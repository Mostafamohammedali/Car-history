from django.apps import AppConfig
import threading
from django.conf import settings
import time
import logging
from datetime import datetime


logger = logging.getLogger(__name__)

# متغيرات عامة لتتبع حالة المزامنة
_sync_lock = threading.Lock()
_last_sync_time = None
_sync_running = False


class DataSyncConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'data_sync'
    verbose_name = 'مزامنة البيانات'

    def ready(self):
        """
        استدعاء عند تحميل التطبيق - إعداد المزامنة الأولية
        """
        try:
            from . import signals
        except ImportError as e:
            logger.warning(f"Could not import signals: {e}")

        # المزامنة التلقائية معطّلة افتراضياً في بيئة التطوير
        # لتفعيلها أضف ENABLE_INITIAL_SYNC=True في ملف .env
        import os
        enable_sync = os.environ.get('ENABLE_INITIAL_SYNC', 'false').lower() == 'true'
        if enable_sync:
            self.schedule_initial_sync()
        else:
            logger.info(
                "[SYNC] Auto-startup sync is DISABLED. "
                "Set ENABLE_INITIAL_SYNC=true in .env to enable."
            )

    def schedule_initial_sync(self):
        """
        جدولة المزامنة كل 24 ساعة:
          - جلب سيارات جديدة من auto.dev listings (bulk)
          - تحديث بيانات السيارات الموجودة من VIN APIs
        """
        import os
        # تشغيل فقط في العملية الرئيسية (تجنب التكرار مع StatReloader)
        if os.environ.get('RUN_MAIN') != 'true':
            return

        if getattr(self, '_sync_scheduled', False):
            return
        self._sync_scheduled = True

        SYNC_INTERVAL = 24 * 3600   # 24 ساعة
        STARTUP_DELAY = 60          # انتظار 60 ثانية بعد بدء السيرفر (تجنب Rate Limit)

        def run_cycle():
            global _last_sync_time, _sync_running

            time.sleep(STARTUP_DELAY)

            first_run = True

            while True:
                with _sync_lock:
                    if _sync_running:
                        logger.info("[SYNC] Already running — skipping.")
                        time.sleep(SYNC_INTERVAL)
                        continue
                    _sync_running = True

                try:
                    logger.info("[SYNC] ═══ Starting 24h sync cycle ═══")
                    print("\n[SYNC-START] Starting 24h sync cycle...")

                    # ── المرحلة 1: جلب سيارات جديدة بالجملة ──────────────
                    # الدورة الأولى: 500 صفحة (10,000 سيارة)
                    # الدورات التالية: 50 صفحة (1,000 سيارة جديدة فقط)
                    pages = 500 if first_run else 50
                    try:
                        from data_sync.tasks import bulk_sync_listings
                        bulk_result = bulk_sync_listings(max_pages=pages)
                        created = bulk_result.get('created', 0)
                        total   = bulk_result.get('total', 0)
                        logger.info(f"[SYNC] Bulk listings: {total} synced ({created} new)")
                        print(f"[SYNC] Bulk: {total} synced ({created} new)")
                    except Exception as e:
                        logger.error(f"[SYNC] Bulk listings failed: {e}")

                    # ── المرحلة 2: إصلاح السيارات ذات make=Unknown فقط ──
                    try:
                        from cars.models import Cars
                        unknown_vins = list(
                            Cars.objects.filter(make='Unknown')
                            .values_list('vin', flat=True)[:30]
                        )
                        if unknown_vins:
                            logger.info(f"[SYNC] Fixing {len(unknown_vins)} unknown cars via VIN API")
                            from cars.car_service import VehicleDataService
                            svc = VehicleDataService()
                            fixed = 0
                            for vin in unknown_vins:
                                try:
                                    result = svc.fetch_from_dynamic_api(vin)
                                    if result['fields']:
                                        wrapper = {'success': True, 'vin': vin,
                                                   'data_sources': {'dynamic_api': result['fields']}}
                                        if svc.save_external_data_to_local(vin, wrapper):
                                            fixed += 1
                                except Exception:
                                    pass
                            if fixed:
                                print(f"[SYNC] Fixed {fixed} unknown cars.")
                        else:
                            logger.info("[SYNC] No unknown cars — skipping VIN API update.")
                    except Exception as e:
                        logger.error(f"[SYNC] Phase 2 failed: {e}")

                    first_run = False
                    _last_sync_time = datetime.now()
                    logger.info(f"[SYNC] ═══ Cycle complete. Next in 24h ═══")
                    print(f"[SYNC-DONE] Cycle complete. Next sync in 24 hours.")

                except Exception as e:
                    logger.error(f"[SYNC] Cycle error: {e}", exc_info=True)
                finally:
                    with _sync_lock:
                        _sync_running = False

                time.sleep(SYNC_INTERVAL)

        t = threading.Thread(target=run_cycle, daemon=True, name='DataSyncThread')
        t.start()
        logger.info("[SYNC] Background sync thread started (24h cycle).")


def get_sync_status():
    """إرجاع حالة المزامنة الحالية للاستخدام في واجهة الإدارة"""
    return {
        'is_running': _sync_running,
        'last_sync_time': _last_sync_time,
    }
