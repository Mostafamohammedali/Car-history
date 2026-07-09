from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth import get_user_model
import json
import logging

logger = logging.getLogger(__name__)
CustomUser = get_user_model()


class ExternalDBConfig(models.Model):
    """إعدادات قاعدة البيانات الخارجية"""
    name = models.CharField(max_length=200, verbose_name="اسم المصدر")
    host = models.CharField(max_length=255, verbose_name="العنوان (Host)")
    port = models.PositiveIntegerField(default=5432, verbose_name="المنفذ (Port)")
    dbname = models.CharField(max_length=255, null=True, blank=True, verbose_name="اسم قاعدة البيانات (Database Name)")
    user = models.CharField(max_length=255, null=True, blank=True, verbose_name="اسم المستخدم (User)")
    password = models.CharField(max_length=255, null=True, blank=True, verbose_name="كلمة المرور (Password)")
    is_active = models.BooleanField(default=True, verbose_name="نشط")
    sync_interval_minutes = models.PositiveIntegerField(
        default=1440,  # 24 hours
        editable=False,
        help_text='فترة المزامنة التلقائية (24 ساعة)',
        verbose_name='فترة المزامنة (دقائق)'
    )
    last_sync = models.DateTimeField(null=True, blank=True, verbose_name="آخر مزامنة")
    connection_timeout = models.IntegerField(default=30, verbose_name="مهلة الاتصال (ثانية)")
    max_connections = models.IntegerField(default=10, verbose_name="الحد الأقصى للاتصالات")
    quick_schedule = models.CharField(
        max_length=20,
        choices=[
            ('24hours', 'كل 24 ساعة')
        ],
        default='24hours',
        editable=False,
        verbose_name='جدولة تلقائية',
        help_text='مزامنة تلقائية كل 24 ساعة'
    )
    sync_interval_type = models.CharField(
        max_length=20,
        choices=[
            ('minutes', 'دقائق')
        ],
        default='minutes',
        editable=False,
        verbose_name='نوع الفترة'
    )
    ssl_mode = models.CharField(
        max_length=20,
        choices=[
            ('disable', 'معطل'),
            ('require', 'مطلوب'),
            ('prefer', 'مفضل'),
            ('verify-ca', 'تحقق من CA'),
            ('verify-full', 'تحقق كامل')
        ],
        default='prefer',
        verbose_name='وضع SSL'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    test_vin = models.CharField(
        max_length=17, 
        null=True, 
        blank=True, 
        verbose_name="رقم هيكل تجريبي (Test VIN)",
        help_text="رقم هيكل صالح لاستخدامه في الاكتشاف التلقائي للحقول"
    )
    seed_vins = models.TextField(
        null=True,
        blank=True,
        verbose_name="أرقام هيكل أولية (Seed VINs)",
        help_text="أرقام هيكل مفصولة بفواصل أو أسطر جديدة. تُستخدم كبداية لمصادر API التي تتطلب VIN محدد (تحتوي على {vin}) عند عدم وجود بيانات محلية."
    )
    created_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_db_configs',
        verbose_name='أنشأ بواسطة'
    )

    class Meta:
        verbose_name = "إعداد قاعدة بيانات خارجية"
        verbose_name_plural = "إعدادات قواعد البيانات الخارجية"
        db_table = 'ExternalDBConfigs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_active']),
            models.Index(fields=['last_sync']),
        ]

    def __str__(self):
        return self.name

    def get_seed_vins_list(self):
        """تحليل حقل seed_vins وإرجاع قائمة بأرقام الهيكل"""
        if not self.seed_vins:
            return []
        import re
        vins = re.split(r'[\n,;]+', self.seed_vins.strip())
        return [v.strip().upper() for v in vins if v.strip() and len(v.strip()) == 17]
    
    def test_connection(self):
        """اختبار الاتصال بقاعدة البيانات"""
        try:
            import psycopg2
            conn = psycopg2.connect(
                host=self.host,
                port=self.port,
                dbname=self.dbname,
                user=self.user,
                password=self.password,
                sslmode=self.ssl_mode,
                connect_timeout=self.connection_timeout
            )
            conn.close()
            return True, "اتصال ناجح"
        except Exception as e:
            logger.error(f"Connection test failed: {str(e)}")
            return False, str(e)
    
    def get_connection_string(self):
        """الحصول على سلسلة الاتصال"""
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.dbname}"
    
    def get_sync_interval_seconds(self):
        """Get sync interval in seconds (24 hours)"""
        return self.sync_interval_minutes * 60
    
    @property
    def is_sync_due(self):
        """التحقق مما إذا كانت المزامنة مستحقة"""
        if not self.last_sync:
            return True
        
        time_since_sync = timezone.now() - self.last_sync
        return time_since_sync.total_seconds() >= self.get_sync_interval_seconds()
    
    def get_next_sync_time(self):
        """الحصول على وقت المزامنة التالي"""
        if not self.last_sync:
            return timezone.now()
        return self.last_sync + timezone.timedelta(seconds=self.get_sync_interval_seconds())


