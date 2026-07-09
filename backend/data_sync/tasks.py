"""
data_sync/tasks.py — Scheduled Synchronization Engine
======================================================

This module contains the Celery tasks that run every 24 hours to
synchronise external data into the local database.

Architecture:
  - auto_sync_all         → master task: runs DB sync then API sync
  - sync_databases        → Stage 1: sync real external DB configs
  - sync_api_sources      → Stage 2: sync API: prefixed configs

User-facing search views NEVER call these tasks.  All data is
pre-populated here so searches are always instant local lookups.
"""

import logging
try:
    from celery import shared_task
except ImportError:
    # Fallback dummy decorator if celery is not installed
    def shared_task(*args, **kwargs):
        def decorator(func):
            return func
        return decorator

from django.utils import timezone

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Master task — called by Celery Beat every 24 hours
# ---------------------------------------------------------------------------

@shared_task(name='data_sync.auto_sync_all')
def auto_sync_all():
    """
    Master 24-hour synchronisation task.

    Runs two stages sequentially:
      Stage 1 — External DB sync  (real PostgreSQL connections)
      Stage 2 — API source sync   (HTTP API endpoints, 'API:' prefix)

    All results are upserted into the local tables:
      Cars, ImageCar, AccidentImage, Repairshops, Reports
    """
    logger.info("=== Starting full 24-hour sync cycle ===")
    summary = {'stage1_db': {}, 'stage2_api': {}, 'status': 'success'}

    try:
        # ── Stage 1: External database sync ─────────────────────────────
        logger.info("--- Stage 1: External database sync ---")
        try:
            db_result = sync_databases.apply()
            summary['stage1_db'] = db_result.result or {}
            logger.info(f"Stage 1 complete: {summary['stage1_db']}")
        except Exception as e:
            logger.error(f"Stage 1 failed: {e}")
            summary['stage1_db'] = {'error': str(e)}

        # ── Stage 2: API source sync ─────────────────────────────────────
        logger.info("--- Stage 2: API source sync ---")
        try:
            api_result = sync_api_sources.apply()
            summary['stage2_api'] = api_result.result or {}
            logger.info(f"Stage 2 complete: {summary['stage2_api']}")
        except Exception as e:
            logger.error(f"Stage 2 failed: {e}")
            summary['stage2_api'] = {'error': str(e)}

        logger.info("=== 24-hour sync cycle complete ===")
        return summary

    except Exception as e:
        logger.error(f"Master sync task failed: {e}")
        return {'status': 'failed', 'error': str(e)}


# ---------------------------------------------------------------------------
# Stage 1 — External database synchronisation
# ---------------------------------------------------------------------------

@shared_task(name='data_sync.sync_databases')
def sync_databases(config_id=None):
    """
    Sync all active external PostgreSQL/MySQL database configurations
    into the local database.

    Skips configs whose name starts with 'API:' — those
    are handled by sync_api_sources.

    Each config's data is upserted into:
      - Cars        (vehicle specifications)
      - Repairshops (workshop / service history)

    Args:
        config_id: Optional int. If provided, sync only that config.

    Returns:
        Dict mapping config_name → sync result.
    """
    from .models import ExternalDBConfig
    from .services.database_service import DatabaseSyncService

    logger.info("[DB-SYNC] Starting external database sync…")
    results = {}

    try:
        db_service = DatabaseSyncService()

        if config_id:
            configs = ExternalDBConfig.objects.filter(
                id=config_id, is_active=True
            )
        else:
            # Real DB configs only — exclude virtual API sources
            configs = ExternalDBConfig.objects.filter(
                is_active=True
            ).exclude(
                name__istartswith='API:'
            )

        if not configs.exists():
            logger.info("[DB-SYNC] No active external DB configs found.")
            return results

        for config in configs:
            try:
                logger.info(f"[DB-SYNC] Syncing config: {config.name}")
                result = db_service.sync_data(config, sync_type='scheduled')
                results[config.name] = result

                # Update last_sync timestamp
                config.last_sync = timezone.now()
                config.save(update_fields=['last_sync'])

                total = result.get('total_synced', 0)
                failed = result.get('total_failed', 0)
                logger.info(
                    f"[DB-SYNC] ✓ {config.name}: {total} synced, {failed} failed"
                )

            except Exception as e:
                logger.error(f"[DB-SYNC] ✗ {config.name} failed: {e}")
                results[config.name] = {'success': False, 'error': str(e)}

        db_service.close_all_connections()
        logger.info("[DB-SYNC] External database sync finished.")
        return results

    except Exception as e:
        logger.error(f"[DB-SYNC] Fatal error during database sync: {e}")
        return {'error': str(e)}


