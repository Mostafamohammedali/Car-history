from django.urls import path
from . import api_views
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse

app_name = 'accounts'

urlpatterns = [
    # CSRF token endpoint
    path('csrf-token/', ensure_csrf_cookie(lambda request: JsonResponse({'detail': 'CSRF cookie set'})), name='api_csrf_token'),
    
    # New registration flow endpoints
    path('send-verification-code/', api_views.api_send_verification_code, name='api_send_verification_code'),
    path('register-with-verification/', api_views.api_register_with_verification, name='api_register_with_verification'),
    path('resend-verification/', api_views.api_resend_verification, name='api_resend_verification'),
    
    # API endpoints for React frontend (with slash)
    path('login/', api_views.api_login, name='api_login'),
    path('logout/', api_views.api_logout, name='api_logout'),
    path('verify-email/', api_views.api_verify_email, name='api_verify_email'),
    path('password-reset/', api_views.api_password_reset, name='api_password_reset'),
    path('reset-password-confirm/', api_views.api_reset_password_confirm, name='api_reset_password_confirm'),
    path('profile/', api_views.api_get_profile, name='api_get_profile'),
    path('profile/update/', api_views.api_update_profile, name='api_update_profile'),
    path('auth/status/', api_views.api_check_auth_status, name='check_auth_status'),
    
    # CSRF token endpoint (without slash)
    path('csrf-token', ensure_csrf_cookie(lambda request: JsonResponse({'detail': 'CSRF cookie set'})), name='api_csrf_token_no_slash'),
    
    # New registration flow endpoints (without slash)
    path('send-verification-code', api_views.api_send_verification_code, name='api_send_verification_code_no_slash'),
    path('register-with-verification', api_views.api_register_with_verification, name='api_register_with_verification_no_slash'),
    path('resend-verification', api_views.api_resend_verification, name='api_resend_verification_no_slash'),
    
    # API endpoints for React frontend (without slash for APPEND_SLASH=False)
    path('login', api_views.api_login, name='api_login_no_slash'),
    path('logout', api_views.api_logout, name='api_logout_no_slash'),
    path('verify-email', api_views.api_verify_email, name='api_verify_email_no_slash'),
    path('password-reset', api_views.api_password_reset, name='api_password_reset_no_slash'),
    path('reset-password-confirm', api_views.api_reset_password_confirm, name='api_reset_password_confirm_no_slash'),
    path('profile', api_views.api_get_profile, name='api_get_profile_no_slash'),
    path('profile/update', api_views.api_update_profile, name='api_update_profile_no_slash'),
    path('auth/status', api_views.api_check_auth_status, name='check_auth_status_no_slash'),
]
