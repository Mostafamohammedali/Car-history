/**
 * @file AboutUs.tsx
 * @description مكون صفحة من نحن لتطبيق Car History
 * يعرض معلومات الشركة والرؤية والقيم والمميزات
 * يتضمن رسوم متحركة وتصميم جذاب لتقديم هوية العلامة التجارية
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import Login from './Login';
import SignUp from './SignUp';
import {
  Eye,
  Target,
  Heart,
  Shield,
  Users,
  Award,
  TrendingUp,
  Globe,
  CheckCircle,
  ArrowLeft,
  Zap,
  Cpu,
  Star,
} from 'lucide-react';

/**
 * @interface AboutUsProps
 * @description خصائص مكون صفحة من نحن
 * @property {boolean} loginModalOpen - يتحكم في ظهور نافذة تسجيل الدخول
 * @property {(open: boolean) => void} setLoginModalOpen - دالة لضبط حالة نافذة تسجيل الدخول
 * @property {boolean} signupModalOpen - يتحكم في ظهور نافذة تسجيل المستخدمين
 * @property {(open: boolean) => void} setSignupModalOpen - دالة لضبط حالة نافذة تسجيل المستخدمين
 */
interface AboutUsProps {
  loginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  signupModalOpen: boolean;
  setSignupModalOpen: (open: boolean) => void;
  isLoggedIn: boolean;
}

/**
 * @constant fadeUp
 * @description متغيرات الرسوم المتحركة لتأثير التلاشي للأعلى
 * يستخدم لإنشاء حركة دخول سلسة للعناصر من الأسفل للأعلى
 */
const fadeUp = {
  hidden: { opacity: 0, y: 32 }, // الحالة الأولية: مخفي ومنزاح للأسفل
  visible: { opacity: 1, y: 0 }, // الحالة النهائية: ظاهر في مكانه
};

/**
 * @constant visionCards
 * @description مصفوفة بطاقات الرؤية والتقنية والمميزات
 * تستخدم لعرض الجوانب الرئيسية للشركة مع أيقونات وأوصاف
 * كل بطاقة تتضمن أيقونة وعنوان ووصف مفصل
 */
const visionCards = [
  {
    icon: Eye, // أيقونة الرؤية
    title: 'رؤيتنا',
    desc: 'نسعى في Car History إلى إحداث ثورة في سوق السيارات اليمني عبر تقديم بيانات دقيقة وشفافة، تمكنك من اتخاذ قرارات شراء آمنة ومدروسة.'
  },
  {
    icon: Cpu, // أيقونة التقنية
    title: 'تقنيتنا',
    desc: 'نعتمد على خوارزميات ذكاء اصطناعي متطورة لتحليل تاريخ المركبات، مما يضمن لك الوصول إلى سجلات دقيقة وموثوقة بضغطة زر.'
  },
  {
    icon: Star, // أيقونة المميزات
    title: 'مميزاتنا',
    desc: 'تغطية شاملة لتاريخ الحوادث، سجلات الصيانة،   مع واجهة مستخدم صممت خصيصاً لتناسب احتياجات السوق المحلي.'
  }
];

/**
 * @constant values
 * @description مصفوفة قيم الشركة ومبادئها الأساسية
 * تستخدم لعرض القيم الأساسية التي تقوم عليها الشركة
 * كل قيمة تتضمن أيقونة وعنوان ووصف توضيحي
 */
const values = [
  {
    icon: Zap, // أيقونة السرعة
    title: 'سرعة استخراج التقارير',
    desc: 'احصل على تقرير شامل عن السيارة في ثوان معدودة. تقنيتنا المتقدمة تضمن نتائج فورية وموثوقة دون تأخير.',
  },
  {
    icon: Eye, // أيقونة الدقة
    title: 'دقة البيانات',
    desc: 'نستخدم أحدث التقنيات والذكاء الاصطناعي للتحقق من كل معلومة. دقة تتجاوز 99.9% في جميع التقارير.',
  },
  {
    icon: Heart, // أيقونة السهولة
    title: 'سهولة الاستخدام',
    desc: 'واجهة بسيطة وسهلة الاستخدام تناسب الجميع. لا تحتاج إلى خبرة تقنية لفهم التقارير الشاملة.',
  },
  {
    icon: Shield, // أيقونة الأمان
    title: 'الموثوقية والأمان',
    desc: 'بيانات آمنة ومشفرة بأعلى معايير الأمان. نحافظ على خصوصيتك ونلتزم بأعلى معايير الشفافية.',
  },
];


/**
 * @function AboutUs
 * @description صفحة من نحن الرئيسية مع عرض معلومات الشركة
 * يدير عرض الرؤية والقيم والمميزات مع نوافذ المصادقة
 * @param {AboutUsProps} props - خصائص المكون
 * @returns {JSX.Element} صفحة من نحن المعروضة مع جميع الميزات
 */
