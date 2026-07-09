/**
 * @file useMobile.tsx
 * @description خطاف مخصص للكشف عن الأجهزة المحمولة
 * يراقب حجم الشاشة ويحدد ما إذا كان الجهاز محمولاً
 * يستخدم Media Query API للكشف الفعال عن حجم الشاشة
 */

// استيراد مكتبات React اللازمة
import * as React from "react";

/**
 * @constant MOBILE_BREAKPOINT
 * @description نقطة انفصال الشاشة المحمولة
 * الشاشات الأصغر من 768 بكسل تعتبر محمولة
 */
const MOBILE_BREAKPOINT = 768;

/**
 * @function useIsMobile
 * @description خطاف مخصص للكشف عن الأجهزة المحمولة
 * يراقب تغييرات حجم الشاشة ويحدد ما إذا كان الجهاز محمولاً
 * @returns {boolean} ما إذا كان الجهاز محمولاً أم لا
 */
export function useIsMobile() {
  // حالة الكشف عن الجهاز المحمول
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined // الحالة الأولية غير محددة
  );

  /**
   * @function useEffect
   * @description يراقب تغييرات حجم الشاشة
   * يستخدم Media Query API للكشف الفعال
   */
  React.useEffect(() => {
    // إنشاء استعلام وسائط للكشف عن الشاشات المحمولة
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    /**
     * @function onChange
     * @description معالج تغيير حجم الشاشة
     * يقوم بتحديث حالة الجهاز المحمول بناءً على حجم الشاشة الحالي
     */
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    // إضافة مستمع الأحداث لتغييرات الشاشة
    mql.addEventListener("change", onChange);
    
    // تعيين الحالة الأولية بناءً على حجم الشاشة الحالي
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    
    // تنظيف مستمع الأحداث عند تفكيك المكون
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // إرجاع قيمة منطقية صارمة
  return !!isMobile;
}
