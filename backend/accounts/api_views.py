from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt, csrf_protect
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.core.cache import cache
from django.core.mail import send_mail
from django.utils import timezone
from django.views import View
from django.db import transaction
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.authentication import SessionAuthentication
import json
import random
import string
import logging
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from .models import CustomUser, UserActivity, OTPTracker
from .forms import CustomUserCreationForm, LoginForm, EmailVerificationForm, VerificationCodeForm, NewPasswordForm

logger = logging.getLogger(__name__)

# --- HELPERS ---

def check_otp_attempts(email, verification_type=None):
    """التحقق من عدد محاولات إدخال الرمز من قاعدة البيانات"""
    tracker = OTPTracker.objects.filter(email=email).first()
    if not tracker:
        return 0
    
    if tracker.lock_until and timezone.now() > tracker.lock_until:
        return 0
        
    return tracker.attempts

def increment_otp_attempts(email, verification_type=None):
    """زيادة عدد المحاولات الخاطئة وتطبيق الحظر إذا لزم الأمر"""
    tracker, created = OTPTracker.objects.get_or_create(email=email)
    
    if tracker.lock_until and timezone.now() > tracker.lock_until:
        tracker.attempts = 0
        tracker.lock_until = None
    
    tracker.attempts += 1
    
    if tracker.attempts >= 3:
        tracker.lock_until = timezone.now() + timedelta(minutes=1)
        
    tracker.save()
    return tracker.attempts

def get_lock_remaining_time(email, verification_type=None):
    """جلب الوقت المتبقي لانتهاء الحظر بالثواني"""
    tracker = OTPTracker.objects.filter(email=email).first()
    if tracker:
        return tracker.get_remaining_seconds()
    return 0

def reset_otp_attempts(email, verification_type=None):
    """إعادة ضبط عدد المحاولات عند النجاح"""
    OTPTracker.objects.filter(email=email).update(attempts=0, lock_until=None)

def create_success_response(data=None, message="", status_code=200):
    """Create a consistent success response"""
    response = {
        'success': True,
        'message': message,
        'timestamp': timezone.now().isoformat()
    }
    if data:
        response['data'] = data
    return JsonResponse(response, status=status_code)

def create_error_response(message="", status_code=400, data=None):
    """Create standardized error response"""
    response = {
        'success': False,
        'message': message,
        'timestamp': timezone.now().isoformat()
    }
    if data:
        response['data'] = data
    return JsonResponse(response, status=status_code)

class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return  # Do not enforce CSRF for login

