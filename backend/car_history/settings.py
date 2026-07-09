"""

إعدادات مشروع Django للبحث عن سيارات VIN



هذا الملف يحتوي على جميع إعدادات تطبيق الويب Django

يحدد اتصالات قاعدة البيانات، التطبيقات المثبتة، الـ middleware، القوالب، والإعدادات الأساسية الأخرى

"""



from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
import os
import django.utils.html
from django.utils.safestring import mark_safe

# Monkeypatch format_html to support django-jazzmin on Django 5.0+
# Jazzmin calls format_html() without args/kwargs which is deprecated/error in new Django
_original_format_html = django.utils.html.format_html
def _patched_format_html(format_string, *args, **kwargs):
    if not args and not kwargs:
        return mark_safe(format_string)
    return _original_format_html(format_string, *args, **kwargs)
django.utils.html.format_html = _patched_format_html



# Load environment variables from .env file

load_dotenv()



# بناء المسارات داخل المشروع مثل: BASE_DIR / 'subdir'

BASE_DIR = Path(__file__).resolve().parent.parent



# تحذير أمني: احتفظ بمفتاح السر المستخدم في الإنتاج سرياً!
# يجب تعيين SECRET_KEY في متغيرات البيئة
SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    raise ValueError("No SECRET_KEY set for Django application")



# تحذير أمني: لا تشغل بتشغيل التصحيح في الإنتاج!

DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'



# قائمة بأسماء المضيفين المسموح بها لتطبيق Django

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')



# تعريف التطبيقات

# هذه هي تطبيقات Django المثبتة والنشطة في هذا المشروع

INSTALLED_APPS = [

    'jazzmin',                     # Modern Admin Interface (Must be before admin)
    'django.contrib.admin',        # واجهة إدارة Django

    'django.contrib.auth',         # نظام المصادقة

    'django.contrib.contenttypes', # إطار عمل نوع المحتوى

    'django.contrib.sessions',     # إطار عمل الجلسات

    'django.contrib.messages',     # إطار عمل الرسائل

    'django.contrib.staticfiles',  # معالجة الملفات الثابتة

    'django.contrib.humanize',      # humanize template tags

    'corsheaders',                 # CORS headers support

    'cars',                        # تطبيق إدارة السيارات (التطبيق الرئيسي)

    'accounts',                    # تطبيق إدارة الحسابات والمصادقة

    'data_sync',                   # تطبيق مزامنة البيانات

    'ai_chat',                     # تطبيق الدردشة مع الذكاء الاصطناعي

]



# فئات الـ middleware التي تعالج الطلبات والاستجابات

MIDDLEWARE = [

    'django.middleware.security.SecurityMiddleware',

    'corsheaders.middleware.CorsMiddleware',  # CORS middleware

    'django.contrib.sessions.middleware.SessionMiddleware',

    'django.middleware.common.CommonMiddleware',

    'django.middleware.csrf.CsrfViewMiddleware',

    'django.contrib.auth.middleware.AuthenticationMiddleware',

    'django.contrib.messages.middleware.MessageMiddleware',

    'django.middleware.clickjacking.XFrameOptionsMiddleware',

]

# Disable automatic slash appending for API compatibility
APPEND_SLASH = False



# وحدة تكوين URL الجذر

ROOT_URLCONF = 'car_history.urls'



# تكوين القوالب

TEMPLATES = [

    {

        'BACKEND': 'django.template.backends.django.DjangoTemplates',

        'DIRS': [BASE_DIR / 'templates', BASE_DIR / '../frontend/templates'],  # مسار دليل القوالب

        'APP_DIRS': True,  # البحث عن القوالب في أدلة التطبيقات

        'OPTIONS': {

            'context_processors': [

                'django.template.context_processors.debug',

                'django.template.context_processors.request',

                'django.contrib.auth.context_processors.auth',

                'django.contrib.messages.context_processors.messages',

                'django.template.context_processors.static',

            ],

        },

    },

]



