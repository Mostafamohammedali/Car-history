"""
APIMappingEngine — نظام تعيين بيانات API المرن
================================================
يطبق DataMappings المخزنة في قاعدة البيانات على استجابات الـ API
مع دعم:
  - Nested JSON paths (مثال: Results.0.Make)
  - Flat JSON
  - Fallback بين APIs
  - Transformation rules
  - Logging تفصيلي
  - تجاهل الحقول المفقودة بدون كسر النظام
"""

import logging
import re
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ── الحقول المطلوبة لإنشاء سيارة جديدة ──────────────────────────────────────
REQUIRED_CAR_FIELDS = {'make', 'model', 'year'}

# ── القيم الافتراضية لكل حقل عند غياب البيانات ───────────────────────────────
FIELD_DEFAULTS: Dict[str, Any] = {
    'make': 'Unknown',
    'model': 'Unknown',
    'year': 2000,
    'color': 'Unknown',
    'fuel_type': 'other',
    'gear_type': 2,
    'engine_capacity': 2000,
    'mileage': 0,
    'seating_capacity': None,
    'num_cylinders': None,
    'trim': None,
    'engine': None,
}

# ── تطبيع قيم fuel_type ──────────────────────────────────────────────────────
FUEL_TYPE_MAP = {
    'gasoline': 'gasoline', 'gas': 'gasoline', 'petrol': 'gasoline', 'بنزين': 'gasoline',
    'diesel': 'diesel', 'ديزل': 'diesel',
    'electric': 'electric', 'ev': 'electric', 'كهربائي': 'electric',
    'hybrid': 'hybrid', 'هجين': 'hybrid',
}

# ── تطبيع قيم gear_type ──────────────────────────────────────────────────────
GEAR_TYPE_MAP = {
    'manual': 1, 'يدوي': 1, 'عادي': 1, '1': 1,
    'automatic': 2, 'auto': 2, 'أوتوماتيك': 2, 'تلقائي': 2, '2': 2,
    'cvt': 2, 'dsg': 2, 'tiptronic': 2,
}


