/**
 * @file Home.tsx
 * @description مكون الصفحة الرئيسية لتطبيق Car History
 * يوفر وظيفة بحث VIN ومصادقة المستخدم وعرض الميزات الشامل
 * يتضمن تأثيرات المنظر البارالكس والرسوم المتحركة والتصميم المتجاوب
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion, useScroll, useTransform } from 'framer-motion';
import Login from './Login';
import SignUp from './SignUp';
import { Search, CheckCircle, Shield, Clock, TrendingUp, Lock, Zap, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import SystemFeatures from '@/components/home/SystemFeatures';
import HowItWorks from '@/components/home/HowItWorks';
import FAQSection from '@/components/home/FAQSection';
import carService from '@/services/carService';
import { validateVIN } from '@/vinValidator';

/**
 * @interface HomeProps
 * @description خصائص مكون الصفحة الرئيسية
 * @property {boolean} loginModalOpen - يتحكم في ظهور نافذة تسجيل الدخول
 * @property {(open: boolean) => void} setLoginModalOpen - دالة لضبط حالة نافذة تسجيل الدخول
 * @property {boolean} signupModalOpen - يتحكم في ظهور نافذة تسجيل المستخدمين
 * @property {(open: boolean) => void} setSignupModalOpen - دالة لضبط حالة نافذة تسجيل المستخدمين
 * @property {boolean} isLoggedIn - حالة مصادقة المستخدم
 * @property {(loggedIn: boolean) => void} setIsLoggedIn - دالة لضبط حالة المصادقة
 * @property {{ name: string; email: string; avatar?: string } | undefined} userProfile - معلومات ملف تعريف المستخدم
 * @property {(profile: { name: string; email: string; avatar?: string } | undefined) => void} setUserProfile - دالة لضبط ملف تعريف المستخدم
 */
interface HomeProps {
  loginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  signupModalOpen: boolean;
  setSignupModalOpen: (open: boolean) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (loggedIn: boolean) => void;
  userProfile: { name: string; email: string; avatar?: string } | undefined;
  setUserProfile: (profile: { name: string; email: string; avatar?: string } | undefined) => void;
  /** callback يُستدعى بعد تسجيل الدخول الناجح */
  onLoginSuccess?: (user: { name: string; email: string }) => void;
}

/**
 * @function Home
 * @description الصفحة الرئيسية مع بحث VIN والمصادقة
 * يدير تفاعلات المستخدم وتأثيرات المنظر البارالكس والتنقل إلى صفحات التقارير
 * @param {HomeProps} props - خصائص المكون
 * @returns {JSX.Element} الصفحة الرئيسية المعروضة مع جميع الميزات
 */
