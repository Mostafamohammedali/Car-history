import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { KeyRound, Search, FileText, Download } from 'lucide-react';

const steps = [
  {
    icon: KeyRound,
    num: '01',
    title: 'VIN ادخل رقم',
    desc: 'اكتب رقم الهيكل المكوّن من 17 خانة الخاص بالسيارة التي تريد فحصها',
  },
  {
    icon: Search,
    num: '02',
    title: 'تحليل البيانات',
    desc: 'يقوم النظام بالبحث في أكثر من 20 قاعدة بيانات محلية وعالمية لجمع المعلومات',
  },
  {
    icon: FileText,
    num: '03',
    title: 'إنشاء التقرير',
    desc: 'يتم إعداد تقرير مفصّل يشمل الحوادث، الصيانة،  والتقييم',
  },
  {
    icon: Download,
    num: '04',
    title: 'استلم التقرير',
    desc: 'مباشرة PDFحمل التقرير بصيغة ',
  },
];

export default function HowItWorks() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  return (
    <section ref={sectionRef} className="relative py-28 bg-[#f8f9fc] overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #002f6c 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Corner accent */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-[#002f6c]/[0.03] rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="inline-block px-5 py-2 rounded-full text-sm font-semibold tracking-wider uppercase text-[#002f6c] border border-[#002f6c]/15 bg-[#002f6c]/5 mb-5">
            كيف يعمل النظام
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-[#0f1729] mb-4 leading-tight">
            أربع خطوات نحو <span className="text-[#002f6c]">تقرير شامل</span>
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto text-base leading-relaxed">
            عملية بسيطة وسريعة تنقلك من رقم الهيكل إلى تقرير تفصيلي احترافي.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative max-w-4xl mx-auto">
          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute top-[60px] right-[60px] left-[60px] h-px z-0">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ duration: 1.2, delay: 0.3, ease: 'easeInOut' }}
              className="w-full h-full origin-right"
              style={{
                background: 'linear-gradient(90deg, #002f6c 0%, #60a5fa 50%, #002f6c 100%)',
              }}
            />
            {/* Animated pulse on the line */}
            <motion.div
              initial={{ right: '100%', opacity: 0 }}
              animate={isInView ? { right: '-10%', opacity: [0, 1, 1, 0] } : {}}
              transition={{ duration: 2, delay: 1.2, ease: 'easeInOut' }}
              className="absolute top-1/2 -translate-y-1/2 w-16 h-[3px] rounded-full bg-[#60a5fa] blur-[2px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
                  className="relative flex flex-col items-center text-center group"
                >
                  {/* Circle */}
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="relative z-10 w-[120px] h-[120px] rounded-full flex flex-col items-center justify-center
                      bg-white border-2 border-[#002f6c]/10
                      shadow-[0_4px_24px_-4px_rgba(0,47,108,0.1)]
                      group-hover:border-[#002f6c]/30 group-hover:shadow-[0_8px_40px_-8px_rgba(0,47,108,0.18)]
                      transition-all duration-400"
                  >
                    {/* Number badge */}
                    <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#002f6c] text-white text-xs font-bold flex items-center justify-center shadow-lg">
                      {step.num}
                    </span>

                    <div className="w-12 h-12 rounded-xl bg-[#002f6c]/[0.06] flex items-center justify-center
                      group-hover:bg-[#002f6c] transition-colors duration-300">
                      <Icon className="w-6 h-6 text-[#002f6c] group-hover:text-white transition-colors duration-300" />
                    </div>
                  </motion.div>

                  {/* Mobile connecting line */}
                  {i < steps.length - 1 && (
                    <div className="lg:hidden w-px h-8 bg-gradient-to-b from-[#002f6c]/20 to-transparent my-2 sm:hidden" />
                  )}

                  {/* Content */}
                  <h3 className="text-lg font-bold text-[#0f1729] mt-5 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-[200px]">{step.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
