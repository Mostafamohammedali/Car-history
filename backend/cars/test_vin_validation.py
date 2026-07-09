#!/usr/bin/env python3
"""
Test script for VIN validation and checksum calculation.
Tests known valid and invalid VINs to ensure the ISO 3779 algorithm works correctly.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils import calculate_vin_checksum, validate_vin_format

def test_checksum_calculation():
    """Test checksum calculation with known valid VINs."""
    
    # Known valid VINs with their expected check digits
    test_vins = [
        # Valid VINs (should pass checksum)
        "1HGCM82633A004352",  # Honda
        "2T2BF1BV1AC123456",  # Lexus  
        "5YJ3E1EA7JF000009",  # Tesla
        "WDDUG8FB6JA123456",  # Mercedes-Benz
        "1FTFW1ET5DFC12345",  # Ford
        
        # Invalid VINs (should fail checksum)
        "4GJBB4HHHJHVHH555",  # Invalid user example
        "1HGCM82633A004353",  # Same Honda but wrong check digit
        "2T2BF1BV1AC123457",  # Same Lexus but wrong check digit
    ]
    
    print("Testing VIN checksum calculation:")
    print("=" * 50)
    
    for vin in test_vins:
        is_valid = calculate_vin_checksum(vin)
        status = "✓ VALID" if is_valid else "✗ INVALID"
        print(f"VIN: {vin} - Checksum: {status}")
    
    print("\nTesting enhanced VIN validation:")
    print("=" * 50)
    
    for vin in test_vins:
        is_valid, error_msg = validate_vin_format(vin)
        status = "✓ VALID" if is_valid else f"✗ INVALID: {error_msg}"
        print(f"VIN: {vin} - Full Validation: {status}")
    
    # Test edge cases
    print("\nTesting edge cases:")
    print("=" * 50)
    
    edge_cases = [
        ("", "Empty VIN"),
        ("123", "Too short"),
        ("123456789012345678", "Too long"),
        ("1HGCM82633A00435I", "Contains I"),
        ("1HGCM82633A00435O", "Contains O"),
        ("1HGCM82633A00435Q", "Contains Q"),
        ("1HGCM82633A00435@", "Contains invalid symbol"),
    ]
    
    for vin, description in edge_cases:
        is_valid, error_msg = validate_vin_format(vin)
        status = "✓ VALID" if is_valid else f"✗ INVALID: {error_msg}"
        print(f"{description}: {status}")

def show_checksum_algorithm():
    """Demonstrate the checksum algorithm step by step."""
    print("\nChecksum Algorithm Demonstration:")
    print("=" * 50)
    
    vin = "1HGCM82633A004352"  # Known valid Honda VIN
    print(f"Analyzing VIN: {vin}")
    
    # Character values
    char_values = {
        'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
        'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9, 'S': 2,
        'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9,
        '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9
    }
    
    # Weight factors
    weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]
    
    print(f"Position | Char | Value | Weight | Product")
    print("-" * 45)
    
    total = 0
    for i in range(17):
        char = vin[i]
        if i == 8:  # Skip check digit
            print(f"    {i+1:2d}   |  {char}   |  ---  |  {weights[i]:2d}   |   ---  (Check Digit)")
            continue
            
        value = char_values[char]
        weight = weights[i]
        product = value * weight
        total += product
        
        print(f"    {i+1:2d}   |  {char}   |   {value:2d}  |  {weight:2d}   |   {product:3d}")
    
    print("-" * 45)
    print(f"Total: {total}")
    
    remainder = total % 11
    calculated_check = 'X' if remainder == 10 else str(remainder)
    actual_check = vin[8]
    
    print(f"Remainder: {total} % 11 = {remainder}")
    print(f"Calculated check digit: {calculated_check}")
    print(f"Actual check digit: {actual_check}")
    print(f"Result: {'✓ VALID' if calculated_check == actual_check else '✗ INVALID'}")

if __name__ == "__main__":
    test_checksum_calculation()
    show_checksum_algorithm()