class APISourceConfig(ExternalDBConfig):
    """Proxy model for Official API configurations"""
    class Meta:
        proxy = True
        verbose_name = "إعداد الاتصال بـ API رسمي"
        verbose_name_plural = "إعدادات الاتصال بـ APIs الرسمية"



class SyncLog(models.Model):
    """سجل المزامنة"""
    STATUS_CHOICES = [
        ('pending', 'قيد الانتظار'),
        ('in_progress', 'قيد التنفيذ'),
        ('completed', 'مكتمل'),
        ('failed', 'فشل'),
        ('cancelled', 'ملغي'),
    ]

    SYNC_TYPE_CHOICES = [
        ('full', 'كامل'),
        ('incremental', 'تزايدي'),
        ('manual', 'يدوي'),
        ('scheduled', 'مجدول'),
        ('auto_discovery', 'اكتشاف تلقائي'),
    ]

    db_config = models.ForeignKey(
        ExternalDBConfig,
        on_delete=models.CASCADE,
        verbose_name="إعداد قاعدة بيانات",
        related_name='sync_logs_db',
        null=True,
        blank=True
    )
    
    # حقول عامة للمزامنة
    data_source = models.CharField(
        max_length=255,
        verbose_name="مصدر البيانات",
        help_text="اسم مصدر البيانات للسجل",
        default="unknown"
    )
    sync_type = models.CharField(
        max_length=20,
        choices=SYNC_TYPE_CHOICES,
        default='full',
        verbose_name="نوع المزامنة"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="الحالة"
    )
    
    # إحصائيات المزامنة
    records_processed = models.PositiveIntegerField(default=0, verbose_name="عدد السجلات المعالجة")
    records_updated = models.PositiveIntegerField(default=0, verbose_name="السجلات المحدثة")
    records_failed = models.PositiveIntegerField(default=0, verbose_name="السجلات الفاشلة")
    records_created = models.PositiveIntegerField(default=0, verbose_name="السجلات الجديدة")
    
    # معلومات إضافية
    error_message = models.TextField(blank=True, null=True, verbose_name="رسالة الخطأ")
    metadata = models.JSONField(
        default=dict, 
        blank=True, 
        verbose_name="بيانات وصفية",
        help_text="معلومات إضافية عن المزامنة مثل الجداول والتعيينات"
    )
    
    # معلومات التوقيت
    duration_seconds = models.IntegerField(blank=True, null=True, verbose_name="المدة بالثواني")
    started_at = models.DateTimeField(auto_now_add=True, verbose_name="وقت البداية")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="وقت الانتهاء")
    
    # معلومات التشغيل
    triggered_by = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='triggered_syncs',
        verbose_name='أطلق بواسطة'
    )

    class Meta:
        verbose_name = "سجل المزامنة"
        verbose_name_plural = "سجلات المزامنة"
        db_table = 'SyncLogs'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['db_config', 'started_at']),
            models.Index(fields=['status']),
            models.Index(fields=['sync_type']),
            models.Index(fields=['data_source']),
            models.Index(fields=['started_at']),
        ]
    
    def __str__(self):
        return f"{self.data_source} - {self.get_status_display()}"

    @property
    def config(self):
        """الحصول على إعداد المزامنة (للتوافق مع الكود القديم)"""
        return self.db_config
    
    @property
    def config_name(self):
        """الحصول على اسم الإعداد"""
        if self.db_config:
            return self.db_config.name
        return self.data_source
    
    @property
    def config_type(self):
        """الحصول على نوع الإعداد"""
        if self.db_config:
            return "Database"
        return "غير محدد"
    
    @property
    def success_rate(self):
        """حساب نسبة النجاح"""
        total = self.records_processed
        if total == 0:
            return 0
        successful = total - self.records_failed
        return (successful / total) * 100
    
    @property
    def duration_formatted(self):
        """عرض المدة بشكل منسق"""
        if not self.duration_seconds:
            return "N/A"
        hours = self.duration_seconds // 3600
        minutes = (self.duration_seconds % 3600) // 60
        seconds = self.duration_seconds % 60
        
        if hours > 0:
            return f"{hours}س {minutes}د {seconds}ث"
        elif minutes > 0:
            return f"{minutes}د {seconds}ث"
        else:
            return f"{seconds}ث"
    
    def get_summary_stats(self):
        """الحصول على ملخص إحصائيات المزامنة"""
        return {
            'total_records': self.records_processed,
            'created': self.records_created,
            'updated': self.records_updated,
            'failed': self.records_failed,
            'success_rate': self.success_rate,
            'duration': self.duration_formatted,
            'status': self.get_status_display(),
            'sync_type': self.get_sync_type_display()
        }
    
    def get_discovery_summary(self):
        """الحصول على ملخص الاكتشاف التلقائي"""
        if self.sync_type != 'auto_discovery' or not self.metadata:
            return None
        
        discovery = self.metadata.get('discovery', {})
        sync_results = self.metadata.get('sync_results', [])
        
        return {
            'tables_discovered': discovery.get('tables_discovered', 0),
            'mappings_created': len(discovery.get('mappings', [])),
            'database_type': discovery.get('database_type', 'غير محدد'),
            'successful_tables': sum(1 for result in sync_results if result.get('status') == 'success'),
            'failed_tables': sum(1 for result in sync_results if result.get('status') == 'failed'),
        }
    
    def mark_as_completed(self, records_processed=None, records_updated=None, records_failed=None, error_message=None):
        """تحديث حالة المزامنة كمكتملة"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        
        if records_processed is not None:
            self.records_processed = records_processed
        if records_updated is not None:
            self.records_updated = records_updated
        if records_failed is not None:
            self.records_failed = records_failed
        if error_message:
            self.error_message = error_message
            self.status = 'failed'
        
        if self.started_at:
            self.duration_seconds = int((self.completed_at - self.started_at).total_seconds())
        
        self.save()
    
    def mark_as_failed(self, error_message, error_details=None):
        """تحديث حالة المزامنة كفاشلة"""
        self.status = 'failed'
        self.completed_at = timezone.now()
        self.error_message = error_message
        
        if error_details:
            if isinstance(self.metadata, dict):
                self.metadata['error_details'] = error_details if isinstance(error_details, dict) else {'error': str(error_details)}
            else:
                self.metadata = {'error_details': error_details if isinstance(error_details, dict) else {'error': str(error_details)}}
        
        if self.started_at:
            self.duration_seconds = int((self.completed_at - self.started_at).total_seconds())
        
        self.save()


class DataMapping(models.Model):
    """تعيين بيانات المزامنة"""
    mapping_id = models.AutoField(primary_key=True)
    
    # دعم جميع أنواع مصادر البيانات
    db_config = models.ForeignKey(
        ExternalDBConfig,
        on_delete=models.CASCADE,
        related_name='db_data_mappings',
        verbose_name='إعداد قاعدة بيانات',
        null=True,
        blank=True
    )
    
    # حقول الاكتشاف التلقائي
    external_table = models.CharField(
        max_length=255, 
        verbose_name='الجدول الخارجي',
        null=True,
        blank=True,
        help_text='اسم الجدول في قاعدة البيانات الخارجية'
    )
    local_model = models.CharField(
        max_length=100, 
        verbose_name='النموذج المحلي',
        null=True,
        blank=True,
        help_text='اسم النموذج في Django'
    )
    local_app = models.CharField(
        max_length=50,
        verbose_name='التطبيق المحلي',
        null=True,
        blank=True,
        help_text='اسم التطبيق في Django'
    )
    
    # تعيينات الحقول التلقائية
    field_mappings = models.JSONField(
        default=list,
        blank=True,
        verbose_name='تعيينات الحقول',
        help_text='قائمة تعيينات الحقول بين الجدول الخارجي والنموذج المحلي'
    )
    
    # استراتيجية المزامنة
    sync_strategy = models.CharField(
        max_length=20,
        choices=[
            ('full_sync', 'مزامنة كاملة'),
            ('batch_sync', 'مزامنة دفعية'),
            ('incremental_sync', 'مزامنة تزايدية'),
            ('create_new', 'إنشاء نموذج جديد'),
        ],
        default='full_sync',
        verbose_name='استراتيجية المزامنة'
    )
    
    # حقول التقييم والثقة
    confidence_score = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        verbose_name='درجة الثقة',
        help_text='درجة الثقة في التعيين (0.0 - 1.0)'
    )
    is_auto_discovered = models.BooleanField(
        default=False,
        verbose_name='مكتشف تلقائياً',
        help_text='هل تم اكتشاف هذا التعيين تلقائياً'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='نشط'
    )
    
    # الحقول القديمة للتوافق
    source_field = models.CharField(
        max_length=255, 
        verbose_name='الحقل المصدر',
        null=True,
        blank=True
    )
    target_field = models.CharField(
        max_length=255, 
        verbose_name='الحقل الهدف',
        null=True,
        blank=True
    )
    target_model = models.CharField(
        max_length=100, 
        verbose_name='النموذج الهدف',
        null=True,
        blank=True
    )
    field_type = models.CharField(
        max_length=20,
        choices=[
            ('string', 'نص'),
            ('integer', 'رقم صحيح'),
            ('float', 'رقم عشري'),
            ('boolean', 'منطقي'),
            ('date', 'تاريخ'),
            ('datetime', 'تاريخ ووقت'),
            ('json', 'JSON'),
            ('foreign_key', 'مفتاح خارجي'),
            ('binary', 'بيانات ثنائية'),
            ('image', 'صورة')
        ],
        default='string',
        verbose_name='نوع الحقل',
        null=True,
        blank=True
    )
    is_required = models.BooleanField(
        default=False, 
        verbose_name='مطلوب'
    )
    default_value = models.TextField(
        blank=True, 
        null=True, 
        verbose_name='القيمة الافتراضية'
    )
    transformation_rule = models.TextField(
        blank=True, 
        null=True, 
        verbose_name='قاعدة التحويل'
    )
    validation_rule = models.TextField(
        blank=True, 
        null=True, 
        verbose_name='قاعدة التحقق'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_sync = models.DateTimeField(
        null=True, 
        blank=True, 
        verbose_name='آخر مزامنة'
    )
    
    class Meta:
        db_table = 'DataMappings'
        verbose_name = 'تعيين بيانات'
        verbose_name_plural = 'تعيينات البيانات'
        ordering = ['-confidence_score', 'external_table', 'local_model']
        indexes = [
            models.Index(fields=['db_config', 'is_active']),
            models.Index(fields=['external_table']),
            models.Index(fields=['local_model']),
            models.Index(fields=['confidence_score']),
            models.Index(fields=['is_auto_discovered']),
        ]
    
    def __str__(self):
        if self.external_table and self.local_model:
            return f"{self.external_table} -> {self.local_app}.{self.local_model}"
        elif self.source_field and self.target_field:
            return f"{self.source_field} -> {self.target_field}"
        else:
            return f"Mapping #{self.mapping_id}"
    
    @property
    def data_source(self):
        """الحصول على مصدر البيانات (Database)"""
        return self.db_config
    
    @property
    def data_source_name(self):
        """الحصول على اسم مصدر البيانات"""
        if self.db_config:
            return self.db_config.name
        return "غير محدد"
    
    @property
    def data_source_type(self):
        """Get data source type"""
        if self.db_config:
            return "Database"
        return "Unspecified"
    
    def get_field_mapping_summary(self):
        """الحصول على ملخص تعيينات الحقول"""
        if not self.field_mappings:
            return "لا توجد تعيينات"
        
        mapped = sum(1 for mapping in self.field_mappings if mapping.get('local_field'))
        total = len(self.field_mappings)
        
        return f"{mapped}/{total} حقول معينة"
    
    def is_mapping_complete(self):
        """التحقق إذا كان التعيين كاملاً"""
        if not self.field_mappings:
            return False
        
        # تحقق من أن جميع الحقول المهمة معينة
        important_fields = ['id', 'name', 'title', 'created_at', 'updated_at']
        mapped_fields = [mapping.get('local_field') for mapping in self.field_mappings if mapping.get('local_field')]
        
        return any(field in mapped_fields for field in important_fields)
    
    def transform_value(self, value):
        """تطبيق قاعدة التحويل على القيمة"""
        if not self.transformation_rule or not value:
            return value
        
        try:
            # تطبيق قواعد التحويل البسيطة
            rule = self.transformation_rule.lower()
            
            if 'upper' in rule:
                value = str(value).upper()
            elif 'lower' in rule:
                value = str(value).lower()
            elif 'strip' in rule:
                value = str(value).strip()
            elif 'title' in rule:
                value = str(value).title()
            
            # تحويلات رقمية
            if self.field_type in ['integer', 'float']:
                try:
                    if self.field_type == 'integer':
                        value = int(float(value))
                    else:
                        value = float(value)
                except (ValueError, TypeError):
                    value = self.default_value
            
            return value
        except Exception as e:
            logger.error(f"Transformation failed: {str(e)}")
            return self.default_value
    
    def validate_value(self, value):
        """التحقق من صحة القيمة"""
        if not self.validation_rule:
            return True, None
        
        try:
            # تحقق بسيط
            rule = self.validation_rule.lower()
            
            if 'required' in rule and not value:
                return False, "هذا الحقل مطلوب"
            
            if 'email' in rule and '@' not in str(value):
                return False, "بريد إلكتروني غير صالح"
            
            if 'numeric' in rule and not str(value).replace('.', '').replace('-', '').isdigit():
                return False, "قيمة رقمية غير صالحة"
            
            return True, None
        except Exception as e:
            logger.error(f"Validation failed: {str(e)}")
            return False, f"خطأ في التحقق: {str(e)}"


        
        
