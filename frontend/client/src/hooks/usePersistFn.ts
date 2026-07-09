/**
 * @file usePersistFn.ts
 * @description خطاف مخصص للحفاظ على استقرار مرجع الدالة
 * يستخدم بدلاً من useCallback لتقليل العبء المعرفي
 * يضمن بقاء مرجع الدالة ثابتاً عبر عمليات إعادة التصيير
 */

// استيراد مكتبات React اللازمة
import { useRef } from "react";

/**
 * @type noop
 * @description نوع الدالة التي لا تقوم بأي عملية
 * @param {...any[]} args - مصفوفة من الوسائط
 * @returns {any} أي قيمة
 */
type noop = (...args: any[]) => any;

/**
 * @function usePersistFn
 * @description خطاف مخصص للحفاظ على استقرار مرجع الدالة
 * يستخدم بدلاً من useCallback لتقليل العبء المعرفي
 * يضمن بقاء مرجع الدالة ثابتاً عبر عمليات إعادة التصيير
 * @template T - نوع الدالة
 * @param {T} fn - الدالة المراد الحفاظ على استقرارها
 * @returns {T} دالة ثابتة المرجع
 */
export function usePersistFn<T extends noop>(fn: T) {
  // مرجع لتخزين الدالة الحالية
  const fnRef = useRef<T>(fn);
  // تحديث المرجع بالدالة الحالية دائماً
  fnRef.current = fn;

  // مرجع لتخزين الدالة الثابتة
  const persistFn = useRef<T>(null);
  
  // إنشاء الدالة الثابتة مرة واحدة فقط
  if (!persistFn.current) {
    persistFn.current = function (this: unknown, ...args) {
      // استدعاء الدالة الحالية من المرجع
      return fnRef.current!.apply(this, args);
    } as T;
  }

  // إرجاع الدالة الثابتة
  return persistFn.current!;
}