# ---------------------------------------------------------------------------
# Stage 2 — API source synchronisation
# ---------------------------------------------------------------------------

@shared_task(name='data_sync.sync_api_sources')
def sync_api_sources(config_id=None):
    """
    Sync all active API-based external sources (name prefix 'API:') into
    the local database.

    Two-phase approach per config:
      Phase 1 — Discovery: If the API URL has no {vin} placeholder, treat
                it as a list/bulk endpoint and fetch ALL vehicles.  New
                vehicles are created immediately.
      Phase 2 — Update:   Refresh the local VIN list (to include vehicles
                just discovered in Phase 1), then query every VIN against
                ALL API sources (including VIN-based ones) to update
                existing records with the latest data.

    Data is mapped using DataMapping.field_mappings and upserted into:
      - Cars          via VehicleDataService.save_external_data_to_local()
      - ImageCar      via VehicleDataService.save_vehicle_images()
      - AccidentImage via VehicleDataService.save_accident_images()
      - Reports       (snapshot / technical specs)

    Args:
        config_id: Optional int. If provided, sync only that config.

    Returns:
        Dict mapping config_name → sync result.
    """
    from .models import ExternalDBConfig, SyncLog
    from cars.models import Cars
    from cars.car_service import VehicleDataService

    logger.info("[API-SYNC] Starting API source sync…")
    results = {}
    vehicle_service = VehicleDataService()

    try:
        if config_id:
            configs = ExternalDBConfig.objects.filter(
                id=config_id, is_active=True, name__istartswith='API:'
            )
        else:
            configs = ExternalDBConfig.objects.filter(
                is_active=True, name__istartswith='API:'
            )

        if not configs.exists():
            logger.info("[API-SYNC] No active API configs found (API: prefix).")
            return results

        # ── Phase 1: Discovery — list/bulk endpoints ────────────────────
        # Process list endpoints first so newly discovered VINs are
        # available for Phase 2 (per-VIN updates).
        for config in configs:
            url = config.host
            is_list_endpoint = '{vin}' not in url.lower() and '{VIN}' not in url

            if not is_list_endpoint:
                continue

            logger.info(f"[API-SYNC] Phase 1 — Discovery from list endpoint: {config.name}")

            sync_log = SyncLog.objects.create(
                db_config=config,
                sync_type='scheduled',
                status='in_progress',
                data_source=config.name,
            )

            synced = 0
            failed = 0
            created = 0

            try:
                import requests
                headers = {}
                if config.user and config.password:
                    headers[config.user] = config.password
                if config.dbname:
                    headers['X-API-SECRET'] = config.dbname

                resp = requests.get(url, headers=headers, timeout=30)
                if resp.status_code == 200:
                    data = resp.json()
                    vehicles = []
                    if isinstance(data, list):
                        vehicles = data
                    elif isinstance(data, dict):
                        for key in ['results', 'vehicles', 'data', 'cars']:
                            if key in data and isinstance(data[key], list):
                                vehicles = data[key]
                                break

                    if vehicles:
                        logger.info(
                            f"[API-SYNC] Discovered {len(vehicles)} vehicles "
                            f"from {config.name}"
                        )
                        for v_data in vehicles:
                            vin = v_data.get('vin') or v_data.get('VIN')
                            if not vin:
                                continue
                            try:
                                is_new = not Cars.objects.filter(vin__iexact=vin).exists()
                                wrapper = {
                                    'success': True,
                                    'vin': vin,
                                    'data_sources': {'dynamic_api': v_data},
                                }
                                saved = vehicle_service.save_external_data_to_local(vin, wrapper)
                                if saved:
                                    synced += 1
                                    if is_new:
                                        created += 1
                                        logger.info(f"[API-SYNC] ✓ New VIN discovered: {vin}")
                            except Exception as e:
                                logger.error(f"[API-SYNC] Error saving VIN {vin}: {e}")
                                failed += 1
                    else:
                        logger.info(f"[API-SYNC] List endpoint returned 0 vehicles from {config.name}")
                else:
                    logger.error(
                        f"[API-SYNC] List endpoint for {config.name} "
                        f"returned {resp.status_code}"
                    )

                config.last_sync = timezone.now()
                config.save(update_fields=['last_sync'])

                sync_log.mark_as_completed(
                    records_processed=synced + failed,
                    records_updated=synced - created,
                    records_failed=failed,
                )
                sync_log.records_created = created
                sync_log.save()

                results[config.name] = {
                    'success': True,
                    'synced': synced,
                    'failed': failed,
                    'created': created,
                }
                logger.info(
                    f"[API-SYNC] ✓ Discovery {config.name}: "
                    f"{synced} synced ({created} new), {failed} failed"
                )

            except Exception as e:
                logger.error(f"[API-SYNC] ✗ Discovery {config.name} failed: {e}")
                sync_log.mark_as_failed(str(e))
                results[config.name] = {'success': False, 'error': str(e)}

        # ── Phase 2: Update — per-VIN refresh for ALL API sources ───────
        # Refresh the VIN list to include vehicles discovered in Phase 1.
        all_vins = list(
            Cars.objects.values_list('vin', flat=True).order_by('updated_at')
        )

        # If no local VINs exist, try using Seed VINs then test_vin as fallback
        if not all_vins:
            seed_vins_found = []
            for config in configs:
                # 1. seed_vins المُعرَّفة يدوياً
                config_seeds = config.get_seed_vins_list()
                if config_seeds:
                    logger.info(
                        f"[API-SYNC] Using {len(config_seeds)} seed VINs "
                        f"from {config.name}"
                    )
                    seed_vins_found.extend(config_seeds)
                # 2. test_vin كـ fallback إذا لم توجد seed_vins
                elif config.test_vin and len(config.test_vin.strip()) == 17:
                    logger.info(
                        f"[API-SYNC] No seed VINs for '{config.name}' — "
                        f"using test_vin '{config.test_vin}' as bootstrap VIN"
                    )
                    seed_vins_found.append(config.test_vin.strip().upper())

            if seed_vins_found:
                # Deduplicate while preserving order
                seen = set()
                all_vins = [v for v in seed_vins_found if v not in seen and not seen.add(v)]
                logger.info(
                    f"[API-SYNC] Total {len(all_vins)} bootstrap VINs to process"
                )
            else:
                logger.info(
                    "[API-SYNC] No local VINs, no seed VINs, and no test VINs configured. "
                    "Phase 2 skipped. Add seed_vins or test_vin to your API configs."
                )
                logger.info("[API-SYNC] API source sync finished.")
                return results

        logger.info(
            f"[API-SYNC] Phase 2 — Updating {len(all_vins)} local VINs "
            f"from {configs.count()} API sources"
        )

        for config in configs:
            synced = 0
            failed = 0
            created = 0
            all_debug_info = {}

            sync_log = SyncLog.objects.create(
                db_config=config,
                sync_type='scheduled',
                status='in_progress',
                data_source=config.name,
            )

            try:
                logger.info(f"[API-SYNC] Phase 2 — Updating VINs from: {config.name}")

                for vin in all_vins:
                    try:
                        api_result = vehicle_service.fetch_from_dynamic_api(vin)
                        api_data = api_result.get('fields', {})
                        debug_info = api_result.get('debug', {})
                        all_debug_info[vin] = debug_info

                        if api_data:
                            external_data_wrapper = {
                                'success': True,
                                'vin': vin,
                                'data_sources': {'dynamic_api': api_data},
                            }
                            saved = vehicle_service.save_external_data_to_local(
                                vin, external_data_wrapper
                            )
                            if saved:
                                synced += 1
                        else:
                            logger.debug(
                                f"[API-SYNC] VIN {vin} not found in {config.name}"
                            )
                    except Exception as vin_err:
                        logger.error(
                            f"[API-SYNC] Error processing VIN {vin} "
                            f"from {config.name}: {vin_err}"
                        )
                        failed += 1

                config.last_sync = timezone.now()
                config.save(update_fields=['last_sync'])

                sync_log.mark_as_completed(
                    records_processed=synced + failed,
                    records_updated=synced,
                    records_failed=failed,
                )
                sync_log.save()

                if all_debug_info:
                    sync_log.metadata = all_debug_info
                    sync_log.save(update_fields=['metadata'])

                results.setdefault(config.name, {})
                results[config.name].update({
                    'phase2_success': True,
                    'phase2_synced': synced,
                    'phase2_failed': failed,
                })
                logger.info(
                    f"[API-SYNC] ✓ Update {config.name}: "
                    f"{synced} synced, {failed} failed"
                )

            except Exception as config_err:
                logger.error(f"[API-SYNC] ✗ Update {config.name} failed: {config_err}")
                sync_log.mark_as_failed(str(config_err))
                results.setdefault(config.name, {})
                results[config.name].update({
                    'phase2_success': False,
                    'error': str(config_err),
                })

        logger.info("[API-SYNC] API source sync finished.")
        return results

    except Exception as e:
        logger.error(f"[API-SYNC] Fatal error during API sync: {e}")
        return {'error': str(e)}