export default function Home({
  loginModalOpen,
  setLoginModalOpen,
  signupModalOpen,
  setSignupModalOpen,
  isLoggedIn,
  setIsLoggedIn,
  userProfile,
  setUserProfile,
  onLoginSuccess,
}: HomeProps) {
  // إدارة حالة البحث عن VIN
  const [vinInput, setVinInput] = useState(''); // مدخل VIN الذي يدخله المستخدم
  const [vinError, setVinError] = useState(''); // رسالة خطأ التحقق من VIN
  const [isSearching, setIsSearching] = useState(false); // حالة البحث لإظهار مؤشر التحميل
  const [, setLocation] = useLocation(); // دالة التنقل بين الصفحات

  // -----------------------------------------------------------------
  // التحقق الذكي من صحة رقم VIN
  // -----------------------------------------------------------------

  /**
   * @function handleVinChange
   * @description يعالج تغيير قيمة حقل VIN مع التحقق المباشر
   * @param {string} value - القيمة الجديدة
   */
  const handleVinChange = (value: string) => {
    // تحويل تلقائي لأحرف كبيرة
    const upperValue = value.toUpperCase();
    setVinInput(upperValue);

    // مسح الخطأ عند الكتابة
    if (vinError) {
      setVinError('');
    }
  };

  // خطافات تأثير المنظر البارالكس للرسوم المتحركة للتمرير السلس
  const { scrollY } = useScroll(); // تتبع موضع التمرير العمودي
  // تأثيرات المنظر البارالكس المحسنة بأداء ضئيل
  const heroImageY = useTransform(scrollY, [0, 300], [0, 10], { clamp: true }); // تحريك الصورة للأعلى عند التمرير
  const heroOpacity = useTransform(scrollY, [0, 150], [1, 0.9], { clamp: true }); // تقليل الشفافية عند التمرير

  /**
   * @function handleVinSearch
   * @description يعالج إرسال بحث VIN مع التحقق الشامل
   * يتحقق من تنسيق VIN ويتنقل إلى صفحة التقرير مع تحسين تجربة المستخدم
   * @param {React.FormEvent} e - حدث إرسال النموذج
   */
  const handleVinSearch = async (e: React.FormEvent) => {
    e.preventDefault(); // منع إعادة تحميل الصفحة

    // التحقق الذكي والصارم من صحة VIN
    const validationResult = validateVIN(vinInput);
    if (!validationResult.isValid) {
      setVinError(validationResult.message);
      setVinInput(''); // مسح الرقم الخاطئ من حقل البحث فوراً
      return;
    }

    // مسح أي خطأ سابق
    setVinError('');

    // التحقق من المصادقة: يجب أن يكون المستخدم مسجلاً للدخول
    if (!isLoggedIn) {
      toast.error('قم بتسجيل حسابك للبحث عن سياره');
      setLoginModalOpen(true);
      return;
    }

    // بدء حالة البحث مع مؤشر تحميل
    setIsSearching(true);
    try {
      // التحقق من VIN عبر الباك إند قبل الانتقال
      await carService.validateVIN(vinInput.trim());
      toast.success('جاري تحليل رقم VIN...');
      setLocation(`/check-vin-report?vin=${encodeURIComponent(vinInput.trim())}`);
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        toast.error(error.response.data?.message || 'قم بتسجيل حسابك للبحث عن سياره');
        setLoginModalOpen(true);
      } else {
        // حتى في حالة الأخطاء الأخرى ننتقل للصفحة لتظهر رسالة مناسبة هناك
        setLocation(`/check-vin-report?vin=${encodeURIComponent(vinInput.trim())}`);
      }
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * @function openLogin
   * @description يفتح نافذة تسجيل الدخول ويغلق نافذة التسجيل
   * يضمن فتح نافذة واحدة فقط في كل مرة
   */
  const openLogin = () => {
    setSignupModalOpen(false); // إغلاق نافذة التسجيل أولاً
    setLoginModalOpen(true); // ثم فتح نافذة تسجيل الدخول
  };

  /**
   * @function openSignup
   * @description يفتح نافذة التسجيل ويغلق نافذة تسجيل الدخول
   * يضمن فتح نافذة واحدة فقط في كل مرة
   */
  const openSignup = () => {
    setLoginModalOpen(false); // إغلاق نافذة تسجيل الدخول أولاً
    setSignupModalOpen(true); // ثم فتح نافذة التسجيل
  };

  /**
   * @function handleLogin
   * @description يعالج عملية تسجيل الدخول الناجحة
   * يقوم بتحديث حالة المصادقة وملف تعريف المستخدم
   * @param {string} email - بريد المستخدم الإلكتروني
   * @param {string} name - اسم المستخدم
   */
  /** يُستدعى من مكوّن Login بعد نجاح تسجيل الدخول */
  const handleLoginSuccess = (user: { name: string; email: string }) => {
    setIsLoggedIn(true);
    setUserProfile({ name: user.name, email: user.email, avatar: '/images/logo.png' });
    setLoginModalOpen(false);
    // إبلاغ App.tsx أيضاً إن وُجد
    onLoginSuccess?.(user);
  };

  /**
   * @function handleLogout
   * @description يعالج عملية تسجيل الخروج
   * يقوم بمسح حالة المصادقة وملف تعريف المستخدم
   */
  const handleLogout = () => {
    setIsLoggedIn(false); // مسح حالة المصادقة
    setUserProfile(undefined); // مسح ملف تعريف المستخدم
    toast.success('تم تسجيل الخروج بنجاح'); // رسالة تأكيد الخروج
  };

  /**
   * @constant features
   * @description مصفوفة ميزات التطبيق الرئيسية
   * تستخدم لعرض الميزات البارزة في القسم الرئيسي مع أيقونات وألوان
   * كل ميزة تتضمن أيقونة وعنوان ووصف وتدرج لوني
   */
  const features = [
    {
      icon: <Zap size={28} />, // أيقونة البرق للسرعة
      title: 'فحص سريع',
      description: 'احصل على النتائج في ثوان معدودة',
      color: 'from-[#0066cc] to-[#004da6]', // تدرج أزرق
    },
    {
      icon: <Shield size={28} />, // أيقونة الدرع للأمان
      title: 'آمن وموثوق',
      description: 'بيانات محمية بأعلى معايير الأمان',
      color: 'from-[#10b981] to-[#059669]', // تدرج أخضر
    },
    {
      icon: <TrendingUp size={28} />, // أيقونة الاتجاه الصاعد للشمولية
      title: 'معلومات شاملة',
      description: 'تاريخ السيارة الكامل والمفصل',
      color: 'from-[#002f6c] to-[#001a3d]', // تدرج أزرق داكن
    },
    {
      icon: <Lock size={28} />,
      title: 'خصوصية مضمونة',
      description: 'بيانات آمنة ومشفرة بالكامل',
      color: 'from-[#f59e0b] to-[#d97706]',
    },
  ];

  return (
    <div className="bg-[#f8f9fc]">
      {/* Ultra-Premium Hero Section */}
      <section id="vin-search" className="relative min-h-[92vh] flex items-center overflow-hidden" style={{ scrollMarginTop: '100px' }}>
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="/images/photo88.jpg"
            alt="Luxury car background"
            className="w-full h-[120%] object-cover"
          />
        </div>

        {/* Multi-layer gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#001a3d]/80 via-[#002f6c]/70 to-[#001a3d]/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#001a3d]/40 via-transparent to-[#001a3d]/40" />

        {/* Ultra-optimized animated accent glows - minimal blur */}
        <motion.div
          className="absolute top-20 right-[10%] w-[150px] h-[150px] rounded-full bg-[#0066cc]/5 blur-[20px] pointer-events-none will-change-opacity"
          animate={{ opacity: [0.3, 0.4, 0.3] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute bottom-20 left-[5%] w-[120px] h-[120px] rounded-full bg-[#60a5fa]/4 blur-[15px] pointer-events-none will-change-opacity"
          animate={{ opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear', delay: 3 }}
        />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <motion.div style={{ opacity: heroOpacity }} className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="max-w-4xl mx-auto text-center"
          >
            {/* Premium badge */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2.5 bg-white/[0.08] backdrop-blur-xl px-6 py-3 rounded-full mb-8 border border-white/[0.15] shadow-[0_0_30px_-5px_rgba(96,165,250,0.2)]"
            >
              <Sparkles size={18} className="text-[#60a5fa]" />
              <span className="text-lg font-medium text-white/95 tracking-wide">بيانات موثوقة من مصادر عالمية</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.15] text-white"
              style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3), 0 1px 10px rgba(0,0,0,0.2)' }}
            >
              {' اكشف تاريخ السيارة'}
              <br />
              <span className="text-[#FFC107]"
                style={{ textShadow: '0 2px 25px rgba(255,193,7,0.4), 0 1px 15px rgba(0,0,0,0.3)' }}>
                {'قبل شرائها'}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.7 }}
              className="text-lg md:text-xl text-white/75 mb-12 max-w-2xl mx-auto leading-relaxed"
            >
              {'واحصل على تقرير مفصل يشمل معلومات السيارة والحوادث والصيانة VIN ادخل رقم'}
            </motion.p>

            {/* VIN Search Form - Premium Glass card */}
            <motion.form
              onSubmit={handleVinSearch}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="bg-white/[0.08] backdrop-blur-lg rounded-3xl p-4 md:p-5 max-w-3xl mx-auto flex flex-col md:flex-row gap-4 border border-white/[0.2] shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.3)] transition-all duration-500"
              style={{ backdropFilter: 'blur(10px)' }}
            >
              <div className="flex-1 relative">
                <Search className="absolute right-7 top-1/2 transform -translate-y-1/2 text-white/50" size={22} />
                <input
                  type="text"
                  placeholder=" المكون من 17 حرفا VIN ادخل رقم"
                  value={vinInput}
                  onChange={(e) => handleVinChange(e.target.value)}
                  maxLength={17}
                  className={`w-full px-10 pr-24 py-8 text-white bg-white/[0.15] border rounded-2xl focus:ring-2 focus:ring-[#60a5fa]/50 focus:border-[#60a5fa]/50 text-2xl font-mono placeholder:text-white/60 placeholder:text-xl transition-all outline-none backdrop-blur-sm hover:bg-white/[0.20] ${vinError
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-400/50'
                      : 'border-white/[0.2]'
                    }`}
                />
                {/* رسالة خطأ التحقق من VIN */}
                {vinError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-12 right-0 left-0 text-center"
                  >
                    <span className="inline-flex items-center gap-2 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm font-bold backdrop-blur-sm shadow-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {vinError}
                    </span>
                  </motion.div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSearching}
                className="bg-[#FFC107] text-[#0B1F3A] px-14 py-6 rounded-2xl font-bold hover:bg-[#e6ac00] transition-all flex items-center justify-center gap-3 text-xl shadow-[0_8px_30px_-4px_rgba(255,193,7,0.4)] hover:shadow-[0_12px_40px_-4px_rgba(255,193,7,0.5)] active:scale-[0.98] relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                {isSearching ? <Loader2 className="animate-spin" /> : <Search size={22} />}
                {isSearching ? 'جاري البحث...' : 'تحقق الان'}
              </button>
            </motion.form>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.7 }}
              className="flex flex-wrap justify-center gap-8 mt-14"
            >
              {/* Trust indicators - optimized rendering */}
              {[
                { icon: <CheckCircle size={22} />, text: 'بيانات دقيقة' },
                { icon: <Shield size={22} />, text: 'حماية كاملة' },
                { icon: <Clock size={22} />, text: 'نتائج فورية' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-3 text-white hover:text-white transition-colors"
                >
                  <span className="text-white/95 text-2xl">{item.icon}</span>
                  <span className="text-base font-semibold text-white/90">{item.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Bottom fade to white */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f8f9fc] to-transparent" />
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-[#f8f9fc] relative">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="inline-block px-6 py-3 rounded-full text-base font-semibold tracking-wider uppercase text-[#002f6c] border border-[#002f6c]/15 bg-[#002f6c]/5 mb-5">
              لماذا نحن
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-[#0f1729] mb-4">{'؟ Car Hostoryلماذا تختار '}</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">{'نحن نوفر لك أدق المعلومات المتاحة في السوق لضمان اتخاذك القرار الصحيح عند شراء سيارة مستعملة'}</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="relative p-8 bg-white rounded-2xl border border-slate-100 hover:shadow-[0_20px_60px_-15px_rgba(0,47,108,0.12)] transition-all duration-300 group"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-[#0f1729] mb-3">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* System Features Section */}
      <SystemFeatures />

      {/* How It Works Section */}
      <HowItWorks />

      {/* FAQ Section */}
      <FAQSection />

      {/* Ultra-Premium CTA Section */}
      <section className="relative py-0 overflow-hidden">
        {/* Full-bleed background image - optimized */}
        <div className="absolute inset-0">
          <img
            src="/images/car b.png"
            alt="Premium car CTA background"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        {/* Overlay gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#001a3d]/85 via-[#002f6c]/80 to-[#001a3d]/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#001a3d]/30 via-transparent to-[#001a3d]/30" />

        {/* Optimized animated accent - minimal size and blur */}
        <motion.div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[300px] h-[150px] rounded-full bg-[#0066cc]/8 blur-[50px] pointer-events-none will-change-opacity"
          animate={{ opacity: [0.3, 0.4, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />

        <div className="container mx-auto px-4 relative z-10 py-28 md:py-36">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="inline-flex items-center gap-2.5 bg-white/[0.08] backdrop-blur-xl px-6 py-3 rounded-full mb-8 border border-white/[0.12]"
            >
              <ArrowRight size={18} className="text-[#fbbf24] rotate-180" />
              <span className="text-base font-semibold text-white/80">{'تحقق من سيارتك الان'}</span>
            </motion.div>

            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[1.15]"
              style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3), 0 1px 10px rgba(0,0,0,0.2)' }}>
              {'لا تشتري سيارتك'}
              <br />
              <span className="bg-gradient-to-r from-[#fbbf24] via-[#f59e0b] to-[#fbbf24] bg-clip-text text-transparent"
                style={{ textShadow: '0 2px 25px rgba(251,191,36,0.4), 0 1px 15px rgba(0,0,0,0.3)' }}>
                {'قبل فحصها'}
              </span>
            </h2>

            <p className="text-white/65 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
              {'VIN احصل علئ تقرير شامل وموثوق خلال ثوان باستخدام رقم '}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {/* زر إنشاء حساب مجاني — يظهر فقط لغير المسجلين */}
              {!isLoggedIn && (
                <motion.button
                  onClick={openSignup}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-10 py-4.5 bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] text-[#001a3d] font-bold rounded-xl hover:from-[#fcd34d] hover:to-[#fbbf24] transition-all text-lg shadow-[0_8px_30px_-6px_rgba(251,191,36,0.4)] hover:shadow-[0_12px_40px_-6px_rgba(251,191,36,0.5)]"
                >
                  {'إنشاء حساب مجاني'}
                </motion.button>
              )}
              <motion.button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-10 py-4.5 bg-white/[0.08] backdrop-blur-xl text-white font-bold rounded-xl hover:bg-white/[0.15] transition-all text-lg border border-white/[0.15] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)]"
              >
                {'ابدأ الفحص الآن'}
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Top fade from previous section */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#f0f2f7] to-transparent z-[5]" />
      </section>

      {/* نوافذ تسجيل الدخول والتسجيل */}
      <Login
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSwitchToSignUp={openSignup}
        onLoginSuccess={handleLoginSuccess}
      />
      <SignUp
        isOpen={signupModalOpen}
        onClose={() => setSignupModalOpen(false)}
        onSwitchToLogin={openLogin}
      />
    </div>
  );
}