class APIMappingEngine:
    """
    محرك تعيين بيانات API.

    الاستخدام:
        engine = APIMappingEngine()
        result = engine.apply_mappings(config, api_response_data)
        # result = {'make': 'Toyota', 'model': 'Camry', ...}
    """

    # ------------------------------------------------------------------
    # الدالة الرئيسية
    # ------------------------------------------------------------------

    def apply_mappings(
        self,
        config,
        api_data: Any,
        vin: str = '',
    ) -> Dict[str, Any]:
        """
        طبّق جميع DataMappings النشطة لـ config على api_data.

        Args:
            config:   ExternalDBConfig instance
            api_data: استجابة الـ API (dict أو list)
            vin:      رقم الهيكل (للـ logging فقط)

        Returns:
            قاموس بالحقول المستخرجة {local_field: value}
        """
        from .models import DataMapping

        mappings = DataMapping.objects.filter(
            db_config=config,
            is_active=True,
        ).order_by('-confidence_score')

        if not mappings.exists():
            logger.warning(
                f"[MAPPING] ⚠ لا توجد DataMappings نشطة للمصدر '{config.name}' — "
                f"VIN: {vin}"
            )
            return {}

        # تسطيح الـ JSON مرة واحدة لتحسين الأداء
        flat_data = self._flatten_json(api_data)

        merged: Dict[str, Any] = {}
        total_mapped = 0
        total_skipped = 0

        for mapping in mappings:
            field_map = mapping.field_mappings
            if not field_map:
                continue

            # field_mappings يمكن أن يكون dict أو list
            pairs = self._normalize_field_map(field_map)

            for local_field, api_path in pairs:
                if not local_field or not api_path:
                    continue

                # استخراج القيمة من الـ JSON (nested أو flat)
                raw_value = self._extract_value(api_data, flat_data, api_path)

                if raw_value is None or raw_value == '':
                    logger.debug(
                        f"[MAPPING] ↷ '{api_path}' → '{local_field}' : "
                        f"غير موجود في استجابة '{config.name}' — تم التجاهل"
                    )
                    total_skipped += 1
                    continue

                # تطبيق التحويل
                transformed = self._transform_value(local_field, raw_value)

                # لا نكتب فوق قيمة موجودة بقيمة أسوأ
                if local_field not in merged or merged[local_field] in (None, '', 'Unknown'):
                    merged[local_field] = transformed
                    total_mapped += 1
                    logger.debug(
                        f"[MAPPING] ✓ '{api_path}' → '{local_field}' = {transformed!r}"
                    )

        logger.info(
            f"[MAPPING] '{config.name}' | VIN: {vin} | "
            f"✓ {total_mapped} حقل مُعيَّن، ↷ {total_skipped} حقل مُتجاهَل"
        )

        if not merged:
            logger.warning(
                f"[MAPPING] ⚠ لم يُستخرج أي حقل من '{config.name}' — "
                f"تحقق من صحة field_mappings"
            )

        return merged

    # ------------------------------------------------------------------
    # Fallback: تجميع من عدة مصادر
    # ------------------------------------------------------------------

    def apply_with_fallback(
        self,
        sources: List[Tuple[Any, Any]],
        vin: str = '',
    ) -> Dict[str, Any]:
        """
        طبّق الـ mappings من عدة مصادر مع fallback تلقائي.

        Args:
            sources: قائمة من (config, api_response_data)
            vin:     رقم الهيكل

        Returns:
            قاموس مدمج من جميع المصادر، الأولوية للمصدر الأول
        """
        merged: Dict[str, Any] = {}

        for config, api_data in sources:
            if api_data is None:
                logger.info(
                    f"[FALLBACK] ↷ المصدر '{config.name}' لم يُرجع بيانات — "
                    f"الانتقال للمصدر التالي"
                )
                continue

            try:
                result = self.apply_mappings(config, api_data, vin=vin)
                for field, value in result.items():
                    if field not in merged or merged[field] in (None, '', 'Unknown'):
                        merged[field] = value

                # إذا حصلنا على الحقول الأساسية، يمكن الاكتفاء
                if REQUIRED_CAR_FIELDS.issubset(merged.keys()):
                    logger.info(
                        f"[FALLBACK] ✓ الحقول الأساسية مكتملة من '{config.name}'"
                    )

            except Exception as e:
                logger.error(
                    f"[FALLBACK] ✗ خطأ في معالجة '{config.name}': {e}"
                )
                continue

        missing = REQUIRED_CAR_FIELDS - merged.keys()
        if missing:
            logger.warning(
                f"[FALLBACK] ⚠ حقول مفقودة بعد جميع المصادر: {missing} — "
                f"سيتم استخدام القيم الافتراضية"
            )

        return merged

    # ------------------------------------------------------------------
    # استخراج القيمة من الـ JSON
    # ------------------------------------------------------------------

    def _extract_value(
        self,
        data: Any,
        flat_data: Dict[str, Any],
        path: str,
    ) -> Any:
        """
        استخرج قيمة من data باستخدام path.

        يدعم:
          - مسار مباشر: 'make'
          - مسار متداخل بنقطة: 'Results.0.Make'
          - مسار في flat_data: 'Results.0.Make'
        """
        if not path:
            return None

        # 1. محاولة المسار المتداخل أولاً
        nested = self._get_nested_value(data, path)
        if nested is not None and nested != '':
            return nested

        # 2. البحث في flat_data (case-insensitive)
        path_lower = path.lower()
        for key, val in flat_data.items():
            if key.lower() == path_lower:
                return val

        # 3. البحث عن آخر جزء من المسار في flat_data
        last_part = path.split('.')[-1].lower()
        for key, val in flat_data.items():
            if key.split('.')[-1].lower() == last_part:
                return val

        return None

    def _get_nested_value(self, data: Any, path: str) -> Any:
        """استخراج قيمة من dict/list متداخل باستخدام dot-notation."""
        if not path or data is None:
            return None

        parts = path.split('.')
        current = data
        for part in parts:
            if isinstance(current, list):
                try:
                    current = current[int(part)]
                except (ValueError, IndexError):
                    return None
            elif isinstance(current, dict):
                # محاولة case-insensitive
                val = current.get(part)
                if val is None:
                    for k, v in current.items():
                        if k.lower() == part.lower():
                            val = v
                            break
                current = val
            else:
                return None
        return current

    # ------------------------------------------------------------------
    # تسطيح الـ JSON
    # ------------------------------------------------------------------

    def _flatten_json(self, data: Any, prefix: str = '') -> Dict[str, Any]:
        """حوّل JSON متداخل إلى قاموس مسطح."""
        out: Dict[str, Any] = {}
        if isinstance(data, dict):
            for key, val in data.items():
                full_key = f"{prefix}{key}" if prefix else key
                if isinstance(val, (dict, list)):
                    out.update(self._flatten_json(val, full_key + '.'))
                else:
                    out[full_key] = val
        elif isinstance(data, list) and data:
            # نأخذ أول عنصر فقط لتحليل الهيكل
            out.update(self._flatten_json(data[0], prefix + '0.'))
        return out

    # ------------------------------------------------------------------
    # تطبيع field_mappings
    # ------------------------------------------------------------------

    def _normalize_field_map(
        self, field_map: Any
    ) -> List[Tuple[str, str]]:
        """
        حوّل field_mappings إلى قائمة من (local_field, api_path).

        يدعم:
          - dict: {"make": "brand_name"}
          - list of dicts: [{"local_field": "make", "api_field": "brand_name"}]
          - list of lists: [["make", "brand_name"]]
        """
        pairs: List[Tuple[str, str]] = []

        if isinstance(field_map, dict):
            for local, api_path in field_map.items():
                pairs.append((str(local), str(api_path)))

        elif isinstance(field_map, list):
            for item in field_map:
                if isinstance(item, dict):
                    local = (
                        item.get('local_field')
                        or item.get('local')
                        or item.get('target')
                    )
                    api_path = (
                        item.get('api_field')
                        or item.get('api_path')
                        or item.get('source')
                        or item.get('external_field')
                    )
                    if local and api_path:
                        pairs.append((str(local), str(api_path)))
                elif isinstance(item, (list, tuple)) and len(item) >= 2:
                    pairs.append((str(item[0]), str(item[1])))

        return pairs

    # ------------------------------------------------------------------
    # تحويل القيم (Transformation)
    # ------------------------------------------------------------------

    def _transform_value(self, local_field: str, value: Any) -> Any:
        """طبّق تحويلات مناسبة بناءً على نوع الحقل."""
        if value is None:
            return None

        try:
            if local_field == 'year':
                return self._parse_year(value)

            elif local_field == 'fuel_type':
                return self._normalize_fuel_type(value)

            elif local_field == 'gear_type':
                return self._normalize_gear_type(value)

            elif local_field in ('engine_capacity', 'mileage', 'num_cylinders', 'seating_capacity'):
                return self._parse_int(value)

            elif local_field in ('make', 'model', 'color', 'trim', 'engine'):
                return str(value).strip() if value else None

            else:
                return value

        except Exception as e:
            logger.debug(f"[MAPPING] تحويل '{local_field}' فشل: {e} — القيمة الأصلية: {value!r}")
            return value

    def _parse_year(self, value: Any) -> Optional[int]:
        if value is None:
            return None
        try:
            if isinstance(value, (int, float)):
                year = int(value)
            else:
                match = re.search(r'\d{4}', str(value))
                year = int(match.group()) if match else None
            if year and 1900 <= year <= 2100:
                return year
        except Exception:
            pass
        return None

    def _parse_int(self, value: Any) -> Optional[int]:
        if value is None:
            return None
        try:
            return int(float(str(value).replace(',', '').strip()))
        except Exception:
            return None

    def _normalize_fuel_type(self, value: Any) -> str:
        if not value:
            return 'other'
        key = str(value).lower().strip()
        return FUEL_TYPE_MAP.get(key, 'other')

    def _normalize_gear_type(self, value: Any) -> int:
        if value is None:
            return 2
        if isinstance(value, int):
            return value if value in (1, 2) else 2
        key = str(value).lower().strip()
        return GEAR_TYPE_MAP.get(key, 2)

    # ------------------------------------------------------------------
    # تحقق من اكتمال البيانات
    # ------------------------------------------------------------------

    def validate_mapped_data(
        self, mapped: Dict[str, Any]
    ) -> Tuple[bool, List[str]]:
        """
        تحقق من أن البيانات المُعيَّنة كافية لإنشاء سيارة.

        Returns:
            (is_valid, missing_fields)
        """
        missing = [f for f in REQUIRED_CAR_FIELDS if not mapped.get(f)]
        return (len(missing) == 0, missing)

    def fill_defaults(self, mapped: Dict[str, Any]) -> Dict[str, Any]:
        """أضف القيم الافتراضية للحقول المفقودة."""
        result = dict(mapped)
        for field, default in FIELD_DEFAULTS.items():
            if field not in result or result[field] in (None, '', 'Unknown'):
                result[field] = default
        return result
