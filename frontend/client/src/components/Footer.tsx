/**
 * @file Footer.tsx
 * @description مكون التذييل لتطبيق Car History
 * يوفر تذييلًا شاملاً مع روابط التنقل ومعلومات الاتصال ووسائل التواصل الاجتماعي
 * يتضمن وظيفة التمرير للأعلى وتأثيرات الدخول المتحركة
 */

import { Link, useLocation } from 'wouter';
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, ChevronUp, ExternalLink, Instagram } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useRef, useEffect } from 'react';

/**
 * @interface ScrollToTopLinkProps
 * @description خصائص مكون ScrollToTopLink
 * @property {string} href - مسار التنقل
 * @property {React.ReactNode} children - محتوى الرابط
 * @property {string} className - فئات CSS للتنسيق
 * @property {any} [key: string] - خصائص إضافية للانتشار
 */
interface ScrollToTopLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}

/**
 * @function ScrollToTopLink
 * @description مكون رابط مخصص ينتقل للأعلى عند التنقل
 * يوفر سلوك التمرير السلس للأعلى عند التنقل بين الصفحات
 * @param {ScrollToTopLinkProps} props - خصائص المكون
 * @returns {JSX.Element} الرابط المعروض مع وظيفة التمرير للأعلى
 */
const ScrollToTopLink = ({ href, children, className, ...props }: ScrollToTopLinkProps) => {
  /**
   * @function handleClick
   * @description يعالج نقرة الرابط مع التمرير السلس للأعلى
   */
  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Link href={href} {...props}>
      <div onClick={handleClick} className={className}>
        {children}
      </div>
    </Link>
  );
};

/**
 * @constant staggerContainer
 * @description متغير الرسوم المتحركة للرسوم المتحركة المتعاقبة للأبناء
 * يوفر رسومًا متحركة تسلسلية سلسة لعناصر التذييل
 */
const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05 },
  },
};

/**
 * @constant fadeUp
 * @description متغير الرسوم المتحركة لتأثير التلاشي للأعلى
 * يوفر رسومًا متحركة للدخول سلسة لمحتوى التذييل
 */
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

/**
 * @function Footer
 * @description مكون التذييل الرئيسي مع تنقل ومعلومات اتصال شامل
 * يدير رسوم التمرير المتحركة وروابط وسائل التواصل الاجتماعي ووظيفة العودة للأعلى
 * @returns {JSX.Element} التذييل المعروض مع جميع الأقسام والميزات
 */
