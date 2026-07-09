import { motion } from 'framer-motion';
import {
  ShieldCheck,
  ScanLine,
  FileSearch,
  BarChart3,
  Cpu,
  BadgeCheck,
} from 'lucide-react';

const features = [
  {
    icon: ScanLine,
    title: 'فوري VIN فحص ',
    desc: '%احصل على تقرير شامل ودقيق عن السيارة خلال ثوانٍ معدودة بدقة تتجاوز 99',
    image: '/images/feature-1.jpg',
  },
  {
    icon: ShieldCheck,
    title: 'كشف الاحتيال المتقدم',
    desc: 'نظام ذكي يكشف التلاعب بعداد المسافات والبلاغات المخفية والحوادث غير المُبلَّغ عنها لحمايتك',
    image: '/images/feature-2.jpg',
  },
  {
    icon: FileSearch,
    title: 'فحص السجلات التاريخية',
    desc: 'استعراض شامل لكافة البيانات المسجلة عن السيارة منذ خروجها من المصنع ',
    image: '/images/feature-3.jpg',
  },
  {
    icon: BarChart3,
    title: 'تقييم القيمة السوقية',
    desc: 'احصل على تقدير دقيق لقيمة السيارة الحالية بناءً على بيانات السوق والتحليلات المتقدمة',
    image: '/images/feature-4.jpg',
  },
  {
    icon: Cpu,
    title: 'فحص الكمبيوتر الشامل',
    desc: 'تحليل للانظمة الالكترونية والحساسات لاكتشاف الاعطال البرمجية وضمان كفاءة اداء المحرك والانظمة المساعدة',
    image: '/images/feature-5.jpg',
  },
  {
    icon: BadgeCheck,
    title: 'ضمان الجودة والسلامة',
    desc: 'مطابقة السيارة لمعايير السلامة الدولية والتاكد من خلوها من العيوب المصنعية',
    image: '/images/feature-6.jpg',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function SystemFeatures() {
  return (
    <section className="relative py-28 overflow-hidden">
      {/* Background image layer - premium car inspection themed */}
      <div className="absolute inset-0">
        <img
          src="/images/feature-6.jpg"
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-[#0a1628]/90" />
      </div>

      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(96,165,250,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,0.5) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Decorative glows */}
      <motion.div
        className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#0066cc]/[0.06] blur-[150px] pointer-events-none"
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#1e3a5f]/[0.08] blur-[120px] pointer-events-none"
        animate={{ opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-5 py-2 rounded-full text-sm font-semibold tracking-wider uppercase text-[#60a5fa] border border-[#60a5fa]/20 bg-[#60a5fa]/[0.06] backdrop-blur-sm mb-5">
            مميزات النظام
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
            تقنية متقدمة لفحص <span className="text-[#60a5fa]">موثوق</span>
          </h2>
          <p className="text-slate-300/80 max-w-2xl mx-auto text-base leading-relaxed">
            نوفّر لك مجموعة متكاملة من أدوات الفحص والتحقق المدعومة بالذكاء الاصطناعي وقواعد بيانات عالمية.
          </p>
        </motion.div>

        {/* Feature cards grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={i}
                variants={cardVariants}
                whileHover={{ y: -6, scale: 1.02 }}
                className="group relative rounded-2xl overflow-hidden transition-all duration-300
                  bg-[#0f1f35]/70 backdrop-blur-xl
                  border border-white/[0.08]
                  hover:border-[#60a5fa]/25 hover:shadow-[0_12px_50px_-15px_rgba(96,165,250,0.2)]"
              >
                {/* Card background image */}
                <div className="absolute inset-0 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity duration-500">
                  <img
                    src={f.image}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                {/* Glass gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0f1f35]/60 via-[#0f1f35]/80 to-[#0f1f35]/95" />

                {/* Content */}
                <div className="relative z-10 p-7">
                  {/* Icon container */}
                  <div className="w-13 h-13 rounded-xl flex items-center justify-center mb-5
                    bg-gradient-to-br from-[#1e3a5f]/80 to-[#0f2744]/80
                    border border-white/[0.1]
                    group-hover:from-[#0066cc] group-hover:to-[#004da6]
                    group-hover:border-[#60a5fa]/20
                    transition-all duration-400
                    shadow-[0_4px_16px_-4px_rgba(0,0,0,0.4)]
                    group-hover:shadow-[0_4px_24px_-4px_rgba(0,102,204,0.3)]"
                    style={{ width: '52px', height: '52px' }}
                  >
                    <Icon className="w-6 h-6 text-[#60a5fa] group-hover:text-white transition-colors duration-300" />
                  </div>

                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#e0eeff] transition-colors">{f.title}</h3>
                  <p className="text-base text-slate-300/80 leading-relaxed group-hover:text-slate-300/95 transition-colors">{f.desc}</p>
                </div>

                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#60a5fa]/0 to-transparent group-hover:via-[#60a5fa]/30 transition-all duration-500" />
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
