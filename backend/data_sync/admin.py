from django import forms
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.contrib import messages
import requests
import json
from datetime import datetime
from .models import ExternalDBConfig, APISourceConfig, SyncLog, DataMapping
from .services.discovery_service import DiscoveryService


@admin.register(ExternalDBConfig)
class ExternalDBConfigAdmin(admin.ModelAdmin):
    list_display = ('name', 'host', 'is_active', 'last_sync', 'test_connection_btn', 'auto_discover_btn', 'db_bulk_sync_btn')
    actions = ['run_auto_discovery']
    list_filter = ('is_active', 'ssl_mode', 'created_at')
    search_fields = ('name', 'host', 'dbname', 'user')
    readonly_fields = ('created_at', 'updated_at', 'last_sync', 'next_sync_display')
    
    fieldsets = (
        ('معلومات قاعدة البيانات', {
            'fields': ('name', 'is_active')
        }),
        ('إعدادات الاتصال', {
            'fields': ('host', 'port', 'dbname', 'user', 'password', 'test_vin', 'seed_vins')
        }),
        ('إعدادات متقدمة', {
            'fields': ('ssl_mode', 'connection_timeout', 'max_connections'),
        }),
        ('معلومات النظام', {
            'fields': ('created_at', 'updated_at', 'last_sync', 'created_by'),
        })
    )

    def get_queryset(self, request):
        """عرض قواعد البيانات فقط والمستثنى منها API"""
        qs = super().get_queryset(request)
        return qs.exclude(name__startswith='API:')
    
    def next_sync_display(self, obj):
        """عرض وقت المزامنة التالي"""
        next_time = obj.get_next_sync_time()
        if next_time:
            return format_html(
                '<span title="{}">{}</span>',
                next_time.strftime('%Y-%m-%d %H:%M:%S'),
                next_time.strftime('%Y-%m-%d %H:%M')
            )
        return '-'
    next_sync_display.short_description = 'المزامنة التالية'
    
    def test_connection_btn(self, obj):
        """زر اختبار الاتصال — يعرض الحالة المحفوظة فقط بدون طلب API تلقائي"""
        if obj.pk:
            name = obj.name.upper()
            if name.startswith('API:'):
                # عرض حالة ثابتة بدون طلب تلقائي لتجنب Rate Limit
                last = obj.last_sync
                if last:
                    return mark_safe(
                        f'<span style="color:#28a745;font-weight:bold;">✅ مُعرَّف</span><br>'
                        f'<small style="color:#666;">آخر مزامنة: {last.strftime("%Y-%m-%d %H:%M")}</small>'
                    )
                return mark_safe('<span style="color:#ffc107;font-weight:bold;">⚠ لم تتم مزامنة بعد</span>')
            try:
                db_type = 'postgresql' if obj.port == 5432 else 'mysql' if obj.port in [3306, 3307] else 'sqlite'
                mysql_available = False
                if db_type == 'mysql':
                    try:
                        import MySQLdb
                        mysql_available = True
                    except ImportError:
                        try:
                            import pymysql
                            pymysql.install_as_MySQLdb()
                            import MySQLdb
                            mysql_available = True
                        except ImportError:
                            mysql_available = False
                if db_type == 'mysql' and not mysql_available:
                    return mark_safe('<span style="color: #dc3545;">❌ مكتبة MySQL غير متوفرة</span>')
                connection_result = self._test_connection(obj, db_type)
                if connection_result['success']:
                    return mark_safe(
                        f'<span style="color: #28a745; font-weight: bold;">✅ متصل</span><br>'
                        f'<small style="color: #666;">{connection_result["message"]}</small>'
                    )
                else:
                    return mark_safe(
                        f'<span style="color: #dc3545; font-weight: bold;">❌ فشل الاتصال</span><br>'
                        f'<small style="color: #666;">{connection_result["message"]}</small>'
                    )
            except Exception as e:
                return mark_safe(
                    f'<span style="color: #dc3545; font-weight: bold;">❌ خطأ</span><br>'
                    f'<small style="color: #666;">{str(e)}</small>'
                )
        return '-'
    
    def _test_connection(self, obj, db_type):
        """اختبار الاتصال الفعلي (دعم DB و API)"""
        name = obj.name.upper()
        
        # 1. اختبار API
        if name.startswith('API:'):
            try:
                url = obj.host.replace('{vin}', 'TEST_VIN').replace('{car_model}', 'Toyota%20Camry')
                headers = {}
                if obj.user: # Auth Header Key
                    headers[obj.user] = obj.password
                
                # إضافة المفتاح السري إذا وجد في حقل dbname
                if obj.dbname:
                    headers['X-API-Secret'] = obj.dbname
                
                response = requests.get(url, headers=headers, timeout=10)
                if response.status_code < 500:
                    msg = f'API Success (Code: {response.status_code})'
                    if response.status_code == 200:
                        try:
                            data = response.json()
                            results_count = len(data.get('results', [])) if isinstance(data, dict) else "Data received"
                            msg += f" - Result: {results_count}"
                        except:
                            msg += " - (Non-JSON response)"
                    return {'success': True, 'message': msg}
                return {'success': False, 'message': f'Server Error: {response.status_code}'}
            except Exception as e:
                return {'success': False, 'message': f'API Error: {str(e)[:100]}'}

        # 2. اختبار قاعدة البيانات
        try:
            import psycopg2
            import sqlite3
            
            if db_type == 'postgresql':
                connection = psycopg2.connect(
                    host=obj.host,
                    port=obj.port,
                    database=obj.dbname,
                    user=obj.user,
                    password=obj.password,
                    connect_timeout=obj.connection_timeout or 5
                )
            elif db_type == 'mysql':
                # استيراد MySQL موجه
                import MySQLdb
                connection = MySQLdb.connect(
                    host=obj.host,
                    port=obj.port,
                    db=obj.dbname,
                    user=obj.user,
                    passwd=obj.password,
                    connect_timeout=obj.connection_timeout or 5
                )
            else:  # sqlite
                connection = sqlite3.connect(obj.dbname)
            
            cursor = connection.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            cursor.close()
            connection.close()
            
            return {
                'success': True, 
                'message': f'Connected to {db_type}'
            }
        except Exception as e:
            return {'success': False, 'message': f'DB Error: {str(e)[:100]}'}

    test_connection_btn.short_description = 'اختبار الاتصال'

    def auto_discover_btn(self, obj):
        """زر اكتشاف الحقول تلقائياً"""
        if obj.pk:
            url = reverse('admin:data_sync_discover_fields', args=[obj.pk])
            return format_html(
                '<a class="button" href="{}" style="background: #2196f3; color: white;">🔍 اكتشاف ذكي</a>',
                url
            )
        return '-'
    auto_discover_btn.short_description = 'اكتشاف الحقول'

    def db_bulk_sync_btn(self, obj):
        """زر المزامنة الجماعية من Supabase/PostgreSQL مباشرة"""
        if obj.pk:
            url = reverse('admin:data_sync_db_bulk_sync', args=[obj.pk])
            return format_html(
                '<a class="button" href="{}" style="background: #28a745; color: white;">🔄 مزامنة جماعية</a>',
                url
            )
        return '-'
    db_bulk_sync_btn.short_description = 'مزامنة جماعية'

    def run_auto_discovery(self, request, queryset):
        """Action لسرعة تشغيل الاكتشاف لمجموعة مصادر"""
        service = DiscoveryService()
        success_count = 0
        for config in queryset:
            result = service.discover_and_map(config.id)
            if result.get('success'):
                success_count += 1
        
        self.message_user(request, f'تم تشغيل الاكتشاف التلقائي لعدد {success_count} مصادر بنجاح.')
    run_auto_discovery.short_description = '🔍 تشغيل الاكتشاف التلقائي الذكي'

    def get_urls(self):
        from django.urls import path
        urls = super().get_urls()
        custom_urls = [
            path('<path:object_id>/discover-fields/', self.admin_site.admin_view(self.discover_fields_view), name='data_sync_discover_fields'),
            path('<path:object_id>/db-bulk-sync/', self.admin_site.admin_view(self.db_bulk_sync_view), name='data_sync_db_bulk_sync'),
        ]
        return custom_urls + urls

    def discover_fields_view(self, request, object_id):
        """View لتشغيل الاكتشاف من الزر الفردي"""
        service = DiscoveryService()
        result = service.discover_and_map(object_id)
        
        if result.get('success'):
            messages.success(request, f'نجاح: تم اكتشاف وتعيين {result.get("mapped_fields", "عدة")} حقول تلقائياً.')
        else:
            messages.error(request, f'خطأ: {result.get("message") or result.get("error")}')
            
        return super().response_change(request, self.get_object(request, object_id))

    def db_bulk_sync_view(self, request, object_id):
        """
        تشغيل المزامنة الجماعية من Supabase/PostgreSQL في الخلفية.
        يقرأ جميع السجلات من قاعدة البيانات الخارجية ويحفظها محلياً.
        """
        import threading
        from django.http import HttpResponseRedirect
        from .services.database_service import DatabaseSyncService

        try:
            config = self.get_object(request, object_id)
            config_name = config.name
            config_id = int(object_id)

            def _run_db_sync():
                import logging
                _logger = logging.getLogger(__name__)
                try:
                    db_service = DatabaseSyncService()
                    result = db_service.sync_data(config, sync_type='manual')
                    total = result.get('total_synced', 0)
                    failed = result.get('total_failed', 0)
                    db_service.close_all_connections()
                    if result.get('success'):
                        _logger.info(
                            f"[DB-BULK-SYNC] ✅ {config_name}: "
                            f"{total} سجل مزامن، {failed} فشل"
                        )
                    else:
                        _logger.error(
                            f"[DB-BULK-SYNC] ❌ {config_name}: {result.get('error')}"
                        )
                except Exception as exc:
                    _logger.error(f"[DB-BULK-SYNC] ❌ استثناء في {config_name}: {exc}")

            t = threading.Thread(target=_run_db_sync, daemon=True, name=f"db-bulk-sync-{config_id}")
            t.start()

            messages.success(
                request,
                f"🚀 بدأت المزامنة الجماعية من «{config_name}» في الخلفية. "
                f"تابع التقدم في Sync Logs."
            )

        except Exception as e:
            messages.error(request, f"❌ خطأ أثناء بدء المزامنة: {e}")

        return HttpResponseRedirect(request.META.get('HTTP_REFERER', '/admin/'))

