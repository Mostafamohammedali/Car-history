/**
 * @file ContactUs.tsx
 * @description مكون صفحة اتصل بنا لتطبيق Car History
 * يوفر نموذج اتصال متكامل مع معلومات التواصل والخريطة
 * يتضمن التحقق من النموذج والرسوم المتحركة والتصميم المتجاوب
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Login from './Login';
import SignUp from './SignUp';
import {
  Mail, Phone, MapPin, Send, CheckCircle, MessageSquare, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { submitContactMessage, validateContactForm, type ContactFormData } from '../services/contactService';

/**
 * @function WhatsAppIcon
 * @description أيقونة واتساب المخصصة لتجنب الاعتمادات الإضافية
 * تستخدم SVG مضمن لتحسين الأداء وتقليل حجم الحزمة
 * @param {string} className - فئات CSS للتنسيق
 * @returns {JSX.Element} أيقونة واتساب المخصصة
 */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/**
 * @constant contactInfo
 * @description مصفوفة معلومات الاتصال بالشركة
 * تستخدم لعرض طرق التواصل المختلفة مع أيقونات وروابط
 * كل عنصر يتضمن أيقونة وتسمية وقيمة ورابط وتدرج لوني
 */
const contactInfo = [
  {
    icon: Mail, // أيقونة البريد الإلكتروني
    label: 'البريد الإلكتروني',
    value: 'carhistory2026@gmail.com',
    href: 'mailto:carhistory2026@gmail.com', // رابط مباشر للبريد
    accent: 'from-[#1e3a5f] to-[#002f6c]', // تدرج لوني
  },
  {
    icon: Phone, // أيقونة الهاتف
    label: 'الهاتف',
    value: '+967 776667703',
    href: 'tel:+967776667703', // رابط مباشر للمكالمة
    accent: 'from-[#1e3a5f] to-[#002f6c]',
  },
  {
    icon: WhatsAppIcon, // أيقونة واتساب المخصصة
    label: 'واتساب',
    value: '+967 776667703',
    href: 'https://wa.me/967776667703', // رابط مباشر لواتساب
    accent: 'from-[#1e3a5f] to-[#002f6c]',
    isCustom: true, // علامة للأيقونة المخصصة
  },
  {
    icon: MapPin, // أيقونة الموقع
    label: 'الموقع',
    value: 'اليمن صنعاء',
    href: '#map', // رابط داخلي للخريطة
    accent: 'from-[#1e3a5f] to-[#002f6c]',
  },
];

/**
 * @constant fadeUp
 * @description متغيرات الرسوم المتحركة لتأثير التلاشي للأعلى
 * يستخدم لإنشاء حركة دخول سلسة للعناصر من الأسفل للأعلى
 */
const fadeUp = {
  hidden: { opacity: 0, y: 28 }, // الحالة الأولية: مخفي ومنزاح للأسفل
  visible: { opacity: 1, y: 0 }, // الحالة النهائية: ظاهر في مكانه
};

/**
 * @interface ContactUsProps
 * @description خصائص مكون صفحة اتصل بنا
 * @property {boolean} loginModalOpen - يتحكم في ظهور نافذة تسجيل الدخول
 * @property {(open: boolean) => void} setLoginModalOpen - دالة لضبط حالة نافذة تسجيل الدخول
 * @property {boolean} signupModalOpen - يتحكم في ظهور نافذة تسجيل المستخدمين
 * @property {(open: boolean) => void} setSignupModalOpen - دالة لضبط حالة نافذة تسجيل المستخدمين
 */
interface ContactUsProps {
  loginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  signupModalOpen: boolean;
  setSignupModalOpen: (open: boolean) => void;
}

/**
 * @function ContactUs
 * @description صفحة اتصل بنا الرئيسية مع نموذج التواصل والمعلومات
 * يدير نموذج الاتصال والتحقق والحالة مع نوافذ المصادقة
 * @param {ContactUsProps} props - خصائص المكون
 * @returns {JSX.Element} صفحة اتصل بنا المعروضة مع جميع الميزات
 */
