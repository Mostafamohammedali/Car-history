import time
import logging
import signal
import sys
from django.core.management.base import BaseCommand
from django.utils import timezone
from data_sync.services.database_service import DatabaseSyncService
from data_sync.models import ExternalDBConfig

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'مزامنة بيانات السيارات من المصادر الخارجية'

    def add_arguments(self, parser):
        parser.add_argument(
            '--config-id',
            type=int,
            help='مزامنة مصدر معين باستخدام المعرف'
        )
        parser.add_argument(
            '--once',
            action='store_true',
            help='تشغيل المزامنة مرة واحدة فقط'
        )
        parser.add_argument(
            '--type',
            type=str,
            choices=['database', 'scheduled', 'auto-discovery'],
            default='database',
            help='نوع المزامنة (database, scheduled, auto-discovery)'
        )
        parser.add_argument(
            '--test-connection',
            action='store_true',
            help='اختبار الاتصال بالمصادر فقط'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='تشغيل المحاكاة بدون حفظ البيانات'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='عرض المزيد من التفاصيل'
        )
        parser.add_argument(
            '--parallel',
            action='store_true',
            default=True,
            help='تفعيل المزامنة المتوازية (افتراضي: مفعل)'
        )
        parser.add_argument(
            '--max-workers',
            type=int,
            default=4,
            help='الحد الأقصى لعدد العمال المتوازيين (افتراضي: 4)'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='حجم الدفعة للمعالجة (افتراضي: 1000)'
        )
        parser.add_argument(
            '--exclude-tables',
            nargs='+',
            default=[],
            help='قائمة الجداول التي سيتم استبعادها'
        )
        parser.add_argument(
            '--include-tables',
            nargs='+',
            default=[],
            help='قائمة الجداول التي سيتم تضمينها فقط'
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.running = True
        self._signals_setup = False
        
        # Setup signal handlers for graceful shutdown (only in main thread)
        self._setup_signal_handlers()

    def _setup_signal_handlers(self):
        """Setup signal handlers only if we're in the main thread"""
        try:
            import threading
            if threading.current_thread() is threading.main_thread():
                signal.signal(signal.SIGINT, self._signal_handler)
                signal.signal(signal.SIGTERM, self._signal_handler)
                self._signals_setup = True
        except (ValueError, AttributeError):
            # Not in main thread or signals not supported
            pass

    def _signal_handler(self, signum, frame):
        """معالج إشارات التوقف"""
        if self._signals_setup:
            self.stdout.write(self.style.WARNING('\nاستلام إشارة التوقف...'))
            self.running = False

    def handle(self, *args, **options):
        sync_type = options['type']
        config_id = options.get('config_id')
        test_connection = options['test_connection']
        dry_run = options['dry_run']
        verbose = options['verbose']
        parallel = options['parallel']
        max_workers = options['max_workers']
        batch_size = options['batch_size']
        exclude_tables = options['exclude_tables']
        include_tables = options['include_tables']
        
        if verbose:
            logging.getLogger('data_sync').setLevel(logging.DEBUG)
        
        self.stdout.write(
            self.style.SUCCESS(f'بدء خدمة المزامنة المحسّنة (النوع: {sync_type}, الموازاة: {parallel}) - الصور مستبعدة')
        )
        
        # عرض إعدادات المزامنة
        if verbose:
            self.stdout.write(f'الإعدادات: العمال={max_workers}, الدفعة={batch_size}')
            if exclude_tables:
                self.stdout.write(f'الجداول المستبعدة: {exclude_tables}')
            if include_tables:
                self.stdout.write(f'الجداول المضمنة: {include_tables}')
        
        try:
            if sync_type == 'database':
                self._sync_database_data(config_id, options)
            elif sync_type == 'scheduled':
                self._run_scheduled_syncs(options)
            elif sync_type == 'auto-discovery':
                self._run_auto_discovery(config_id, options)
            
        except KeyboardInterrupt:
            self.stdout.write(self.style.SUCCESS('\nتم إيقاف الخدمة بنجاح'))
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'خطأ غير متوقع: {str(e)}')
            )
            logger.exception("Unexpected error in enhanced sync command")
            sys.exit(1)


    def _sync_database_data(self, config_id, options):
        """مزامنة بيانات قاعدة البيانات المحسّنة"""
        from data_sync.models import ExternalDBConfig
        
        parallel = options['parallel']
        max_workers = options['max_workers']
        test_connection = options['test_connection']
        dry_run = options['dry_run']
        batch_size = options['batch_size']
        exclude_tables = options['exclude_tables']
        include_tables = options['include_tables']
        
        # إنشاء خدمة المزامنة مع الإعدادات المحسّنة
        db_service = DatabaseSyncService(max_workers=max_workers)
        
        if test_connection:
            self._test_database_connections(db_service, config_id)
            return
        
        try:
            self.stdout.write(f'جاري مزامنة قاعدة البيانات (الموازاة: {parallel}, العمال: {max_workers})...')
            
            if dry_run:
                self.stdout.write(self.style.WARNING('وضع المحاكاة: لن يتم حفظ أي بيانات'))
                # هنا يمكن إضافة منطق المحاكاة
                return
            
            # تنفيذ المزامنة مع الإعدادات المحددة
            # Get the specific config if config_id is provided
            if config_id:
                config = ExternalDBConfig.objects.get(id=config_id)
                result = db_service.sync_data(config, 'full')
                results = {config.name: result}
            else:
                # Sync all active configs
                configs = ExternalDBConfig.objects.filter(is_active=True)
                results = {}
                for config in configs:
                    result = db_service.sync_data(config, 'full')
                    results[config.name] = result
            
            # عرض النتائج المحسّنة
            for config_name, result in results.items():
                if result.get('success'):
                    total_synced = result.get('total_synced', 0)
                    total_failed = result.get('total_failed', 0)
                    result_details = result.get('results', {})
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✓ {config_name}: {total_synced:,} سجل مزامنة, {total_failed:,} فشل'
                        )
                    )
                    
                    # عرض تفاصيل أنواع البيانات
                    for data_type, counts in result_details.items():
                        synced = counts.get('synced', 0)
                        failed = counts.get('failed', 0)
                        if synced > 0 or failed > 0:
                            self.stdout.write(
                                f'  {data_type}: {synced} مزامنة, {failed} فشل'
                            )
                else:
                    error = result.get('error', 'خطأ غير معروف')
                    self.stdout.write(
                        self.style.ERROR(
                            f'✗ {config_name}: فشلت المزامنة - {error}'
                        )
                    )
        
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'خطأ في مزامنة قاعدة البيانات: {str(e)}')
            )
            logger.exception("Error in enhanced database sync")
        
        finally:
            # تنظيف الاتصالات
            db_service.close_all_connections()

    def _run_scheduled_syncs(self, options):
        """تشغيل المزامنات المجدولة - الآن باستخدام Celery"""
        once = options['once']
        
        try:
            self.stdout.write('جاري تشغيل المزامنة المجدولة...')
            
            
            # تشغيل مزامنة قواعد البيانات المجدولة
            db_service = DatabaseSyncService()
            configs = ExternalDBConfig.objects.filter(is_active=True)
            for config in configs:
                db_service.sync_data(config, 'scheduled')
            
            self.stdout.write(self.style.SUCCESS('اكتملت المزامنة المجدولة. للمزامنة التلقائية كل 24 ساعة، استخدم Celery beat.'))
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'خطأ في جدولة المزامنة: {str(e)}')
            )
            logger.exception("Error in scheduled sync")


    def _run_auto_discovery(self, config_id, options):
        """تشغيل الاكتشاف التلقائي للجداول والنماذج"""
        verbose = options['verbose']
        
        try:
            self.stdout.write('جاري تشغيل الاكتشاف التلقائي...')
            
            from data_sync.services.database_api_service import DatabaseSyncService
            db_service = DatabaseSyncService()
            
            configs = ExternalDBConfig.objects.filter(is_active=True)
            if config_id:
                configs = configs.filter(id=config_id)
            
            for config in configs:
                self.stdout.write(f'اكتشاف الجداول في: {config.name}')
                
                try:
                    # الاكتشاف التلقائي
                    discovery_result = db_service._auto_discover_tables(config)
                    
                    tables_discovered = discovery_result.get('tables_discovered', 0)
                    tables = discovery_result.get('tables', [])
                    
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ تم اكتشاف {tables_discovered} جدول')
                    )
                    
                    # عرض تفاصيل الجداول
                    if verbose:
                        for table in tables:
                            table_name = table['name']
                            row_count = table['row_count']
                            model_mapping = table.get('model_mapping', 'None')
                            has_mapping = '✓' if model_mapping else '✗'
                            
                            self.stdout.write(
                                f'  {has_mapping} {table_name}: {row_count:,} سجل -> {model_mapping}'
                            )
                    
                    # إنشاء تعيينات تلقائية
                    mappings_created = self._create_auto_mappings(config, tables)
                    
                    if mappings_created > 0:
                        self.stdout.write(
                            self.style.SUCCESS(f'✓ تم إنشاء {mappings_created} تعيين تلقائي')
                        )
                    
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'✗ فشل الاكتشاف لـ {config.name}: {str(e)}')
                    )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'خطأ في الاكتشاف التلقائي: {str(e)}')
            )
            logger.exception("Error in auto discovery")
    
    def _create_auto_mappings(self, config, tables):
        """إنشاء تعيينات تلقائية للجداول المكتشفة"""
        mappings_created = 0
        
        for table in tables:
            table_name = table['name']
            model_mapping = table.get('model_mapping')
            
            if not model_mapping:
                continue
            
            try:
                # التحقق من وجود التعيين
                from data_sync.models import DataMapping
                
                existing_mapping = DataMapping.objects.filter(
                    db_config=config,
                    external_table=table_name
                ).first()
                
                if not existing_mapping:
                    # إنشاء تعيين جديد
                    mapping = DataMapping.objects.create(
                        db_config=config,
                        external_table=table_name,
                        local_model=model_mapping.split('.')[1],  # استخراج اسم النموذج
                        local_app=model_mapping.split('.')[0],   # استخراج اسم التطبيق
                        field_mappings=self._generate_field_mappings(table),
                        sync_strategy='full_sync',
                        confidence_score=0.8,
                        is_auto_discovered=True
                    )
                    
                    mappings_created += 1
                    logger.info(f"Created auto mapping for {table_name} -> {model_mapping}")
            
            except Exception as e:
                logger.error(f"Error creating mapping for {table_name}: {str(e)}")
        
        return mappings_created
    
    def _generate_field_mappings(self, table):
        """توليد تعيينات الحقول التلقائية"""
        columns = table.get('columns', [])
        mappings = []
        
        for column_info in columns:
            column_name = column_info[0]
            data_type = column_info[1]
            
            # تعيين بسيط: نفس اسم الحقل
            mappings.append({
                'source_field': column_name,
                'target_field': column_name,
                'data_type': data_type,
                'is_required': False,
                'default_value': None,
                'transform_function': None
            })
        
        return mappings

    def _test_database_connections(self, db_service, config_id):
        """اختبار اتصالات قواعد البيانات"""
        configs = ExternalDBConfig.objects.filter(is_active=True)
        if config_id:
            configs = configs.filter(id=config_id)
        
        self.stdout.write('اختبار اتصالات قواعد البيانات...')
        
        for config in configs:
            self.stdout.write(f'اختبار: {config.name}...')
            
            try:
                result = db_service.test_database_connection(config)
                
                if result['success']:
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ {config.name}: اتصال ناجح')
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(f'✗ {config.name}: فشل الاتصال - {result.get("error", "خطأ غير معروف")}')
                    )
            
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'✗ {config.name}: خطأ في الاختبار - {str(e)}')
                )
        
        # Close all connections
        db_service.close_all_connections()
