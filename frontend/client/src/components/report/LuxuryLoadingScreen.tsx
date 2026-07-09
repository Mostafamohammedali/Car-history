/**
 * @file LuxuryLoadingScreen.tsx
 * @description مكون شاشة التحميل الفاخرة والعالية التقنية
 * يعرض واجهة احترافية مع رسوم متحركة متطورة وتأثيرات بصرية فاخرة
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Car, Scan, Database, Shield, Cpu, Network } from 'lucide-react';

/**
 * رسائل التحميل المتغيرة لإعطاء إحساس بالعمل المستمر
 */
const LOADING_MESSAGES = [
  { text: 'جارٍ استخراج بيانات رقم الهيكل (VIN)...', icon: Scan },
  { text: 'جارٍ الاتصال بقواعد البيانات العالمية...', icon: Database },
  { text: 'جارٍ تحليل سجل الصيانة والحوادث...', icon: Shield },
  { text: 'جارٍ فحص البيانات الفنية للمركبة...', icon: Cpu },
  { text: 'جارٍ التحقق من مصادر التقارير الرسمية...', icon: Network },
  { text: 'جارٍ تجميع التقرير الشامل...', icon: Car },
];

/**
 * مكون النبضات الرادارية المتعددة
 */
function RadarPulse() {
  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      {/* الدوائر الرادارية المتناسقة */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2 border-[#60a5fa]/30"
          style={{
            width: `${(i + 1) * 40}px`,
            height: `${(i + 1) * 40}px`,
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: [0, 0.6, 0],
            scale: [0.8, 1.2, 1.4],
            borderColor: ['rgba(96, 165, 250, 0.1)', 'rgba(96, 165, 250, 0.5)', 'rgba(96, 165, 250, 0.1)'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.4,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* الدائرة المركزية المضيئة */}
      <motion.div
        className="absolute w-20 h-20 rounded-full bg-gradient-to-br from-[#60a5fa] to-[#002f6c] flex items-center justify-center shadow-2xl"
        animate={{
          boxShadow: [
            '0 0 30px rgba(96, 165, 250, 0.4), 0 0 60px rgba(0, 47, 108, 0.3)',
            '0 0 50px rgba(96, 165, 250, 0.6), 0 0 100px rgba(0, 47, 108, 0.5)',
            '0 0 30px rgba(96, 165, 250, 0.4), 0 0 60px rgba(0, 47, 108, 0.3)',
          ],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Car size={36} className="text-white" strokeWidth={1.5} />
      </motion.div>

      {/* خط المسح الضوئي الدوار */}
      <motion.div
        className="absolute w-32 h-32"
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-16 bg-gradient-to-b from-[#60a5fa] to-transparent rounded-full opacity-80" />
      </motion.div>

      {/* النقاط المضيئة المتحركة */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={`dot-${i}`}
          className="absolute w-2 h-2 rounded-full bg-[#60a5fa]"
          style={{
            top: `${50 + 35 * Math.sin((i * Math.PI) / 3)}%`,
            left: `${50 + 35 * Math.cos((i * Math.PI) / 3)}%`,
          }}
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.25,
          }}
        />
      ))}
    </div>
  );
}

/**
 * مكون شريط التقدم المتقدم
 */
function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-64 h-1 bg-[#1e3a5f] rounded-full overflow-hidden mt-8">
      <motion.div
        className="h-full bg-gradient-to-r from-[#60a5fa] via-[#3b82f6] to-[#60a5fa] rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
}

/**
 * مكون الشعار والهوية
 */
function BrandIdentity() {
  return (
    <motion.div
      className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-3"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#60a5fa] to-[#002f6c] flex items-center justify-center">
        <Car size={22} className="text-white" />
      </div>
      <div className="text-center">
        <h3 className="text-white font-bold text-lg tracking-wide">CarHistory</h3>
        <p className="text-[#60a5fa] text-xs tracking-wider">PREMIUM REPORTS</p>
      </div>
    </motion.div>
  );
}

/**
 * مكون شاشة التحميل الفاخرة الرئيسي
 */
export function LuxuryLoadingScreen() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // تدوير الرسائل كل 1.5 ثانية (1500 ميلي ثانية)
  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1500);

    return () => clearInterval(messageInterval);
  }, []);

  // تحديث شريط التقدم
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        return prev + Math.random() * 8;
      });
    }, 800);

    return () => clearInterval(progressInterval);
  }, []);

  const CurrentIcon = LOADING_MESSAGES[messageIndex].icon;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* الخلفية الداكنة المتدرجة */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#000a1a] via-[#001529] to-[#002a4d]" />

      {/* طبقة النمط الهندسي التقني */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M40 0L80 40L40 80L0 40L40 0zm0 10L10 40L40 70L70 40L40 10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* تأثير الضوء المتحرك في الخلفية */}
      <motion.div
        className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-[#002f6c]/20 blur-[100px]"
        animate={{
          x: [0, 200, 0],
          y: [0, 100, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-[#60a5fa]/10 blur-[80px]"
        animate={{
          x: [0, -150, 0],
          y: [0, -80, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />

      {/* خطوط الشبكة التقنية */}
      <div className="absolute inset-0 opacity-[0.05]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(96, 165, 250, 0.3) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(96, 165, 250, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* الهوية العلوية */}
      <BrandIdentity />

      {/* المحتوى المركزي */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
        {/* الرادار والأنيميشن */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <RadarPulse />
        </motion.div>

        {/* النصوص المتغيرة */}
        <div className="mt-10 text-center h-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={messageIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="flex items-center gap-2 text-[#60a5fa]">
                <CurrentIcon size={18} strokeWidth={2} />
                <span className="text-xs tracking-widest uppercase">Processing</span>
              </div>
              <p className="text-xl md:text-2xl font-bold text-white tracking-wide">
                {LOADING_MESSAGES[messageIndex].text}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* شريط التقدم */}
        <ProgressBar progress={progress} />

        {/* النسبة المئوية */}
        <motion.p
          className="mt-3 text-[#60a5fa] font-mono text-sm"
          key={Math.floor(progress)}
        >
          {Math.min(Math.floor(progress), 99)}%
        </motion.p>

        {/* رسالة footer */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <p className="text-[#475569] text-xs tracking-wider">
            نظام فحص المركبات الذكي
          </p>
          <p className="text-[#334155] text-[10px] mt-1">
            Smart Vehicle Inspection System v2.0
          </p>
        </motion.div>
      </div>
    </div>
  );
}
