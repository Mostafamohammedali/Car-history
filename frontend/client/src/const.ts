/**
 * @file const.ts
 * @description ثوابت ودوال مساعدة من جانب العميل
 * يوفر ثوابت مشتركة ووظيفة إنشاء رابط OAuth
 * يعيد تصدير الثوابت المشتركة ويعرف مساعدات خاصة بالعميل
 */

// إعادة تصدير الثوابت المشتركة من الوحدة المشتركة
export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * @function getLoginUrl
 * @description ينشئ رابط تسجيل دخول OAuth مع إعادة توجيه ديناميكية
 * يبني رابط مصادقة مع معلمات خاصة بالبيئة
 * يستخدم ترميز base64 لمعلمة الحالة مع إعادة التوجيه
 * @returns {string} رابط تسجيل دخول OAuth الكامل مع معلمات الاستعلام
 */
export const getLoginUrl = () => {
  // متغيرات البيئة لتكوين OAuth
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  
  // إعادة توجيه ديناميكية بناءً على الأصل الحالي
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  // ترميز إعادة التوجيه كمعلمة حالة للأمان
  const state = btoa(redirectUri);

  // بناء رابط OAuth مع المعلمات المطلوبة
  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