export default function Footer() {
  // مرجع لمشاهد التقاطع لبدء الرسوم المتحركة
  const footerRef = useRef<HTMLElement>(null);
  // حالة العرض لبدء رسوم الدخول المتحركة
  const isInView = useInView(footerRef, { once: true, amount: 0.15 });
  const [location] = useLocation();

  // Handle anchor scrolling when component loads
  useEffect(() => {
    if (window.location.hash) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const element = document.getElementById(window.location.hash.substring(1));
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [location]);

  /**
   * @function scrollToTop
   * @description التمرير السلس لأعلى الصفحة
   * يستخدمه زر العودة للأعلى لتجربة مستخدم أفضل
   */
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer ref={footerRef} className="relative overflow-hidden bg-gradient-to-b from-[#0a1628] to-[#050c15]">
      {/* Simple top border */}
      <div className="h-1 bg-gradient-to-r from-transparent via-[#0066cc] to-transparent" />

      {/* Minimal background elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Simple grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.01]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,102,204,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0,102,204,0.2) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Single subtle glow - reduced size */}
        <motion.div
          className="absolute -top-20 right-[10%] w-[300px] h-[300px] rounded-full bg-[#0066cc]/[0.05] blur-[80px]"
          animate={{ opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 relative z-10 pt-20 pb-12 md:pt-28 md:pb-16">
        {/* Top row: Brand + scroll-to-top */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="flex items-start justify-between mb-16"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-4">
            <div className="w-16 h-16 flex items-center justify-center">
              <img
                src="/images/logo.png"
                alt="Car History Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h3 className="font-bold text-xl text-white leading-none mb-1">Car History</h3>
              <p className="text-[12px] text-slate-400 tracking-widest uppercase font-medium">Premium Vehicle Reports</p>
            </div>
          </motion.div>

          <motion.button
            variants={fadeUp}
            onClick={scrollToTop}
            whileHover={{ y: -4, scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="w-12 h-12 rounded-xl bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/[0.12] hover:border-[#60a5fa]/40 transition-all shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3)]"
            aria-label="Scroll to top"
          >
            <ChevronUp size={20} />
          </motion.button>
        </motion.div>

        {/* Premium Links grid with enhanced spacing */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-10 mb-20"
        >
          {/* Column 1: About */}
          <motion.div variants={fadeUp}>
            <h4 className="text-xs font-bold tracking-widest uppercase text-slate-300 mb-6 opacity-90">عن الخدمة</h4>
            <p className="text-sm text-slate-400 leading-relaxed mb-7 max-w-[280px] font-light">
              منصة فاخرة وموثوقة للحصول على سجل السيارة الكامل والمفصل. نوفر معلومات دقيقة وشاملة لكل سيارة بأعلى معايير الجودة.
            </p>
            <div className="flex gap-3">
              {[
                { Icon: Facebook, label: 'Facebook', href: '#' },
                { Icon: Twitter, label: 'Twitter', href: '#' },
                { Icon: Instagram, label: 'Instagram', href: '#' },
                { Icon: Linkedin, label: 'LinkedIn', href: '#' },
              ].map(({ Icon, label, href }, i) => (
                <motion.a
                  key={i}
                  href={href}
                  whileHover={{ y: -3, scale: 1.12 }}
                  whileTap={{ scale: 0.88 }}
                  className="w-10 h-10 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-[#60a5fa] hover:bg-white/[0.1] hover:border-[#60a5fa]/30 transition-all shadow-[0_4px_12px_-4px_rgba(0,0,0,0.2)]"
                  title={label}
                >
                  <Icon size={18} />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Column 2: Quick Links */}
          <motion.div variants={fadeUp}>
            <h4 className="text-xs font-bold tracking-widest uppercase text-slate-300 mb-6 opacity-90">روابط سريعة</h4>
            <ul className="space-y-4">
              {[
                { label: 'الرئيسية', href: '/' },
                { label: 'عينة التقارير', href: '/reports' },
                { label: 'عن الخدمة', href: '/about' },
                { label: 'اتصل بنا', href: '/contact' },
              ].map((link, i) => (
                <li key={i}>
                  <ScrollToTopLink href={link.href}>
                    <motion.span
                      whileHover={{ x: -3 }}
                      className="text-sm text-slate-400 hover:text-[#60a5fa] transition-colors inline-flex items-center gap-1.5 cursor-pointer font-light"
                    >
                      {link.label}
                    </motion.span>
                  </ScrollToTopLink>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Column 3: Resources */}
          <motion.div variants={fadeUp}>
            <h4 className="text-xs font-bold tracking-widest uppercase text-slate-300 mb-6 opacity-90">الموارد</h4>
            <ul className="space-y-4">
              {[
                { label: 'البدء السريع', href: '/#vin-search' },
                { label: 'معلومات VIN', href: '/vin-info' },
                { label: 'فك تشفير VIN', href: '/vin-decoder' },
                { label: 'الأسئلة الشائعة', href: '/#faq' },
              ].map((link, i) => (
                <li key={i}>
                  <motion.div
                    whileHover={{ x: -3 }}
                    className="text-sm text-slate-400 hover:text-[#60a5fa] transition-colors inline-flex items-center gap-1.5 font-light"
                  >
                    {link.href.startsWith('/#') ? (
                      <span 
                        onClick={(e) => {
                          e.preventDefault();
                          const targetId = link.href.substring(2);
                          const element = document.getElementById(targetId);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          } else {
                            // If element not found, navigate to the page with hash
                            window.location.href = link.href;
                          }
                        }}
                        className="hover:text-[#60a5fa] transition-colors cursor-pointer"
                      >
                        {link.label}
                      </span>
                    ) : (
                      <ScrollToTopLink href={link.href} className="hover:text-[#60a5fa] transition-colors">
                        {link.label}
                      </ScrollToTopLink>
                    )}
                  </motion.div>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Column 4: Contact */}
          <motion.div variants={fadeUp}>
            <h4 className="text-xs font-bold tracking-widest uppercase text-slate-300 mb-6 opacity-90">تواصل معنا</h4>
            <ul className="space-y-4 mb-6">
              {[
                { icon: Phone, text: '+967776667703', href: 'tel:+967776667703' },
                { icon: Mail, text: 'carhistory2026@gmail.com', href: 'mailto:info@carhistory.com' },
                { icon: MapPin, text: 'اليمن صنعاء', href: '#' },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <li key={i}>
                    <a
                      href={item.href}
                      className="flex items-center gap-3 group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[#0066cc]/15 flex items-center justify-center group-hover:bg-[#0066cc]/25 transition-colors shadow-[0_4px_12px_-4px_rgba(0,102,204,0.2)]">
                        <Icon size={16} className="text-[#60a5fa]" />
                      </div>
                      <span className="text-sm text-slate-400 group-hover:text-[#60a5fa] transition-colors font-light">{item.text}</span>
                    </a>
                  </li>
                );
              })}
            </ul>

            {/* Premium Help button */}
            <ScrollToTopLink href="/contact">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-gradient-to-r from-[#0066cc]/15 to-[#004da6]/10 border border-[#0066cc]/25 text-[#60a5fa] text-sm font-semibold hover:from-[#0066cc]/20 hover:to-[#004da6]/15 hover:border-[#0066cc]/40 transition-all shadow-[0_4px_12px_-4px_rgba(0,102,204,0.15)]"
              >
                <ExternalLink size={16} />
                طلب المساعدة
              </motion.div>
            </ScrollToTopLink>
          </motion.div>
        </motion.div>

        {/* Premium Divider */}
        <motion.div
          className="h-px bg-gradient-to-r from-transparent via-[#0066cc]/30 to-transparent mb-10"
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 1, delay: 0.3 }}
        />

        {/* Bottom row - Enhanced styling */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <p className="text-xs text-slate-500 font-light">
            {'© 2026 Car History. جميع الحقوق محفوظة. منصة فاخرة للتقارير الموثوقة.'}
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-xs">
            {[
              { text: 'من نحن', href: '/about' },
              { text: 'اتصل بنا', href: '/contact' }
            ].map((item, i) => (
              <ScrollToTopLink key={i} href={item.href}>
                <motion.span
                  whileHover={{ color: '#60a5fa' }}
                  className="text-slate-500 hover:text-[#60a5fa] transition-colors cursor-pointer font-light"
                >
                  {item.text}
                </motion.span>
              </ScrollToTopLink>
            ))}
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
