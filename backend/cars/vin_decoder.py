#!/usr/bin/env python3
"""
Servicio dedicado para decodificación de VIN - Proyecto Car History
Sistema optimizado por Bash Mohandis Mustafa
"""

import logging
import requests
from typing import Dict, Any, Optional, List
from django.utils import timezone
from django.conf import settings
from .utils import decode_vin_locally, validate_vin_format

# Configuración de logging
logger = logging.getLogger(__name__)

class VINDecoderService:
    """
    Servicio especializado para decodificación de VIN.
    Actúa como puente entre la lógica de utils.py y las vistas de Django.
    """
    
    def __init__(self):
        self.logger = logger
        self.logger.info("VINDecoderService inicializado con motor DeepAnalyzer")

    @staticmethod
    def _safe_value(value: Any, default: str = 'Unknown') -> Any:
        """يضمن عدم ظهور قيم فارغة في واجهة المستخدم."""
        return default if value in (None, '', [], {}, 'Unknown') else value

    def _with_unknowns(self, data: Optional[Dict[str, Any]], defaults: Dict[str, Any]) -> Dict[str, Any]:
        """يقوم بدمج البيانات المستخرجة مع القيم الافتراضية بشكل آمن."""
        merged = defaults.copy()
        if data and isinstance(data, dict):
            for key in defaults.keys():
                if key in data:
                    merged[key] = self._safe_value(data[key], defaults[key])
        return merged

    def _fetch_from_nhtsa(self, vin: str) -> Dict[str, Any]:
        """Fetch vehicle data from NHTSA vPIC API."""
        try:
            self.logger.info(f"Fetching data from NHTSA vPIC API for VIN: {vin}")
            url = f"https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{vin}?format=json"
            
            # 5 second timeout as requested
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('Results'):
                    # Filter and extract essential fields from NHTSA response
                    filtered_data = self._filter_nhtsa_data(data['Results'])
                    self.logger.info("Successfully fetched and filtered data from NHTSA API")
                    return filtered_data
                else:
                    self.logger.warning("NHTSA API returned empty results")
                    return {}
            else:
                self.logger.warning(f"NHTSA API error: {response.status_code} - {response.text}")
                return {}
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Network error with NHTSA API: {str(e)}")
            return {}
        except Exception as e:
            self.logger.error(f"Unexpected error with NHTSA API: {str(e)}")
            return {}

    def _filter_nhtsa_data(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Filter NHTSA API results to extract comprehensive vehicle information organized by categories."""
        # Initialize categorized data structure
        categorized_data = {
            'header_info': {},
            'engine_performance': {},
            'body_manufacturing': {},
            'safety_tech': {}
        }

        # Comprehensive field mapping with categories
        field_mappings = {
            # Header Info
            'Make': ('header_info', 'make'),
            'Model': ('header_info', 'model'),
            'Model Year': ('header_info', 'model_year'),

            # Engine & Performance
            'Fuel Type - Primary': ('engine_performance', 'fuel_type_primary'),
            'Engine Number of Cylinders': ('engine_performance', 'engine_cylinders'),
            'Displacement (L)': ('engine_performance', 'displacement_l'),
            'Engine Model': ('engine_performance', 'engine_model'),
            'Drive Type': ('engine_performance', 'drive_type'),

            # Body & Manufacturing
            'Plant Country': ('body_manufacturing', 'plant_country'),
            'Body Class': ('body_manufacturing', 'body_class'),
            'Number of Doors': ('body_manufacturing', 'number_of_doors'),
            'Series': ('body_manufacturing', 'series'),
            'Manufacturer Name': ('body_manufacturing', 'manufacturer_name'),

            # Safety & Tech
            'Brake System Type': ('safety_tech', 'brake_system_type'),
            'Bus Floor Configuration Type': ('safety_tech', 'bus_floor_config_type'),
            # Air Bag related fields will be collected separately
        }

        # Extract values from results array
        air_bag_locations = []
        for result in results:
            variable = result.get('Variable', '')
            value = result.get('Value', '')

            # Skip invalid/empty values
            if not value or value == 'Not Applicable' or value == 'null':
                continue

            # Handle Air Bag Locations separately (collect all)
            if 'Air Bag Loc' in variable:
                air_bag_locations.append({
                    'location': variable,
                    'value': value
                })
                continue

            # Map other fields to categories
            if variable in field_mappings:
                category, field_name = field_mappings[variable]
                categorized_data[category][field_name] = value

        # Add collected air bag locations to safety_tech
        if air_bag_locations:
            categorized_data['safety_tech']['air_bag_locations'] = air_bag_locations

        return categorized_data

    def _merge_header_info(self, vininfo_data: Dict[str, Any], nhtsa_data: Dict[str, Any], vin: str) -> Dict[str, Any]:
        """Merge header information from vininfo and NHTSA data."""
        header = {}

        # VIN is passed directly from validation
        header['vin'] = vin

        # Make - prefer NHTSA over vininfo
        header['make'] = nhtsa_data.get('header_info', {}).get('make') or vininfo_data.get('make', 'Unknown')

        # Model - prefer NHTSA over vininfo
        header['model'] = nhtsa_data.get('header_info', {}).get('model') or vininfo_data.get('model', 'Unknown')

        # Model Year - prefer NHTSA over vininfo
        header['model_year'] = nhtsa_data.get('header_info', {}).get('model_year') or vininfo_data.get('year', 'Unknown')

        return {k: self._safe_value(v) for k, v in header.items()}

    def _merge_engine_performance(self, vininfo_data: Dict[str, Any], nhtsa_data: Dict[str, Any]) -> Dict[str, Any]:
        """Merge engine and performance information."""
        engine_perf = {}

        nhtsa_engine = nhtsa_data.get('engine_performance', {})
        vininfo_engine = vininfo_data.get('engine_info', {})

        # Fuel Type - prefer NHTSA
        engine_perf['fuel_type_primary'] = nhtsa_engine.get('fuel_type_primary') or vininfo_engine.get('fuel_type', 'Unknown')

        # Engine Cylinders - prefer NHTSA
        engine_perf['engine_cylinders'] = nhtsa_engine.get('engine_cylinders') or vininfo_engine.get('cylinders', 'Unknown')

        # Displacement - prefer NHTSA
        engine_perf['displacement_l'] = nhtsa_engine.get('displacement_l') or vininfo_engine.get('displacement', 'Unknown')

        # Engine Model - NHTSA only
        engine_perf['engine_model'] = nhtsa_engine.get('engine_model', 'Unknown')

        # Drive Type - prefer NHTSA
        engine_perf['drive_type'] = nhtsa_engine.get('drive_type') or vininfo_data.get('drivetrain_info', {}).get('drive_type', 'Unknown')

        return {k: self._safe_value(v) for k, v in engine_perf.items()}

    def _merge_body_manufacturing(self, vininfo_data: Dict[str, Any], nhtsa_data: Dict[str, Any]) -> Dict[str, Any]:
        """Merge body and manufacturing information."""
        body_mfg = {}

        nhtsa_body = nhtsa_data.get('body_manufacturing', {})
        vininfo_body = vininfo_data.get('body_info', {})

        # Plant Country - prefer NHTSA
        body_mfg['plant_country'] = nhtsa_body.get('plant_country') or vininfo_data.get('country', 'Unknown')

        # Body Class - prefer NHTSA
        body_mfg['body_class'] = nhtsa_body.get('body_class') or vininfo_body.get('type', 'Unknown')

        # Number of Doors - prefer NHTSA
        body_mfg['number_of_doors'] = nhtsa_body.get('number_of_doors') or vininfo_body.get('doors', 'Unknown')

        # Series - NHTSA only
        body_mfg['series'] = nhtsa_body.get('series', 'Unknown')

        # Manufacturer Name - NHTSA only
        body_mfg['manufacturer_name'] = nhtsa_body.get('manufacturer_name', 'Unknown')

        return {k: self._safe_value(v) for k, v in body_mfg.items()}

    def _merge_safety_tech(self, vininfo_data: Dict[str, Any], nhtsa_data: Dict[str, Any]) -> Dict[str, Any]:
        """Merge safety and technology information."""
        safety_tech = {}

        nhtsa_safety = nhtsa_data.get('safety_tech', {})
        vininfo_safety = vininfo_data.get('safety_system', {})

        # Brake System Type - NHTSA only
        safety_tech['brake_system_type'] = nhtsa_safety.get('brake_system_type', 'Unknown')

        # Bus Floor Configuration Type - NHTSA only
        safety_tech['bus_floor_config_type'] = nhtsa_safety.get('bus_floor_config_type', 'Unknown')

        # Air Bag Locations - NHTSA only (array of locations)
        safety_tech['air_bag_locations'] = nhtsa_safety.get('air_bag_locations', [])

        # Add vininfo safety data as fallback
        if not safety_tech['air_bag_locations']:
            safety_tech['airbags'] = vininfo_safety.get('airbags', 'Unknown')
            safety_tech['abs'] = vininfo_safety.get('abs', 'Unknown')

        return safety_tech

    def validate_vin(self, vin: str) -> Dict[str, Any]:
        """التحقق من صحة تنسيق رقم الهيكل قبل المعالجة."""
        try:
            is_valid, error_msg = validate_vin_format(vin)
            return {
                'vin': vin.strip().upper() if vin else '',
                'is_valid': is_valid,
                'error_message': error_msg,
                'validation_timestamp': timezone.now().isoformat(),
                'validation_method': 'local_format_check'
            }
        except Exception as e:
            self.logger.error(f"Error validando VIN: {str(e)}")
            return {'is_valid': False, 'error_message': str(e)}
    
    def decode_vin(self, vin: str, include_details: bool = True) -> Dict[str, Any]:
        """
        الوظيفة الرئيسية: تقوم بجلب البيانات العميقة وتنسيقها للواجهة.
        """
        try:
            self.logger.info(f"Iniciando decodificación profunda: {vin}")
            start_time = timezone.now()
            
            # 1. التحقق من الرقم أولاً
            validation_result = self.validate_vin(vin)
            if not validation_result['is_valid']:
                return {'success': False, 'error': validation_result['error_message']}
            
            # 2. استدعاء المحلل العميق من utils.py
            decoded_data = decode_vin_locally(vin)
            
            # 2.5 Fetch data from NHTSA vPIC API
            nhtsa_data = self._fetch_from_nhtsa(vin)
            
            # If both local decoding and NHTSA API fail
            if not decoded_data.get('is_valid', False) and not nhtsa_data:
                return {'success': False, 'error': decoded_data.get('error', 'Decoding failed from both local and external sources')}
            
            # If local decoding fails and NHTSA data is available
            if not decoded_data.get('is_valid', False) and nhtsa_data:
                decoded_data = {'is_valid': True, 'decode_method': 'nhtsa_api_fallback', **nhtsa_data}
            elif nhtsa_data:
                decoded_data['decode_method'] = 'vininfo_and_nhtsa'
                
            processing_time = round((timezone.now() - start_time).total_seconds(), 6)
            
            # دالة مساعدة لدمج الحقول وتفضيل البيانات غير الفارغة
            def merge_field(local_val, ext_val):
                if self._safe_value(local_val, 'Unknown') == 'Unknown' and self._safe_value(ext_val, 'Unknown') != 'Unknown':
                    return ext_val
                return local_val
                
            # 3. Build comprehensive technical data from merged sources
            # Merge NHTSA categorized data with vininfo data
            header_info = self._merge_header_info(decoded_data, nhtsa_data, validation_result['vin'])
            engine_performance = self._merge_engine_performance(decoded_data, nhtsa_data)
            body_manufacturing = self._merge_body_manufacturing(decoded_data, nhtsa_data)
            safety_tech = self._merge_safety_tech(decoded_data, nhtsa_data)

            # Extract basic information with NHTSA data taking precedence
            make = nhtsa_data.get('make') or decoded_data.get('make')
            model = nhtsa_data.get('model') or decoded_data.get('model')
            year = nhtsa_data.get('model_year') or decoded_data.get('year')
            country = nhtsa_data.get('plant_country') or decoded_data.get('country')

            # 4. Build final response structure optimized for Glassmorphism UI
            response = {
                'success': True,
                'vin': validation_result['vin'],
                'decode_method': decoded_data.get('decode_method', 'vininfo'),
                'processing_time': processing_time,
                'timestamp': timezone.now().isoformat(),

                # Header Info section
                'header_info': header_info,

                # Engine & Performance section
                'engine_performance': engine_performance,

                # Body & Manufacturing section
                'body_manufacturing': body_manufacturing,

                # Safety & Tech section
                'safety_tech': safety_tech,

                # VIN codes section (maintained for compatibility)
                'vin_codes': {
                    'wmi': vin[:3],
                    'vds': vin[3:9],
                    'vis': vin[9:],
                    'year_code': vin[9],
                    'plant_code': vin[10],
                    'serial': vin[11:],
                    'checksum_valid': decoded_data.get('checksum_valid', False)
                },

                # Vehicle info for compatibility
                'vehicle_info': {
                    'make': header_info.get('make'),
                    'model': header_info.get('model'),
                    'year': header_info.get('model_year'),
                    'country': body_manufacturing.get('plant_country'),
                    'body_type': body_manufacturing.get('body_class'),
                    'fuel_type': engine_performance.get('fuel_type_primary'),
                    'transmission': 'Unknown',  # Not in current categories
                    'drive_type': engine_performance.get('drive_type'),
                    'engine_info': {
                        'cylinders': engine_performance.get('engine_cylinders'),
                        'displacement': engine_performance.get('displacement_l'),
                        'fuel_type': engine_performance.get('fuel_type_primary'),
                    },
                    'transmission_info': {'type': 'Unknown'},
                    'body_info': {
                        'type': body_manufacturing.get('body_class'),
                        'doors': body_manufacturing.get('number_of_doors'),
                    },
                },
            }
            
            if include_details:
                response['raw_data'] = decoded_data
                response['nhtsa_data'] = nhtsa_data
                # Add metadata for frontend
                response['metadata'] = {
                    'decode_confidence': 'High' if nhtsa_data else 'Medium',
                    'engine_version': 'v3.0-NHTSA-Hybrid-Categorized',
                    'data_sources': {
                        'vininfo': bool(decoded_data.get('is_valid')),
                        'nhtsa_api': bool(nhtsa_data)
                    }
                }

            return response
            
        except Exception as e:
            self.logger.error(f"Error general en servicio: {str(e)}")
            return {'success': False, 'error': 'Internal Server Error'}

    def batch_decode(self, vin_list: List[str]) -> Dict[str, Any]:
        """معالجة مجموعة من الأرقام في وقت واحد."""
        results = [self.decode_vin(v, include_details=False) for v in vin_list]
        return {
            'total': len(vin_list),
            'successful': len([r for r in results if r['success']]),
            'results': results
        }

# نسخة عالمية للاستخدام في الـ Views
vin_decoder_service = VINDecoderService()
