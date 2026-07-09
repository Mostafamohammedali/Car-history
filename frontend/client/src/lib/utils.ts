/**
 * @file utils.ts
 * @description دوال مساعدة لتطبيق Car History
 * يوفر دوال مساعدة شائعة لإدارة فئات CSS والتنسيق
 * يستخدم في جميع أنحاء التطبيق لأنماط تنسيق متسقة
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * @function cn
 * @description دالة مساعدة لدمج فئات CSS مع Tailwind CSS
 * يدمج ويزيل تكرار فئات Tailwind باستخدام clsx و tailwind-merge
 * يحل تعارضات الفئات ويوفر سلاسل فئات نظيفة
 * @param {ClassValue[]} inputs - مصفوفة قيم الفئات لدمجها
 * @returns {string} سلسلة فئة CSS مدمجة وغير مكررة
 * @example
 * cn('px-4 py-2', 'bg-blue-500', isActive && 'bg-red-500')
 * // Returns: 'px-4 py-2 bg-red-500' (bg-blue-500 is overridden when isActive is true)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
