/**
 * @file VINDecoderPage.tsx
 * @description مكون صفحة فك تشفير VIN الرئيسي مع نوافذ المصادقة
 * يوفر وظيفة فك تشفير VIN مع نظام متكامل لتسجيل الدخول/التسجيل
 * يتضمن نوافذ المصادقة وواجهة فك تشفير VIN التفاعلية
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import Login from './Login';
import SignUp from './SignUp';
import UnderstandingVIN from '@/components/UnderstandingVIN';

/**
 * @interface VINDecoderPageProps
 * @description خصائص مكون صفحة فك تشفير VIN
 * @property {boolean} loginModalOpen - يتحكم في ظهور نافذة تسجيل الدخول
 * @property {(open: boolean) => void} setLoginModalOpen - دالة لضبط حالة نافذة تسجيل الدخول
 * @property {boolean} signupModalOpen - يتحكم في ظهور نافذة التسجيل
 * @property {(open: boolean) => void} setSignupModalOpen - دالة لضبط حالة نافذة التسجيل
 */
interface VINDecoderPageProps {
  loginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  signupModalOpen: boolean;
  setSignupModalOpen: (open: boolean) => void;
}

/**
 * @function VINDecoderPage
 * @description صفحة فك تشفير VIN الرئيسية مع تكامل المصادقة
 * يدير نوافذ تسجيل الدخول/التسجيل ويوفر واجهة فك تشفير VIN
 * @param {VINDecoderPageProps} props - خصائص المكون
 * @returns {JSX.Element} صفحة فك تشفير VIN المعروضة مع النوافذ
 */
export default function VINDecoderPage({
  loginModalOpen,
  setLoginModalOpen,
  signupModalOpen,
  setSignupModalOpen
}: VINDecoderPageProps) {
  /**
   * @constant containerVariants
   * @description متغيرات الرسوم المتحركة لعناصر الحاوية
   * يوفر رسومًا متحركة متعاقبة للأبناء مع تأخير
   */
  const containerVariants = {
    hidden: { opacity: 0 }, // الحالة الأولية: مخفي
    visible: {
      opacity: 1, // الحالة النهائية: ظاهر بالكامل
      transition: { staggerChildren: 0.1, delayChildren: 0.2 } // تأخير متتالي للأبناء
    }
  };

  /**
   * @constant itemVariants
   * @description متغيرات الرسوم المتحركة للعناصر الفردية
   * يوفر رسومًا متحركة للانزلاق من الأسفل للأعلى
   */
  const itemVariants = {
    hidden: { opacity: 0, y: 20 }, // الحالة الأولية: مخفي ومنزاح للأسفل
    visible: { opacity: 1, y: 0 } // الحالة النهائية: ظاهر في مكانه
  };

  return (
    // حاوية الصفحة الرئيسية مع خلفية متدرجة
    <div className="bg-gradient-to-br from-[#f8f9fc] via-white to-[#f0f2f7]">
      {/* القسم الرئيسي للصفحة مع خلفية صورة ثابتة */}
      <motion.section
        variants={containerVariants}  
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden py-28 md:py-36 w-full"
        style={{
          backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.85)), url('/images/photo444.jpg')`, // صورة خلفية مع تدرج
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed' // تثبيت الصورة عند التمرير
        }}
      >
        {/* نمط الخلفية الشبكي */}
        <div className="absolute inset-0">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`, // شبكة متقاطعة
              backgroundSize: '60px 60px', // حجم الشبكة
            }}
          />
        </div>

        {/* عنصر زخرفي متحرك */}
        <motion.div
          className="absolute top-10 right-[10%] w-[400px] h-[400px] rounded-full bg-[#0066cc]/8 blur-[120px] pointer-events-none"
          animate={{ opacity: [0.3, 0.5, 0.3] }} // حركة تلاشي متكررة
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} // حركة لا نهائية سلسة
        />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center"
          >
            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[1.15]"
            >
              {'  VIN'}
              <br />
              <span className="bg-gradient-to-r from-[#fbbf24] via-[#f59e0b] to-[#fbbf24] bg-clip-text text-transparent">
                {'دليلك الشامل'}
              </span>
            </motion.h1>
            <motion.p
              variants={itemVariants}
              className="text-lg md:text-xl text-white/75 max-w-2xl mx-auto leading-relaxed"
            >
              {'تعرف على كل ما يتعلق برقم تعريف المركبة وكيفية فك تشفيره بسهولة'}
            </motion.p>
          </motion.div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f8f9fc] to-transparent" />
      </motion.section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <UnderstandingVIN />
      </main>
      
      {/* Login and Signup Modals */}
      <Login 
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSwitchToSignUp={() => {
          setLoginModalOpen(false);
          setSignupModalOpen(true);
        }}
      />
      <SignUp 
        isOpen={signupModalOpen}
        onClose={() => setSignupModalOpen(false)}
        onSwitchToLogin={() => {
          setSignupModalOpen(false);
          setLoginModalOpen(true);
        }}
      />
    </div>
  );
}
