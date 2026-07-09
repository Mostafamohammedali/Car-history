"""
VehicleDataService — Local-First Architecture
=============================================
This service ONLY queries the local database for user-facing searches.
All external data acquisition is handled exclusively by the scheduled
24-hour Celery sync task (data_sync.tasks.auto_sync_all).
"""

import re
from typing import Dict, List, Optional, Any
import requests
import logging
from django.utils import timezone
from django.core.files.base import ContentFile
import os

logger = logging.getLogger(__name__)

# Import for dynamic configurations
try:
    from data_sync.models import ExternalDBConfig, DataMapping
except ImportError:
    ExternalDBConfig = None
    DataMapping = None


class VehicleDataService:
    """
    Vehicle data service — LOCAL DATABASE ONLY for user queries.
    """

    def __init__(self):
        """Initialise the service."""
        self.vin_pattern = re.compile(r'^[A-HJ-NPR-Z0-9]{17}$', re.IGNORECASE)


    def validate_vin(self, vin: str) -> bool:
        """Enhanced VIN validation with regex and checksum verification."""
        # Import the enhanced validation function
        from .utils import validate_vin_format
        
        if not vin or not isinstance(vin, str):
            return False
        
        is_valid, error_msg = validate_vin_format(vin)
        return is_valid

    # ------------------------------------------------------------------
    # Local database query
    # ------------------------------------------------------------------

    def get_local_vehicle_data(self, vin: str) -> Optional[Dict[str, Any]]:
        """Search the LOCAL database for a vehicle report by VIN."""
        try:
            logger.info(f"[LOCAL] Searching local DB for VIN: {vin}")

            from .models import Reports, Evaluation, ImageCar, AccidentImage, Repairshops

            report = (
                Reports.objects
                .filter(car__vin__iexact=vin)
                .select_related('car')
                .order_by('-created_at')
                .first()
            )

            if not report:
                logger.info(f"[LOCAL] VIN {vin} not found in local database.")
                return None

            # --- CHECK IF AI EVALUATION IS MISSING OR NEW IMAGES EXIST AND TRIGGER IT ---
            from cars.models import AccidentImage
            unanalyzed_images_exist = AccidentImage.objects.filter(car__vin=vin, ai_analyzed_at__isnull=True).exists()
            has_ai_eval = report.risk_assessment_data and "purchase_recommendation" in report.risk_assessment_data
            
            if not has_ai_eval or unanalyzed_images_exist:
                try:
                    from ai_chat.services import AutomotiveAIAssistant
                    logger.info(f"[LOCAL] Triggering comprehensive AI evaluation for VIN {vin} on the fly...")
                    ai_assistant = AutomotiveAIAssistant()
                    ai_assistant.evaluate_car_comprehensive(vin)
                    report.refresh_from_db()  # Reload the new data saved by the AI
                except Exception as e:
                    logger.error(f"[LOCAL] Error triggering AI evaluation: {e}")

            report.update_report_data()
            car = report.car
            snapshot = report.car_snapshot or {}

            # 1. Evaluations
            evaluations = Evaluation.objects.filter(car=car).select_related('user').order_by('-created_at')
            evaluations_data = [{
                'id': ev.evaluation_id,
                'user': ev.user.username if ev.user else 'Anonymous',
                'user_id': ev.user.id if ev.user else None,
                'rating': ev.rate,
                'comment': ev.comment or '',
                'pros': ev.pros or '',
                'cons': ev.cons or '',
                'would_recommend': ev.would_recommend,
                'created_at': ev.created_at.isoformat() if ev.created_at else None,
            } for ev in evaluations]

            # 2. Regular vehicle images
            car_images = ImageCar.objects.filter(car=car).order_by('-created_at')
            images_list = [{
                'id': img.img_car_id,
                'image_url': img.get_image_data_url(),
                'type': 'regular',
                'created_at': img.created_at.isoformat() if img.created_at else None,
            } for img in car_images if img.get_image_data_url()]

            # 3. Accident images
            acc_images = AccidentImage.objects.filter(car=car).order_by('-created_at')
            accident_images_data = [{
                'id': img.accident_image_id,
                'image_url': img.get_image_data_url(),
                'type': 'accident',
                'ai_description': img.ai_description or '',
                'ai_accident_type': img.ai_accident_type or 'other',
                'ai_analysis_data': getattr(img, 'ai_analysis_data', {}),
                'created_at': img.created_at.isoformat() if img.created_at else None,
            } for img in acc_images if img.get_image_data_url()]

            # 4. Workshop records
            repair_shops = Repairshops.objects.filter(car=car).order_by('-created_at')
            repair_shops_data = [{
                'id': shop.repairshop_id,
                'mech_insp_desc': shop.mech_insp_desc or '',
                'comp_scan_desc': shop.comp_scan_desc or '',
                'created_at': shop.created_at.isoformat() if shop.created_at else None,
            } for shop in repair_shops]

            return {
                'report': {
                    'id': report.report_id,
                    'uuid': str(report.report_uuid),
                    'overall_ai_score': report.overall_ai_score,
                    'accident_severity_score': report.accident_severity_score,
                    'risk_assessment_data': report.risk_assessment_data,
                    'detailed_report': report.detailed_report or '',
                    'created_at': report.created_at.isoformat() if report.created_at else None,
                },
                'car': {
                    **(snapshot if snapshot else {}),
                    'vin': car.vin,
                    'name_car': car.name_car,
                    'make': car.make,
                    'model': car.model,
                    'year': car.year,
                    'color': car.color,
                    'mileage': car.mileage,
                    'fuel_type': car.fuel_type,
                    'gear_type': car.gear_type,
                    # بيان الجمرك
                    'customs_num': car.customs_num,
                    'customs_date': car.customs_date.isoformat() if car.customs_date else None,
                    'receipt_number': car.receipt_number,
                    'receipt_date': car.receipt_date.isoformat() if car.receipt_date else None,
                    # بيانات المحرك
                    'engine_capacity': car.engine_capacity,
                    'num_cylinders': car.num_cylinders,
                },
                'statistics': {
                    'total_images': len(images_list),
                    'total_accident_images': len(accident_images_data),
                    'avg_rating': report.avg_user_rating,
                },
                'evaluations': evaluations_data,
                'images': images_list,
                'accident_images': accident_images_data,
                'repair_shops': repair_shops_data,
                'source': 'local_database',
                'data_quality': 'complete',
            }
        except Exception as e:
            logger.error(f"[LOCAL] Error: {e}")
            return None

    def get_integrated_search_workflow(self, vin: str, user_authenticated: bool = False) -> Dict[str, Any]:
        """Integrated VIN Search with Guest and Fallback logic."""
        vin = vin.strip().upper()
        
        local_report = self.get_local_vehicle_data(vin)
        if local_report:
            local_report['success'] = True
            local_report['result_type'] = 'report'
            local_report['source'] = 'local_database'
            return local_report
        
        try:
            from .vin_decoder import vin_decoder_service
            decode_result = vin_decoder_service.decode_vin(vin, include_details=True)
            
            if decode_result.get('success'):
                vehicle_info = decode_result.get('vehicle_info', {})
                return {
                    'success': True,
                    'result_type': 'decoded',
                    'source': 'vin_decoder',
                    'vin': vin,
                    'car': {
                        'vin': vin,
                        'make': vehicle_info.get('make', 'Unknown'),
                        'model': vehicle_info.get('model', 'Unknown'),
                        'year': vehicle_info.get('year', 0),
                    },
                    'report': {
                        'detailed_report': f"تم فك تشفير {vin} بنجاح.",
                    },
                    'decode_info': decode_result,
                }
        except Exception as e:
            logger.error(f"[VIN_DECODE] Error: {e}")

        return {'success': False, 'error': 'رقم الهيكل غير متوفر.', 'result_type': 'not_found', 'vin': vin}

    def fetch_from_dynamic_api(self, vin: str) -> Dict[str, Any]:
        """
        Fetch data for a VIN from all active API sources defined in ExternalDBConfig (name starting with 'API:').
        This is used for background sync and manual sync scripts.
        """
        from data_sync.models import ExternalDBConfig
        from data_sync.mapping_engine import APIMappingEngine
        import requests
        
        vin = vin.strip().upper()
        configs = ExternalDBConfig.objects.filter(is_active=True, name__istartswith='API:')
        
        if not configs.exists():
            return {'fields': {}, 'debug': {'error': 'No active API sources found'}}
            
        engine = APIMappingEngine()
        sources_data = []
        
        for config in configs:
            try:
                url = config.host
                if not url or '{vin}' not in url.lower():
                    continue
                
                vin_url = url.replace('{vin}', vin).replace('{VIN}', vin)
                
                # Setup headers from config
                headers = {}
                if config.user and config.password:
                    headers[config.user] = config.password
                if config.dbname:
                    headers['X-API-SECRET'] = config.dbname
                
                logger.info(f"[DYNAMIC-API] Fetching VIN {vin} from {config.name}...")
                resp = requests.get(vin_url, headers=headers, timeout=20)
                
                if resp.status_code == 200:
                    try:
                        api_data = resp.json()
                        sources_data.append((config, api_data))
                    except:
                        logger.warning(f"[DYNAMIC-API] Non-JSON response from {config.name}")
                else:
                    logger.debug(f"[DYNAMIC-API] Source {config.name} returned HTTP {resp.status_code}")
                    
            except Exception as e:
                logger.error(f"[DYNAMIC-API] Error fetching from {config.name}: {e}")
                
        if not sources_data:
            return {'fields': {}, 'debug': {'status': 'not_found'}}
            
        # Use mapping engine to apply mappings and fallback logic
        mapped_data = engine.apply_with_fallback(sources_data, vin=vin)
        
        return {
            'fields': mapped_data,
            'debug': {
                'status': 'success',
                'sources_used': [c.name for c, d in sources_data]
            }
        }

    # ------------------------------------------------------------------
    # Sync-engine helpers
    # ------------------------------------------------------------------

    def save_external_data_to_local(self, vin: str, external_data: Dict[str, Any]) -> bool:
        """
        Persist fetched external data to the local database.
        """
        try:
            from .models import Cars, Reports
            sources = external_data.get('data_sources', {})
            dynamic_api_data = sources.get('dynamic_api', {})
            external_db_data = sources.get('external_db', {})
            
            # Merge all available technical specs
            tech_specs = {**dynamic_api_data, **external_db_data}

            # 1. Update or Create Car
            car, created = Cars.objects.get_or_create(
                vin=vin.upper(), 
                defaults={
                    'make': tech_specs.get('make', 'Unknown'),
                    'model': tech_specs.get('model', 'Unknown'),
                    'year': tech_specs.get('year', 2000),
                    'engine_capacity': tech_specs.get('engine_capacity', 2000),
                    'gear_type': tech_specs.get('gear_type', 2),
                    'fuel_type': tech_specs.get('fuel_type', 'other'),
                    'name_car': f"{tech_specs.get('make', '')} {tech_specs.get('model', '')}".strip() or 'Unknown Car'
                }
            )
            
            if not created:
                # Update existing car fields if local data is sparse
                fields_to_update = ['make', 'model', 'year', 'color', 'mileage', 'fuel_type', 'gear_type', 'engine_capacity']
                updated = False
                for field in fields_to_update:
                    new_val = tech_specs.get(field)
                    current_val = getattr(car, field)
                    
                    # Only update if the new value is meaningful and the current one is default/missing
                    if new_val not in (None, '', 'Unknown', 0):
                        if current_val in (None, '', 'Unknown', 0, 2000):
                            setattr(car, field, new_val)
                            updated = True
                
                if updated:
                    car.save()
            
            # 2. Update or Create Report Snapshot
            report, _ = Reports.objects.get_or_create(car=car)
            current_snapshot = report.car_snapshot or {}
            current_snapshot['all_technical_specs'] = {**current_snapshot.get('all_technical_specs', {}), **tech_specs}
            report.car_snapshot = current_snapshot
            report.save()

            # 3. Handle Images
            # Check both direct lists in sources and lists inside mapped dictionaries
            for name, data in sources.items():
                if isinstance(data, list):
                    # Direct list (e.g., from a legacy source or external_db)
                    if 'accident' in name.lower():
                        self.save_accident_images(vin, car, data)
                    else:
                        self.save_vehicle_images(vin, car, data)
                elif isinstance(data, dict):
                    # Mapped dictionary (e.g., from dynamic_api)
                    for field_name, field_val in data.items():
                        if isinstance(field_val, list) and any(x in field_name.lower() for x in ['image', 'photo', 'picture', 'img']):
                            if 'accident' in field_name.lower():
                                self.save_accident_images(vin, car, field_val)
                            else:
                                self.save_vehicle_images(vin, car, field_val)
            
            # --- TRIGGER COMPREHENSIVE AI EVALUATION ---
            try:
                from ai_chat.services import AutomotiveAIAssistant
                logger.info(f"[SYNC] Running comprehensive AI evaluation for VIN {vin}...")
                ai_assistant = AutomotiveAIAssistant()
                ai_assistant.evaluate_car_comprehensive(vin.upper())
            except Exception as e:
                logger.error(f"[SYNC] AI evaluation failed for VIN {vin}: {e}")
            
            return True
        except Exception as e:
            logger.error(f"[SYNC] Persist error for VIN {vin}: {e}")
            return False

    def save_vehicle_images(self, vin: str, car_instance, images_data: Any) -> int:
        from .models import ImageCar
        saved = 0
        if not isinstance(images_data, list): images_data = [images_data]
        
        for img_item in images_data:
            url = img_item if isinstance(img_item, str) else img_item.get('url')
            if url:
                if url.startswith('//'): url = 'https:' + url
                if not ImageCar.objects.filter(car=car_instance, img_car=url).exists():
                    ImageCar.objects.create(car=car_instance, img_car=url)
                    saved += 1
        return saved

    def save_accident_images(self, vin: str, car_instance, images_data: Any) -> int:
        from .models import AccidentImage
        saved = 0
        if not isinstance(images_data, list): images_data = [images_data]
        
        for img_item in images_data:
            url = img_item if isinstance(img_item, str) else img_item.get('url')
            desc = 'صورة حادث' if isinstance(img_item, str) else img_item.get('description', 'صورة حادث')
            img_bytes = self.download_image_from_url(url)
            if img_bytes:
                AccidentImage.objects.create(car=car_instance, accident_image=img_bytes, ai_description=desc)
                saved += 1
        return saved

    def download_image_from_url(self, image_url: str) -> Optional[bytes]:
        if not image_url: return None
        try:
            resp = requests.get(image_url, timeout=20)
            return resp.content if resp.status_code == 200 else None
        except: return None

    def _normalize_fuel_type(self, val: Any) -> str:
        s = str(val or '').lower()
        if any(x in s for x in ['petrol', 'gasoline', 'بنزين']): return 'gasoline'
        if any(x in s for x in ['diesel', 'ديزل']): return 'diesel'
        return 'other'

    def _normalize_gear_type(self, val: Any) -> int:
        s = str(val or '').lower()
        return 1 if any(x in s for x in ['manual', 'يدوي']) else 2