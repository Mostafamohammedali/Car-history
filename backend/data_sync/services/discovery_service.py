import logging
import re
import difflib
import requests
from django.utils import timezone
from ..models import ExternalDBConfig, DataMapping
from .database_service import DatabaseSyncService

logger = logging.getLogger(__name__)

# خريطة المرادفات للحقول المحلية
# الترتيب مهم: الأكثر دقة أولاً
SYNONYM_MAP = {
    'make': ['make', 'brand', 'manufacturer', 'man_name', 'make_name', 'марка', 'الشركة', 'الصانع'],
    'model': ['model', 'car_model', 'model_name', 'mod_name', 'модель', 'الموديل', 'الطراز'],
    'year': ['year', 'production_year', 'model_year', 'year_prod', 'год', 'السنة', 'سنة الصنع'],
    'vin': ['vin', 'chassis', 'serial', 'id_number', 'вин', 'الشاصي', 'رقم الهيكل'],
    'color': ['color', 'colour', 'paint', 'exterior_color', 'لون', 'اللون'],
    'mileage': ['mileage', 'odometer', 'distance', 'km', 'المسافة', 'الممشى', 'العداد'],
    'fuel_type': ['fuel_type', 'fuel', 'fueltype', 'energy_source', 'الوقود', 'نوع الوقود'],
    'gear_type': ['gear_type', 'transmission', 'gearbox', 'الجير', 'ناقل الحركة'],
    'num_cylinders': ['cylinder', 'cylinders', 'num_cylinders', 'enginecylinders'],
    'trim': ['trim', 'trim_level', 'series', 'variant'],
}

# حقول يجب تجنبها لأنها IDs أو codes وليست قيم نصية مفيدة
BLACKLISTED_SUFFIXES = {
    'id', 'code', 'key', 'uuid', 'slug', 'nicename', 'href',
    'manufacturercode', 'squishvin',
}

# تفضيل المسارات التي تنتهي بـ 'name' للحقول النصية
PREFER_NAME_SUFFIX_FIELDS = {'make', 'model'}