# تكوين تطبيق WSGI

WSGI_APPLICATION = 'car_history.wsgi.application'


# قاعدة البيانات
# https://docs.djangoproject.com/en/stable/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [

    {

        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',

    },

    {

        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',

    },

    {

        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',

    },

    {

        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',

    },

]


LANGUAGE_CODE = 'en-us'  # اللغة الافتراضية

TIME_ZONE = 'UTC'       # المنطقة الزمنية الافتراضية

USE_I18N = True         # تمكين التدويل

USE_TZ = True           # تمكين دعم المنطقة الزمنية




# تكوين الملفات الثابتة

STATIC_URL = 'static/'  # بادئة URL للملفات الثابتة

STATICFILES_DIRS = [
    BASE_DIR / '../frontend/static',
    BASE_DIR / '../frontend/client/public',
    BASE_DIR / 'static',
] if (BASE_DIR / '../frontend/static').exists() else [BASE_DIR / '../frontend/client/public', BASE_DIR / 'static']# مسار دليل الملفات الثابتة

STATIC_ROOT = BASE_DIR / 'staticfiles'  # مسار تجميع الملفات الثابتة للإنتاج



# نوع حقل المفتاح الأساسي الافتراضي

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'



# تخصيص نموذج المستخدم

AUTH_USER_MODEL = 'accounts.CustomUser'



# إعدادات تسجيل الدخول

LOGIN_URL = 'accounts:login'  # URL to redirect to when login is required

LOGIN_REDIRECT_URL = 'home'    # URL to redirect to after successful login

# استخدام الـ Backend الافتراضي فقط
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]




# إعدادات CORS للسماح بالتواصل بين الواجهة والخادم
# في بيئة الإنتاج، يجب تحديد النطاقات المسموح بها بدقة
CORS_ALLOWED_ORIGINS = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

CORS_ALLOW_CREDENTIALS = True

# في بيئة التطوير فقط، للسماح بجميع المصادر
# في الإنتاج، يجب تعيين هذا إلى False وتحديد المصادر المسموح بها أعلاه
CORS_ALLOW_ALL_ORIGINS = os.getenv('DEBUG', 'False').lower() == 'true'

# CSRF Configuration
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Session Configuration
SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'


# إعدادات Groq API لميزة الدردشة فقط
# يجب تعيين GROQ_API_KEY في متغيرات البيئة
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
if not GROQ_API_KEY:
    raise ValueError("No GROQ_API_KEY set for AI chat functionality")


# إعدادات الملفات الوسائطية

MEDIA_URL = '/media/'

MEDIA_ROOT = BASE_DIR / 'media'



# إعدادات البريد الإلكتروني

EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')

EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')

EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))

EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() == 'true'

EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')

EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')

# Default email addresses
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER)

SITE_EMAIL = os.getenv('SITE_EMAIL', EMAIL_HOST_USER)

ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', 'admin@carhistory.com')

# Site Configuration
SITE_NAME = os.getenv('SITE_NAME', 'Car History')
SITE_URL = os.getenv('SITE_URL', 'https://localhost:8000')


# إعدادات Cache
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
        'TIMEOUT': 300,  # 5 minutes default timeout
    }
}

# إذا كان Redis متوفراً في بيئة الإنتاج
if os.getenv('REDIS_URL'):
    CACHES['default'] = {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.getenv('REDIS_URL'),
        'TIMEOUT': 3600,  # 1 hour for rate limiting
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }


# CSRF Cookie Configuration
CSRF_COOKIE_SECURE = False  # Set to True in production with HTTPS
CSRF_COOKIE_HTTPONLY = False # Allowed for React to read it
CSRF_COOKIE_SAMESITE = 'Lax'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER)

SITE_EMAIL = os.getenv('SITE_EMAIL', EMAIL_HOST_USER)





# Celery Configuration
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Asia/Riyadh'