# --- API VIEWS ---

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def api_send_verification_code(request):
    """إرسال رمز التحقق والتحقق من البيانات قبل الحفظ المؤقت"""
    try:
        data = request.data
        if data is None:
            return create_error_response('لم يتم استلام أي بيانات', 400)
        
        email = str(data.get('email') or '').strip().lower()
        password = str(data.get('password') or data.get('pass') or '').strip()
        first_name = data.get('first_name') or data.get('fullName') or data.get('name', 'User')
        
        if not email:
            return create_error_response('يرجى إدخال البريد الإلكتروني للمتابعة.', 400)
            
        if not password:
            return create_error_response('كلمة المرور مطلوبة لإتمام عملية التسجيل.', 400)
            
        first_name = str(first_name).strip()
        username = email.split('@')[0]

        # Ensure unique username
        base_username = username
        counter = 1
        while CustomUser.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1
            
        if CustomUser.objects.filter(email__iexact=email).exists():
            return create_error_response('هذا البريد الإلكتروني مسجل بالفعل.', 400)
            
        remaining = get_lock_remaining_time(email, 'signup')
        if remaining > 0:
            return create_error_response(f'لقد تجاوزت المحاولات. يرجى الانتظار {remaining} ثانية.', 429)
        
        cache_key = f'temp_reg_{email}'
        existing_data = cache.get(cache_key)
        
        if existing_data and (timezone.now().timestamp() - existing_data.get('created_at', 0) < 60):
            code = existing_data.get('code')
            registration_data = existing_data
            registration_data.update({
                'password': password,
                'first_name': first_name,
                'created_at': timezone.now().timestamp()
            })
        else:
            code = ''.join(random.choices(string.digits, k=6))
            registration_data = {
                'email': email,
                'username': username,
                'password': password,
                'first_name': first_name,
                'code': code,
                'created_at': timezone.now().timestamp()
            }
        
        cache.set(cache_key, registration_data, 60)
        reset_otp_attempts(email, 'signup')
        
        try:
            send_mail(
                subject='رمز التحقق من Car History',
                message=f'مرحباً {first_name}!\nرمز التحقق الخاص بك هو: {code}\nصلاحية الرمز هي دقيقة واحدة.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            
            response_data = {'email': email}
            if settings.DEBUG:
                response_data['verification_code'] = code
            
            return create_success_response(data=response_data, message='تم إرسال رمز التحقق بنجاح.')
        except Exception as email_error:
            logger.error(f'Email error: {str(email_error)}')
            if settings.DEBUG:
                return create_success_response(data={'email': email, 'verification_code': code}, message='(Debug) OTP generated.')
            return create_error_response('فشل إرسال البريد الإلكتروني.', 500)
            
    except Exception as e:
        logger.error(f'Error in send_verification: {str(e)}')
        return create_error_response('حدث خطأ في الخادم.', 500)

@api_view(['POST'])
@permission_classes([AllowAny])
def api_resend_verification(request):
    """إعادة إرسال رمز التحقق"""
    try:
        data = request.data
        email = str(data.get('email') or '').strip().lower()
        
        remaining = get_lock_remaining_time(email, 'signup')
        if remaining > 0:
            return create_error_response(f'يرجى الانتظار {remaining} ثانية.', 429)
            
        cache_key = f'temp_reg_{email}'
        reg_data = cache.get(cache_key)
        if not reg_data:
            return create_error_response('انتهت صلاحية الجلسة.', 400)
        
        code = ''.join(random.choices(string.digits, k=6))
        reg_data['code'] = code
        cache.set(cache_key, reg_data, 60)
        
        send_mail(
            subject='رمز تحقق جديد - Car History',
            message=f'رمز التحقق الجديد الخاص بك هو: {code}',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
        )
        return create_success_response(message='تمت إعادة إرسال الرمز.')
    except Exception as e:
        logger.error(f'Error in resend: {str(e)}')
        return create_error_response('فشل إعادة الإرسال.', 500)

@api_view(['POST'])
@permission_classes([AllowAny])
def api_verify_email(request):
    """التحقق من الرمز"""
    try:
        data = request.data
        email = str(data.get('email') or '').strip().lower()
        code = str(data.get('code') or '').strip()
        v_type = data.get('verification_type')
        
        if v_type == 'signup':
            remaining = get_lock_remaining_time(email, 'signup')
            if remaining > 0:
                return create_error_response(f'محظور لمدة {remaining} ثانية.', 429)
                
            cache_key = f'temp_reg_{email}'
            reg_data = cache.get(cache_key)
            if not reg_data or str(reg_data.get('code')) != code:
                increment_otp_attempts(email, 'signup')
                return create_error_response('الرمز غير صحيح أو منتهي.', 400)
            
            with transaction.atomic():
                user = CustomUser.objects.create_user(
                    username=reg_data['username'],
                    email=reg_data['email'],
                    password=reg_data['password'],
                    first_name=reg_data['first_name'],
                    is_active=True,
                    is_email_verified=True
                )
                login(request, user, backend='accounts.backends.EmailBackend')
                cache.delete(cache_key)
                reset_otp_attempts(email, 'signup')
                
                refresh = RefreshToken.for_user(user)
                return create_success_response(data={
                    'user': {
                        'id': user.id, 
                        'username': user.username, 
                        'email': user.email,
                        'is_staff': user.is_staff,
                        'is_superuser': user.is_superuser
                    },
                    'tokens': {'refresh': str(refresh), 'access': str(refresh.access_token)}
                }, message='تم تفعيل الحساب.')

        elif v_type == 'reset':
            stored_code = cache.get(f'reset_code_{email}')
            if not stored_code or str(stored_code) != code:
                increment_otp_attempts(email, 'reset')
                return create_error_response('الرمز غير صحيح.', 400)
            
            cache.set(f'reset_verified_{email}', True, 600)
            reset_otp_attempts(email, 'reset')
            return create_success_response(message='تم التحقق بنجاح.')
            
    except Exception as e:
        logger.error(f'Error in verification: {str(e)}')
        return create_error_response('خطأ في التحقق.', 500)

api_register_with_verification = api_verify_email

@api_view(['POST'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([AllowAny])
def api_login(request):
    """تسجيل الدخول"""
    try:
        data = request.data
        login_field = str(data.get('login_field') or '').strip().lower()
        password = data.get('password')
        
        remaining = get_lock_remaining_time(login_field, 'login')
        if remaining > 0:
            return create_error_response(f'محظور لمدة {remaining} ثانية.', 429)

        user = authenticate(request, email=login_field, password=password)
        if user and user.is_active:
            login(request, user, backend='accounts.backends.EmailBackend')
            reset_otp_attempts(login_field, 'login')
            refresh = RefreshToken.for_user(user)
            return create_success_response(data={
                'user': {
                    'id': user.id, 
                    'username': user.username, 
                    'email': user.email,
                    'is_staff': user.is_staff,
                    'is_superuser': user.is_superuser
                },
                'tokens': {'refresh': str(refresh), 'access': str(refresh.access_token)}
            }, message='أهلاً بك.')
        
        increment_otp_attempts(login_field, 'login')
        return create_error_response('بيانات الدخول غير صحيحة.', 401)
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return create_error_response('فشل تسجيل الدخول.', 500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_logout(request):
    logout(request)
    return create_success_response(message='تم تسجيل الخروج.')

@api_view(['GET'])
@permission_classes([AllowAny])
def api_check_auth_status(request):
    if request.user.is_authenticated:
        return create_success_response(data={
            'authenticated': True, 
            'user': {
                'id': request.user.id, 
                'email': request.user.email, 
                'username': request.user.username,
                'is_staff': request.user.is_staff,
                'is_superuser': request.user.is_superuser
            }
        })
    return create_success_response(data={'authenticated': False})

@api_view(['POST'])
@permission_classes([AllowAny])
def api_password_reset(request):
    """إرسال رمز استعادة كلمة المرور"""
    try:
        email = str(request.data.get('email') or '').strip().lower()
        user = CustomUser.objects.filter(email__iexact=email).first()
        if not user:
            return create_error_response('البريد غير مسجل.', 404)
        
        code = ''.join(random.choices(string.digits, k=6))
        cache.set(f'reset_code_{email}', code, 600)
        cache.set(f'reset_user_{email}', user.id, 600)
        
        send_mail(
            subject='رمز استعادة كلمة المرور - Car History',
            message=f'رمز التحقق: {code}',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
        )
        return create_success_response(message='تم إرسال الرمز.')
    except Exception as e:
        logger.error(f"Reset request error: {str(e)}")
        return create_error_response('فشل إرسال الرمز.', 500)

@api_view(['POST'])
@permission_classes([AllowAny])
def api_reset_password_confirm(request):
    try:
        data = request.data
        email = str(data.get('email') or '').strip().lower()
        code = str(data.get('code') or '').strip()
        p1 = data.get('password1')
        p2 = data.get('password2')
        
        if p1 != p2:
            return create_error_response('كلمات المرور غير متطابقة.', 400)
        
        if not cache.get(f'reset_verified_{email}') or str(cache.get(f'reset_code_{email}')) != code:
            return create_error_response('رمز التحقق غير صالح.', 400)
            
        user = CustomUser.objects.get(id=cache.get(f'reset_user_{email}'))
        user.set_password(p1)
        user.save()
        
        cache.delete(f'reset_code_{email}')
        cache.delete(f'reset_verified_{email}')
        return create_success_response(message='تم تحديث كلمة المرور.')
    except Exception as e:
        return create_error_response('فشل التحديث.', 500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_get_profile(request):
    user = request.user
    return create_success_response(data={'user': {
        'id': user.id, 
        'username': user.username, 
        'email': user.email, 
        'name': user.first_name,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser
    }})

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def api_update_profile(request):
    user = request.user
    if 'name' in request.data: user.first_name = request.data['name']
    user.save()
    return create_success_response(message='تم التحديث.')

@api_view(['POST'])
@permission_classes([AllowAny])
def api_admin_login(request):
    data = request.data
    email = data.get('email', '').lower()
    password = data.get('password')
    user = authenticate(request, email=email, password=password)
    
    if user and (user.is_staff or user.is_superuser):
        login(request, user, backend='accounts.backends.EmailBackend')
        refresh = RefreshToken.for_user(user)
        return create_success_response(data={
            'isAdmin': True, 
            'user': {'id': user.id, 'email': user.email, 'username': user.username},
            'tokens': {'refresh': str(refresh), 'access': str(refresh.access_token)}
        })
    return create_error_response('غير مصرح.', 401)

@api_view(['GET'])
@permission_classes([AllowAny])
def api_admin_verify(request):
    is_admin = request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser)
    return create_success_response(data={'isAdmin': is_admin})