class DiscoveryService:
    """خدمة الاكتشاف التلقائي للحقول والتعيينات التلقائية"""

    def __init__(self):
        self.db_service = DatabaseSyncService()

    def discover_and_map(self, config_id):
        """العملية الرئيسية لاكتشاف المappings لمصدر معين"""
        try:
            config = ExternalDBConfig.objects.get(id=config_id)
            if config.name.upper().startswith('API:'):
                return self._discover_api_source(config)
            else:
                return self._discover_db_source(config)
        except Exception as e:
            logger.error(f"[DISCOVERY] Critical error for config {config_id}: {e}")
            return {'success': False, 'error': str(e)}

    def _discover_db_source(self, config):
        """اكتشاف الجداول والأعمدة في قاعدة بيانات خارجية"""
        try:
            conn = self.db_service.get_connection(config)
            cursor = conn.cursor()

            # 1. البحث عن الجداول المرتبطة بالسيارات
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND (table_name ILIKE '%car%' OR table_name ILIKE '%vehicle%' OR table_name ILIKE '%repair%')
            """)
            tables = [row[0] for row in cursor.fetchall()]

            if not tables:
                return {'success': False, 'message': 'لم يتم العثور على جداول مرتبطة بالسيارات.'}

            results = []
            for table in tables:
                # 2. تحليل أعمدة كل جدول
                cursor.execute(f"""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = '{table}'
                """)
                columns = {row[0]: row[1] for row in cursor.fetchall()}
                
                # 3. محاولة المطابقة
                mappings = self._match_fields(columns.keys())
                
                if mappings:
                    # 4. حفظ أو تحديث التعيينات في قاعدة البيانات
                    self._persist_mappings(config, table, mappings)
                    results.append({'table': table, 'mapped_fields': len(mappings)})

            return {'success': True, 'results': results}

        except Exception as e:
            logger.error(f"[DISCOVERY-DB] Error for {config.name}: {e}")
            return {'success': False, 'error': str(e)}

    def _discover_api_source(self, config):
        """اكتشاف حقول الـ API عبر الفحص التقني أو طلب عينة"""
        try:
            from cars.models import Cars
            vin = config.test_vin or "TEST_VIN"
            
            # جلب بيانات السيارة التجريبية لتعبئة المتغيرات العالمية
            car = Cars.objects.filter(vin__iexact=vin).first()
            make = car.make if car else ''
            model_name = car.model if car else ''
            year_str = str(car.year) if car else ''

            url = config.host
            placeholders = {
                '{vin}': vin,
                '{VIN}': vin,
                '{make}': make,
                '{model}': model_name,
                '{year}': year_str
            }
            
            found_placeholder = False
            for p, val in placeholders.items():
                if p in url:
                    url = url.replace(p, str(val))
                    found_placeholder = True
            
            if not found_placeholder:
                sep = '&' if '?' in url else '?'
                url = f"{url}{sep}vin={vin}"

            headers = {}
            params = {}
            if config.user:
                if config.user.lower() in ('apikey', 'api_key', 'api-key'):
                    params[config.user] = config.password
                else:
                    headers[config.user] = config.password
            if config.dbname:
                headers['X-API-SECRET'] = config.dbname

            logger.info(f"[DISCOVERY-API] Probing URL: {url}")
            response = requests.get(url, headers=headers, params=params, timeout=10)
            
            if response.status_code == 429:
                import time
                logger.warning("[DISCOVERY-API] Rate limited (429), retrying after 2s...")
                time.sleep(2)
                response = requests.get(url, headers=headers, params=params, timeout=10)

            if response.status_code != 200:
                return {
                    'success': False, 
                    'message': f'فشل طلب الـ API (Status: {response.status_code}). يرجى التأكد من صحة البيانات ورقم الهيكل التجريبي.'
                }

            try:
                data = response.json()
            except Exception:
                return {'success': False, 'message': 'استجابة الـ API ليست بتنسيق JSON صالح.'}

            # 5. تسطيح الـ JSON (Flattening) للبحث عن الحقول العميقة
            flat_fields = self._flatten_json(data)
            mappings = self._match_fields(flat_fields.keys())

            if mappings:
                self._persist_mappings(config, "api_endpoint", mappings)
                return {'success': True, 'mapped_fields': len(mappings), 'fields': list(mappings.keys())}
            
            return {'success': False, 'message': 'لم يتم العثور على حقول مطابقة تلقائياً.'}

        except Exception as e:
            logger.error(f"[DISCOVERY-API] Error for {config.name}: {e}")
            return {'success': False, 'error': str(e)}

    def _match_fields(self, external_fields):
        """
        منطق المطابقة الذكي بين الحقول الخارجية والمحلية.

        قواعد الأولوية:
        1. مسار يبدأ بنفس اسم الحقل وينتهي بـ 'name' (مثال: make.name → make)
        2. تطابق مباشر مع المرادفات (score=1.0)
        3. تجنب الحقول المُدرجة في القائمة السوداء (IDs, codes)
        4. تفضيل المسارات الأقصر (أقل عمقاً)
        5. تطابق تقريبي (Fuzzy) كآخر خيار
        """
        results = {}
        external_fields = list(external_fields)

        for local_field, synonyms in SYNONYM_MAP.items():
            best_match = None
            highest_score = 0

            for ext_field in external_fields:
                parts = ext_field.lower().split('.')
                last_part = parts[-1]
                first_part = parts[0]

                # ── 0. أعلى أولوية: مسار يبدأ بالحقل وينتهي بـ 'name' ──
                # مثال: make.name → make, model.name → model
                if (
                    last_part == 'name'
                    and first_part in synonyms
                    and local_field in PREFER_NAME_SUFFIX_FIELDS
                ):
                    score = 1.2  # أعلى من أي شيء آخر
                    if score > highest_score:
                        highest_score = score
                        best_match = ext_field
                    continue

                # تجاهل الحقول المُدرجة في القائمة السوداء
                if last_part in BLACKLISTED_SUFFIXES:
                    continue

                # ── 1. تطابق مباشر ──────────────────────────────────────
                if last_part in synonyms:
                    score = 1.0
                    # تفضيل المسارات الأقصر (أقل نقاط = أقل عمقاً)
                    depth_penalty = ext_field.count('.') * 0.01
                    score -= depth_penalty

                    if score > highest_score:
                        highest_score = score
                        best_match = ext_field
                    continue

                # ── 2. تطابق تقريبي (Fuzzy) ─────────────────────────────
                for syn in synonyms:
                    ratio = difflib.SequenceMatcher(None, last_part, syn).ratio()
                    if ratio > highest_score and ratio > 0.82:
                        if len(last_part) < 4:
                            continue
                        highest_score = ratio
                        best_match = ext_field

            if best_match:
                results[local_field] = best_match
                logger.debug(
                    f"[DISCOVERY] Matched '{local_field}' → '{best_match}' "
                    f"(score={highest_score:.2f})"
                )

        return results

    def _flatten_json(self, y, prefix=''):
        """دالة لتحويل JSON المتداخل إلى قاموس مسطح لسهولة التعيين"""
        out = {}
        if isinstance(y, dict):
            for a in y:
                # تخطي الجداول/المصفوفات الكبيرة جداً للحفاظ على الأداء
                val = y[a]
                if isinstance(val, (dict, list)):
                    out.update(self._flatten_json(val, prefix + a + '.'))
                else:
                    out[prefix + a] = val
        elif isinstance(y, list):
            # نأخذ أول عنصر فقط في المصفوفات لغرض تحليل الهيكل
            if len(y) > 0:
                out.update(self._flatten_json(y[0], prefix + '0.'))
        return out

    def _persist_mappings(self, config, table_name, mappings):
        """
        حفظ التعيينات المكتشفة في جدول DataMapping.

        mappings: dict من {local_field: api_path}
        يُخزَّن كـ dict مباشرة — APIMappingEngine يدعم هذا الشكل.
        """
        confidence = 0.9 if len(mappings) > 3 else 0.7

        DataMapping.objects.update_or_create(
            db_config=config,
            external_table=table_name,
            defaults={
                'local_app': 'cars',
                'local_model': 'Cars',
                # الصيغة الموحدة: {local_field: api_path}
                'field_mappings': mappings,
                'sync_strategy': 'batch_sync' if config.name.upper().startswith('API:') else 'full_sync',
                'confidence_score': confidence,
                'is_auto_discovered': True,
                'is_active': confidence > 0.85,
            }
        )
        logger.info(
            f"[DISCOVERY] Persisted {len(mappings)} mappings for '{config.name}' "
            f"(table: {table_name}, confidence: {confidence:.2f})"
        )
