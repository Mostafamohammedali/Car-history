import json
import logging
import requests
import base64
from io import BytesIO
from datetime import datetime, timedelta
from django.utils import timezone
from django.db import transaction, connection
from django.apps import apps
from django.core.cache import cache
from django.conf import settings
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
import socket
import random
from urllib.parse import quote_plus
from ..models import ExternalDBConfig, SyncLog, DataMapping
from django.db.models import Avg
from cars.models import Cars, Repairshops

logger = logging.getLogger(__name__)

class DatabaseSyncService:
    """خدمة متقدمة لمزامنة قواعد البيانات الخارجية """
    
    def __init__(self, max_workers=2):
        self.connections = {}
        self.max_workers = max_workers  # Reduced from 4 to 2 to reduce locking
        self._lock = threading.Lock()
        self.connection_pool = {}
        self._setup_connection_pool()
        self.supported_image_formats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
    
    def __del__(self):
        """إغلاق جميع الاتصالات عند حذف الكائن"""
        self.close_all_connections()
    
    def close_all_connections(self):
        """إغلاق جميع الاتصالات النشطة"""
        for config_id, conn in self.connections.items():
            try:
                conn.close()
            except:
                pass
        self.connections.clear()
    
    def _setup_connection_pool(self):
        """إعداد تجمع الاتصالات"""
        self.connection_pool = {
            'active': {},
            'idle': {},
            'max_size': 10,
            'current_size': 0
        }

    def _process_image_to_data_url(self, image_source, source_name="Unknown"):
        """
        تحويل مصدر الصورة (رابط، بيانات ثنائية، أو Base64) إلى رابط Data URL (Base64).
        
        Args:
            image_source: مصدر الصورة (bytes, str, memoryview)
            source_name: اسم المصدر لأغراض السجلات
            
        Returns:
            str: رابط Data URL للصورة، أو None إذا فشل التحويل
        """
        if not image_source:
            return None

        try:
            binary_data = None
            mime_type = "image/jpeg" # افتراضي

            # 1. إذا كانت البيانات ثنائية بالفعل
            if isinstance(image_source, (bytes, memoryview)):
                binary_data = bytes(image_source)
            
            # 2. إذا كانت البيانات نصية (رابط أو Base64)
            elif isinstance(image_source, str):
                image_source = image_source.strip()
                
                # أ. إذا كان بالفعل Data URL
                if image_source.startswith('data:image'):
                    if self._is_valid_image_url(image_source):
                        return image_source
                    return None
                
                # ب. التعامل مع الروابط (HTTP/HTTPS)
                if image_source.startswith(('http://', 'https://')):
                    try:
                        headers = {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.9',
                        }
                        response = requests.get(image_source, headers=headers, timeout=15, stream=True)
                        if response.status_code == 200:
                            binary_data = response.content
                            content_type = response.headers.get('Content-Type', '')
                            if content_type.startswith('image/'):
                                mime_type = content_type
                        else:
                            logger.warning(f"[IMG-PROC] Failed to fetch image: {image_source} (Status: {response.status_code})")
                            return None
                    except Exception as e:
                        logger.error(f"[IMG-PROC] Error fetching image from {image_source}: {e}")
                        return None
                
                # ج. محاولة فك تشفير النص كـ base64 مباشر
                else:
                    try:
                        binary_data = base64.b64decode(image_source)
                    except:
                        pass

            # التحقق من صحة البيانات الثنائية وتحويلها إلى Data URL
            if binary_data and self._is_valid_image(binary_data):
                # تحديد الـ MIME type بشكل أدق من الـ binary
                mime_type = self._get_mime_type(binary_data)
                encoded_string = base64.b64encode(binary_data).decode('utf-8')
                return f"data:{mime_type};base64,{encoded_string}"

            logger.warning(f"[IMG-PROC] Unsupported or invalid image source from {source_name}")
            return None

        except Exception as e:
            logger.error(f"[IMG-PROC] Unexpected error processing image from {source_name}: {e}")
            return None

    def _is_valid_image_url(self, url):
        """التحقق البسيط من صحة رابط Data URL"""
        try:
            if not url.startswith('data:image/'):
                return False
            header, encoded = url.split(',', 1)
            return len(encoded) > 10
        except:
            return False

    def _get_mime_type(self, data):
        """تحديد MIME type بناءً على الـ signature"""
        if data.startswith(b'\xff\xd8\xff'): return "image/jpeg"
        if data.startswith(b'\x89PNG\r\n\x1a\n'): return "image/png"
        if data.startswith(b'GIF87a') or data.startswith(b'GIF89a'): return "image/gif"
        if data.startswith(b'RIFF') and data[8:12] == b'WEBP': return "image/webp"
        if data.startswith(b'BM'): return "image/bmp"
        return "image/jpeg"

    def _is_valid_image(self, data):
        """التحقق البسيط من أن البيانات تمثل صورة صالحة"""
        if not data or len(data) < 10:
            return False
        
        # التحقق من الـ magic numbers لأشهر التنسيقات
        # JPEG: FF D8 FF
        # PNG: 89 50 4E 47 0D 0A 1A 0A
        # GIF: 47 49 46 38
        # WEBP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
        
        signatures = [
            b'\xff\xd8\xff',              # JPEG
            b'\x89PNG\r\n\x1a\n',         # PNG
            b'GIF87a', b'GIF89a',         # GIF
            b'RIFF',                      # WebP/others
            b'BM',                        # BMP
        ]
        
        for sig in signatures:
            if data.startswith(sig):
                return True
        return False
    
    def _get_pooled_connection(self, config):
        """الحصول على اتصال من التجمع"""
        with self._lock:
            config_id = config.id
            
            # البحث عن اتصال نشط
            if config_id in self.connection_pool['active']:
                try:
                    conn = self.connection_pool['active'][config_id]
                    cursor = conn.cursor()
                    cursor.execute("SELECT 1")
                    cursor.close()
                    return conn
                except:
                    # إزالة الاتصال التالف
                    try:
                        conn.close()
                    except:
                        pass
                    del self.connection_pool['active'][config_id]
            
            # البحث عن اتصال خامل
            if config_id in self.connection_pool['idle']:
                try:
                    conn = self.connection_pool['idle'].pop(config_id)
                    cursor = conn.cursor()
                    cursor.execute("SELECT 1")
                    cursor.close()
                    self.connection_pool['active'][config_id] = conn
                    return conn
                except:
                    try:
                        conn.close()
                    except:
                        pass
            
            # إنشاء اتصال جديد
            if self.connection_pool['current_size'] < self.connection_pool['max_size']:
                conn = self._create_new_connection(config)
                self.connection_pool['active'][config_id] = conn
                self.connection_pool['current_size'] += 1
                return conn
            
            # إذا وصلنا للحد الأقصى، أنشئ اتصال مؤقت
            return self._create_new_connection(config)
    
    def _create_new_connection(self, config):
        """إنشاء اتصال جديد"""
        import psycopg2
        try:
            conn = psycopg2.connect(
                host=config.host,
                port=config.port,
                dbname=config.dbname,
                user=config.user,
                password=config.password,
                sslmode=config.ssl_mode,
                connect_timeout=config.connection_timeout
            )
            # Set autocommit to reduce locking
            conn.set_session(autocommit=True)
            return conn
        except Exception as e:
            logger.error(f"Failed to create database connection: {str(e)}")
            raise
    
    def _sync_virtual_source(self, config, sync_type, sync_log):
        """
        Sync an API-prefixed virtual source using the scheduled sync path.

        Uses VehicleDataService.fetch_from_dynamic_api() + save_external_data_to_local()
        ONLY — never the old live-search get_vehicle_data_sync().
        """
        try:
            from cars.car_service import VehicleDataService
            service = VehicleDataService()

            target_cars = Cars.objects.all().order_by('updated_at')
            total_cars = target_cars.count()
            synced_count = 0
            failed_count = 0

            logger.info(
                f"[VIRTUAL-SYNC] Starting scheduled sync for '{config.name}' "
                f"on {total_cars} cars."
            )

            for car in target_cars:
                try:
                    # Fetch via the scheduled API path
                    api_result = service.fetch_from_dynamic_api(car.vin)
                    api_data = api_result.get('fields', {})

                    if api_data:
                        external_wrapper = {
                            'success': True,
                            'vin': car.vin,
                            'data_sources': {'dynamic_api': api_data},
                        }
                        saved = service.save_external_data_to_local(
                            car.vin, external_wrapper
                        )
                        if saved:
                            synced_count += 1
                            logger.debug(
                                f"[VIRTUAL-SYNC] ✓ VIN {car.vin} synced from {config.name}"
                            )
                        else:
                            failed_count += 1
                    else:
                        # VIN not in this API — not a failure
                        logger.debug(
                            f"[VIRTUAL-SYNC] VIN {car.vin} not found in {config.name}"
                        )

                except Exception as e:
                    logger.error(
                        f"[VIRTUAL-SYNC] Error syncing VIN {car.vin} "
                        f"from {config.name}: {e}"
                    )
                    failed_count += 1

            sync_log.mark_as_completed(
                records_processed=synced_count + failed_count,
                records_updated=synced_count,
                records_failed=failed_count,
            )

            logger.info(
                f"[VIRTUAL-SYNC] Completed '{config.name}': "
                f"{synced_count} synced, {failed_count} failed out of {total_cars}."
            )
            return {
                'success': True,
                'total_synced': synced_count,
                'total_failed': failed_count,
            }

        except Exception as e:
            logger.error(f"[VIRTUAL-SYNC] Fatal error for {config.name}: {e}")
            sync_log.mark_as_failed(str(e))
            return {'success': False, 'error': str(e)}

    def get_connection(self, config):
        """الحصول على اتصال بقاعدة البيانات"""
        return self._get_pooled_connection(config)
    
    def _cleanup_old_connections(self):
        """تنظيف الاتصالات القديمة أو المغلقة"""
        to_remove = []
        for config_id, conn in self.connections.items():
            try:
                # اختبار الاتصال
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                cursor.close()
            except:
                # إذا فشل الاختبار، أضفه لقائمة الإزالة
                to_remove.append(config_id)
                try:
                    conn.close()
                except:
                    pass
        
        # إزالة الاتصالات الفاشلة
        for config_id in to_remove:
            if config_id in self.connections:
                del self.connections[config_id]
    
    def test_database_connection(self, config):
        """اختبار اتصال قاعدة البيانات"""
        try:
            conn = self.get_connection(config)
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            
            return {
                'success': True,
                'message': 'اتصال ناجح'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def close_all_connections(self):
        """إغلاق جميع الاتصالات"""
        for conn in self.connections.values():
            try:
                conn.close()
            except:
                pass
        self.connections.clear()
    
    def sync_data(self, config, sync_type='full'):
        """مزامنة جميع الجداول من Supabase إلى قاعدة البيانات المحلية"""
        try:
            # إنشاء سجل مزامنة
            sync_log = SyncLog.objects.create(
                db_config=config,
                sync_type=sync_type,
                status='in_progress',
                started_at=timezone.now(),
                data_source=config.name
            )

            # التحقق مما إذا كان المصدر "افتراضياً" (API)
            if config.name.upper().startswith('API:'):
                return self._sync_virtual_source(config, sync_type, sync_log)

            # إصلاح الـ sequences قبل المزامنة لتجنب تعارض الـ primary key
            self._fix_sequences()

            results = {
                'cars':            {'synced': 0, 'failed': 0},
                'repairshops':     {'synced': 0, 'failed': 0},
                'reports':         {'synced': 0, 'failed': 0},
                'evaluations':     {'synced': 0, 'failed': 0},
                'image_car':       {'synced': 0, 'failed': 0},
                'accident_images': {'synced': 0, 'failed': 0},
                'contact_messages':{'synced': 0, 'failed': 0},
                'mapped_tables':   {'synced': 0, 'failed': 0, 'tables_synced': 0},
            }

            # ترتيب المزامنة مهم: Cars أولاً لأن بقية الجداول تعتمد عليه
            logger.info(f"[FULL-SYNC] Starting full sync for '{config.name}'...")

            results['cars']            = self._sync_cars_data(config)
            results['repairshops']     = self._sync_repairshops_data(config)
            results['reports']         = self._sync_reports_data(config)
            results['evaluations']     = self._sync_evaluations_data(config)
            results['image_car']       = self._sync_image_car_data(config)
            results['accident_images'] = self._sync_accident_images_data(config)
            results['contact_messages']= self._sync_contact_messages_data(config)

            # مزامنة أي جداول إضافية مُعيَّنة عبر DataMapping
            results['mapped_tables']   = self._sync_mapped_tables(config)

            # حساب الإجماليات
            total_synced = sum(r.get('synced', 0) for r in results.values())
            total_failed = sum(r.get('failed', 0) for r in results.values())

            sync_log.metadata = {
                k: {'synced': v.get('synced', 0), 'failed': v.get('failed', 0)}
                for k, v in results.items()
            }
            sync_log.save(update_fields=['metadata'])
            sync_log.mark_as_completed(
                records_processed=total_synced + total_failed,
                records_updated=total_synced,
                records_failed=total_failed,
            )

            logger.info(
                f"[FULL-SYNC] ✅ Completed '{config.name}': "
                f"{total_synced} synced, {total_failed} failed. "
                f"Details: { {k: v.get('synced',0) for k, v in results.items()} }"
            )
            return {
                'success': True,
                'results': results,
                'total_synced': total_synced,
                'total_failed': total_failed,
            }

        except Exception as e:
            logger.error(f"Sync failed for {config.name}: {str(e)}")
            if 'sync_log' in locals():
                sync_log.mark_as_failed(str(e))
            return {'success': False, 'error': str(e)}
            
    def fetch_single_vin(self, config, vin: str):
        """
        Fetch a single VIN's data from a real external PostgreSQL database.

        Only works with genuine DB connections (non-API configs).
        API-prefixed sources are handled by the batch sync task
        (sync_api_sources) — per-VIN on-demand API lookups are prohibited.

        Args:
            config: ExternalDBConfig instance (must NOT be API:).
            vin:    17-character VIN to look up.

        Returns:
            Dict of car fields, or None if not found.
        """
        try:
            # Reject virtual sources — they have no real DB connection
            if config.name.upper().startswith('API:'):
                logger.warning(
                    f"[DB] fetch_single_vin called on virtual source '{config.name}'. "
                    f"Use the scheduled sync task for API sources."
                )
                return None

            conn = self.get_connection(config)
            cursor = conn.cursor()

            # Find the cars table in the external DB
            cursor.execute("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'cars'
            """)
            car_tables = [row[0] for row in cursor.fetchall()]

            if not car_tables:
                logger.info(f"[DB] 'cars' table not found in external DB '{config.name}'")
                return None

            for table in car_tables:
                try:
                    cursor.execute(
                        f"SELECT column_name FROM information_schema.columns "
                        f"WHERE table_name = '{table}'"
                    )
                    existing_cols = [row[0].lower() for row in cursor.fetchall()]

                    if 'vin' not in existing_cols:
                        logger.warning(f"[DB] No VIN column in table '{table}'")
                        continue

                    cursor.execute(
                        f"SELECT * FROM {table} WHERE vin = %s LIMIT 1", (vin,)
                    )
                    row = cursor.fetchone()

                    if row:
                        columns = [desc[0] for desc in cursor.description]
                        data = dict(zip(columns, row))

                        car_data = {
                            'vin': data.get('vin') or data.get('VIN'),
                            'name_car': (
                                data.get('name_car') or data.get('name')
                                or data.get('car_name') or f'Car {vin}'
                            ),
                            'make': (
                                data.get('make') or data.get('manufacturer')
                                or data.get('brand') or 'Unknown'
                            ),
                            'model': data.get('model') or data.get('car_model') or 'Unknown',
                            'year': self._parse_year(
                                data.get('year') or data.get('manufacture_year')
                            ) or 2023,
                            'color': data.get('color') or data.get('colour') or 'Unknown',
                            'seating_capacity': data.get('seating_capacity') or data.get('seats'),

                            'num_cylinders': data.get('num_cylinders') or data.get('cylinders'),
                            'fuel_type': data.get('fuel_type') or data.get('fuel') or 'other',
                            'engine_capacity': (
                                self._parse_engine_capacity(data.get('engine_capacity')) or 2000
                            ),
                            'gear_type': (
                                self._parse_gear_type(
                                    data.get('gear_type') or data.get('transmission')
                                ) or 2
                            ),
                            'customs_num': data.get('customs_num') or data.get('customs_number'),
                            'customs_date': self._parse_date(data.get('customs_date')),
                            'receipt_number': data.get('receipt_number'),
                            'receipt_date': self._parse_date(data.get('receipt_date')),
                            'mileage': data.get('mileage') or data.get('odometer') or 0,
                        }

                        cursor.close()
                        return {k: v for k, v in car_data.items() if v is not None}

                except Exception as table_err:
                    logger.error(
                        f"[DB] Error querying table '{table}' for VIN {vin}: {table_err}"
                    )

            cursor.close()
            return None

        except Exception as e:
            logger.error(f"[DB] fetch_single_vin failed for '{config.name}': {e}")
            return None
    def _fix_sequences(self):
        """إصلاح الـ sequences لجميع الجداول ذات AutoField لتجنب تعارض الـ primary key"""
        tables_sequences = [
            ('Reports', 'report_id'),
            ('repairshops', 'repairshop_id'),
            ('evaluation', 'evaluation_id'),
            ('image_car', 'id'),
            ('accident_images', 'accident_image_id'),
        ]
        try:
            with connection.cursor() as cursor:
                for table, pk_col in tables_sequences:
                    try:
                        cursor.execute(
                            f"SELECT setval("
                            f"pg_get_serial_sequence('\"{table}\"', '{pk_col}'), "
                            f"(SELECT COALESCE(MAX({pk_col}), 0) FROM \"{table}\") + 1, false"
                            f")"
                        )
                        logger.debug(f"[SEQ-FIX] Fixed sequence for {table}.{pk_col}")
                    except Exception as e:
                        logger.warning(f"[SEQ-FIX] Could not fix sequence for {table}: {e}")
        except Exception as e:
            logger.warning(f"[SEQ-FIX] Sequence fix failed: {e}")

    def _sync_cars_data(self, config):
        """مزامنة بيانات السيارات الأساسية (اكتشاف كامل للسجلات الجديدة)"""
        try:
            conn = self.get_connection(config)
            cursor = conn.cursor()

            # البحث عن جدول السيارات بغض النظر عن حالة الأحرف
            cursor.execute("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public'
                AND LOWER(table_name) = 'cars'
            """)
            car_tables = [row[0] for row in cursor.fetchall()]

            if not car_tables:
                logger.info(f"Table 'cars' not found in external database for {config.name}")
                return {'synced': 0, 'failed': 0, 'created': 0}

            synced_count = 0
            failed_count = 0
            created_count = 0

            for table in car_tables:
                try:
                    # استخدام quotes للتعامل مع أسماء الجداول case-sensitive
                    cursor.execute(f'SELECT * FROM "{table}"')
                    columns = [desc[0] for desc in cursor.description]
                    rows = cursor.fetchall()

                    logger.info(f"[DB-DISCOVERY] Found {len(rows)} records in table '{table}'")

                    for row in rows:
                        data = dict(zip(columns, row))
                        vin = data.get('vin') or data.get('VIN')

                        if not vin:
                            failed_count += 1
                            continue

                        # تطبيع fuel_type (يدعم العربية والإنجليزية)
                        raw_fuel = str(data.get('fuel_type') or data.get('fuel') or '').lower().strip()
                        fuel_map = {
                            'gasoline': 'gasoline', 'gas': 'gasoline', 'petrol': 'gasoline',
                            'بنزين': 'gasoline', 'بنزن': 'gasoline',
                            'diesel': 'diesel', 'ديزل': 'diesel',
                            'electric': 'electric', 'كهربائي': 'electric', 'كهرباء': 'electric',
                            'hybrid': 'hybrid', 'هجين': 'hybrid',
                        }
                        fuel_type = fuel_map.get(raw_fuel, 'other')

                        # تطبيع engine_capacity (قد يكون string)
                        engine_cap = self._parse_engine_capacity(data.get('engine_capacity')) or 2000

                        car_data = {
                            'vin': vin.strip().upper(),
                            'name_car': data.get('name_car') or data.get('name') or f'{data.get("make","Car")} {data.get("model","")}',
                            'make': data.get('make') or data.get('manufacturer') or data.get('brand') or 'Unknown',
                            'model': data.get('model') or data.get('car_model') or 'Unknown',
                            'year': self._parse_year(data.get('year') or data.get('manufacture_year')) or 2023,
                            'color': data.get('color') or data.get('colour') or 'Unknown',
                            'seating_capacity': data.get('seating_capacity') or data.get('seats'),

                            'num_cylinders': data.get('num_cylinders') or data.get('cylinders'),
                            'fuel_type': fuel_type,
                            'engine_capacity': engine_cap,
                            'gear_type': self._parse_gear_type(data.get('gear_type') or data.get('transmission')) or 2,
                            'customs_num': data.get('customs_num') or data.get('customs_number'),
                            'customs_date': self._parse_date(data.get('customs_date')),
                            'receipt_number': data.get('receipt_number'),
                            'receipt_date': self._parse_date(data.get('receipt_date')),
                            'mileage': data.get('mileage') or data.get('odometer') or 0,
                        }

                        car, created = Cars.objects.update_or_create(
                            vin=vin.strip().upper(),
                            defaults=car_data,
                        )

                        from cars.models import Reports
                        from django.db import IntegrityError as _IntegrityError
                        try:
                            report, r_created = Reports.objects.get_or_create(
                                car=car,
                                defaults={
                                    'overall_ai_score': 0.0,
                                    'accident_severity_score': 0,
                                }
                            )
                            if not r_created:
                                # تحديث الإحصائيات فقط بدون استدعاء save() الكامل
                                Reports.objects.filter(pk=report.pk).update(
                                    avg_user_rating=car.evaluations.aggregate(Avg('rate'))['rate__avg'],
                                )
                        except _IntegrityError:
                            # الـ sequence غير متزامن — نصلحه ونحاول مرة أخرى
                            with connection.cursor() as seq_cursor:
                                seq_cursor.execute(
                                    "SELECT setval(pg_get_serial_sequence('\"Reports\"', 'report_id'), "
                                    "(SELECT COALESCE(MAX(report_id), 0) FROM \"Reports\") + 1, false)"
                                )
                            report, _ = Reports.objects.get_or_create(
                                car=car,
                                defaults={
                                    'overall_ai_score': 0.0,
                                    'accident_severity_score': 0,
                                }
                            )
                            logger.info(f"[DB-SYNC] Fixed Reports sequence and retried for VIN {vin}")

                        synced_count += 1
                        if created:
                            created_count += 1
                            logger.info(f"[DB-SYNC] Created: {car.make} {car.model} ({vin})")

                except Exception as e:
                    logger.error(f"Error syncing table '{table}': {str(e)}")
                    failed_count += 1

            cursor.close()
            return {'synced': synced_count, 'failed': failed_count, 'created': created_count}

        except Exception as e:
            logger.error(f"Failed to sync cars data: {str(e)}")
            return {'synced': 0, 'failed': 0, 'created': 0}
    
    def _sync_repairshops_data(self, config):
        """مزامنة بيانات ورش التصليح"""
        try:
            conn = self.get_connection(config)
            cursor = conn.cursor()

            cursor.execute("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public' AND LOWER(table_name) = 'repairshops'
            """)
            repairshop_tables = [row[0] for row in cursor.fetchall()]

            if not repairshop_tables:
                logger.info(f"[SYNC] Table 'repairshops' not found in {config.name}")
                cursor.close()
                return {'synced': 0, 'failed': 0}

            synced_count = 0
            failed_count = 0

            for table in repairshop_tables:
                try:
                    cursor.execute(f'SELECT * FROM "{table}"')
                    columns = [desc[0] for desc in cursor.description]
                    rows = cursor.fetchall()
                    logger.info(f"[SYNC] repairshops: {len(rows)} rows in '{table}'")

                    for row in rows:
                        data = dict(zip(columns, row))

                        # ─── الإصلاح: Django يخزن FK بعمود اسمه car_id ────────
                        # قيمة car_id هي الـ VIN لأن PK لجدول Cars هو VIN
                        vin = (
                            data.get('car_id')        # اسم العمود الفعلي في Supabase
                            or data.get('vin')
                            or data.get('VIN')
                        )
                        repairshop_id = data.get('repairshop_id')

                        if not vin:
                            logger.warning(f"[SYNC-REPAIR] No VIN found in row: {list(data.keys())}")
                            failed_count += 1
                            continue

                        try:
                            car = Cars.objects.get(vin=vin)
                        except Cars.DoesNotExist:
                            logger.warning(f"[SYNC-REPAIR] Car VIN '{vin}' not found locally, skipping.")
                            failed_count += 1
                            continue

                        repairshop_data = {
                            'mech_insp_desc': data.get('mech_insp_desc') or '',
                            'comp_scan_desc': data.get('comp_scan_desc') or '',
                        }

                        if repairshop_id:
                            Repairshops.objects.update_or_create(
                                repairshop_id=repairshop_id,
                                defaults={'car': car, **repairshop_data}
                            )
                        else:
                            # إن لم يكن له ID ثابت، أنشئ سجلاً واحداً لكل سيارة
                            Repairshops.objects.update_or_create(
                                car=car,
                                defaults=repairshop_data
                            )
                        synced_count += 1
                        logger.info(f"[SYNC-REPAIR] ✓ Synced repairshop for VIN: {vin}")

                except Exception as e:
                    logger.error(f"[SYNC-REPAIR] Error in table '{table}': {e}")
                    failed_count += 1

            cursor.close()
            return {'synced': synced_count, 'failed': failed_count}

        except Exception as e:
            logger.error(f"[SYNC-REPAIR] Fatal: {e}")
            return {'synced': 0, 'failed': 0}

    # ── جداول تُدار تلقائياً من الكود ولا حاجة لـ DataMapping لها ──────────────
    AUTO_MANAGED_TABLES = {
        'reports', 'cars_reports', 'Reports',
        'cars', 'repairshops',
        'evaluation', 'image_car', 'accident_images', 'contactmessages',
    }

    # ─────────────────────────────────────────────────────────────────────────
    # Reports
    # ─────────────────────────────────────────────────────────────────────────
    def _sync_reports_data(self, config):
        """مزامنة جدول التقارير (Reports) من Supabase"""
        try:
            from cars.models import Reports
            conn = self.get_connection(config)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public' AND LOWER(table_name) = 'reports'
            """)
            tables = [r[0] for r in cursor.fetchall()]
            if not tables:
                logger.info(f"[SYNC] Table 'Reports' not found in {config.name}")
                cursor.close()
                return {'synced': 0, 'failed': 0}

            synced = 0
            failed = 0
            for table in tables:
                try:
                    cursor.execute(f'SELECT * FROM "{table}"')
                    columns = [d[0] for d in cursor.description]
                    rows = cursor.fetchall()
                    logger.info(f"[SYNC] Reports: {len(rows)} rows in '{table}'")
                    for row in rows:
                        data = dict(zip(columns, row))
                        car_vin = data.get('car_id') or data.get('vin')
                        if not car_vin:
                            failed += 1
                            continue
                        try:
                            car = Cars.objects.get(vin=car_vin)
                        except Cars.DoesNotExist:
                            logger.warning(f"[SYNC-REPORTS] Car VIN '{car_vin}' not found, skipping.")
                            failed += 1
                            continue
                        defaults = {
                            'overall_ai_score':    float(data.get('overall_ai_score') or 0.0),
                            'accident_severity_score': int(data.get('accident_severity_score') or 0),
                        }
                        if data.get('risk_assessment_data'):
                            defaults['risk_assessment_data'] = data['risk_assessment_data']
                        Reports.objects.update_or_create(car=car, defaults=defaults)
                        synced += 1
                except Exception as e:
                    logger.error(f"[SYNC-REPORTS] Error in table '{table}': {e}")
                    failed += 1
            cursor.close()
            return {'synced': synced, 'failed': failed}
        except Exception as e:
            logger.error(f"[SYNC-REPORTS] Fatal: {e}")
            return {'synced': 0, 'failed': 0}

    # ─────────────────────────────────────────────────────────────────────────
    # Evaluations
    # ─────────────────────────────────────────────────────────────────────────
    def _sync_evaluations_data(self, config):
        """مزامنة جدول التقييمات (evaluation) من Supabase"""
        try:
            from cars.models import Evaluation
            from accounts.models import CustomUser
            conn = self.get_connection(config)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public' AND LOWER(table_name) = 'evaluation'
            """)
            tables = [r[0] for r in cursor.fetchall()]
            if not tables:
                logger.info(f"[SYNC] Table 'evaluation' not found in {config.name}")
                cursor.close()
                return {'synced': 0, 'failed': 0}

            synced = 0
            failed = 0
            for table in tables:
                try:
                    cursor.execute(f'SELECT * FROM "{table}"')
                    columns = [d[0] for d in cursor.description]
                    rows = cursor.fetchall()
                    logger.info(f"[SYNC] Evaluation: {len(rows)} rows in '{table}'")
                    for row in rows:
                        data = dict(zip(columns, row))
                        car_vin = data.get('car_id') or data.get('vin')
                        user_id = data.get('user_id')
                        if not car_vin:
                            failed += 1
                            continue
                        try:
                            car = Cars.objects.get(vin=car_vin)
                        except Cars.DoesNotExist:
                            failed += 1
                            continue
                        # حاول إيجاد المستخدم، إن لم يوجد تخطَّ السجل
                        try:
                            user = CustomUser.objects.get(pk=user_id)
                        except Exception:
                            logger.warning(f"[SYNC-EVAL] User {user_id} not found, skipping.")
                            failed += 1
                            continue
                        defaults = {
                            'rate':             int(data.get('rate') or 3),
                            'comment':          data.get('comment') or '',
                            'pros':             data.get('pros') or '',
                            'cons':             data.get('cons') or '',
                            'would_recommend':  bool(data.get('would_recommend', True)),
                        }
                        Evaluation.objects.update_or_create(
                            car=car, user=user, defaults=defaults
                        )
                        synced += 1
                except Exception as e:
                    logger.error(f"[SYNC-EVAL] Error in table '{table}': {e}")
                    failed += 1
            cursor.close()
            return {'synced': synced, 'failed': failed}
        except Exception as e:
            logger.error(f"[SYNC-EVAL] Fatal: {e}")
            return {'synced': 0, 'failed': 0}

    # ─────────────────────────────────────────────────────────────────────────
    # ImageCar
    # ─────────────────────────────────────────────────────────────────────────
    def _sync_image_car_data(self, config):
        """مزامنة جدول صور السيارات (image_car) من Supabase"""
        try:
            from cars.models import ImageCar
            conn = self.get_connection(config)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public' AND LOWER(table_name) = 'image_car'
            """)
            tables = [r[0] for r in cursor.fetchall()]
            if not tables:
                logger.info(f"[SYNC] Table 'image_car' not found in {config.name}")
                cursor.close()
                return {'synced': 0, 'failed': 0}

            synced = 0
            failed = 0
            for table in tables:
                try:
                    cursor.execute(f'SELECT * FROM "{table}"')
                    columns = [d[0] for d in cursor.description]
                    rows = cursor.fetchall()
                    logger.info(f"[SYNC] ImageCar: {len(rows)} rows in '{table}'")
                    for row in rows:
                        data = dict(zip(columns, row))
                        car_vin = data.get('car_id') or data.get('vin')
                        if not car_vin:
                            failed += 1
                            continue
                        try:
                            car = Cars.objects.get(vin=car_vin)
                        except Cars.DoesNotExist:
                            failed += 1
                            continue
                        
                        # استخراج الصورة (قد تكون URL أو Binary أو Base64)
                        raw_image = data.get('img_car') or data.get('image') or data.get('img')
                        if not raw_image:
                            failed += 1
                            continue
                        
                        # تحويل الصورة إلى رابط Data URL
                        data_url = self._process_image_to_data_url(raw_image, source_name=f"CarImage-{car_vin}")
                        
                        if data_url:
                            # تجنب تكرار الصورة بنفس الرابط لنفس السيارة
                            ImageCar.objects.get_or_create(
                                car=car,
                                img_car=data_url,
                            )
                            synced += 1
                            logger.info(f"[SYNC-IMAGECAR] ✓ Synced image URL for VIN: {car_vin}")
                        else:
                            failed += 1
                            logger.warning(f"[SYNC-IMAGECAR] ✗ Failed to process image URL for VIN: {car_vin}")
                except Exception as e:
                    logger.error(f"[SYNC-IMAGECAR] Error in table '{table}': {e}")
                    failed += 1
            cursor.close()
            return {'synced': synced, 'failed': failed}
        except Exception as e:
            logger.error(f"[SYNC-IMAGECAR] Fatal: {e}")
            return {'synced': 0, 'failed': 0}

    # ─────────────────────────────────────────────────────────────────────────
    # AccidentImages
    # ─────────────────────────────────────────────────────────────────────────
    def _sync_accident_images_data(self, config):
        """مزامنة جدول صور الحوادث من Supabase
        
        الجدول في Supabase اسمه 'accident_image' (بدون s)
        ويحتوي على:
          - accident_image_id  (PK)
          - car_id             (FK → Cars.VIN)
          - accident_image_url (رابط URL للصورة)
        """
        try:
            from cars.models import AccidentImage
            conn = self.get_connection(config)
            cursor = conn.cursor()

            # الجدول قد يكون بأسماء مختلفة — نبحث عن كل الاحتمالات
            cursor.execute("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public'
                AND LOWER(table_name) IN (
                    'accident_image',
                    'accident_images',
                    'accidentimage',
                    'accidentimages',
                    'cars_accidentimage'
                )
            """)
            tables = [r[0] for r in cursor.fetchall()]
            if not tables:
                logger.info(f"[SYNC] Table 'accident_image' not found in {config.name} — skipping.")
                cursor.close()
                return {'synced': 0, 'failed': 0}

            # اكتشاف أعمدة الجدول الفعلية مرة واحدة
            synced = 0
            failed = 0
            for table in tables:
                try:
                    # اكتشاف الأعمدة أولاً
                    cursor.execute(
                        "SELECT column_name FROM information_schema.columns "
                        "WHERE table_schema='public' AND table_name=%s",
                        (table,)
                    )
                    col_names = {r[0].lower() for r in cursor.fetchall()}

                    # تحديد عمود الصورة (URL أو binary)
                    img_url_col  = None
                    img_bin_col  = None
                    for candidate in ('accident_image_url', 'img_url', 'image_url', 'url'):
                        if candidate in col_names:
                            img_url_col = candidate
                            break
                    for candidate in ('accident_image', 'image', 'img', 'image_data'):
                        if candidate in col_names and candidate != img_url_col:
                            img_bin_col = candidate
                            break

                    cursor.execute(f'SELECT * FROM "{table}"')
                    columns = [d[0] for d in cursor.description]
                    rows = cursor.fetchall()
                    logger.info(
                        f"[SYNC] AccidentImages ('{table}'): {len(rows)} rows | "
                        f"url_col={img_url_col}, bin_col={img_bin_col}"
                    )

                    for row in rows:
                        data = dict(zip(columns, row))
                        # استخراج VIN من car_id (FK في Supabase)
                        car_vin = data.get('car_id') or data.get('vin') or data.get('VIN')
                        if not car_vin:
                            failed += 1
                            continue
                        try:
                            car = Cars.objects.get(vin=car_vin)
                        except Cars.DoesNotExist:
                            logger.warning(f"[SYNC-ACCIDENT] Car VIN '{car_vin}' not found locally.")
                            failed += 1
                            continue

                        ext_id       = data.get('accident_image_id')
                        image_url    = data.get(img_url_col) if img_url_col else None
                        image_bytes  = data.get(img_bin_col) if img_bin_col else None
                        
                        # إذا كان في Supabase URL موجود، نحتفظ به كما هو.
                        if image_url:
                            processed_url = image_url
                        elif image_bytes:
                            processed_url = self._process_image_to_data_url(
                                image_bytes,
                                source_name=f"AccidentImage-{car_vin}"
                            )
                        else:
                            processed_url = None

                        defaults = {
                            'ai_description':      data.get('ai_description') or '',
                            'ai_accident_type':    data.get('ai_accident_type') or None,
                            'ai_confidence_score': data.get('ai_confidence_score') or None,
                            'accident_image':      processed_url,
                        }
                        if data.get('ai_analysis_data'):
                            defaults['ai_analysis_data'] = data['ai_analysis_data']

                        if not processed_url and image_url:
                            # إذا فشل التحويل وكان لدينا رابط، نحتفظ بالرابط في الوصف
                            defaults['ai_description'] = (
                                (defaults.get('ai_description') or '') +
                                f'\n[image_url: {image_url}]'
                            ).strip()

                        if processed_url:
                            logger.info(f"[SYNC-ACCIDENT] ✓ Processed image URL for VIN: {car_vin}")
                        elif image_url:
                            logger.warning(f"[SYNC-ACCIDENT] ! Could not convert to Data URL for VIN: {car_vin}")

                        if ext_id:
                            AccidentImage.objects.update_or_create(
                                accident_image_id=ext_id,
                                defaults={'car': car, **defaults}
                            )
                        else:
                            AccidentImage.objects.create(car=car, **defaults)
                        synced += 1

                except Exception as e:
                    logger.error(f"[SYNC-ACCIDENT] Error in table '{table}': {e}")
                    failed += 1

            cursor.close()
            return {'synced': synced, 'failed': failed}
        except Exception as e:
            logger.error(f"[SYNC-ACCIDENT] Fatal: {e}")
            return {'synced': 0, 'failed': 0}


    # ─────────────────────────────────────────────────────────────────────────
    # ContactMessages
    # ─────────────────────────────────────────────────────────────────────────
    def _sync_contact_messages_data(self, config):
        """مزامنة جدول رسائل التواصل (ContactMessages) من Supabase"""
        try:
            from cars.models import ContactMessage
            conn = self.get_connection(config)
            cursor = conn.cursor()
            # الجدول قد يكون بأسماء مختلفة
            cursor.execute("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public'
                AND LOWER(table_name) IN ('contactmessages', 'contact_messages', 'contactmessage')
            """)
            tables = [r[0] for r in cursor.fetchall()]
            if not tables:
                logger.info(f"[SYNC] Table 'ContactMessages' not found in {config.name}")
                cursor.close()
                return {'synced': 0, 'failed': 0}

            synced = 0
            failed = 0
            for table in tables:
                try:
                    cursor.execute(f'SELECT * FROM "{table}"')
                    columns = [d[0] for d in cursor.description]
                    rows = cursor.fetchall()
                    logger.info(f"[SYNC] ContactMessages: {len(rows)} rows in '{table}'")
                    for row in rows:
                        data = dict(zip(columns, row))
                        ref_num = data.get('reference_number')
                        defaults = {
                            'name':    data.get('name') or 'Unknown',
                            'email':   data.get('email') or 'unknown@example.com',
                            'phone':   data.get('phone') or '',
                            'subject': data.get('subject') or 'general',
                            'message': data.get('message') or '',
                            'vin':     data.get('vin') or None,
                            'urgent':  bool(data.get('urgent', False)),
                            'is_read': bool(data.get('is_read', False)),
                        }
                        if ref_num:
                            ContactMessage.objects.update_or_create(
                                reference_number=ref_num, defaults=defaults
                            )
                        else:
                            ContactMessage.objects.create(**defaults)
                        synced += 1
                except Exception as e:
                    logger.error(f"[SYNC-CONTACT] Error in table '{table}': {e}")
                    failed += 1
            cursor.close()
            return {'synced': synced, 'failed': failed}
        except Exception as e:
            logger.error(f"[SYNC-CONTACT] Fatal: {e}")
            return {'synced': 0, 'failed': 0}


    def _sync_mapped_tables(self, config):
        """Sync external tables that have active DataMapping definitions."""
        mappings = DataMapping.objects.filter(
            db_config=config,
            is_active=True,
            external_table__isnull=False,
            local_app__isnull=False,
            local_model__isnull=False,
        )

        if not mappings.exists():
            return {'synced': 0, 'failed': 0, 'tables_synced': 0}

        grouped = {}
        for mapping in mappings:
            table_name = mapping.external_table.strip().lower()
            # تجاهل جدول Reports لأنه يُنشأ تلقائياً عند مزامنة السيارات
            if table_name in {t.lower() for t in self.AUTO_MANAGED_TABLES}:
                logger.info(f"[MAPPED-SYNC] Skipping auto-managed table '{table_name}'")
                continue
            grouped.setdefault(table_name, []).append(mapping)

        total_synced = 0
        total_failed = 0
        total_tables = 0

        for table_name, mappings_list in grouped.items():
            result = self._sync_external_table_with_mappings(config, table_name, mappings_list)
            total_synced += result.get('synced', 0)
            total_failed += result.get('failed', 0)
            if result.get('tables_synced'):
                total_tables += result['tables_synced']

        return {
            'synced': total_synced,
            'failed': total_failed,
            'tables_synced': total_tables,
        }

    def _sync_external_table_with_mappings(self, config, table_name, mappings_list):
        """Sync one external table using its DataMapping definitions."""
        try:
            conn = self.get_connection(config)
            cursor = conn.cursor()

            cursor.execute(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public' AND LOWER(table_name) = %s",
                (table_name.lower(),)
            )
            if not cursor.fetchone():
                cursor.close()
                logger.info(
                    f"[MAPPED-SYNC] External table '{table_name}' not found for {config.name}, skipping."
                )
                return {'synced': 0, 'failed': 0, 'tables_synced': 0}

            cursor.execute(f'SELECT * FROM "{table_name}"')
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
        except Exception as e:
            if 'cursor' in locals() and cursor:
                cursor.close()
            if 'does not exist' in str(e).lower():
                logger.info(
                    f"[MAPPED-SYNC] External table '{table_name}' does not exist for {config.name}, skipping."
                )
                return {'synced': 0, 'failed': 0, 'tables_synced': 0}
            logger.error(f"Failed to read external mapped table '{table_name}': {e}")
            return {'synced': 0, 'failed': 1, 'tables_synced': 0}

        cursor.close()
        normalized_columns = {col.lower(): col for col in columns}
        saved = 0
        failed = 0

        mapping = mappings_list[0]
        try:
            local_model = apps.get_model(mapping.local_app, mapping.local_model)
        except LookupError:
            logger.error(f"Could not resolve local model '{mapping.local_app}.{mapping.local_model}'")
            return {'synced': 0, 'failed': len(rows), 'tables_synced': 0}

        field_mappings = self._normalize_field_mappings(mapping.field_mappings)
        if not field_mappings:
            logger.warning(f"No field mappings for external table '{table_name}'")
            return {'synced': 0, 'failed': len(rows), 'tables_synced': 0}

        for row in rows:
            record = dict(zip(columns, row))
            low_record = {k.lower(): v for k, v in record.items()}
            defaults = {}
            lookup = {}

            for item in field_mappings:
                source_field = item.get('source_field', '').strip()
                target_field = item.get('target_field', '').strip()
                if not source_field or not target_field:
                    continue

                value = None
                if source_field.lower() in low_record:
                    value = low_record[source_field.lower()]
                elif source_field in record:
                    value = record[source_field]

                if value is not None:
                    defaults[target_field] = value

            if not defaults:
                failed += 1
                continue

            pk_name = local_model._meta.pk.name
            if pk_name in defaults:
                lookup[pk_name] = defaults.pop(pk_name)
            elif 'vin' in defaults:
                lookup['vin'] = defaults.pop('vin')
            elif 'id' in defaults:
                lookup['id'] = defaults.pop('id')
            else:
                first_key = next(iter(defaults))
                lookup[first_key] = defaults[first_key]

            try:
                from django.db import IntegrityError
                try:
                    local_model.objects.update_or_create(defaults=defaults, **lookup)
                    saved += 1
                except IntegrityError as ie:
                    # قد يحدث تعارض في الـ primary key إذا كان AutoField
                    # نحاول get_or_create كبديل
                    try:
                        obj = local_model.objects.filter(**lookup).first()
                        if obj:
                            for k, v in defaults.items():
                                setattr(obj, k, v)
                            obj.save()
                            saved += 1
                        else:
                            logger.error(f"IntegrityError and record not found in '{table_name}': {ie}")
                            failed += 1
                    except Exception as fallback_e:
                        logger.error(f"Fallback upsert failed in '{table_name}': {fallback_e}")
                        failed += 1
            except Exception as e:
                logger.error(f"Failed to upsert record in '{table_name}': {e}")
                failed += 1

        return {'synced': saved, 'failed': failed, 'tables_synced': 1}

    def _normalize_field_mappings(self, field_mappings):
        """Normalize raw field mappings to a uniform list."""
        if isinstance(field_mappings, dict):
            field_mappings = [field_mappings]

        normalized = []
        for item in field_mappings or []:
            if not isinstance(item, dict):
                continue
            source_field = item.get('source_field') or item.get('source') or item.get('sourceField')
            target_field = item.get('target_field') or item.get('target') or item.get('targetField')
            if source_field and target_field:
                normalized.append({
                    'source_field': str(source_field),
                    'target_field': str(target_field)
                })
        return normalized
    
    def _parse_gear_type(self, gear_data):
        """تحويل نوع ناقل الحركة — يدعم العربية والإنجليزية"""
        try:
            if isinstance(gear_data, int):
                return gear_data if gear_data in (1, 2) else 2
            if gear_data is None:
                return 2
            gear_lower = str(gear_data).lower().strip()
            gear_mapping = {
                'manual': 1, 'stick': 1, 'عادي': 1, 'يدوي': 1, 'مانيوال': 1, '1': 1,
                'automatic': 2, 'auto': 2, 'cvt': 2, 'dsg': 2, 'tiptronic': 2,
                'أوتوماتيك': 2, 'اوتوماتيك': 2, 'تلقائي': 2, 'أتوماتيك': 2, '2': 2,
            }
            return gear_mapping.get(gear_lower, 2)
        except Exception:
            return 2
    
    def _parse_year(self, year_data):
        """تحويل سنة الصنع"""
        if not year_data:
            return None
        
        try:
            if isinstance(year_data, (int, float)):
                return int(year_data)
            elif isinstance(year_data, str):
                # استخراج الأرقام من النص
                import re
                match = re.search(r'\d{4}', year_data)
                if match:
                    year = int(match.group())
                    # التحقق من أن السنة معقولة
                    if 1900 <= year <= 2100:
                        return year
            return None
            
        except (ValueError, TypeError, AttributeError):
            return None
    
    def _auto_discover_tables(self, config):
        """الاكتشاف التلقائي للجداول والعلاقات مع ترتيب المزامنة الصحيح"""
        conn = self.get_connection(config)
        cursor = conn.cursor()
        
        try:
            # جلب جميع الجداول
            cursor.execute("""
                SELECT table_name, table_type
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY 
                    CASE 
                        WHEN table_name = 'cars' THEN 1
                        WHEN table_name = 'repairshops' THEN 2
                        ELSE 3
                    END,
                    table_name
            """)
            tables_info = cursor.fetchall()
            
            tables = []
            for table_name, table_type in tables_info:
                # تخطي جداول النظام
                if table_name.startswith('pg_') or table_name in ['django_migrations', 'auth_permission']:
                    continue
                
                # جلب معلومات الأعمدة
                cursor.execute(f"""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = '{table_name}' 
                    ORDER BY ordinal_position
                """)
                columns_info = cursor.fetchall()
                
                # جلب عدد السجلات
                cursor.execute(f'SELECT COUNT(*) FROM "{table_name}"')
                row_count = cursor.fetchone()[0]
                
                # جلب المفاتيح الخارجية
                cursor.execute(f"""
                    SELECT
                        tc.constraint_name,
                        kcu.column_name,
                        ccu.table_name AS foreign_table_name,
                        ccu.column_name AS foreign_column_name
                    FROM information_schema.table_constraints AS tc 
                    JOIN information_schema.key_column_usage AS kcu
                        ON tc.constraint_name = kcu.constraint_name
                        AND tc.table_schema = kcu.table_schema
                    JOIN information_schema.constraint_column_usage AS ccu
                        ON ccu.constraint_name = tc.constraint_name
                        AND ccu.table_schema = tc.table_schema
                    WHERE tc.constraint_type = 'FOREIGN KEY' 
                    AND tc.table_name = '{table_name}'
                """)
                foreign_keys = cursor.fetchall()
                
                tables.append({
                    'name': table_name,
                    'type': table_type,
                    'columns': columns_info,
                    'row_count': row_count,
                    'foreign_keys': foreign_keys,
                    'model_mapping': self._find_model_for_table(table_name)
                })
            
            return {
                'tables_discovered': len(tables),
                'tables': tables,
                'database_type': 'PostgreSQL',
                'discovery_time': timezone.now().isoformat()
            }
            
        finally:
            cursor.close()
    
    def _parallel_sync_tables(self, config, tables):
        """مزامنة الجداول بشكل متوازي"""
        start_time = timezone.now()
        total_saved = 0
        total_failed = 0
        tables_synced = 0
        
        # تقسيم الجداول إلى مجموعات
        table_groups = [tables[i::self.max_workers] for i in range(self.max_workers)]
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # إرسال مهام المزامنة
            future_to_group = {
                executor.submit(self._sync_table_group, config, group): group 
                for group in table_groups if group
            }
            
            # جمع النتائج
            for future in as_completed(future_to_group):
                try:
                    result = future.result()
                    total_saved += result['saved']
                    total_failed += result['failed']
                    tables_synced += result['tables_count']
                    
                    logger.info(f"Parallel sync group completed: {result['saved']} saved, {result['failed']} failed")
                    
                except Exception as e:
                    logger.error(f"Parallel sync group failed: {str(e)}")
                    total_failed += len(future_to_group[future])
        
        return {
            'total_saved': total_saved,
            'total_failed': total_failed,
            'tables_synced': tables_synced,
            'duration': (timezone.now() - start_time).total_seconds()
        }
    
    def _sequential_sync_tables(self, config, tables):
        """مزامنة الجداول بشكل متسلسل"""
        start_time = timezone.now()
        total_saved = 0
        total_failed = 0
        tables_synced = 0
        
        for table_info in tables:
            try:
                result = self._sync_single_table(config, table_info)
                total_saved += result['saved']
                total_failed += result['failed']
                tables_synced += 1
                
                logger.info(f"Sequential sync {table_info['name']}: {result['saved']} saved, {result['failed']} failed")
                
            except Exception as e:
                logger.error(f"Sequential sync failed for {table_info['name']}: {str(e)}")
                total_failed += 1
        
        return {
            'total_saved': total_saved,
            'total_failed': total_failed,
            'tables_synced': tables_synced,
            'duration': (timezone.now() - start_time).total_seconds()
        }
    
    def _sync_table_group(self, config, table_group):
        """مزامنة مجموعة من الجداول"""
        saved = 0
        failed = 0
        
        for table_info in table_group:
            try:
                result = self._sync_single_table(config, table_info)
                saved += result['saved']
                failed += result['failed']
                
            except Exception as e:
                logger.error(f"Table group sync failed for {table_info['name']}: {str(e)}")
                failed += 1
        
        return {
            'saved': saved,
            'failed': failed,
            'tables_count': len(table_group)
        }
    
    def _sync_single_table(self, config, table_info):
        """مزامنة جدول واحد مع دعم الجداول المحددة"""
        table_name = table_info['name']
        columns_info = table_info['columns']
        
        # تحديد الجداول المستهدفة للمزامنة (بدون صور)
        target_tables = ['cars', 'repairshops']
        
        if table_name.lower() not in target_tables:
            logger.info(f"Skipping table {table_name} - not in target tables")
            return {'saved': 0, 'failed': 0}
        
        max_retries = 3
        retry_delay = 1  # seconds
        
        for attempt in range(max_retries):
            conn = None
            cursor = None
            try:
                conn = self.get_connection(config)
                cursor = conn.cursor()
                
                # جلب البيانات من الجدول
                cursor.execute(f'SELECT * FROM "{table_name}"')
                rows = cursor.fetchall()
                
                # الحصول على أسماء الأعمدة
                column_names = [desc[0] for desc in cursor.description]
                
                # تحويل البيانات إلى قاموس
                data_list = []
                for row in rows:
                    row_dict = dict(zip(column_names, row))
                    data_list.append(row_dict)
                
                # مزامنة البيانات حسب نوع الجدول (بدون صور)
                if table_name.lower() == 'cars':
                    result = self._sync_cars_data_from_list(data_list, config)
                elif table_name.lower() == 'repairshops':
                    # التأكد من وجود السيارات أولاً
                    result = self._sync_repairshops_data_from_list(data_list, config)
                else:
                    # تخطي جداول الصور وغيرها من الجداول غير المدعومة
                    logger.info(f"Skipping table {table_name} - images and other tables are not synced")
                    result = {'saved': 0, 'failed': 0}
                
                return result
                
            except Exception as e:
                error_msg = str(e)
                if "database is locked" in error_msg.lower() and attempt < max_retries - 1:
                    logger.warning(f"Database locked for {table_name}, retrying in {retry_delay}s (attempt {attempt + 1}/{max_retries})")
                    import time
                    time.sleep(retry_delay)
                    retry_delay *= 2  # exponential backoff
                    continue
                else:
                    logger.error(f"Error syncing table {table_name}: {error_msg}")
                    return {'saved': 0, 'failed': len(data_list) if 'data_list' in locals() else 0}
            finally:
                if cursor:
                    try:
                        cursor.close()
                    except:
                        pass
                # Don't close conn here as it's managed by the pool
    
    def _sync_cars_data_from_list(self, data_list, config):
        """مزامنة بيانات السيارات"""
        from cars.models import Cars
        from django.db import transaction
        
        saved_count = 0
        failed_count = 0
        
        # Process in smaller batches to reduce locking
        batch_size = 50
        
        for i in range(0, len(data_list), batch_size):
            batch = data_list[i:i + batch_size]
            
            try:
                with transaction.atomic():
                    for data in batch:
                        try:
                            # تحويل البيانات لتتوافق مع نموذج Cars
                            car_data = {
                                'vin': data.get('vin'),
                                'name_car': data.get('name_car'),
                                'make': data.get('make'),
                                'model': data.get('model'),
                                'year': data.get('year'),
                                'color': data.get('color'),
                                'seating_capacity': data.get('seating_capacity'),

                                'num_cylinders': data.get('num_cylinders'),
                                'fuel_type': data.get('fuel_type'),
                                'engine_capacity': self._parse_engine_capacity(data.get('engine_capacity')),
                                'gear_type': self._convert_gear_type(data.get('gear_type')),
                                'customs_num': data.get('customs_num'),
                                'customs_date': self._parse_date(data.get('customs_date')),
                                'receipt_number': data.get('receipt_number'),
                                'receipt_date': self._parse_date(data.get('receipt_date')),
                                'mileage': data.get('mileage')
                            }
                            
                            # إزالة القيم الفارغة
                            car_data = {k: v for k, v in car_data.items() if v is not None}
                            
                            if not car_data.get('vin'):
                                failed_count += 1
                                continue
                            
                            # تحديث أو إنشاء السيارة
                            car, created = Cars.objects.update_or_create(
                                vin=car_data['vin'],
                                defaults=car_data
                            )
                            
                            saved_count += 1
                            logger.info(f"{'Created' if created else 'Updated'} car: {car_data['vin']}")
                            
                        except Exception as e:
                            failed_count += 1
                            logger.error(f"Error syncing car data: {str(e)}")
                            continue
                            
            except Exception as e:
                logger.error(f"Batch transaction failed: {str(e)}")
                # Process individually if batch fails
                for data in batch:
                    try:
                        car_data = {
                            'vin': data.get('vin'),
                            'name_car': data.get('name_car'),
                            'make': data.get('make'),
                            'model': data.get('model'),
                            'year': data.get('year'),
                            'color': data.get('color'),
                            'seating_capacity': data.get('seating_capacity'),

                            'num_cylinders': data.get('num_cylinders'),
                            'fuel_type': data.get('fuel_type'),
                            'engine_capacity': self._parse_engine_capacity(data.get('engine_capacity')),
                            'gear_type': self._convert_gear_type(data.get('gear_type')),
                            'customs_num': data.get('customs_num'),
                            'customs_date': self._parse_date(data.get('customs_date')),
                            'receipt_number': data.get('receipt_number'),
                            'receipt_date': self._parse_date(data.get('receipt_date')),
                            'mileage': data.get('mileage')
                        }
                        
                        car_data = {k: v for k, v in car_data.items() if v is not None}
                        
                        if not car_data.get('vin'):
                            failed_count += 1
                            continue
                        
                        car, created = Cars.objects.update_or_create(
                            vin=car_data['vin'],
                            defaults=car_data
                        )
                        
                        saved_count += 1
                        logger.info(f"{'Created' if created else 'Updated'} car: {car_data['vin']}")
                        
                    except Exception as e:
                        failed_count += 1
                        logger.error(f"Error syncing car data individually: {str(e)}")
        
        return {'saved': saved_count, 'failed': failed_count}
    
    def _convert_gear_type(self, gear_type):
        """تحويل نوع ناقل الحركة من نص إلى رقم"""
        if not gear_type:
            # Default to automatic (2) if no value provided
            return 2
        
        gear_mapping = {
            'manual': 1,
            'automatic': 2,
            'auto': 2,
            'cvt': 2,
            'dual-clutch': 2,
            'dsg': 2,
            'tiptronic': 2,
            'عادي': 1,
            'أوتوماتيك': 2,
            'يدوي': 1,
            'كلتش مزدوج': 2,
            'double clutch': 2
        }
        
        # Convert to lowercase and strip for matching
        gear_type_clean = str(gear_type).lower().strip()
        
        # Try to find exact match first
        if gear_type_clean in gear_mapping:
            return gear_mapping[gear_type_clean]
        
        # Try partial matching
        for key, value in gear_mapping.items():
            if key in gear_type_clean or gear_type_clean in key:
                return value
        
        # Default to automatic if no match found
        logger.warning(f"Unknown gear type '{gear_type}', defaulting to automatic (2)")
        return 2
    
    def _sync_repairshops_data_from_list(self, data_list, config):
        """مزامنة بيانات ورش الصيانة"""
        
        saved_count = 0
        failed_count = 0
        
        for data in data_list:
            try:
                # التحقق من وجود السيارة
                vin = data.get('vin')
                if not vin:
                    failed_count += 1
                    continue
                
                try:
                    car = Cars.objects.get(vin=vin)
                except Cars.DoesNotExist:
                    failed_count += 1
                    logger.warning(f"Car with VIN {vin} not found, skipping repairshop data")
                    continue
                
                # تحويل البيانات لتتوافق مع نموذج Repairshops
                repairshop_data = {
                    'car': car,
                    'mech_insp_desc': data.get('mech_insp_desc'),
                    'comp_scan_desc': data.get('comp_scan_desc')
                }
                
                # إزالة القيم الفارغة
                repairshop_data = {k: v for k, v in repairshop_data.items() if v is not None}
                
                # إنشاء سجل ورشة جديد
                repairshop = Repairshops.objects.create(**repairshop_data)
                saved_count += 1
                logger.info(f"Created repairshop data for VIN: {vin}")
                
            except Exception as e:
                failed_count += 1
                logger.error(f"Error syncing repairshop data: {str(e)}")
        
        return {'saved': saved_count, 'failed': failed_count}
    
    def _parse_date(self, date_str):
        """تحويل التاريخ من string إلى date object"""
        if not date_str:
            return None
        
        try:
            if isinstance(date_str, str):
                from datetime import datetime
                # محاولة تحليل التاريخ بصيغ مختلفة
                for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y']:
                    try:
                        return datetime.strptime(date_str, fmt).date()
                    except ValueError:
                        continue
            return date_str
        except Exception:
            return None
    
    def _parse_engine_capacity(self, engine_capacity):
        """تحويل سعة المحرك من نص مع وحدات عربية إلى رقم"""
        if not engine_capacity:
            return None
        
        try:
            if isinstance(engine_capacity, (int, float)):
                return int(engine_capacity)
            
            if isinstance(engine_capacity, str):
                # إزالة الوحدات العربية والرموز
                cleaned = engine_capacity.strip()
                
                # إزالة الوحدات العربية والإنجليزية
                arabic_units = ['سم³', 'سم2', 'سم٣', 'cc', 'cm3', 'cm³']
                for unit in arabic_units:
                    cleaned = cleaned.replace(unit, '').strip()
                
                # إزالة الفواصل والمسافات
                cleaned = cleaned.replace(',', '').replace(' ', '')
                
                # استخراج الرقم الأول
                import re
                match = re.search(r'\d+', cleaned)
                if match:
                    return int(match.group())
                
                # محاولة تحويل النظيف إلى رقم
                if cleaned:
                    return int(float(cleaned))
            
            return None
            
        except (ValueError, TypeError, AttributeError):
            logger.warning(f"Failed to parse engine capacity: {engine_capacity}")
            return None
    
    def _find_model_for_table(self, table_name):
        """البحث عن النموذج المقابل للجدول"""
        from django.apps import apps
        
        # قائمة التعيينات بين الجداول والنماذج (بدون صور)
        table_model_mapping = {
            'cars': 'cars.Cars',
            'repairshops': 'cars.Repairshops'
        }
        
        return table_model_mapping.get(table_name.lower())
