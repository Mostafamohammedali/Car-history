from django.contrib.auth.models import AbstractUser
from django.db import models
import base64


class CustomUser(AbstractUser):
    """نموذج المستخدم المخصص"""
    email = models.CharField(max_length=255, unique=True, verbose_name='البريد الإلكتروني')
    username = models.CharField(max_length=150, unique=True, verbose_name='اسم المستخدم')
    is_email_verified = models.BooleanField(default=False, verbose_name='تم التحقق من البريد الإلكتروني')
    email_verification_token = models.CharField(max_length=255, blank=True, null=True, verbose_name='رمز التحقق')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاريخ الإنشاء')
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    class Meta:
        verbose_name = 'مستخدم'
        verbose_name_plural = 'المستخدمون'
    
    def __str__(self):
        return self.email


class UserActivity(models.Model):
    """سجل نشاط المستخدم"""
    activity_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(
        max_length=50,
        choices=[
            ('login', 'تسجيل الدخول'),
            ('logout', 'تسجيل الخروج'),
            ('profile_update', 'تحديث الملف'),
            ('password_change', 'تغيير كلمة المرور'),
            ('email_change', 'تغيير البريد'),
            ('search', 'بحث'),
            ('view', 'عرض'),
            ('create', 'إنشاء'),
            ('update', 'تحديث'),
            ('delete', 'حذف')
        ],
        verbose_name='نوع النشاط'
    )
    description = models.TextField(verbose_name='الوصف')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='التاريخ')

    class Meta:
        db_table = 'UserActivities'
        verbose_name = 'نشاط المستخدم'
        verbose_name_plural = 'أنشطة المستخدمين'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['activity_type']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.get_activity_type_display()}"


class OTPTracker(models.Model):
    """تتبع محاولات التحقق والحظر"""
    email = models.EmailField(unique=True, verbose_name='البريد الإلكتروني')
    attempts = models.IntegerField(default=0, verbose_name='عدد المحاولات')
    lock_until = models.DateTimeField(null=True, blank=True, verbose_name='وقت انتهاء الحظر')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='تاريخ التحديث')

    class Meta:
        verbose_name = 'متابع رمز التحقق'
        verbose_name_plural = 'متابعو رموز التحقق'

    def is_locked(self):
        """التحقق مما إذا كان البريد محظوراً حالياً"""
        from django.utils import timezone
        if self.lock_until and timezone.now() < self.lock_until:
            return True
        return False

    def get_remaining_seconds(self):
        """جلب الثواني المتبقية لانتهاء الحظر"""
        from django.utils import timezone
        if self.is_locked():
            return int((self.lock_until - timezone.now()).total_seconds())
        return 0

    def __str__(self):
        return f"{self.email} - Attempts: {self.attempts}"