# Celery Beat Configuration
# ──────────────────────────────────────────────────────────────────────
# NOTE: When CELERY_TASK_ALWAYS_EAGER = True (below), Celery Beat does
# NOT fire automatically.  The background thread in data_sync/apps.py
# handles both the initial sync at server start and the 24-hour cycle.
# If you switch to a real Celery worker + Redis in production, set
# CELERY_TASK_ALWAYS_EAGER = False and Beat will take over scheduling.
# ──────────────────────────────────────────────────────────────────────
CELERY_BEAT_SCHEDULE = {
    'auto-sync-all': {
        'task': 'data_sync.auto_sync_all',
        'schedule': 86400.0,  # كل 24 ساعة
        'options': {'queue': 'sync_queue'},
    },
}

# Celery Queue Configuration
CELERY_TASK_DEFAULT_QUEUE = 'default'
CELERY_TASK_ROUTES = {
    'data_sync.tasks.*': {'queue': 'sync_queue'},
}

# Celery Worker Configuration
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_WORKER_MAX_TASKS_PER_CHILD = 1000

# Execute tasks locally (sync) instead of sending to an external broker.
# When True → Celery Beat schedules do NOT fire; the daemon thread in
# data_sync/apps.py handles the 24-hour sync cycle instead.
# When False → Requires a running Celery worker + Redis; Beat fires on schedule.
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_STORE_EAGER_RESULT = True

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# CarDog API Configuration
CARDOG_API_KEY = os.getenv('CARDOG_API_KEY', '')
CARDOG_API_URL = os.getenv('CARDOG_API_URL', 'https://api.cardog.com/v1/vin/')










# =============================================================================
# JAZZMIN ADMIN INTERFACE - COMPLETE CONFIGURATION
# All settings to control the admin interface appearance and behavior
# =============================================================================
JAZZMIN_SETTINGS = {
    # ===== SITE IDENTITY =====
    "site_title": "Car History Admin",           # Browser tab title
    "site_header": "Car History",               # Login page header
    "site_brand": "Car History",                # Sidebar brand text
    "welcome_sign": "Welcome to Car History Management Portal",
    "copyright": "Car History © 2025",            # Footer copyright text
    
    # ===== LOGO CONFIGURATION =====
    "site_logo": "images/logo.png",             # Sidebar logo
    "login_logo": "images/logo.png",            # Login page logo
    "login_logo_dark": "images/logo.png",       # Dark mode login logo
    "site_logo_classes": "",                     # Clear classes to make it larger
    "site_icon": "images/logo.png",              # Browser favicon
    
    # ===== USER PROFILE =====
    "user_avatar": None,                         # User avatar field
    
    # ===== SEARCH CONFIGURATION =====
    "search_model": ["accounts.CustomUser", "cars.Car"],  # Models to search

    # ===== TOP NAVIGATION MENU =====
    "topmenu_links": [
        {"name": "Home", "url": "admin:index", "permissions": ["auth.view_user"]},
        {"name": "View Site", "url": "/", "new_window": True},
        {"model": "accounts.CustomUser"},
    ],
    
    # ===== SIDEBAR CONFIGURATION =====
    "show_sidebar": True,                        # Show/hide sidebar
    "navigation_expanded": True,                 # Auto-expand menu items
    "hide_apps": [],                             # Hide specific apps
    "hide_models": [],                           # Hide specific models
    "order_with_respect_to": ["accounts", "cars", "data_sync", "ai_chat"],
    
    # ===== ICONS CONFIGURATION =====
    "icons": {
        # ── App-level icons ──────────────────────────────────────────
        "auth":                             "fas fa-shield-alt",
        "accounts":                         "fas fa-users",
        "cars":                             "fas fa-car",
        "data_sync":                        "fas fa-database",
        "ai_chat":                          "fas fa-robot",

        # ── Accounts app ─────────────────────────────────────────────
        "accounts.CustomUser":              "fas fa-user-circle",
        "accounts.UserActivity":            "fas fa-history",
        "accounts.OTPTracker":              "fas fa-key",

        # ── Auth app ─────────────────────────────────────────────────
        "auth.Group":                       "fas fa-users-cog",

        # ── Cars app ─────────────────────────────────────────────────
        "cars.Cars":                        "fas fa-car",
        "cars.Reports":                     "fas fa-file-medical-alt",
        "cars.Repairshops":                 "fas fa-tools",
        "cars.Evaluation":                  "fas fa-star-half-alt",
        "cars.ImageCar":                    "fas fa-images",
        "cars.AccidentImage":               "fas fa-car-crash",
        "cars.ContactMessage":              "fas fa-envelope-open-text",

        # ── Data Sync app ─────────────────────────────────────────────
        "data_sync.ExternalDBConfig":       "fas fa-server",
        "data_sync.APISourceConfig":        "fas fa-plug",
        "data_sync.SyncLog":                "fas fa-sync-alt",
        "data_sync.DataMapping":            "fas fa-random",

        # ── AI Chat app ───────────────────────────────────────────────
        "ai_chat.ChatMessage":              "fas fa-comments",
    },
    "default_icon_parents": "fas fa-chevron-circle-right",
    "default_icon_children": "fas fa-circle",
    
    # ===== UI FEATURES =====
    "related_modal_active": True,                # Use modals instead of popups
    
    # ===== FORM DISPLAY =====
    "changeform_format": "single",               # Form layout: single (all open), horizontal_tabs, vertical_tabs, collapsible, carousel
    "changeform_format_overrides": {             # Per-model form layouts
        "accounts.CustomUser": "single",
        "cars.Cars": "single"
    },
    "custom_css": "admin_custom/custom.css?v=10",
}