class APISourceForm(forms.ModelForm):
    """نموذج مخصص لإضافة API بشكل سهل"""
    AUTH_HEADER_CHOICES = [
        ('', '--- بدون مصادقة ---'),
        ('Authorization', 'Authorization (Bearer / Client-ID)'),
        ('X-API-KEY', 'X-API-KEY'),
        ('api-key', 'api-key'),
    ]
    
    # تحويل حقل 'user' إلى قائمة منسدلة في الواجهة
    user = forms.ChoiceField(
        choices=AUTH_HEADER_CHOICES,
        required=False,
        label="اسم مفتاح المصادقة (Header Key)",
        help_text="اختر نوع الهيدر الذي يطلبه الـ API"
    )

    class Meta:
        model = APISourceConfig
        fields = '__all__'
        widgets = {
            'host': forms.TextInput(attrs={'style': 'width: 80%;', 'placeholder': 'https://api.example.com/data?vin={vin}'}),
            'password': forms.PasswordInput(render_value=True, attrs={'placeholder': 'أدخل التوكن أو المفتاح السري هنا'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['host'].label = "رابط الـ API (Endpoint URL)"
        self.fields['password'].label = "قيمة التوكن / المفتاح (Token / Key)"

class APISourceForm(forms.ModelForm):
    """نموذج مطور يدعم كافة أنواع المصادقة بوضوح تام مع وجود مفتاح سري"""
    AUTH_HEADER_CHOICES = [
        ('', '--- بدون مصادقة (للمواقع العامة) ---'),
        ('Authorization', 'Authorization (Bearer / Client-ID)'),
        ('X-API-KEY', 'X-API-KEY (مفاتيح خاصة)'),
        ('api-key', 'api-key (مفتاح بسيط)'),
    ]
    
    user = forms.ChoiceField(
        choices=AUTH_HEADER_CHOICES,
        required=False,
        label="طريقة المصادقة (Auth Header)",
        help_text="كيف يطلب منك الموقع إرسال مفتاح الوصول؟"
    )

    class Meta:
        model = APISourceConfig
        fields = ['name', 'is_active', 'host', 'user', 'password', 'dbname', 'test_vin', 'seed_vins']
        widgets = {
            'host': forms.TextInput(attrs={
                'style': 'width: 100%;', 
                'placeholder': 'مثال: https://api.site.com/search?model={car_model}'
            }),
            'password': forms.PasswordInput(render_value=True, attrs={
                'placeholder': 'ألصق مفتاح الوصول (Access Key / Token) هنا'
            }),
            'dbname': forms.PasswordInput(render_value=True, attrs={
                'placeholder': 'ألصق المفتاح السري (Secret Key) هنا إذا تطلبه الموقع'
            }),
            'seed_vins': forms.Textarea(attrs={
                'rows': 4,
                'style': 'width: 100%; font-family: monospace;',
                'placeholder': 'أدخل أرقام هيكل مفصولة بفواصل أو أسطر جديدة\nمثال:\n1HGCM82633A004352\n5YJSA1E26MF123456'
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['host'].label = "رابط الوصول (Endpoint)"
        self.fields['password'].label = "كود الوصول (Token / Key)"
        self.fields['dbname'].label = "المفتاح السري (Secret Key)"

    def clean(self):
        """التحقق الذكي من الحقول بناءً على نوع المصادقة"""
        cleaned_data = super().clean()
        auth_type = cleaned_data.get('user')
        password = cleaned_data.get('password')

        # إذا اختار المستخدم نوع مصادقة ولم يضع كود الوصول
        if auth_type and not password:
            self.add_error('password', 'عفواً، لقد اخترت نوع مصادقة، لذا يجب عليك إدخال "كود الوصول" لإتمام الاتصال.')
        
        # إذا كان بدون مصادقة، نتأكد من مسح أي بيانات قديمة في الحقول السرية لضمان نظافة البيانات
        if not auth_type:
            cleaned_data['password'] = ""
            cleaned_data['dbname'] = ""

        return cleaned_data

@admin.register(APISourceConfig)
class APISourceConfigAdmin(ExternalDBConfigAdmin):
    form = APISourceForm
    list_display = ('name', 'api_url', 'is_active', 'last_sync', 'test_api_btn', 'auto_discover_btn', 'bulk_sync_btn')
    readonly_fields = ('setup_instructions', 'created_at', 'updated_at', 'last_sync')
    actions = ['action_bulk_sync']

    def bulk_sync_btn(self, obj):
        if obj.pk:
            url = reverse('admin:data_sync_bulk_sync_listings', args=[obj.pk])
            return format_html(
                '<a class="button" href="{}" style="background:#28a745;color:white;">🚗 مزامنة جماعية</a>',
                url
            )
        return '-'
    bulk_sync_btn.short_description = 'مزامنة جماعية'

    def test_api_btn(self, obj):
        """زر اختبار الـ API يدوياً"""
        if obj.pk:
            url = reverse('admin:data_sync_test_api_connection', args=[obj.pk])
            return format_html(
                '<a class="button" href="{}" style="background:#17a2b8;color:white;">🔌 اختبار API</a>',
                url
            )
        return '-'
    test_api_btn.short_description = 'اختبار الاتصال'

    def action_bulk_sync(self, request, queryset):
        import threading
        import logging
        from .tasks import bulk_sync_single_source
        _logger = logging.getLogger(__name__)

        started = 0
        for config in queryset:
            config_id   = config.id
            config_name = config.name

            def _run(cid=config_id, cname=config_name):
                try:
                    # المزامنة الذكية: هدف 50 سيارة جديدة
                    result = bulk_sync_single_source(config_id=cid, target_created=50, is_manual=True)
                    total = result.get('total', 0)
                    created = result.get('created', 0)
                    updated = result.get('updated', 0)
                    failed = result.get('failed', 0)
                    
                    success_msg = f"[BULK-SYNC] ✅ {cname}: تم فحص {total} سجل ({created} جديدة مضافة، {updated} محدّثة)"
                    if failed > 0:
                        success_msg += f" | {failed} فشلت"
                    _logger.info(success_msg)
                except Exception as exc:
                    _logger.error(f"[BULK-SYNC] ❌ {cname}: {exc}")

            threading.Thread(target=_run, daemon=True, name=f"bulk-sync-{config_id}").start()
            started += 1

        self.message_user(
            request,
            f"🚀 بدأت المزامنة لـ {started} مصدر في الخلفية (الهدف: إضافة 50 سيارة جديدة لكل مصدر). راجع سجلات الخادم (Sync Logs) للنتائج.",
        )
    action_bulk_sync.short_description = "🚗 إضافة 50 سيارة جديدة لكل مصدر"

    def get_urls(self):
        from django.urls import path
        urls = super(ExternalDBConfigAdmin, self).get_urls()
        custom_urls = [
            path('<path:object_id>/discover-fields/', self.admin_site.admin_view(self.discover_fields_view), name='data_sync_discover_fields'),
            path('<path:object_id>/bulk-sync/', self.admin_site.admin_view(self.bulk_sync_view), name='data_sync_bulk_sync_listings'),
            path('<path:object_id>/test-api/', self.admin_site.admin_view(self.test_api_view), name='data_sync_test_api_connection'),
        ]
        return custom_urls + urls

    def test_api_view(self, request, object_id):
        """اختبار الاتصال بالـ API يدوياً"""
        try:
            config = self.get_object(request, object_id)
            result = self._test_connection(config, 'api')
            if result['success']:
                messages.success(request, f"✅ {result['message']}")
            else:
                messages.error(request, f"❌ {result['message']}")
        except Exception as e:
            messages.error(request, f"❌ خطأ: {e}")
        from django.http import HttpResponseRedirect
        return HttpResponseRedirect(request.META.get('HTTP_REFERER', '/admin/'))

    def bulk_sync_view(self, request, object_id):
        """
        تشغيل المزامنة الجماعية في الخلفية وإرجاع الرد فوراً.
        المزامنة تعمل في Thread منفصل حتى لا يتجمد المتصفح.
        حد أقصى: 50 سيارة (الأقدم تحديثاً أولاً)
        """
        import threading
        from .tasks import bulk_sync_single_source
        from django.http import HttpResponseRedirect

        try:
            config = self.get_object(request, object_id)
            config_name = config.name
            config_id   = int(object_id)

            def _run_sync():
                """تشغيل المزامنة في خلفية بعيداً عن request/response cycle"""
                import logging
                _logger = logging.getLogger(__name__)
                try:
                    # المزامنة الذكية: هدف 50 سيارة جديدة
                    result = bulk_sync_single_source(config_id=config_id, target_created=50, is_manual=True)
                    total   = result.get('total', 0)
                    created = result.get('created', 0)
                    updated = result.get('updated', 0)
                    failed  = result.get('failed', 0)
                    
                    if result.get('success'):
                        success_msg = (
                            f"[BULK-SYNC] ✅ {config_name}: "
                            f"تم فحص {total} سجل ({created} جديدة مضافة، {updated} محدّثة)"
                        )
                        if failed > 0:
                            success_msg += f" | {failed} فشلت"
                        _logger.info(success_msg)
                    else:
                        _logger.error(
                            f"[BULK-SYNC] ❌ {config_name} فشلت: {result.get('error')}"
                        )
                except Exception as exc:
                    _logger.error(f"[BULK-SYNC] ❌ استثناء في {config_name}: {exc}")

            # تشغيل في thread خلفي (daemon حتى لا يوقف السيرفر)
            t = threading.Thread(target=_run_sync, daemon=True, name=f"bulk-sync-{config_id}")
            t.start()

            messages.success(
                request,
                f"🚀 بدأت المزامنة الجماعية لـ «{config_name}» في الخلفية. الهدف: الاستمرار حتى إضافة 50 سيارة جديدة. "
                f"تابع التقدم في سجلات الخادم (Sync Logs)."
            )

        except Exception as e:
            messages.error(request, f"❌ خطأ أثناء بدء المزامنة: {e}")

        return HttpResponseRedirect(request.META.get('HTTP_REFERER', '/admin/'))
    
    fieldsets = (
        ('دليل الإعداد السريع', {
            'fields': ('setup_instructions',),
        }),
        ('بيانات الاتصال', {
            'fields': ('name', 'is_active', 'host', 'test_vin'),
            'description': 'استخدم {vin} لرقم الشاصي، {make} للشركة، {model} للموديل، أو {year} للسنة.'
        }),
        ('إعدادات الدخول الصارم (Security)', {
            'fields': ('user', 'password', 'dbname'),
            'description': 'أدخل بيانات المصادقة التي حصلت عليها من الموقع المزود للخدمة.'
        }),
        ('معلومات إضافية', {
            'fields': ('created_at', 'updated_at', 'last_sync'),
        })
    )

    def api_url(self, obj):
        return obj.host
    api_url.short_description = 'رابط الـ API'

    def get_queryset(self, request):
        return admin.ModelAdmin.get_queryset(self, request).filter(name__startswith='API:')

    def save_model(self, request, obj, form, change):
        if not obj.name.upper().startswith('API:'):
            obj.name = f"API: {obj.name}"
        super().save_model(request, obj, form, change)

    def setup_instructions(self, obj):
        return mark_safe(
            '<div style="background: #e7f3ff; padding: 15px; border-left: 5px solid #2196f3; color: #000;">'
            '<strong>دليل الربط العالمي:</strong><br>'
            '1. استخدم <code>{vin}</code> للبحث المباشر عن معلومات السيارة برقم الهيكل.<br>'
            '2. استخدم <code>{make}</code> و <code>{model}</code> و <code>{year}</code> للبحث في قواعد البيانات التي تتطلب تفاصيل الموديل.<br>'
            '3. مثال للرابط: <code>https://api.site.com/data?year={year}&make={make}&model={model}</code><br>'
            '4. تأكد من ضبط "تعيين الحقول" (Data Mapping) لربط نتائج الـ API بحقول الموقع.'
            '</div>'
        )
    setup_instructions.short_description = 'دليل الإعداد'



@admin.register(SyncLog)
class SyncLogAdmin(admin.ModelAdmin):
    list_display = ('data_source', 'sync_type', 'status', 'records_processed', 'success_rate_display', 'duration_formatted', 'started_at')
    list_filter = ('status', 'sync_type', 'data_source', 'started_at')
    search_fields = ('data_source', 'error_message')
    readonly_fields = ('started_at', 'completed_at', 'duration_seconds', 'success_rate_display', 'duration_formatted')
    fieldsets = (
        ('معلومات المزامنة', {
            'fields': ('data_source', 'sync_type', 'status')
        }),
        ('الإحصائيات', {
            'fields': ('records_processed', 'records_updated', 'records_failed', 'records_created', 'success_rate_display')
        }),
        ('الوقت', {
            'fields': ('started_at', 'completed_at', 'duration_seconds', 'duration_formatted')
        }),
        ('النتائج', {
            'fields': ('metadata', 'error_message'),
        })
    )
    
    def data_source(self, obj):
        """عرض مصدر البيانات"""
        if obj.db_config:
            return format_html(
                '<a href="{}">DB: {}</a>',
                reverse('admin:data_sync_externaldbconfig_change', args=[obj.db_config.pk]),
                obj.db_config.name
            )
        return '-'
    
    data_source.short_description = 'مصدر البيانات'
    
    def success_rate_display(self, obj):
        """عرض نسبة النجاح"""
        rate = float(obj.success_rate)
        if rate >= 90:
            color = 'green'
        elif rate >= 70:
            color = 'orange'
        else:
            color = 'red'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}%</span>',
            color, format(rate, ".1f")
        )
    success_rate_display.short_description = 'نسبة النجاح'
    
    def get_queryset(self, request):
        """إخفاء سجلات المزامنة الجماعية بناءً على طلب المستخدم"""
        qs = super().get_queryset(request)
        return qs.exclude(data_source__icontains='[bulk-listings]')

    def duration_formatted(self, obj):
        """عرض المدة المنسقة"""
        return obj.duration_formatted
    duration_formatted.short_description = 'المدة'




# ─── حقول نماذج Django المحلية المعروفة ──────────────────────────────────────
LOCAL_FIELD_CHOICES = [
    ('', '--- اختر حقل السيارة ---'),
    # بيانات أساسية
    ('make',          'الشركة المصنعة (make)'),
    ('model',         'الموديل (model)'),
    ('year',          'سنة الصنع (year)'),
    ('color',         'اللون (color)'),
    ('mileage',       'عداد الكيلومترات (mileage)'),
    # المحرك والأداء
    ('fuel_type',     'نوع الوقود (fuel_type)'),
    ('num_cylinders', 'عدد الاسطوانات (num_cylinders)'),
    ('drive_type',    'نظام الدفع (drive_type)'),
    ('body_style',    'شكل الهيكل (body_style)'),
    ('transmission',  'ناقل الحركة (transmission)'),
    # أخرى
    ('name_car',      'اسم السيارة الكامل (name_car)'),
    ('gear_type',     'نوع الجير (gear_type)'),
    ('engine_capacity','سعة المحرك cc (engine_capacity)'),
    # صور (مصفوفات JSON)
    ('images',        'صور السيارة (images) - مصفوفة روابط'),
    ('accident_images', 'صور الحوادث (accident_images) - مصفوفة روابط'),
    # بيانات الورش
    ('mech_insp_desc', 'وصف الفحص الميكانيكي (mech_insp_desc)'),
    ('comp_scan_desc', 'وصف فحص الكمبيوتر (comp_scan_desc)'),
]

# ─── Inline: صف واحد لكل زوج (حقل API → حقل محلي) ───────────────────────────
class FieldMappingRowForm(forms.Form):
    """نموذج صف واحد: مسار حقل من الـ API → حقل في قاعدة البيانات المحلية"""
    api_field = forms.CharField(
        label='مسار حقل الـ API',
        required=False,
        widget=forms.TextInput(attrs={
            'placeholder': 'مثال: make  أو  specs.displacement_l',
            'style': 'width:280px; direction:ltr;',
        }),
        help_text='اكتب مسار الحقل كما يأتي في استجابة الـ API، يمكنك استخدام النقطة للحقول المتداخلة.'
    )
    local_field = forms.ChoiceField(
        label='حقل السيارة المحلي',
        choices=LOCAL_FIELD_CHOICES,
        required=False,
        widget=forms.Select(attrs={'style': 'width:280px;'}),
    )


class BaseFieldMappingFormSet(forms.BaseFormSet):
    pass


FieldMappingFormSet = forms.formset_factory(
    FieldMappingRowForm,
    formset=BaseFieldMappingFormSet,
    extra=1,
    max_num=30,
    can_delete=True,
)


class DataMappingForm(forms.ModelForm):
    """نموذج DataMapping مبسط باستخدام واجهة JSON الأصلية"""

    local_app = forms.ChoiceField(
        label='التطبيق المحلي',
        choices=[('cars', 'cars'), ('data_sync', 'data_sync'), ('accounts', 'accounts')],
        required=True,
        widget=forms.Select(attrs={'style': 'width:300px;'}),
    )

    local_model = forms.ChoiceField(
        label='النموذج المحلي (Model)',
        choices=[
            ('Cars', 'Cars - بيانات السيارة'),
            ('Reports', 'Reports - تقارير السيارة'),
        ],
        required=True,
        widget=forms.Select(attrs={'style': 'width:300px;'}),
    )

    class Meta:
        model = DataMapping
        fields = [
            'db_config', 'external_table', 'local_app', 'local_model',
            'sync_strategy', 'is_active', 'confidence_score', 'is_auto_discovered',
            'field_mappings',
        ]
        widgets = {
            'external_table': forms.TextInput(attrs={
                'placeholder': 'مثال: vin_endpoint  أو  listings',
                'style': 'width:300px;',
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # تحميل خيارات مصادر البيانات من قاعدة البيانات
        try:
            api_configs = ExternalDBConfig.objects.filter(
                is_active=True, name__startswith='API:'
            )
            db_choices = [('', '--- اختر مصدر البيانات ---')] + [
                (c.pk, f"{c.name}  ({c.host[:60]}…)" if len(c.host) > 60 else f"{c.name}  ({c.host})")
                for c in api_configs
            ]
            self.fields['db_config'].widget = forms.Select(
                attrs={'style': 'width:400px;'},
                choices=db_choices,
            )
            self.fields['db_config'].label = 'مصدر بيانات الـ API'
        except Exception:
            pass

        # إذا كان الحقل فارغاً وقيمته الافتراضية قائمة نعيده إلى قاموس ليسهل كتابة التعيينات
        if not self.instance.pk or not self.instance.field_mappings:
            self.initial['field_mappings'] = {
                "make": "Results.0.Make",
                "model": "Results.0.Model",
                "year": "Results.0.ModelYear",
                "fuel_type": "Results.0.FuelTypePrimary",
                "num_cylinders": "Results.0.EngineCylinders",
                "trim": "Results.0.Trim",
            }

@admin.register(DataMapping)
class DataMappingAdmin(admin.ModelAdmin):
    form = DataMappingForm
    list_display = (
        'data_source_name', 'external_table', 'local_model',
        'mapped_fields_count', 'sync_strategy', 'confidence_score',
        'is_active', 'is_auto_discovered',
    )
    actions = ['run_global_vin_sync', 'run_bulk_listings_sync']

    def run_bulk_listings_sync(self, request, queryset):
        """جلب سيارات بالجملة — كل مصدر يزامن نفسه"""
        from .tasks import bulk_sync_single_source
        total_processed = 0
        total_created = 0
        # جلب كل مصادر API النشطة
        from .models import ExternalDBConfig
        api_configs = ExternalDBConfig.objects.filter(is_active=True, name__istartswith='API:')
        for config in api_configs:
            # المزامنة الذكية: هدف 50 سيارة جديدة لكل مصدر
            result = bulk_sync_single_source(config_id=config.id, target_created=50, is_manual=True)
            total_processed += result.get('total', 0)
            total_created += result.get('created', 0)
        self.message_user(
            request,
            f"✅ تمت المزامنة بنجاح: تم فحص {total_processed} سجل وإضافة {total_created} سيارة جديدة من {api_configs.count()} مصادر.",
            level='success',
        )
    run_bulk_listings_sync.short_description = "🚗 إضافة 50 سيارة جديدة (لكل مصدر)"
    readonly_fields = ('mapping_id', 'data_source_name', 'created_at', 'updated_at', 'last_sync', 'mapping_examples')

    def get_readonly_fields(self, request, obj=None):
        return self.readonly_fields

    def mapping_examples(self, obj):
        return mark_safe(
            '<div style="background:#f0f7ff;padding:14px;border-left:4px solid #2196f3;font-size:13px;">'
            '<strong>أمثلة جاهزة للـ field_mappings:</strong><br><br>'
            '<b>NHTSA API (nested JSON):</b><br>'
            '<code style="direction:ltr;display:block;background:#fff;padding:8px;margin:4px 0;">'
            '{"make": "Results.0.Make", "model": "Results.0.Model", "year": "Results.0.ModelYear",'
            ' "fuel_type": "Results.0.FuelTypePrimary",'
            ' "num_cylinders": "Results.0.EngineCylinders", "trim": "Results.0.Trim"}'
            '</code>'
            '<b>VIN Decoder API (flat JSON):</b><br>'
            '<code style="direction:ltr;display:block;background:#fff;padding:8px;margin:4px 0;">'
            '{"make": "make", "model": "model", "year": "year", "fuel_type": "fuel_type", "mileage": "odometer", "color": "color"}'
            '</code>'
            '<b>Custom API (mixed):</b><br>'
            '<code style="direction:ltr;display:block;background:#fff;padding:8px;margin:4px 0;">'
            '{"make": "vehicle.brand", "model": "vehicle.model_name", "year": "vehicle.production_year"}'
            '</code>'
            '</div>'
        )
    mapping_examples.short_description = 'أمثلة جاهزة'

    def run_global_vin_sync(self, request, queryset):
        """بدء عملية مزامنة شاملة لجميع الـ VINs من المصادر الرسمية"""
        from .tasks import auto_sync_all
        # تشغيل المهمة بشكل فوري (بسبب EAGER mode أو في الخلفية)
        result = auto_sync_all.delay() if hasattr(auto_sync_all, 'delay') else auto_sync_all()
        
        self.message_user(
            request, 
            "تم بدء عملية المزامنة الشاملة لجميع السيارات من المصادر الرسمية (APIs). "
            "يمكنك متابعة التقدم في سجلات النظام.",
            level='success'
        )
    run_global_vin_sync.short_description = "🚀 تشغيل مزامنة شاملة من المصادر الرسمية"
    list_filter = ('is_active', 'sync_strategy', 'is_auto_discovered')
    search_fields = ('external_table', 'local_model', 'data_source_name')

    fieldsets = (
        ('أمثلة جاهزة للـ Mapping', {
            'fields': ('mapping_examples',),
        }),
        ('ربط المصدر بالنموذج المحلي', {
            'fields': ('db_config', 'external_table', 'local_app', 'local_model'),
            'description': 'اختر مصدر الـ API والجدول الذي سيُعيَّن إلى نموذج Django محدد.'
        }),
        ('إعدادات المزامنة', {
            'fields': ('sync_strategy', 'is_active', 'confidence_score', 'is_auto_discovered'),
        }),
        ('تعيين الحقول 🔗', {
            'fields': ('field_mappings',),
            'description': (
                'أدخل التعيينات بصيغة JSON. '
                'الجهة اليسرى: الحقل المحلي، الجهة اليمنى: مسار الحقل في استجابة الـ API.<br>'
                '<strong>صيغة مسطحة:</strong> {"make": "brand_name", "model": "model_name", "year": "year"}<br>'
                '<strong>صيغة متداخلة (nested):</strong> {"make": "Results.0.Make", "model": "Results.0.Model", "year": "Results.0.ModelYear"}<br>'
                '<strong>الحقول المدعومة:</strong> make, model, year, color, mileage, fuel_type, gear_type, engine_capacity, num_cylinders, trim, engine, images, accident_images, mech_insp_desc, comp_scan_desc'
            ),
        }),
        ('معلومات النظام', {
            'fields': ('mapping_id', 'data_source_name', 'created_at', 'updated_at', 'last_sync'),
        }),
    )

    # ─── عرض عدد الحقول المعيَّنة في قائمة السجلات ──────────────────────────
    def mapped_fields_count(self, obj):
        count = len(obj.field_mappings) if isinstance(obj.field_mappings, dict) else 0
        color = '#28a745' if count > 0 else '#dc3545'
        return format_html(
            '<span style="color:{};font-weight:bold;">{} حقل</span>', color, count
        )
    mapped_fields_count.short_description = 'الحقول المعيَّنة'

    def confidence_indicator(self, obj):
        confidence = obj.confidence_score
        if confidence >= 0.8:
            color, text = '#28a745', 'عالي'
        elif confidence >= 0.6:
            color, text = '#ffc107', 'متوسط'
        else:
            color, text = '#dc3545', 'منخفض'
        return format_html(
            '<span style="color:{};font-weight:bold;">{} ({:.2f})</span>',
            color, text, confidence
        )
    confidence_indicator.short_description = 'مستوى الثقة'


# ─── إنشاء ملف CSS لتنسيق واجهة التعيينات ───────────────────────────────────
import os
from django.conf import settings as django_settings

_css_dir = os.path.join(django_settings.BASE_DIR, 'static', 'admin', 'css')
_css_file = os.path.join(_css_dir, 'mapping_inline.css')

if not os.path.exists(_css_dir):
    os.makedirs(_css_dir, exist_ok=True)

if not os.path.exists(_css_file):
    with open(_css_file, 'w', encoding='utf-8') as _f:
        _f.write("""
/* ─── تنسيق جدول تعيين الحقول ─── */
.field-mapping-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
.field-mapping-table th {
    background: #417690; color: #fff;
    padding: 8px 12px; text-align: right; font-size: 13px;
}
.field-mapping-table td { padding: 6px 8px; border-bottom: 1px solid #e0e0e0; }
.field-mapping-table tr:hover td { background: #f9f9f9; }
.field-mapping-table input[type=text] {
    width: 100%; border: 1px solid #ccc; padding: 5px 8px;
    border-radius: 4px; font-family: monospace; direction: ltr;
}
.field-mapping-table select {
    width: 100%; border: 1px solid #ccc; padding: 5px 8px;
    border-radius: 4px;
}
.field-mapping-table input[type=checkbox] { margin: auto; }
.add-mapping-row-btn {
    margin-top: 8px; padding: 6px 16px;
    background: #28a745; color: #fff; border: none;
    border-radius: 4px; cursor: pointer; font-size: 13px;
}
.add-mapping-row-btn:hover { background: #218838; }
""")


# ─── تخصيص واجهة الإدارة ───────────────────────────────────────────────────
admin.site.site_header = "لوحة تحكم Car History"
admin.site.site_title  = "Car History Admin"
admin.site.index_title = "مرحباً بك في لوحة إدارة Car History"
