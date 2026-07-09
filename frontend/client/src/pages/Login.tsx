/**
 * @file Login.tsx
 * @description مكون صفحة تسجيل الدخول للمستخدمين
 * يوفر واجهة تسجيل دخول حديثة ومتجاوبة مع رسوم متحركة سلسة وخيارات تسجيل دخول عبر وسائل التواصل الاجتماعي
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';

/**
 * @interface LoginProps
 * @description خصائص مكون تسجيل الدخول
 * @property {boolean} isOpen - يتحكم في ظهور نافذة تسجيل الدخول
 * @property {() => void} onClose - دالة رد النداء لإغلاق نافذة تسجيل الدخول
 * @property {() => void} onSwitchToSignUp - دالة رد النداء للانتقال إلى نموذج إنشاء الحساب
 * @property {() => void} onSwitchToForgotPassword - دالة رد النداء للانتقال إلى صفحة نسيت كلمة المرور
 */
interface LoginProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSwitchToSignUp?: () => void;
  onSwitchToForgotPassword?: () => void;
}

/**
 * @function Login
 * @description مكون تسجيل الدخول الرئيسي مع التحقق من النموذج والمصادقة
 * @param {LoginProps} props - خصائص المكون
 * @returns {JSX.Element} نافذة تسجيل الدخول المعروضة مع النموذج وخيارات تسجيل الدخول الاجتماعي
 */