export default function AboutUs({
  loginModalOpen,
  setLoginModalOpen,
  signupModalOpen,
  setSignupModalOpen,
  isLoggedIn
}: AboutUsProps) {
  /**
   * @function openLogin
   * @description يفتح نافذة تسجيل الدخول ويغلق نافذة التسجيل
   * يضمن فتح نافذة واحدة فقط في كل مرة
   */
  const openLogin = () => { setSignupModalOpen(false); setLoginModalOpen(true); };
  
  /**
   * @function openSignup
   * @description يفتح نافذة التسجيل ويغلق نافذة تسجيل الدخول
   * يضمن فتح نافذة واحدة فقط في كل مرة
   */
  const openSignup = () => { setLoginModalOpen(false); setSignupModalOpen(true); };

  return (
    // حاوية الصفحة الرئيسية مع خلفية فاتحة
    <div className="bg-[#f8f9fc]">
      {/* نوافذ المصادقة */}
      <Login isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} onSwitchToSignUp={openSignup} />
      <SignUp isOpen={signupModalOpen} onClose={() => setSignupModalOpen(false)} onSwitchToLogin={openLogin} />

      {/* ====== القسم الرئيسي ====== */}
      <section className="relative overflow-hidden py-28 md:py-36">
        {/* صورة الخلفية مع تدرج */}
        <div className="absolute inset-0">
          <img src="/images/photo-161.avif" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#001a3d]/90 via-[#002f6c]/80 to-[#0f2744]/90" />
        </div>

        {/* كرات زخرفية للتصميم */}
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-[#60a5fa]/8 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-[#334155]/10 blur-[120px] pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-block px-5 py-2 rounded-full text-xs font-semibold tracking-wider uppercase text-[#93c5fd] border border-[#1e3a5f] bg-white/5 backdrop-blur-sm mb-6"
            >
              من نحن
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight"
            >
              منصة حديثة لسوق <span className="text-[#60a5fa]">يمني</span> واعد
              <br className="hidden md:block" />
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
            >
              Car History هي انطلاقة جديدة في السوق اليمني، تقدم تقارير دقيقة وشفافة لتاريخ السيارات باستخدام أحدث التقنيات والذكاء الاصطناعي.
            </motion.p>
          </div>
        </div>
      </section>

      {/* ====== VISION CARDS ====== */}
      <section className="relative -mt-16 z-20 px-4 py-24">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {visionCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="group relative bg-white rounded-3xl shadow-lg border border-gray-100 p-8 hover:shadow-2xl hover:border-[#002f6c]/20 transition-all duration-300"
                >
                  {/* Icon container */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#002f6c] to-[#001a3d] flex items-center justify-center mb-6 group-hover:from-[#003f7f] group-hover:to-[#002f6c] transition-all duration-300">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-bold text-[#0f1729] mb-4 group-hover:text-[#002f6c] transition-colors duration-300">
                    {card.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    {card.desc}
                  </p>
                  
                  {/* Decorative element */}
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#60a5fa] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>


      {/* ====== VISION & VALUES ====== */}
      <section className="relative py-28 overflow-hidden">
        {/* Dark BG */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0f2035] to-[#091424]" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#0066cc]/8 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#334155]/10 blur-[100px] pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase text-[#60a5fa] border border-[#1e3a5f] bg-[#0f2744]/60 backdrop-blur-sm mb-5">
              رؤيتنا وقيمنا
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
              مميزاتنا <span className="text-[#60a5fa]">الرئيسية</span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-base leading-relaxed">
              نركز على ثلاث ركائز أساسية: السرعة، الدقة، والسهولة. كل ذلك لخدمة السوق اليمني بأفضل طريقة.
            </p>
          </motion.div>

          {/* Vision card -- asymmetric */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative rounded-3xl p-8 md:p-12 mb-12
              bg-white/[0.04] backdrop-blur-md
              border border-white/[0.08]"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-2 flex justify-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#002f6c] flex items-center justify-center shadow-xl">
                  <Target className="w-9 h-9 text-[#60a5fa]" />
                </div>
              </div>
              <div className="md:col-span-10">
                <h3 className="text-2xl font-bold text-white mb-3">رؤيتنا</h3>
                <p className="text-slate-300 text-base md:text-lg leading-relaxed">
                  أن نصبح المرجع الأول والموثوق لفحص السيارات في السوق اليمني، ونساهم في بناء سوق سيارات أكثر شفافية وعدالة. نسعى لأن يصبح فحص السيارة قبل الشراء ثقافة سائدة في اليمن، باستخدام أحدث التقنيات والذكاء الاصطناعي. مستقبلنا واعد، وهدفنا واضح: خدمة السوق اليمني بكفاءة واحترافية عالية.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Values grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.12 }}
                  whileHover={{ y: -4 }}
                  className="group relative rounded-2xl p-7
                    bg-white/[0.04] backdrop-blur-md
                    border border-white/[0.08]
                    hover:bg-white/[0.07] hover:border-[#60a5fa]/25
                    transition-all duration-300"
                >
                  <div className="flex items-start gap-5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                      bg-gradient-to-br from-[#1e3a5f] to-[#0f2744]
                      border border-white/10
                      group-hover:from-[#1e4a7f] group-hover:to-[#1e3a5f]
                      transition-all duration-300 shadow-lg shadow-black/20"
                    >
                      <Icon className="w-5 h-5 text-[#60a5fa] group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">{v.title}</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">{v.desc}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>


      {/* ====== CTA ====== */}
      {!isLoggedIn && (
        <section className="py-20 relative overflow-hidden">
          {/* Background image with overlay */}
          <div className="absolute inset-0">
            <img 
              src= '/images/car-ho.jpg'
              alt="Car background" 
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#002f6c]/85 via-[#003d7a]/80 to-[#001a3d]/90" />
          </div>
          <div className="container mx-auto px-4 relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
               car history انضم الينا 
              </h2>
              <p className="text-white/80 text-lg mb-10 max-w-2xl mx-auto">
                ابدأ رحلتك مع أدق منصة لفحص السيارات في المنطقة
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={openSignup}
                  className="px-10 py-4 bg-yellow-400 text-[#002f6c] font-bold rounded-xl hover:bg-yellow-300 transition-all text-lg shadow-xl"
                >
                  إنشاء حساب مجاني
                </button>
                <a
                  href="/contact"
                  className="px-10 py-4 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all text-lg backdrop-blur-md border border-white/20"
                >
                  تواصل معنا
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      )}
    </div>
  );
}
