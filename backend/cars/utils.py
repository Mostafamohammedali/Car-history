#!/usr/bin/env python3
"""
أدوات مساعدة لمشروع Car History
"""

import logging
from typing import Dict, Optional, Tuple, Any
from vininfo import Vin

# إعداد السجلات
logger = logging.getLogger(__name__)

UNKNOWN = 'Unknown'

def calculate_vin_checksum(vin: str) -> bool:
    """
    حساب المجموع التدقيقي لرقم الهيكل (VIN Checksum)
    """
    if not vin or len(vin) != 17:
        return False
    
    vin = vin.upper()
    
    # ISO 3779 character value mapping
    char_values = {
        'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
        'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9, 'S': 2,
        'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9,
        '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9
    }
    
    # ISO 3779 weight factors by position
    weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]
    
    total = 0
    for i in range(17):
        char = vin[i]
        
        # Skip check digit (position 8) in calculation
        if i == 8:
            continue
            
        # Validate character is allowed
        if char not in char_values:
            return False
            
        total += char_values[char] * weights[i]
    
    # Calculate check digit using MOD 11
    remainder = total % 11
    calculated_check_digit = 'X' if remainder == 10 else str(remainder)
    
    # Compare with actual check digit (9th character)
    return vin[8] == calculated_check_digit

