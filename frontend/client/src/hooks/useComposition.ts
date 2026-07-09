/**
 * @file useComposition.ts
 * @description خطاف مخصص للتعامل مع أحداث التركيب في مدخلات النصوص
 * يدير حالة التركيب للغة الصينية واليابانية والكورية وغيرها
 * يحل مشاكل التوافق مع المتصفحات المختلفة
 */

// استيراد المكتبات والخطافات اللازمة
import { useRef } from "react";
import { usePersistFn } from "./usePersistFn";

/**
 * @interface UseCompositionReturn
 * @description قيمة الإرجاع لخطاف useComposition
 * @property {React.CompositionEventHandler} onCompositionStart - معالج بدء التركيب
 * @property {React.CompositionEventHandler} onCompositionEnd - معالج انتهاء التركيب
 * @property {React.KeyboardEventHandler} onKeyDown - معالج ضغط المفاتيح
 * @property {() => boolean} isComposing - دالة للتحقق من حالة التركيب
 */
export interface UseCompositionReturn<
  T extends HTMLInputElement | HTMLTextAreaElement,
> {
  onCompositionStart: React.CompositionEventHandler<T>;
  onCompositionEnd: React.CompositionEventHandler<T>;
  onKeyDown: React.KeyboardEventHandler<T>;
  isComposing: () => boolean;
}

/**
 * @interface UseCompositionOptions
 * @description خيارات خطاف useComposition
 * @property {React.KeyboardEventHandler} onKeyDown - معالج ضغط المفاتيح المخصص
 * @property {React.CompositionEventHandler} onCompositionStart - معالج بدء التركيب المخصص
 * @property {React.CompositionEventHandler} onCompositionEnd - معالج انتهاء التركيب المخصص
 */
export interface UseCompositionOptions<
  T extends HTMLInputElement | HTMLTextAreaElement,
> {
  onKeyDown?: React.KeyboardEventHandler<T>;
  onCompositionStart?: React.CompositionEventHandler<T>;
  onCompositionEnd?: React.CompositionEventHandler<T>;
}

/**
 * @type TimerResponse
 * @description نوع استجابة المؤقت
 */
type TimerResponse = ReturnType<typeof setTimeout>;

/**
 * @function useComposition
 * @description خطاف مخصص للتعامل مع أحداث التركيب
 * يدير حالة التركيب ويحل مشاكل التوافق مع المتصفحات
 * @template T - نوع عنصر الإدخال
 * @param {UseCompositionOptions} options - خيارات الخطاف
 * @returns {UseCompositionReturn} معالجات الأحداث ووظائف التحقق
 */
export function useComposition<
  T extends HTMLInputElement | HTMLTextAreaElement = HTMLInputElement,
>(options: UseCompositionOptions<T> = {}): UseCompositionReturn<T> {
  // استخراج المعالجات الأصلية من الخيارات
  const {
    onKeyDown: originalOnKeyDown,
    onCompositionStart: originalOnCompositionStart,
    onCompositionEnd: originalOnCompositionEnd,
  } = options;

  // متغيرات المرجع لحالة التركيب والمؤقتات
  const c = useRef(false); // حالة التركيب الحالية
  const timer = useRef<TimerResponse | null>(null); // المؤقت الأول
  const timer2 = useRef<TimerResponse | null>(null); // المؤقت الثاني

  /**
   * @function onCompositionStart
   * @description معالج بدء التركيب
   * يقوم بتنظيف المؤقتات وتحديث حالة التركيب
   * @param {React.CompositionEvent} e - حدث بدء التركيب
   */
  const onCompositionStart = usePersistFn((e: React.CompositionEvent<T>) => {
    // تنظيف المؤقتات الموجودة
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (timer2.current) {
      clearTimeout(timer2.current);
      timer2.current = null;
    }
    // تحديث حالة التركيب
    c.current = true;
    // استدعاء المعالج الأصلي
    originalOnCompositionStart?.(e);
  });

  /**
   * @function onCompositionEnd
   * @description معالج انتهاء التركيب
   * يستخدم طبقتين من setTimeout للتعامل مع مشكلة متصفح Safari
   * @param {React.CompositionEvent} e - حدث انتهاء التركيب
   */
  const onCompositionEnd = usePersistFn((e: React.CompositionEvent<T>) => {
    // استخدام طبقتين من setTimeout للتعامل مع مشكلة متصفح Safari
    // حيث يطلق compositionEnd قبل onKeyDown
    timer.current = setTimeout(() => {
      timer2.current = setTimeout(() => {
        c.current = false; // تحديث حالة التركيب
      });
    });
    // استدعاء المعالج الأصلي
    originalOnCompositionEnd?.(e);
  });

  /**
   * @function onKeyDown
   * @description معالج ضغط المفاتيح
   * يمنع انتشار أحداث ESC و Enter أثناء حالة التركيب
   * @param {React.KeyboardEvent} e - حدث ضغط المفتاح
   */
  const onKeyDown = usePersistFn((e: React.KeyboardEvent<T>) => {
    // منع انتشار أحداث ESC و Enter (غير shift+Enter) أثناء حالة التركيب
    if (
      c.current &&
      (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey))
    ) {
      e.stopPropagation();
      return;
    }
    // استدعاء المعالج الأصلي
    originalOnKeyDown?.(e);
  });

  /**
   * @function isComposing
   * @description دالة للتحقق من حالة التركيب الحالية
   * @returns {boolean} حالة التركيب الحالية
   */
  const isComposing = usePersistFn(() => {
    return c.current;
  });

  // إرجاع المعالجات والدوال
  return {
    onCompositionStart,
    onCompositionEnd,
    onKeyDown,
    isComposing,
  };
}