# ---------------------------------------------------------------------------
# Utility task — sync a single config by ID (admin / manual trigger)
# ---------------------------------------------------------------------------

@shared_task(name='data_sync.sync_single_config')
def sync_single_config(config_id: int):
    """
    Sync a single ExternalDBConfig by its primary key.

    Routes automatically to sync_databases (for real DB configs) or
    sync_api_sources (for API: prefixed configs).

    Args:
        config_id: Primary key of the ExternalDBConfig to sync.

    Returns:
        Dict with sync result.
    """
    from .models import ExternalDBConfig

    try:
        config = ExternalDBConfig.objects.get(id=config_id, is_active=True)
    except ExternalDBConfig.DoesNotExist:
        logger.error(f"[SYNC] Config ID {config_id} not found or not active.")
        return {'success': False, 'error': 'Config not found or inactive.'}

    if config.name.upper().startswith('API:'):
        logger.info(f"[SYNC] Routing config {config.name} to API sync.")
        # we can call the direct function or apply sync_api_sources
        return sync_api_sources(config_id=config_id)
    else:
        logger.info(f"[SYNC] Routing config {config.name} to DB sync.")
        return sync_databases(config_id=config_id)


# ---------------------------------------------------------------------------
# Discovery task — Smart Auto-Discovery of fields
# ---------------------------------------------------------------------------

