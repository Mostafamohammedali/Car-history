"""
Accounts Serializers - Django REST Framework serializers
Handles data validation and serialization for user accounts
"""

import time
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from .models import CustomUser, UserActivity


class CustomUserSerializer(serializers.ModelSerializer):
    """Basic user serializer for read operations"""
    
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'is_email_verified',
            'email_verification_token', 'email_verification_sent_at', 'created_at'
        ]
        read_only_fields = ['id', 'is_email_verified', 'email_verification_token', 'email_verification_sent_at', 'created_at']
    
    def get_full_name(self, obj):
        return obj.username


class CustomUserCreateSerializer(serializers.ModelSerializer):
    """Serializer for user registration with comprehensive validation"""
    
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        validators=[
            RegexValidator(
                regex=r'^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$',
                message='كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل، حرف واحد ورقم واحد على الأقل'
            )
        ]
    )
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = CustomUser
        fields = [
            'username', 'email', 'password', 'confirm_password'
        ]
    
    def validate_email(self, value):
        """Validate email format and uniqueness"""
        value = value.strip().lower()
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError('البريد الإلكتروني مستخدم بالفعل')
        return value
    
    def validate_username(self, value):
        """Validate username uniqueness"""
        if CustomUser.objects.filter(username=value).exists():
            raise serializers.ValidationError('اسم المستخدم مستخدم بالفعل')
        return value
    
    def validate_password(self, value):
        """Validate password strength"""
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
    
    def validate(self, attrs):
        """Validate password confirmation"""
        password = attrs.get('password')
        confirm_password = attrs.get('confirm_password')
        
        if password and confirm_password and password != confirm_password:
            raise serializers.ValidationError('كلمات المرور غير متطابقة')
        
        return attrs
    
    def create(self, validated_data):
        """Create user with encrypted password"""
        validated_data.pop('confirm_password', None)
        password = validated_data.pop('password')
        
        user = CustomUser.objects.create_user(
            password=password,
            **validated_data
        )
        
        
        return user


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    remember_me = serializers.BooleanField(default=False)
    
    def validate(self, attrs):
        """Validate login credentials"""
        email = attrs.get('email').strip().lower()
        password = attrs.get('password')
        
        if not email or not password:
            raise serializers.ValidationError('البريد الإلكتروني وكلمة المرور مطلوبان')
        
        attrs['email'] = email
        return attrs



class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for changing password"""
    
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        validators=[
            RegexValidator(
                regex=r'^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$',
                message='كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل، حرف واحد ورقم واحد على الأقل'
            )
        ]
    )
    confirm_password = serializers.CharField(write_only=True)
    
    def validate_new_password(self, value):
        """Validate new password strength"""
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
    
    def validate(self, attrs):
        """Validate password confirmation"""
        new_password = attrs.get('new_password')
        confirm_password = attrs.get('confirm_password')
        
        if new_password and confirm_password and new_password != confirm_password:
            raise serializers.ValidationError('كلمات المرور الجديدة غير متطابقة')
        
        return attrs


class PasswordResetSerializer(serializers.Serializer):
    """Serializer for password reset request"""
    
    email = serializers.EmailField()
    
    def validate_email(self, value):
        """Validate email exists in system"""
        value = value.strip().lower()
        if not CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError('لا يوجد حساب مسجل بهذا البريد الإلكتروني')
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation"""
    
    email = serializers.EmailField()
    verification_code = serializers.CharField(max_length=6, min_length=6)
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        validators=[
            RegexValidator(
                regex=r'^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$',
                message='كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل، حرف واحد ورقم واحد على الأقل'
            )
        ]
    )
    confirm_password = serializers.CharField(write_only=True)
    
    def validate_new_password(self, value):
        """Validate new password strength"""
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
    
    def validate(self, attrs):
        """Validate password confirmation"""
        new_password = attrs.get('new_password')
        confirm_password = attrs.get('confirm_password')
        
        if new_password and confirm_password and new_password != confirm_password:
            raise serializers.ValidationError('كلمات المرور غير متطابقة')
        
        return attrs


class UserPublicSerializer(serializers.ModelSerializer):
    """Public user serializer (limited fields for privacy)"""
    
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'created_at']
        read_only_fields = ['id', 'username', 'email', 'created_at']


class UserStatsSerializer(serializers.Serializer):
    """Serializer for user statistics"""
    
    total_searches = serializers.IntegerField(read_only=True)
    total_reports = serializers.IntegerField(read_only=True)
    total_ratings = serializers.IntegerField(read_only=True)
    account_age_days = serializers.IntegerField(read_only=True)
    last_login_days = serializers.IntegerField(read_only=True)


class EmailVerificationSerializer(serializers.Serializer):
    """Serializer for email verification"""
    
    email = serializers.EmailField()
    verification_code = serializers.CharField(max_length=6, min_length=6)
    verification_type = serializers.ChoiceField(
        choices=['signup', 'reset'],
        default='signup'
    )
    
    def validate_verification_code(self, value):
        """Validate verification code format"""
        if not value.isdigit() or len(value) != 6:
            raise serializers.ValidationError('رمز التحقق يجب أن يكون 6 أرقام')
        return value


class PreRegistrationSerializer(serializers.Serializer):
    """Serializer for pre-registration verification code"""
    
    email = serializers.EmailField()
    
    def validate_email(self, value):
        """Validate email format and check if already exists"""
        value = value.strip().lower()
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError('البريد الإلكتروني مستخدم بالفعل')
        return value


class RegistrationWithVerificationSerializer(serializers.ModelSerializer):
    """Serializer for registration with verification code"""
    
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        validators=[
            RegexValidator(
                regex=r'^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$',
                message='كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل، حرف واحد ورقم واحد على الأقل'
            )
        ]
    )
    confirm_password = serializers.CharField(write_only=True)
    verification_code = serializers.CharField(max_length=6, min_length=6)
    
    class Meta:
        model = CustomUser
        fields = [
            'email', 'password', 'confirm_password', 'verification_code',
            'username'
        ]
    
    def validate_verification_code(self, value):
        """Validate verification code format"""
        if not value.isdigit() or len(value) != 6:
            raise serializers.ValidationError('رمز التحقق يجب أن يكون 6 أرقام')
        return value
    
    def validate_email(self, value):
        """Validate email format and uniqueness"""
        value = value.strip().lower()
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError('البريد الإلكتروني مستخدم بالفعل')
        return value
    
    def validate_password(self, value):
        """Validate password strength"""
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
    
    def validate(self, attrs):
        """Validate password confirmation"""
        password = attrs.get('password')
        confirm_password = attrs.get('confirm_password')
        
        if password and confirm_password and password != confirm_password:
            raise serializers.ValidationError('كلمات المرور غير متطابقة')
        
        return attrs
    
    def create(self, validated_data):
        """Create user after verification"""
        validated_data.pop('confirm_password', None)
        validated_data.pop('verification_code', None)
        password = validated_data.pop('password')
        
        user = CustomUser.objects.create_user(
            password=password,
            **validated_data
        )
        
        
        return user