export default function Login({ isOpen = true, onClose, onSwitchToSignUp, onSwitchToForgotPassword }: LoginProps) {
  const [, setLocation] = useLocation();
  
  // إدارة حالة النموذج
  const [loginField, setLoginField] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // تحسين الأداء: تحميل الصورة الخلفية بشكل متأخر
  const [imageLoaded, setImageLoaded] = useState(false);

  /**
   * @function handleLogin
   * @description يعالج إرسال النموذج ومصادقة المستخدم
   * يتواصل مع authStore لإتمام عملية تسجيل الدخول
   * @param {React.FormEvent} e - حدث إرسال النموذج
   */
  const { login } = useAuthStore();
  
  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginField || !password) {
      toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور للمتابعة');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(loginField.trim(), password);
      if (result.success) {
        toast.success(result.message || 'مرحباً بك مجدداً! تم تسجيل دخولك بنجاح.');
        if (onClose) onClose();
        setLocation('/');
      } else {
        toast.error(result.message || 'لم نتمكن من العثور على حساب بهذه البيانات. يرجى التأكد من البريد الإلكتروني وكلمة المرور.');
      }
    } catch (err: any) {
      const data = err?.response?.data;
      const errorMessage = data?.message || 'حدث خطأ غير متوقع أثناء محاولة تسجيل الدخول. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(true); // Stop loading
      setIsLoading(false);
    }
  }, [loginField, password, onClose, setLocation, login]);

  /**
   * @function useEffect
   * @description يقوم بتحميل الصورة الخلفية مسبقاً لتحسين الأداء
   * يمنع تغيير التخطيط ويحسن تجربة التحميل
   */
  useEffect(() => {
    const img = new Image();
    img.src = '/images/logn.jpg';
    img.onload = () => setImageLoaded(true);
  }, []);


  return (
    // AnimatePresence يدير حالة الظهور والاخفاء للنافذة مع رسوم متحركة سلسة
    <AnimatePresence>
      {isOpen && (
        // طبقة الخلفية الشفافة مع إغلاق عند النقر
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
          {/* الحاوية الرئيسية للنافذة مع رسوم متحركة للدخول والخروج */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
            className="w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()} // منع انتشار النقر لإغلاق النافذة عند النقر على المحتوى
          >
            {/* تخطيط الشبكة: قسم الصورة على اليسار، النموذج على اليمين */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 bg-white rounded-2xl shadow-2xl overflow-hidden relative">
              {/* زر الإغلاق في الزاوية العلوية اليمنى مع تأثيرات تفاعلية */}
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }} // تكبير وتدوير عند التمرير
                whileTap={{ scale: 0.95 }} // تصغير عند النقر
                onClick={onClose}
                className="absolute top-4 right-4 z-[110] text-gray-900 hover:text-red-600 transition-all bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-md border border-gray-100"
              >
                <X size={20} />
              </motion.button>

              {/* القسم الأيسر - قسم الصورة والعرض الترويجي */}
              <motion.div
                initial={{ opacity: 0, x: -30 }} // حركة انزلاق من اليسار
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="hidden lg:flex flex-col p-8 relative overflow-hidden h-full min-h-[600px]"
                style={{
                  backgroundImage: imageLoaded ? 'url(/images/logn.jpg)' : 'none', // الصورة الخلفية بعد التحميل
                  backgroundColor: imageLoaded ? 'transparent' : '#1e40af', // لون احتياطي أثناء التحميل
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {/* طبقة التدرج فوق الصورة لتحسين قابلية القراءة */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />

                {/* العنوان والوصف العلوي */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }} // حركة من الأعلى
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.3 }}
                  className="relative z-10"
                >
                  <h2 className="text-4xl font-bold text-white mb-2">Car History</h2>
                  <p className="text-white/90 text-lg">فحص VIN موثوق وسريع</p>
                </motion.div>

              </motion.div>

              {/* القسم الأيمن - قسم النموذج */}
              <motion.div
                initial={{ opacity: 0, x: 30 }} // حركة انزلاق من اليمين
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                className="p-8 md:p-12 flex flex-col justify-center bg-white"
              >
                {/* رأس النموذج */}
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">تسجيل الدخول</h1>
                  <p className="text-gray-600">أدخل بيانات حسابك للوصول إلى التقارير</p>
                </div>

                {/* نموذج تسجيل الدخول مع معالج الإرسال handleLogin */}
                <form onSubmit={handleLogin} className="space-y-5">
                  {/* حقل البريد الإلكتروني */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-900">البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" 
                        name="username"
                        id="username"
                        autoComplete="username"
                        placeholder="البريد الإلكتروني أو اسم المستخدم" 
                        value={loginField}
                        onChange={(e) => setLoginField(e.target.value)}
                        className="w-full px-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                        required 
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* حقل كلمة المرور مع إمكانية إظهار/إخفاء */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-900">كلمة المرور</label>
                    <div className="relative">
                      <Lock className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        id="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 pr-12 pl-14 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        required
                      />
                      {/* زر تبديل عرض كلمة المرور */}
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)} // عكس حالة العرض
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1.5"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* خيارات إضافية: تذكرني ونسيت كلمة المرور */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe} // ربط القيمة بحالة rememberMe
                        onChange={(e) => setRememberMe(e.target.checked)} // تحديث الحالة
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">تذكرني</span>
                    </label>
                    {/* رابط إلى صفحة نسيت كلمة المرور */}
                    <button type="button" onClick={() => setLocation('/forgotpassword')} className="text-sm text-blue-600 font-semibold hover:text-blue-700">نسيت كلمة المرور؟</button>
                  </div>

                  {/* زر الإرسال مع حالة التحميل */}
                  <button
                    type="submit"
                    disabled={isLoading} // تعطيل الزر أثناء التحميل
                    className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {/* عرض النص بناءً على حالة التحميل */}
                    {isLoading ? 'جاري التحميل...' : 'دخول'}
                  </button>
                </form>

                {/* قسم تسجيل الدخول عبر وسائل التواصل الاجتماعي */}
                <div className="mt-6">
                  {/* فاصل مع نص "أو التسجيل بواسطة" */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500 font-medium">أو التسجيل بواسطة</span>
                    </div>
                  </div>

                  {/* أزرار تسجيل الدخول الاجتماعي */}
                  <div className="mt-6 flex justify-center gap-6">
                    {/* زر تسجيل الدخول عبر جوجل */}
                    <motion.button
                      whileHover={{ scale: 1.08, y: -2 }} // تأثيرات تفاعلية
                      whileTap={{ scale: 0.92 }}
                      className="w-16 h-16 rounded-full border-2 border-gray-200 bg-white flex items-center justify-center hover:border-[#4285F4] hover:shadow-lg hover:shadow-[#4285F4]/20 transition-all duration-150"
                      onClick={() => toast.info('هذه الميزة ستتوفر قريباً! نحن نعمل حالياً على تفعيل تسجيل الدخول عبر جوجل لتسهيل وصولك.')} // رسالة مؤقتة للميزة تحت التطوير
                    >
                      {/* أيقونة جوجل المخصصة */}
                      <svg className="w-8 h-8" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1.5 12 1.5 7.7 1.5 3.99 3.97 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </motion.button>

                    {/* Facebook Login */}
                    <motion.button
                      whileHover={{ scale: 1.08, y: -2 }}
                      whileTap={{ scale: 0.92 }}
                      className="w-16 h-16 rounded-full border-2 border-gray-200 bg-white flex items-center justify-center hover:border-[#1877F2] hover:shadow-lg hover:shadow-[#1877F2]/20 transition-all duration-150"
                      onClick={() => toast.info('هذه الميزة ستتوفر قريباً! نحن نعمل على إضافة خيار تسجيل الدخول عبر فيسبوك.')}
                    >
                      <svg className="w-8 h-8" fill="#1877F2" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </motion.button>

                    {/* Apple Login */}
                    <motion.button
                      whileHover={{ scale: 1.08, y: -2 }}
                      whileTap={{ scale: 0.92 }}
                      className="w-16 h-16 rounded-full border-2 border-gray-200 bg-white flex items-center justify-center hover:border-gray-800 hover:shadow-lg hover:shadow-gray-800/20 transition-all duration-150"
                      onClick={() => toast.info('هذه الميزة ستتوفر قريباً! سنقوم بتفعيل تسجيل الدخول عبر حساب أبل في التحديث القادم.')}
                    >
                      <svg className="w-8 h-8" viewBox="0 0 24 24">
                        <path fill="#000" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                    </motion.button>
                  </div>
                </div>

                {/* رابط الانتقال إلى صفحة إنشاء الحساب */}
                <div className="mt-8 text-center">
                  <p className="text-gray-600">
                    ليس لديك حساب؟{' '}
                    <button
                      onClick={onSwitchToSignUp} // استدعاء دالة التبديل إلى التسجيل
                      className="text-blue-600 font-bold hover:underline"
                    >
                      إنشاء حساب جديد
                    </button>
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