@shared_task(name='data_sync.sync_discover_fields')
def sync_discover_fields(config_id: int):
    """
    Asynchronously run the discovery engine for a specific config.
    Created to be triggered by signals on new config creation.
    """
    from .services.discovery_service import DiscoveryService
    
    logger.info(f"[DISCOVERY-TASK] Starting discovery for config ID: {config_id}")
    service = DiscoveryService()
    result = service.discover_and_map(config_id)
    
    if result.get('success'):
        logger.info(f"[DISCOVERY-TASK] ✓ Successfully mapped fields for config {config_id}")
    else:
        logger.warning(f"[DISCOVERY-TASK] ✗ Discovery failed: {result.get('error') or result.get('message')}")
        
    return result


# ---------------------------------------------------------------------------
# Bulk Sync Single Source — مزامنة جماعية لمصدر واحد
# ---------------------------------------------------------------------------

@shared_task(name='data_sync.bulk_sync_single_source', bind=True)
def bulk_sync_single_source(self, config_id: int, max_pages: int = 100, is_manual: bool = True, target_created: int = 50):
    """
    مزامنة جماعية لمصدر API واحد محدد.
    
    يدعم نوعين من المصادر:
    1. List endpoints (بدون {vin}) → يجلب كل السيارات مباشرة
    2. VIN-based endpoints (مع {vin}) → يجلب بيانات لكل VIN محلي
    
    Args:
        config_id: معرف ExternalDBConfig
        max_pages: أقصى عدد صفحات للـ list endpoints (كحد أمان)
        is_manual: True = مزامنة يدوية (تتوقف عند إضافة 50 سيارة جديدة)، False = مزامنة تلقائية
        target_created: الهدف من السيارات الجديدة المراد إضافتها في المزامنة اليدوية
    
    Returns:
        dict مع إحصائيات المزامنة
    """
    import requests
    from .models import ExternalDBConfig, SyncLog
    from cars.car_service import VehicleDataService
    from cars.models import Cars, Reports
    
    logger.info(f"[BULK-SYNC] Starting bulk sync for config_id={config_id}")
    
    try:
        config = ExternalDBConfig.objects.get(id=config_id, is_active=True)
    except ExternalDBConfig.DoesNotExist:
        logger.error(f"[BULK-SYNC] Config {config_id} not found or inactive")
        return {'success': False, 'error': 'Config not found'}
    
    # إنشاء سجل مزامنة
    sync_log = SyncLog.objects.create(
        db_config=config,
        sync_type='full',
        status='in_progress',
        data_source=f"{config.name} [bulk]",
    )
    
    vehicle_service = VehicleDataService()
    created = updated = failed = 0
    url = config.host
    
    # ── تحديد نوع المصدر ────────────────────────────────────────────────
    is_list_endpoint = '{vin}' not in url.lower() and '{VIN}' not in url
    
    try:
        if is_list_endpoint:
            # ── نوع 1: List Endpoint (مثل auto.dev /api/listings) ────────
            logger.info(f"[BULK-SYNC] Detected list endpoint: {config.name}")
            
            headers = {}
            base_params = {}
            if config.user and config.password:
                if config.user.lower() in ('apikey', 'api_key', 'api-key'):
                    base_params[config.user] = config.password
                else:
                    headers[config.user] = config.password
            if config.dbname:
                headers['X-API-SECRET'] = config.dbname
            
            # المزامنة الذكية: الاستمرار حتى نصل للعدد المطلوب من السيارات الجديدة (Created)
            page = 1
            max_limit_pages = max_pages
            
            while page <= max_limit_pages:
                try:
                    resp = requests.get(
                        url,
                        headers=headers,
                        params={**base_params, 'page': page, 'pageSize': 20},
                        timeout=30,
                    )
                    
                    if resp.status_code == 429:
                        logger.warning("[BULK-SYNC] Rate limited — stopping.")
                        break
                    
                    if resp.status_code != 200:
                        logger.error(f"[BULK-SYNC] Page {page} returned {resp.status_code}")
                        failed += 1
                        break
                    
                    data = resp.json()
                    records = data.get('records', [])
                    
                    if not records:
                        logger.info(f"[BULK-SYNC] No more records at page {page}.")
                        break
                    
                    logger.info(
                        f"[BULK-SYNC] Page {page} — "
                        f"Processed: {len(records)} | Total New: {created} | Total Updated: {updated}"
                    )
                    
                    from django.db import transaction as db_transaction
                    page_created = page_updated = page_failed = 0
                    
                    with db_transaction.atomic():
                        for rec in records:
                            vin = (rec.get('vin') or '').strip().upper()
                            if not vin or len(vin) != 17:
                                page_failed += 1
                                continue
                            
                            try:
                                car_data = _map_listing_record(rec)
                                car, car_created = Cars.objects.update_or_create(
                                    vin=vin,
                                    defaults=car_data,
                                )
                                Reports.objects.get_or_create(
                                    car=car,
                                    defaults={
                                        'detailed_report': f"بيانات مستوردة من {config.name}.",
                                    }
                                )
                                if car_created:
                                    page_created += 1
                                else:
                                    page_updated += 1
                            except Exception as rec_err:
                                logger.error(f"[BULK-SYNC] Error saving VIN {vin}: {rec_err}")
                                page_failed += 1
                    
                    created += page_created
                    updated += page_updated
                    failed  += page_failed
                    
                    self.update_state(
                        state='PROGRESS',
                        meta={'page': page, 'created': created, 'updated': updated, 'failed': failed},
                    )

                    # شرط التوقف الذكي للمزامنة اليدوية: الوصول لعدد السيارات الجديدة المطلوب
                    if is_manual and created >= target_created:
                        logger.info(f"[BULK-SYNC] Smart stop: Reached target of {target_created} new cars at page {page}.")
                        break
                    
                    page += 1
                
                except Exception as page_err:
                    logger.error(f"[BULK-SYNC] Error on page {page}: {page_err}")
                    failed += 1
                    continue
        
        else:
            # ── نوع 2: VIN-based Endpoint (مثل carapi.dev) ───────────────
            logger.info(f"[BULK-SYNC] Detected VIN-based endpoint: {config.name}")
            
            # جلب الـ VINs المحلية
            # إذا كانت مزامنة يدوية: أقدم 50 سيارة فقط (الأقل تحديثاً)
            # إذا كانت مزامنة تلقائية: كل السيارات
            if is_manual:
                all_vins = list(Cars.objects.values_list('vin', flat=True).order_by('updated_at')[:50])
                logger.info(f"[BULK-SYNC] Manual sync - limiting to 50 oldest VINs")
            else:
                all_vins = list(Cars.objects.values_list('vin', flat=True).order_by('updated_at'))
                logger.info(f"[BULK-SYNC] Automatic sync - processing all VINs")
            
            # إذا لم توجد VINs محلية، استخدم seed_vins
            if not all_vins:
                seed_vins = config.get_seed_vins_list()
                if config.test_vin and len(config.test_vin.strip()) == 17:
                    seed_vins.append(config.test_vin.strip().upper())
                
                if seed_vins:
                    seen = set()
                    all_vins = [v for v in seed_vins if v not in seen and not seen.add(v)]
                    logger.info(f"[BULK-SYNC] Using {len(all_vins)} seed VINs")
                else:
                    logger.warning("[BULK-SYNC] No VINs available for VIN-based endpoint")
                    sync_log.mark_as_failed("No VINs available")
                    return {'success': False, 'error': 'No VINs available'}
            
            logger.info(f"[BULK-SYNC] Processing {len(all_vins)} VINs from {config.name}")
            
            # بناء headers لهذا المصدر المحدد فقط
            vin_headers = {}
            if config.user and config.password:
                vin_headers[config.user] = config.password
            if config.dbname:
                vin_headers['X-API-SECRET'] = config.dbname
            
            for idx, vin in enumerate(all_vins, 1):
                try:
                    # استدعاء API هذا المصدر المحدد مباشرة (لا fetch_from_dynamic_api)
                    vin_url = url.replace('{vin}', vin).replace('{VIN}', vin)
                    
                    # استبدال متغيرات أخرى إن وُجدت
                    from cars.models import Cars as CarsModel
                    car_obj = CarsModel.objects.filter(vin__iexact=vin).first()
                    if car_obj:
                        vin_url = vin_url.replace('{make}', car_obj.make or '')
                        vin_url = vin_url.replace('{model}', car_obj.model or '')
                        vin_url = vin_url.replace('{year}', str(car_obj.year) if car_obj.year else '')
                    
                    resp = requests.get(vin_url, headers=vin_headers, timeout=30)
                    
                    if resp.status_code == 429:
                        logger.warning(f"[BULK-SYNC] Rate limited on {config.name} — stopping VIN loop.")
                        break
                    
                    if resp.status_code == 200:
                        try:
                            api_data = resp.json()
                        except Exception:
                            logger.warning(f"[BULK-SYNC] Non-JSON from {config.name} for VIN {vin}")
                            failed += 1
                            continue
                        
                        # تطبيق field mappings لهذا المصدر
                        from data_sync.mapping_engine import APIMappingEngine
                        from data_sync.models import DataMapping
                        engine = APIMappingEngine()
                        mappings = DataMapping.objects.filter(db_config=config, is_active=True)
                        if mappings.exists():
                            mapped = engine.apply_mappings(config, api_data, vin=vin)
                        else:
                            # fallback: استخدم البيانات الخام مباشرة
                            mapped = api_data if isinstance(api_data, dict) else {}
                        
                        if mapped:
                            external_wrapper = {
                                'success': True,
                                'vin': vin,
                                'data_sources': {'dynamic_api': mapped},
                            }
                            saved = vehicle_service.save_external_data_to_local(vin, external_wrapper)
                            if saved:
                                updated += 1
                            else:
                                failed += 1
                        else:
                            logger.debug(f"[BULK-SYNC] VIN {vin} — no fields mapped from {config.name}")
                            failed += 1
                    else:
                        logger.warning(
                            f"[BULK-SYNC] ✗ '{config.name}' returned HTTP {resp.status_code} for VIN {vin}"
                        )
                        failed += 1
                    
                    if idx % 10 == 0:
                        self.update_state(
                            state='PROGRESS',
                            meta={'processed': idx, 'total': len(all_vins), 'updated': updated, 'failed': failed},
                        )
                
                except Exception as vin_err:
                    logger.error(f"[BULK-SYNC] Error processing VIN {vin}: {vin_err}")
                    failed += 1
        
        # ── إنهاء ────────────────────────────────────────────────────────
        config.last_sync = timezone.now()
        config.save(update_fields=['last_sync'])
        
        sync_log.mark_as_completed(
            records_processed=created + updated + failed,
            records_updated=updated,
            records_failed=failed,
        )
        sync_log.records_created = created
        sync_log.save(update_fields=['records_created'])
        
        # حساب عدد السيارات المتبقية (للمزامنة اليدوية فقط)
        remaining_vins = 0
        if is_manual and not is_list_endpoint:
            total_vins = Cars.objects.count()
            remaining_vins = max(0, total_vins - 50)
        
        result = {
            'success': True,
            'created': created,
            'updated': updated,
            'failed': failed,
            'total': created + updated,
            'remaining': remaining_vins,
            'is_manual': is_manual,
        }
        
        if is_manual and remaining_vins > 0:
            logger.info(
                f"[BULK-SYNC] ✓ Done (Manual) — created={created}, updated={updated}, failed={failed}, remaining={remaining_vins} VINs"
            )
        else:
            logger.info(
                f"[BULK-SYNC] ✓ Done — created={created}, updated={updated}, failed={failed}"
            )
        return result
    
    except Exception as e:
        logger.error(f"[BULK-SYNC] Fatal error: {e}")
        sync_log.mark_as_failed(str(e))
        return {'success': False, 'error': str(e)}