export default function ContactUs({
  loginModalOpen,
  setLoginModalOpen,
  signupModalOpen,
  setSignupModalOpen
}: ContactUsProps) {
  // إدارة حالة نموذج الاتصال
  const [isSubmitting, setIsSubmitting] = useState(false); // حالة إرسال النموذج
  const [isSubmitted, setIsSubmitted] = useState(false); // حالة نجاح الإرسال
  const [referenceNumber, setReferenceNumber] = useState<string>(''); // رقم المرجع
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    subject: '', 
    message: '', 
    phone: '', 
    vin: ''
  }); // بيانات النموذج

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

  /**
   * @function handleChange
   * @description يعالج تغييرات حقول النموذج
   * يقوم بتحديث حالة النموذج مع الحفاظ على باقي البيانات
   * @param {React.ChangeEvent} e - حدث تغيير الحقل
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // معالجة خاصة للـ checkbox
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm({ ...form, [name]: checked });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  /**
   * @function handleSubmit
   * @description يعالج إرسال نموذج الاتصال مع التحقق والاتصال بالـ API
   * يتحقق من الحقول المطلوبة ويرسل البيانات إلى الخادم
   * @param {React.FormEvent} e - حدث إرسال النموذج
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // منع إعادة تحميل الصفحة
    
    // التحقق من الحقول المطلوبة
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('يرجى ملء الاسم، البريد الإلكتروني، ونص الرسالة لنتمكن من مساعدتك.');
      return;
    }
    
    // بدء عملية الإرسال مع حالة التحميل
    setIsSubmitting(true);
    
    try {
      // إرسال البيانات إلى الـ API
      const result = await submitContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject || 'general',
        message: form.message.trim(),
        phone: form.phone.trim(),
        vin: form.vin.trim()
      });
      
      // التحقق من نجاح الإرسال
      if (result.success !== false) {
        setIsSubmitted(true); // عرض حالة النجاح
        
        // حفظ رقم المرجع
        if (result.data?.reference_number) {
          setReferenceNumber(result.data.reference_number);
        }
        
        toast.success(result.message || 'تم استلام رسالتك بنجاح! سيتواصل معك فريقنا في أقرب وقت ممكن.');
        
        // عرض رقم المرجع إذا كان متوفراً
        if (result.data && result.data.reference_number) {
          setTimeout(() => {
            toast.info(`يرجى الاحتفاظ برقم المرجع الخاص بك للمتابعة: ${result.data!.reference_number}`);
          }, 1000);
        }
        
        setTimeout(() => {
          setIsSubmitted(false);
          setReferenceNumber('');
        }, 5000); // إخفاء حالة النجاح بعد 5 ثواني
        
        setForm({ 
          name: '', 
          email: '', 
          subject: '', 
          message: '', 
          phone: '', 
          vin: ''
        }); // إعادة تعيين النموذج
      } else {
        toast.error(result.message || 'نعتذر، لم نتمكن من إرسال رسالتك في هذه اللحظة. يرجى المحاولة مرة أخرى لاحقاً.');
      }
    } catch (error: any) {
      console.error('Error submitting contact form:', error);
      
      // عرض رسالة الخطأ من الخادم أو رسالة افتراضية
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'حدث خطأ غير متوقع أثناء معالجة طلبك. يرجى التأكد من اتصالك بالإنترنت.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false); // إيقاف حالة التحميل
    }
  };

  return (
    <div className="bg-[#f8f9fc]">
      <Login isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} onSwitchToSignUp={openSignup} />
      <SignUp isOpen={signupModalOpen} onClose={() => setSignupModalOpen(false)} onSwitchToLogin={openLogin} />

      {/* ====== HERO ====== */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1596524430615-b46475ddff6e?w=1600&q=80" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#001a3d]/92 via-[#002f6c]/85 to-[#0f2744]/92" />
        </div>
        <div className="absolute top-10 left-10 w-80 h-80 rounded-full bg-[#60a5fa]/8 blur-[120px] pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="inline-block px-5 py-2 rounded-full text-xs font-semibold tracking-wider uppercase text-[#93c5fd] border border-[#1e3a5f] bg-white/5 backdrop-blur-sm mb-6"
          >
            تواصل معنا
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold text-white mb-5 leading-tight"
          >
            نحن هنا <span className="text-[#60a5fa]">لمساعدتك</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="text-slate-300 text-lg max-w-xl mx-auto leading-relaxed"
          >
            لديك سؤال أو استفسار؟ فريقنا جاهز لمساعدتك في أي وقت.
          </motion.p>
        </div>
      </section>

      {/* ====== MAIN CONTENT ====== */}
      <section className="relative -mt-14 z-20 pb-24 md:pb-32">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* ---- Contact Info Side ---- */}
            <div className="lg:col-span-4 flex flex-col gap-5">
              {/* Info cards */}
              {contactInfo.map((c, i) => {
                const Icon = c.icon;
                return (
                  <motion.a
                    key={i}
                    custom={i}
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    href={c.href}
                    target={c.href.startsWith('http') ? '_blank' : undefined}
                    rel={c.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="group flex items-center gap-4 rounded-2xl p-5
                      bg-white/70 backdrop-blur-xl
                      border border-white/80
                      shadow-[0_4px_20px_-6px_rgba(0,47,108,0.08)]
                      hover:shadow-[0_8px_32px_-8px_rgba(0,47,108,0.14)]
                      hover:border-[#002f6c]/15
                      transition-all duration-300"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                      bg-gradient-to-br ${c.accent}
                      shadow-lg shadow-[#002f6c]/15
                      group-hover:scale-105 transition-transform duration-300`}
                    >
                      {'isCustom' in c ? (
                        <Icon className="w-5 h-5 text-white" />
                      ) : (
                        <Icon className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs text-slate-400 font-medium mb-0.5">{c.label}</span>
                      <span className="block text-sm font-bold text-[#0f1729] group-hover:text-[#002f6c] transition-colors truncate">
                        {c.value}
                      </span>
                    </div>
                  </motion.a>
                );
              })}


            </div>

            {/* ---- Form Side ---- */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-8"
            >
              <div className="relative rounded-3xl p-8 md:p-10
                bg-white/60 backdrop-blur-2xl
                border border-[#002f6c]/8
                shadow-[0_8px_40px_-12px_rgba(0,47,108,0.10)]"
              >
                {/* Corner accent */}
                <div className="absolute top-0 left-0 w-24 h-24 rounded-tl-3xl border-t-2 border-l-2 border-[#002f6c]/15 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-24 h-24 rounded-br-3xl border-b-2 border-r-2 border-[#002f6c]/15 pointer-events-none" />

                {/* Form header */}
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-[#002f6c]/[0.06] flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-[#002f6c]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#0f1729]">أرسل لنا رسالة</h3>
                    <p className="text-xs text-slate-400">سنرد عليك خلال 24 ساعة عمل</p>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {isSubmitted ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-16 text-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-[#10b981]/10 flex items-center justify-center mb-5">
                        <CheckCircle className="w-8 h-8 text-[#10b981]" />
                      </div>
                      <h4 className="text-xl font-bold text-[#0f1729] mb-2">تم الإرسال بنجاح</h4>
                      <p className="text-sm text-slate-500 mb-3">شكرًا لتواصلك معنا. سنرد عليك في أقرب وقت.</p>
                      {referenceNumber && (
                        <div className="mt-4 px-6 py-3 rounded-xl bg-blue-50 border border-blue-200">
                          <p className="text-xs text-blue-600 mb-1">رقم المرجع</p>
                          <p className="text-lg font-bold text-blue-900 font-mono">{referenceNumber}</p>
                          <p className="text-xs text-blue-500 mt-1">احتفظ بهذا الرقم للمتابعة</p>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onSubmit={handleSubmit}
                      className="space-y-5"
                    >
                      {/* Name + Email */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-semibold text-[#0f1729] mb-2">
                            الاسم الكامل <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="أدخل اسمك"
                            required
                            className="w-full px-4 py-3.5 rounded-xl text-sm
                              bg-white/50 backdrop-blur-sm
                              border border-slate-200
                              text-[#0f1729] placeholder-slate-400
                              focus:outline-none focus:border-[#002f6c]/30 focus:ring-2 focus:ring-[#002f6c]/10 focus:bg-white
                              transition-all duration-200"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-[#0f1729] mb-2">
                            البريد الإلكتروني <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="example@email.com"
                            dir="ltr"
                            required
                            className="w-full px-4 py-3.5 rounded-xl text-sm
                              bg-white/50 backdrop-blur-sm
                              border border-slate-200
                              text-[#0f1729] placeholder-slate-400
                              focus:outline-none focus:border-[#002f6c]/30 focus:ring-2 focus:ring-[#002f6c]/10 focus:bg-white
                              transition-all duration-200"
                          />
                        </div>
                      </div>

                      {/* Phone + VIN */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-semibold text-[#0f1729] mb-2">
                            رقم الهاتف
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            placeholder="+967 xxx xxx xxx"
                            dir="ltr"
                            className="w-full px-4 py-3.5 rounded-xl text-sm
                              bg-white/50 backdrop-blur-sm
                              border border-slate-200
                              text-[#0f1729] placeholder-slate-400
                              focus:outline-none focus:border-[#002f6c]/30 focus:ring-2 focus:ring-[#002f6c]/10 focus:bg-white
                              transition-all duration-200"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-[#0f1729] mb-2">
                            رقم الهيكل (VIN)
                          </label>
                          <input
                            type="text"
                            name="vin"
                            value={form.vin}
                            onChange={handleChange}
                            placeholder="اختياري - إذا كان الاستفسار عن سيارة معينة"
                            maxLength={17}
                            dir="ltr"
                            className="w-full px-4 py-3.5 rounded-xl text-sm
                              bg-white/50 backdrop-blur-sm
                              border border-slate-200
                              text-[#0f1729] placeholder-slate-400
                              focus:outline-none focus:border-[#002f6c]/30 focus:ring-2 focus:ring-[#002f6c]/10 focus:bg-white
                              transition-all duration-200"
                          />
                        </div>
                      </div>

                      {/* Subject */}
                      <div>
                        <label className="block text-sm font-semibold text-[#0f1729] mb-2">الموضوع</label>
                        <select
                          name="subject"
                          value={form.subject}
                          onChange={handleChange}
                          className="w-full px-4 py-3.5 rounded-xl text-sm
                            bg-white/50 backdrop-blur-sm
                            border border-slate-200
                            text-[#0f1729]
                            focus:outline-none focus:border-[#002f6c]/30 focus:ring-2 focus:ring-[#002f6c]/10 focus:bg-white
                            transition-all duration-200 appearance-none cursor-pointer"
                        >
                          <option value="">اختر الموضوع</option>
                          <option value="general">استفسار عام</option>
                          <option value="support">دعم فني</option>
                          <option value="complaint">شكوى</option>
                          <option value="suggestion">اقتراح أو ملاحظة</option>
                          <option value="other">أخرى</option>
                        </select>
                      </div>

                      {/* Message */}
                      <div>
                        <label className="block text-sm font-semibold text-[#0f1729] mb-2">
                          الرسالة <span className="text-red-400">*</span>
                        </label>
                        <textarea
                          name="message"
                          value={form.message}
                          onChange={handleChange}
                          rows={5}
                          placeholder="اكتب رسالتك هنا..."
                          required
                          className="w-full px-4 py-3.5 rounded-xl text-sm resize-none
                            bg-white/50 backdrop-blur-sm
                            border border-slate-200
                            text-[#0f1729] placeholder-slate-400
                            focus:outline-none focus:border-[#002f6c]/30 focus:ring-2 focus:ring-[#002f6c]/10 focus:bg-white
                            transition-all duration-200"
                        />
                      </div>



                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl
                          bg-[#002f6c] text-white font-bold text-sm
                          hover:bg-[#001a3d]
                          disabled:opacity-60 disabled:cursor-not-allowed
                          transition-all duration-200
                          shadow-lg shadow-[#002f6c]/20 hover:shadow-xl hover:shadow-[#002f6c]/25"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            جاري الإرسال...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            إرسال الرسالة
                          </>
                        )}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ====== MAP ====== */}
      <section id="map" className="relative">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Dark styled map placeholder */}
          <div className="relative h-[380px] md:h-[440px] bg-[#0f1729] overflow-hidden">
            {/* Map grid overlay */}
            <div
              className="absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px',
              }}
            />

            {/* Faux map roads */}
            <div className="absolute inset-0">
              {/* Horizontal roads */}
              <div className="absolute top-[30%] left-0 right-0 h-px bg-[#1e3a5f]/40" />
              <div className="absolute top-[55%] left-0 right-0 h-px bg-[#1e3a5f]/30" />
              <div className="absolute top-[75%] left-0 right-0 h-px bg-[#1e3a5f]/25" />
              {/* Vertical roads */}
              <div className="absolute top-0 bottom-0 left-[25%] w-px bg-[#1e3a5f]/35" />
              <div className="absolute top-0 bottom-0 left-[50%] w-px bg-[#1e3a5f]/30" />
              <div className="absolute top-0 bottom-0 left-[70%] w-px bg-[#1e3a5f]/25" />
              {/* Diagonal */}
              <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-[20%] left-[10%] w-[40%] h-px bg-[#1e3a5f]/20 rotate-[25deg] origin-left" />
                <div className="absolute top-[60%] left-[45%] w-[35%] h-px bg-[#1e3a5f]/20 -rotate-[15deg] origin-left" />
              </div>
            </div>

            {/* Location pin */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="w-14 h-14 rounded-full bg-[#002f6c] flex items-center justify-center shadow-[0_0_40px_8px_rgba(0,47,108,0.3)]">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
              </motion.div>
              {/* Pulse rings */}
              <motion.div
                animate={{ scale: [1, 2], opacity: [0.4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeOut' }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full border-2 border-[#60a5fa]"
              />
            </div>

            {/* Label */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
              <div className="px-5 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-white text-sm font-medium">
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#60a5fa]" />
                  اليمن صنعاء
                </span>
              </div>
            </div>

            {/* Subtle radial glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#002f6c]/10 blur-[80px] pointer-events-none" />
          </div>
        </motion.div>
      </section>
    </div>
  );
}
