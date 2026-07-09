import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';

const faqs = [
  {
    q: 'ما هو رقم VIN وأين أجده؟',
    a: 'رقم VIN هو رقم تعريف المركبة المكوّن من 17 خانة. يمكنك العثور عليه على لوحة أسفل الزجاج الأمامي من جهة السائق، أو على ملصق باب السائق، أو في وثائق التسجيل الرسمية.',
  },
  {
    q: 'هل التقرير يشمل جميع الحوادث السابقة؟',
    a: 'نعم، نقوم بالبحث في قواعد بيانات شركات التأمين، إدارات المرور، ومراكز الصيانة المعتمدة لتوفير سجل شامل يتضمن جميع الحوادث والأضرار المُبلَّغ عنها.',
  },
  {
    q: 'كم يستغرق الحصول على التقرير؟',
    a: 'يتم إنشاء التقرير خلال ثوانٍ معدودة بعد إدخال رقم VIN. في بعض الحالات النادرة قد يستغرق حتى دقيقة واحدة عند الحاجة للبحث في قواعد بيانات إضافية.',
  },
  {
    q: 'هل يمكنني مشاركة التقرير مع البائع أو المشتري؟',
    a: 'بالتأكيد، يمكنك تحميل التقرير بصيغة PDF أو مشاركته عبر رابط مباشر. التقرير يحمل ختمًا رقميًا يثبت صحته ومصداقيته.',
  },
  {
    q: 'ما مدى دقة البيانات في التقرير؟',
    a: 'نعتمد على أكثر من 20 قاعدة بيانات محلية وعالمية، ودقّة بياناتنا تتجاوز 99%. نقوم بتحديث مصادرنا بشكل مستمر لضمان أعلى مستوى من الموثوقية.',
  },
  {
    q: 'هل الخدمة متاحة لجميع أنواع السيارات؟',
    a: 'نعم، نغطّي جميع الماركات والموديلات بما في ذلك السيارات الأمريكية، الأوروبية، اليابانية، والكورية. كما ندعم المركبات التجارية والدراجات النارية.',
  },
];

export default function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section id="faq" className="relative py-28 overflow-hidden" style={{ scrollMarginTop: '100px' }}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-[#f0f2f7] to-[#e8ecf1]" />

      {/* Decorative shapes */}
      <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-[#002f6c]/[0.03] blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-[#334155]/[0.04] blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="inline-block px-5 py-2 rounded-full text-sm font-semibold tracking-wider uppercase text-[#002f6c] border border-[#002f6c]/15 bg-[#002f6c]/5 mb-5">
            الأسئلة الشائعة
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-[#0f1729] mb-4 leading-tight">
            إجابات على <span className="text-[#002f6c]">استفساراتك</span>
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto text-base leading-relaxed">
            كل ما تحتاج معرفته عن خدمة فحص السيارات وتقارير VIN.
          </p>
        </motion.div>

        {/* Premium card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="max-w-3xl mx-auto
            rounded-3xl
            bg-white/60 backdrop-blur-xl
            border border-[#002f6c]/[0.08]
            shadow-[0_8px_60px_-16px_rgba(0,47,108,0.1)]
            p-2 sm:p-3"
        >
          {faqs.map((faq, i) => {
            const isOpen = openIdx === i;
            return (
              <motion.div
                key={i}
                initial={false}
                className={`rounded-2xl transition-colors duration-300 ${
                  isOpen ? 'bg-[#002f6c]/[0.04]' : 'bg-transparent hover:bg-slate-50/70'
                }`}
              >
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-right"
                  aria-expanded={isOpen}
                >
                  {/* Icon */}
                  <div
                    className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-300 ${
                      isOpen
                        ? 'bg-[#002f6c] text-white'
                        : 'bg-[#002f6c]/[0.06] text-[#002f6c]'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4" />
                  </div>

                  {/* Question text */}
                  <span
                    className={`flex-1 text-sm sm:text-base font-semibold transition-colors duration-300 ${
                      isOpen ? 'text-[#002f6c]' : 'text-[#1a1a2e]'
                    }`}
                  >
                    {faq.q}
                  </span>

                  {/* Chevron */}
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex-shrink-0 transition-colors duration-300 ${
                      isOpen ? 'text-[#002f6c]' : 'text-slate-400'
                    }`}
                  >
                    <ChevronDown className="w-5 h-5" />
                  </motion.div>
                </button>

                {/* Answer */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pr-[72px]">
                        <p className="text-sm text-slate-500 leading-relaxed">
                          {faq.a}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Separator */}
                {i < faqs.length - 1 && (
                  <div className="mx-5 h-px bg-[#002f6c]/[0.05]" />
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