# ---------------------------------------------------------------------------
# Bulk Listings Sync — auto.dev /api/listings (Legacy)
# ---------------------------------------------------------------------------

@shared_task(name='data_sync.bulk_sync_listings', bind=True)
def bulk_sync_listings(self, max_pages: int = 50, page_size: int = 20):
    """
    جلب سيارات بالجملة من auto.dev /api/listings وحفظها مباشرة.

    كل صفحة تحتوي على 20 سيارة (حد الـ API).
    max_pages=50 → يجلب حتى 1000 سيارة في كل تشغيل.

    Args:
        max_pages:  أقصى عدد صفحات يتم جلبها (افتراضي 50 = 1000 سيارة)
        page_size:  عدد السجلات لكل صفحة (الـ API يُرجع 20 كحد أقصى)

    Returns:
        dict مع إحصائيات المزامنة
    """
    import requests
    from .models import ExternalDBConfig, SyncLog
    from cars.car_service import VehicleDataService
    from cars.models import Cars, Reports

    logger.info(f"[BULK-SYNC] Starting bulk listings sync (max_pages={max_pages})")

    # ── جلب إعداد auto.dev ──────────────────────────────────────────────
    config = ExternalDBConfig.objects.filter(
        is_active=True,
        name__icontains='auto.dev',
        host__icontains='auto.dev',
    ).first()

    if not config:
        # fallback: أي config يحتوي على listings
        config = ExternalDBConfig.objects.filter(
            is_active=True, name__istartswith='API:'
        ).first()

    if not config:
        logger.error("[BULK-SYNC] No active API config found.")
        return {'success': False, 'error': 'No API config found'}

    # ── بناء الـ headers والـ params ────────────────────────────────────
    headers = {}
    base_params = {}
    if config.user and config.password:
        # إذا كان user = 'apiKey' نرسله كـ query param بدل header
        if config.user.lower() in ('apikey', 'api_key', 'api-key'):
            base_params[config.user] = config.password
        else:
            headers[config.user] = config.password
    if config.dbname:
        headers['X-API-SECRET'] = config.dbname

    # ── إنشاء سجل مزامنة ────────────────────────────────────────────────
    sync_log = SyncLog.objects.create(
        db_config=config,
        sync_type='full',
        status='in_progress',
        data_source=f"{config.name} [bulk-listings]",
    )

    vehicle_service = VehicleDataService()
    created = updated = failed = 0
    listings_url = 'https://auto.dev/api/listings'

    try:
        for page in range(1, max_pages + 1):
            try:
                resp = requests.get(
                    listings_url,
                    headers=headers,
                    params={**base_params, 'page': page, 'pageSize': page_size},
                    timeout=30,
                )

                if resp.status_code == 429:
                    logger.warning("[BULK-SYNC] Rate limited — stopping.")
                    break

                if resp.status_code != 200:
                    logger.error(f"[BULK-SYNC] Page {page} returned {resp.status_code}")
                    failed += 1
                    break

                data = resp.json()
                records = data.get('records', [])

                if not records:
                    logger.info(f"[BULK-SYNC] No more records at page {page}.")
                    break

                logger.info(
                    f"[BULK-SYNC] Page {page}/{max_pages} — "
                    f"{len(records)} records (total so far: {created + updated})"
                )

                # ── حفظ كل صفحة في transaction واحدة لتقليل الـ lock ──
                from django.db import transaction as db_transaction
                page_created = page_updated = page_failed = 0

                with db_transaction.atomic():
                    for rec in records:
                        vin = (rec.get('vin') or '').strip().upper()
                        if not vin or len(vin) != 17:
                            page_failed += 1
                            continue

                        try:
                            car_data = _map_listing_record(rec)
                            car, car_created = Cars.objects.update_or_create(
                                vin=vin,
                                defaults=car_data,
                            )
                            Reports.objects.get_or_create(
                                car=car,
                                defaults={
                                    'detailed_report': "بيانات مستوردة من auto.dev listings.",
                                }
                            )
                            if car_created:
                                page_created += 1
                            else:
                                page_updated += 1
                        except Exception as rec_err:
                            logger.error(f"[BULK-SYNC] Error saving VIN {vin}: {rec_err}")
                            page_failed += 1

                created += page_created
                updated += page_updated
                failed  += page_failed

                # تحديث الـ task state للمتابعة
                self.update_state(
                    state='PROGRESS',
                    meta={'page': page, 'created': created, 'updated': updated, 'failed': failed},
                )

                # تحديث الـ task state للمتابعة من الـ Admin
                self.update_state(
                    state='PROGRESS',
                    meta={'page': page, 'created': created, 'updated': updated, 'failed': failed},
                )

            except Exception as page_err:
                logger.error(f"[BULK-SYNC] Error on page {page}: {page_err}")
                failed += 1
                continue

        # ── إنهاء ────────────────────────────────────────────────────────
        config.last_sync = timezone.now()
        config.save(update_fields=['last_sync'])

        sync_log.mark_as_completed(
            records_processed=created + updated + failed,
            records_updated=updated,
            records_failed=failed,
        )
        sync_log.records_created = created
        sync_log.save(update_fields=['records_created'])

        result = {
            'success': True,
            'created': created,
            'updated': updated,
            'failed': failed,
            'total': created + updated,
        }
        logger.info(
            f"[BULK-SYNC] ✓ Done — created={created}, updated={updated}, failed={failed}"
        )
        return result

    except Exception as e:
        logger.error(f"[BULK-SYNC] Fatal error: {e}")
        sync_log.mark_as_failed(str(e))
        return {'success': False, 'error': str(e)}