def decode_vin_locally(vin: str) -> Dict[str, Any]:
    """
    فك تشفير محلي معزز لرقم الهيكل.
    """
    try:
        # Enhanced validation first
        is_valid, error_msg = validate_vin_format(vin)
        if not is_valid:
            return {'is_valid': False, 'error': error_msg}
        
        clean_vin = vin.strip().upper()
        vin_obj = Vin(clean_vin) # Initialize core engine
        
        # Sectional Data Extraction
        wmi = clean_vin[:3]
        vds = clean_vin[3:9]
        year_code = clean_vin[9]
        plant_code = clean_vin[10]

        # Initializing Result Dictionary
        decoded_info = {
            'vin': clean_vin,
            'is_valid': True,
            'make': str(vin_obj.manufacturer) if vin_obj.manufacturer else UNKNOWN,
            'brand': str(getattr(vin_obj, 'brand', UNKNOWN)),
            'year': UNKNOWN,
            'country': str(vin_obj.country) if vin_obj.country else UNKNOWN,
            'model': UNKNOWN,
            'serial': clean_vin[11:17],
            'plant_code': plant_code,
            'checksum_valid': calculate_vin_checksum(clean_vin),  # Use our enhanced checksum
            'decode_method': 'deep_local_analyzer_v2',
            'engine_info': {'fuel_type': UNKNOWN, 'displacement': UNKNOWN, 'hp_est': UNKNOWN},
            'transmission_info': {'type': UNKNOWN},
            'body_info': {'type': UNKNOWN, 'doors': UNKNOWN},
            'drivetrain_info': {'drive_type': UNKNOWN},
            'safety_system': {'airbags': UNKNOWN, 'abs': 'Standard ABS' if year_code > '4' else 'Basic ABS'}
        }

        # Enhanced Year Mapping (Supporting up to 2026)
        years_map = {
            'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015, 'G': 2016, 
            'H': 2017, 'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 
            'R': 2024, 'S': 2025, 'T': 2026
        }
        decoded_info['year'] = years_map.get(year_code, UNKNOWN)

        # ---------------------------------------------------------
        # Manufacturer Specific Deep Logic (The "Brain")
        # ---------------------------------------------------------
        make_lower = decoded_info['make'].lower()

        # 1. MERCEDES-BENZ DEEP ANALYZER
        if 'mercedes' in make_lower or wmi == 'WDD':
            mb_body = {'F': 'Sedan', 'G': 'Sedan', 'H': 'SUV/Crossover', 'K': 'Coupe', 'L': 'SUV'}
            decoded_info['body_info']['type'] = mb_body.get(vds[0], 'Sedan')
            
            # Engine & Model Logic
            mb_models = {'212': 'E-Class', '205': 'C-Class', '222': 'S-Class', '166': 'GLE'}
            decoded_info['model'] = mb_models.get(vds[0:3], "Mercedes-Benz Model")
            
            # Drive Train Inference (AWD/RWD)
            is_awd = any(c in vds[1:3] for c in '89ABC')
            decoded_info['drivetrain_info']['drive_type'] = 'AWD (4MATIC)' if is_awd else 'RWD'
            # Fix: Convert year to int safely (may be UNKNOWN string)
            year_val = decoded_info['year']
            try:
                year_int = int(year_val) if year_val != UNKNOWN and str(year_val).isdigit() else 0
            except (ValueError, TypeError):
                year_int = 0
            decoded_info['transmission_info']['type'] = 'Automatic (9G-TRONIC)' if year_int > 2016 else 'Automatic (7G-TRONIC)'

        # 2. LEXUS/TOYOTA DEEP ANALYZER
        elif wmi in ['2T2', 'JTD', 'JTH', 'JT2']:
            if '2T2' in wmi: decoded_info['make'] = 'Lexus (Canada)'
            
            # Deep Engine Mapping
            lex_engines = {'A': '2.4L Turbo', 'B': '2.5L Hybrid', 'C': '3.5L V6', 'M': '2.4L Hybrid'}
            decoded_info['engine_info']['displacement'] = lex_engines.get(vds[1], UNKNOWN)
            
            # Body & Transmission Logic (Fixing Sedan/SUV conflict)
            if vds[0] in ['B', 'Y', 'J']:
                decoded_info['body_info']['type'] = 'SUV (RX Series)'
                decoded_info['transmission_info']['type'] = 'Automatic'
            
            # Drive Train Consistency
            decoded_info['drivetrain_info']['drive_type'] = 'AWD (Active Torque)' if vds[4] in '012' else 'FWD'

        # 3. TESLA ANALYZER
        elif 'tesla' in make_lower or wmi == '5YJ':
            decoded_info['engine_info']['fuel_type'] = 'Electric'
            decoded_info['transmission_info']['type'] = 'Single-speed Automatic'
            decoded_info['body_info']['type'] = 'Sedan (Model 3/S)' if vds[0] in '3S' else 'SUV (Model Y/X)'
            decoded_info['drivetrain_info']['drive_type'] = 'AWD' if vds[1] in 'BCF' else 'RWD'

        # 4. GENERAL BACKUP LOGIC (ISO Standard)
        else:
            if decoded_info['body_info']['type'] == UNKNOWN:
                decoded_info['body_info']['type'] = 'Sedan' if vds[0] in 'ABCD' else 'SUV' if vds[0] in 'LM' else UNKNOWN
            if decoded_info['transmission_info']['type'] == UNKNOWN:
                # Fix: Convert year to int safely (may be UNKNOWN string)
                year_val = decoded_info['year']
                try:
                    year_int = int(year_val) if year_val != UNKNOWN and str(year_val).isdigit() else 0
                except (ValueError, TypeError):
                    year_int = 0
                decoded_info['transmission_info']['type'] = 'Automatic' if year_int > 2015 else UNKNOWN

        return decoded_info

    except Exception as e:
        logger.error(f"Critical error in local decoder: {e}")
        return {'is_valid': False, 'error': str(e)}

def validate_vin_format(vin: str) -> Tuple[bool, Optional[str]]:
    """
    التحقق من صحة تنسيق رقم الهيكل.
    """
    import re
    
    if not vin:
        return False, "VIN cannot be empty"
    
    clean = vin.strip().upper()
    
    # Regex validation: exactly 17 characters, alphanumeric only, no I/O/Q
    vin_pattern = r'^[A-HJ-NPR-Z0-9]{17}$'
    if not re.match(vin_pattern, clean):
        if len(clean) != 17:
            return False, "VIN must be exactly 17 characters"
        elif any(c in clean for c in 'IOQ'):
            return False, "VIN cannot contain I, O, or Q"
        else:
            return False, "VIN contains invalid characters"
    
    # Checksum validation using ISO 3779 algorithm
    if not calculate_vin_checksum(clean):
        return False, "Invalid VIN checksum - the 9th digit check failed"
    
    return True, None