# ============================================
# JAZZMIN UI TWEAKS - Complete Interface Control
# ============================================
JAZZMIN_UI_TWEAKS = {
    # ===== Typography =====
    "navbar_small_text": False,      # Small text in navbar
    "footer_small_text": False,        # Small text in footer
    "body_small_text": False,          # Small text in body
    "brand_small_text": False,         # Small text in brand/logo
    "sidebar_nav_small_text": False,  # Small text in sidebar navigation

    # Sidebar style
    
    # ===== Layout Control =====
    "layout_boxed": False,              # Boxed layout (fixed width)
    "layout_fixed": True,               # Fixed layout
    "navbar_fixed": True,               # Fixed navbar
    "footer_fixed": True,              # Fixed footer
    "sidebar_fixed": True,              # Fixed sidebar
    "sidebar_mini": False,              # Mini sidebar (icons only)
    "sidebar_collapsed": False,         # Start with collapsed sidebar
    
    # ===== Borders & Spacing =====
    "no_navbar_border": True,            # Remove navbar border
    "sidebar_nav_child_indent": False,   # Indent child menu items
    "sidebar_nav_compact_style": False,  # Compact sidebar style
    "sidebar_nav_legacy_style": False,   # Legacy sidebar style
    "sidebar_nav_flat_style": False,     # Flat sidebar style
    "sidebar_disable_expand": False,     # Disable sidebar expand/collapse

    # ===== Themes =====
    "theme": "default",                   # Minimal base theme for full custom CSS control
    "dark_mode_theme": None,              # Dark mode theme (set to "darkly" to enable)
    
    # ===== Button Styles =====
    "button_classes": {
        "primary": "btn-primary",
        "secondary": "btn-secondary",
        "info": "btn-info",
        "warning": "btn-warning",
        "danger": "btn-danger",
        "success": "btn-success"
    },
    
    # ===== Features =====
    "actions_sticky_top": True,           # Sticky action buttons at top
    "rtl": False,                         # RTL support (set True for Arabic)
}

# Custom CSS is now handled via custom_css in JAZZMIN_SETTINGS




