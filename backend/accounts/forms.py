from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import authenticate
from .models import CustomUser

class CustomUserCreationForm(UserCreationForm):
    email = forms.EmailField(required=True, label='البريد الإلكتروني')
    first_name = forms.CharField(max_length=30, required=True, label='الاسم الأول')
    last_name = forms.CharField(max_length=30, required=True, label='اسم العائلة')
    terms_agreed = forms.BooleanField(required=False, label='أوافق على الشروط والأحكام')
    newsletter_subscribed = forms.BooleanField(required=False, label='أرغب في تلقي النشرة البريدية والعروض الخاصة')

    class Meta:
        model = CustomUser
        fields = ('username', 'first_name', 'last_name', 'email', 'password1', 'password2', 'terms_agreed', 'newsletter_subscribed')
        labels = {
            'username': 'اسم المستخدم',
            'password1': 'كلمة المرور',
            'password2': 'تأكيد كلمة المرور',
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['password1'].widget.attrs.update({'placeholder': 'أدخل كلمة مرور قوية'})
        self.fields['password2'].widget.attrs.update({'placeholder': 'أعد إدخال كلمة المرور'})
        self.fields['username'].widget.attrs.update({'placeholder': 'اختر اسم مستخدم فريد'})
        self.fields['first_name'].widget.attrs.update({'placeholder': 'الاسم الأول'})
        self.fields['last_name'].widget.attrs.update({'placeholder': 'اسم العائلة'})
        self.fields['email'].widget.attrs.update({'placeholder': 'example@email.com'})

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if CustomUser.objects.filter(email=email).exists():
            raise forms.ValidationError('هذا البريد الإلكتروني مستخدم بالفعل')
        return email

    def clean_username(self):
        username = self.cleaned_data.get('username')
        if CustomUser.objects.filter(username=username).exists():
            raise forms.ValidationError('هذا اسم المستخدم مستخدم بالفعل')
        return username

    def clean(self):
        cleaned_data = super().clean()
        password1 = cleaned_data.get('password1')
        password2 = cleaned_data.get('password2')

        if password1 and password2 and password1 != password2:
            raise forms.ValidationError('كلمات المرور غير متطابقة')

        return cleaned_data

class LoginForm(forms.Form):
    username = forms.CharField(max_length=150, label='اسم المستخدم')
    password = forms.CharField(widget=forms.PasswordInput, label='كلمة المرور')
    remember_me = forms.BooleanField(required=False, label='تذكرني')

    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)
        super().__init__(*args, **kwargs)
        self.fields['username'].widget.attrs.update({'placeholder': 'اسم المستخدم أو البريد الإلكتروني'})
        self.fields['password'].widget.attrs.update({'placeholder': 'كلمة المرور'})
        self.user_cache = None

    def get_user(self):
        return self.user_cache

    def clean(self):
        cleaned_data = super().clean()
        username = cleaned_data.get('username')
        password = cleaned_data.get('password')

        if username and password:
            # Since CustomUser uses email as USERNAME_FIELD, authenticate with email directly
            # If user entered username, find their email first
            try:
                user = CustomUser.objects.get(email=username)
                email_for_auth = username
            except CustomUser.DoesNotExist:
                try:
                    user = CustomUser.objects.get(username=username)
                    email_for_auth = user.email
                except CustomUser.DoesNotExist:
                    email_for_auth = username
            
            self.user_cache = authenticate(
                request=self.request,
                username=email_for_auth,
                password=password
            )
            if self.user_cache is None:
                raise forms.ValidationError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
            elif not self.user_cache.is_active:
                raise forms.ValidationError('هذا الحساب غير نشط')

        return cleaned_data

class EmailVerificationForm(forms.Form):
    email = forms.EmailField(label='البريد الإلكتروني')
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['email'].widget.attrs.update({
            'placeholder': 'أدخل بريدك الإلكتروني',
            'class': 'form-input'
        })
    
    def clean_email(self):
        email = self.cleaned_data.get('email')
        if not CustomUser.objects.filter(email=email).exists():
            raise forms.ValidationError('لا يوجد حساب مسجل بهذا البريد الإلكتروني')
        return email


class VerificationCodeForm(forms.Form):
    code = forms.CharField(max_length=6, label='رمز التحقق')
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['code'].widget.attrs.update({
            'placeholder': 'أدخل الرمز المكون من 6 أرقام',
            'class': 'form-input',
            'maxlength': '6'
        })



class NewPasswordForm(forms.Form):
    new_password = forms.CharField(widget=forms.PasswordInput, label='كلمة المرور الجديدة')
    confirm_password = forms.CharField(widget=forms.PasswordInput, label='تأكيد كلمة المرور')
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['new_password'].widget.attrs.update({
            'placeholder': 'أدخل كلمة المرور الجديدة',
            'class': 'form-input'
        })
        self.fields['confirm_password'].widget.attrs.update({
            'placeholder': 'أعد إدخال كلمة المرور',
            'class': 'form-input'
        })
    
    def clean(self):
        cleaned_data = super().clean()
        password1 = cleaned_data.get('new_password')
        password2 = cleaned_data.get('confirm_password')
        
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError('كلمات المرور غير متطابقة')
        
        return cleaned_data
