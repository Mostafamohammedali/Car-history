/**
 * @file VINDecoder.tsx
 * @description مكون صفحة فك تشفير VIN لتطبيق Car History
 * يوفر معلومات شاملة حول فك تشفير VIN وتحديد المركبات
 * يتضمن محتوى تعليمي مع رسوم متحركة وأقسام تفاعلية
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import UnderstandingVIN from '@/components/UnderstandingVIN';

/**
 * @function VINDecoder
 * @description صفحة فك تشفير VIN الرئيسية مع المحتوى التعليمي
 * يعرض محتوى تعليمي حول فك تشفير VIN مع أقسام متحركة
 * @returns {JSX.Element} صفحة فك تشفير VIN المعروضة مع أقسام المعلومات
 */
export default function VINDecoder() {
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
      {/* القسم الرئيسي للصفحة */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden py-28 md:py-36"
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
            {/* عنوان الصفحة الرئيسي */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[1.15]"
            >
              {'فك تشفير VIN'}
              <br />
              <span className="bg-gradient-to-r from-[#fbbf24] via-[#f59e0b] to-[#fbbf24] bg-clip-text text-transparent">
                {'دليلك الشامل'}
              </span>
            </motion.h1>
            {/* وصف الصفحة */}
            <motion.p
              variants={itemVariants}
              className="text-lg md:text-xl text-white/75 max-w-2xl mx-auto leading-relaxed"
            >
              {'تعرف على كل ما يتعلق برقم تعريف المركبة وكيفية فك تشفيره بسهولة'}
            </motion.p>
          </motion.div>
        </div>

        {/* تأثير التدرج السفلي للاندماج مع المحتوى */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f8f9fc] to-transparent" />
      </motion.section>

      {/* المحتوى الرئيسي */}
      <main className="container mx-auto px-4 py-8">
        {/* مكون فهم VIN */}
        <UnderstandingVIN />
      </main>
    </div>
  );
}