def _map_listing_record(rec: dict) -> dict:
    """
    حوّل سجل listings من auto.dev إلى حقول نموذج Cars.
    listings تحتوي على البيانات مباشرة بدون nested objects.
    """
    def parse_int(v, default=0):
        if v is None:
            return default
        try:
            return int(float(str(v).replace(',', '').strip()))
        except Exception:
            return default

    def normalize_fuel(v):
        if not v:
            return 'other'
        v = str(v).lower()
        if 'electric' in v or 'ev' in v:
            return 'electric'
        if 'hybrid' in v:
            return 'hybrid'
        if 'diesel' in v:
            return 'diesel'
        if 'gas' in v or 'petrol' in v or 'benzin' in v:
            return 'gasoline'
        return 'other'

    def normalize_gear(v):
        if not v:
            return 2
        v = str(v).lower()
        if 'manual' in v or 'stick' in v:
            return 1
        return 2

    # mileage: قد يكون "New" أو رقم
    raw_mileage = rec.get('mileageUnformatted') or rec.get('mileage') or 0
    mileage = parse_int(raw_mileage, 0)

    make = str(rec.get('make') or 'Unknown').strip()[:100]
    model = str(rec.get('model') or 'Unknown').strip()[:100]
    year = parse_int(rec.get('year'), 2000)
    color_raw = str(rec.get('displayColor') or 'Unknown').strip()[:50]

    return {
        'name_car': f"{make} {model}"[:255],
        'make': make,
        'model': model,
        'year': year,
        'color': color_raw,
        'mileage': mileage,
        'fuel_type': normalize_fuel(rec.get('fuelType')),
        'gear_type': normalize_gear(rec.get('transmission')),
        'engine_capacity': 2000,   # listings لا تحتوي على engine_capacity
        'seating_capacity': None,
        'num_cylinders': None,
    }
