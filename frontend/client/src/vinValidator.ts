/**
 * @file vinValidator.ts
 * @description خوارزمية التحقق العالمية من رقم الهيكل (VIN Check Digit)
 */

export function validateVIN(vin: string): { isValid: boolean; message: string } {
  const cleanVin = vin.trim().toUpperCase();

  // 1. التحقق من الطول
  if (cleanVin.length !== 17) {
    return { isValid: false, message: 'رقم الهيكل يجب أن يتكون من 17 حرفاً ورقم' };
  }

  // 2. التحقق من الأحرف المحظورة (I, O, Q غير مسموح بها في VIN العالمي)
  if (/[IOQ]/i.test(cleanVin)) {
    return { isValid: false, message: 'رقم الهيكل غير صحيح (يحتوي على أحرف محظورة I أو O أو Q)' };
  }

  // 3. خوارزمية رقم التحقق (Check Digit Algorithm - Position 9)
  // هذه الخوارزمية مستخدمة في أمريكا الشمالية ومعظم المصنعين العالميين
  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  const transliteration: Record<string, number> = {
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
    'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9,
    'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9,
    '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '0': 0
  };

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const char = cleanVin[i];
    const value = transliteration[char];
    if (value === undefined) {
      return { isValid: false, message: 'يحتوي رقم الهيكل على رموز غير مسموح بها' };
    }
    sum += value * weights[i];
  }

  const remainder = sum % 11;
  const expectedCheckDigit = remainder === 10 ? 'X' : remainder.toString();
  const actualCheckDigit = cleanVin[8];

  if (actualCheckDigit !== expectedCheckDigit) {
    return { isValid: false, message: 'هذا الرقم يبدو وهمياً أو غير رياضي (فشل في اختبار Check Digit)' };
  }

  return { isValid: true, message: 'رقم الهيكل صحيح' };
}
