/**
 * @file ReportSample.tsx
 * @description مكون صفحة عينة التقرير لتطبيق Car History
 * يوفر عرض تفصيلي لعينة تقرير VIN مع جميع الأقسام والميزات
 * يتضمن معارض الصور وتقييم المستخدم والتنقل بين التقارير
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Login from './Login';
import SignUp from './SignUp';
import {
  Car,
  Shield,
  Fuel,
  Gauge,
  Calendar,
  Hash,
  Cog,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Wrench,
  Star,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Cpu,
  CircleAlert,
  ThumbsUp,
  Send,
  FileCheck,
  Info,
  Paintbrush,
  Layers,
  Zap,
  Activity,
  Eye,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * @constant sampleReports
 * @description مصفوفة بيانات عينات التقارير للعرض التوضيحي
 * تستخدم لعرض أمثلة التقارير مع معلومات شاملة عن المركبات
 * كل تقرير يتضمن معلومات المركبة والمحرك والهيكل والصور والحوادث
 */
const sampleReports = [
  {
    id: 'sample-1', // معرف فريد للتقرير
    vin: '4JGFB5KB6RB127994', // رقم تعريف المركبة
    car: {
      name: 'Mercedes-Benz GLE', // اسم المركبة بالإنجليزية
      nameAr: 'مرسيدس-بنز جي ال اي كلاس', // اسم المركبة بالعربية
      year: 2024, // سنة التصنيع
      trim: 'GLE 350', // فئة الموديل
      color: 'ابيض', // لون المركبة
      mileage: '20,808 كم', // المسافة المقطوعة
      fuelType: 'بنزين', // نوع الوقود
      transmission: 'أوتوماتيك', // نوع ناقل الحركة
      drivetrain: 'دفع أمامي', // نظام الدفع
      bodyType: 'سيدان', // نوع الهيكل
      doors: 4, // عدد الأبواب
      seats: 5, // عدد المقاعد
    },
    engine: {
      type: '6-Cylinder 3.0L', // نوع المحرك
      horsepower: '203 حصان', // القدرة الحصانية
      torque: '250 نيوتن/متر', // عزم الدوران
      fuelEconomy: '7.8 لتر/100كم', // استهلاك الوقود
    },
    chassis: {
      wheelbase: '2,825 مم', // قاعدة العجلات
      weight: '1,495 كجم', // الوزن الإجمالي
      tireSize: '235/45 R18', // حجم الإطارات
    },
    specs: {
      airbags: 8, // عدد وسائد الهواء
      abs: true, // نظام الفرامل المانع للانغلاق
      cruiseControl: true, // التحكم في السرعة
      sunroof: true, // فتحة السقف
      camera: 'كاميرا 360 درجة', // كاميرا الرؤية المحيطية
      navigation: true, // نظام الملاحة
    },
    images: [
      { src: '/images/photo3.webp', label: 'الأمام' }, // صورة أمامية
      { src: '/images/photo6.webp', label: 'الجانب' }, // صورة جانبية
      { src: 'images/photo13.webp', label: 'الخلف' }, // صورة خلفية
      { src: 'images/photo17.webp', label: 'الداخلية' }, // صورة داخلية
    ],
    accidents: [
      {
        date: '2024-03-15', // تاريخ الحادث
        type: 'اصطدام جانبي خفيف', // نوع الحادث
        severity: 'خفيف', // شدة الحادث
        image: '/images/photo11.webp', // صورة الحادث
      },
      {
        date: '2024-09-02', // تاريخ الحادث
        type: 'خدش خلفي بسيط', // نوع الحادث
        severity: 'طفيف', // شدة الحادث
        image: '/images/photo9.webp', // صورة الحادث
      },
    ],
    serviceHistory: [
      { type: 'تغيير زيت المحرك', date: '2024-01-10' }, // سجل الصيانة
      { type: 'فحص دوري شامل', date: '2024-04-22' }, // فحص دوري
      { type: 'تبديل فلتر الهواء', date: '2024-06-15' }, // صيانة فلتر
      { type: 'تبديل تيل الفرامل الأمامية', date: '2024-08-03' }, // صيانة الفرامل
      { type: 'فحص نظام التعليق', date: '2024-10-20' },
      { type: 'تعبئة غاز المكيف', date: '2025-01-05' },
    ],
    diagnostics: [
      { part: 'فلتر الزيت', status: 'replace', note: 'تجاوز العمر الافتراضي' },
      { part: 'بطارية السيارة', status: 'warning', note: 'مستوى الشحن 40%' },
      { part: 'إطارات أمامية', status: 'replace', note: 'تآكل يتجاوز 75%' },
      { part: 'سائل الفرامل', status: 'ok', note: 'مستوى طبيعي' },
      { part: 'حساس الأكسجين', status: 'warning', note: 'قراءة غير مستقرة' },
      { part: 'نظام العادم', status: 'ok', note: 'لا توجد مشاكل' },
    ],
    rating: 7.4,
  },
  {
    id: 'sample-2',
    vin: 'W1KAF4GB3PR092530',
    car: {
      name: 'Mercedes-Benz CLS-Class 2019',
      nameAr: 'مرسيدس-بنز سي ال اس',
      year: 2019,
      trim: 'M Sport',
      color: 'اسود غامق',
      mileage: '32,800 كم',
      fuelType: 'بنزين',
      transmission: 'أوتوماتيك',
      drivetrain: 'دفع خلفي',
      bodyType: 'سيدان',
      doors: 4,
      seats: 5,
    },
    engine: {
      type: '3.0L Twin-Turbo 6-Cylinder',
      horsepower: '335 حصان',
      torque: '450 نيوتن/متر',
      fuelEconomy: '9.2 لتر/100كم',
    },
    chassis: {
      wheelbase: '2,975 مم',
      weight: '1,740 كجم',
      tireSize: '245/40 R19',
    },
    specs: {
      airbags: 10,
      abs: true,
      cruiseControl: true,
      sunroof: true,
      camera: 'كاميرا 360 درجة',
      navigation: true,
    },
    images: [
      { src: '/images/photo333.jpg', label: 'الأمام' },
      { src: '/images/photo26.jpg', label: 'الجانب' },
      { src: '/images/photo111.jpg', label: 'الخلف' },
      { src: '/images/photo28.jpg', label: 'الداخلية' },
    ],
    accidents: [],
    serviceHistory: [
      { type: 'تغيير زيت المحرك', date: '2023-11-05' },
      { type: 'فحص دوري شامل', date: '2024-02-18' },
      { type: 'تبديل فلتر المكيف', date: '2024-05-10' },
      { type: 'تبديل شمعات الاحتراق', date: '2024-07-22' },
      { type: 'فحص نظام الفرامل', date: '2024-09-30' },
    ],
    diagnostics: [
      { part: 'فلتر الزيت', status: 'ok', note: 'تم التغيير مؤخراً' },
      { part: 'بطارية السيارة', status: 'ok', note: 'مستوى الشحن 92%' },
      { part: 'إطارات أمامية', status: 'warning', note: 'تآكل يتجاوز 50%' },
      { part: 'سائل الفرامل', status: 'ok', note: 'مستوى طبيعي' },
      { part: 'حساس الأكسجين', status: 'ok', note: 'قراءة مستقرة' },
      { part: 'نظام العادم', status: 'ok', note: 'لا توجد مشاكل' },
    ],
    rating: 8.9,
  },
  {
    id: 'sample-3',
    vin: 'WDDNG8GB1LA123456',
    car: {
      name: 'Mercedes-Benz S-Class',
      nameAr: 'مرسيدس بنز الفئة S',
      year: 2024,
      trim: 'S 500 AMG Line',
      color: 'أبيض لؤلؤي',
      mileage: '12,500 كم',
      fuelType: 'بنزين',
      transmission: 'أوتوماتيك 9 سرعات',
      drivetrain: 'دفع رباعي 4MATIC',
      bodyType: 'سيدان فاخرة',
      doors: 4,
      seats: 5,
    },
    engine: {
      type: '3.0L Inline-6 Turbo + EQ Boost',
      horsepower: '449 حصان',
      torque: '550 نيوتن/متر',
      fuelEconomy: '8.5 لتر/100كم',
    },
    chassis: {
      wheelbase: '3,216 مم',
      weight: '2,115 كجم',
      tireSize: '255/40 R20',
    },
    specs: {
      airbags: 12,
      abs: true,
      cruiseControl: true,
      sunroof: true,
      camera: 'كاميرا 360 درجة + رؤية ليلية',
      navigation: true,
    },
    images: [
      { src: '/images/photo30.jpg', label: 'الأمام' },
      { src: '/images/photo34.jpg', label: 'الجانب' },
      { src: '/images/photo33.jpg', label: 'الخلف' },
      { src: '/images/photo35.jpg', label: 'الداخلية' },
    ],
    accidents: [
      {
        date: '2025-01-20',
        type: 'خدش جانبي سطحي',
        severity: 'طفيف',
        image: '/images/photo31.jpg',
      },
    ],
    serviceHistory: [
      { type: 'فحص تسليم جديد', date: '2024-03-01' },
      { type: 'تغيير زيت المحرك', date: '2024-09-15' },
      { type: 'فحص دوري شامل', date: '2025-01-10' },
    ],
    diagnostics: [
      { part: 'فلتر الزيت', status: 'ok', note: 'تم التغيير مؤخراً' },
      { part: 'بطارية السيارة', status: 'ok', note: 'مستوى الشحن 98%' },
      { part: 'إطارات أمامية', status: 'ok', note: 'حالة ممتازة' },
      { part: 'سائل الفرامل', status: 'ok', note: 'مستوى طبيعي' },
      { part: 'حساس الأكسجين', status: 'ok', note: 'قراءة مثالية' },
      { part: 'نظام العادم', status: 'ok', note: 'لا توجد مشاكل' },
    ],
    rating: 9.5,
  },
];

// ---- Sub-Components ----

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-lg bg-[#002f6c] flex items-center justify-center text-white flex-shrink-0">
        {icon}
      </div>
      <h2 className="text-lg font-bold text-[#0f172a]">{title}</h2>
    </div>
  );
}

function InfoChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3">
      <div className="w-8 h-8 rounded-lg bg-[#002f6c]/10 flex items-center justify-center text-[#002f6c] flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-[#94a3b8] font-medium leading-none mb-1">{label}</p>
        <p className="text-sm font-semibold text-[#1e293b] truncate">{value}</p>
      </div>
    </div>
  );
}

function RatingGauge({ score }: { score: number }) {
  const maxScore = 10;
  const pct = (score / maxScore) * 100;
  const color =
    score >= 8 ? '#10b981' : score >= 6 ? '#f59e0b' : '#ef4444';
  const label =
    score >= 8 ? 'ممتازة' : score >= 6 ? 'جيدة' : 'تحتاج مراجعة';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <motion.circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 52}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
            whileInView={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - pct / 100) }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            viewport={{ once: true }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>
            {score}
          </span>
          <span className="text-xs text-[#94a3b8]">/ {maxScore}</span>
        </div>
      </div>
      <span className="text-sm font-bold" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className="p-0.5 transition-transform hover:scale-110"
          aria-label={`${s} stars`}
        >
          <Star
            size={28}
            className={s <= value ? 'fill-[#f59e0b] text-[#f59e0b]' : 'text-[#cbd5e1]'}
          />
        </button>
      ))}
    </div>
  );
}

// ---- Report Card for Grid ----
function ReportCard({
  report,
  onSelect,
}: {
  report: typeof sampleReports[0];
  onSelect: () => void;
}) {
  const ratingColor = report.rating >= 8 ? '#10b981' : report.rating >= 6 ? '#f59e0b' : '#ef4444';

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,47,108,0.12)' }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden shadow-sm cursor-pointer group"
      onClick={onSelect}
    >
      {/* Image */}
      <div className="relative h-48 bg-[#f1f5f9] overflow-hidden">
        <img
          src={report.images[0].src}
          alt={report.car.nameAr}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        {/* Rating badge */}
        <div
          className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-sm text-white text-xs font-bold"
          style={{ backgroundColor: `${ratingColor}CC` }}
        >
          <Shield size={12} />
          {report.rating}/10
        </div>
        {/* Sample badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#002f6c]/80 backdrop-blur-sm text-white text-[11px] font-semibold px-3 py-1.5 rounded-full">
          <Eye size={12} />
          عينة تقرير
        </div>
        {/* Car name overlay */}
        <div className="absolute bottom-3 right-3 left-3">
          <h3 className="text-white font-bold text-lg leading-tight">{report.car.nameAr}</h3>
          <p className="text-white/80 text-sm">{report.car.year} - {report.car.trim}</p>
        </div>
      </div>

      {/* Details */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-[#64748b]">
            <Gauge size={14} className="text-[#002f6c]" />
            <span>{report.car.mileage}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#64748b]">
            <Fuel size={14} className="text-[#002f6c]" />
            <span>{report.car.fuelType}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#64748b]">
            <Cog size={14} className="text-[#002f6c]" />
            <span>{report.car.transmission}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#64748b]">
            <Paintbrush size={14} className="text-[#002f6c]" />
            <span>{report.car.color}</span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-3 pt-3 border-t border-[#e2e8f0]">
          <div className="flex items-center gap-1.5">
            {report.accidents.length === 0 ? (
              <CheckCircle size={14} className="text-[#10b981]" />
            ) : (
              <AlertTriangle size={14} className="text-[#f59e0b]" />
            )}
            <span className="text-xs text-[#64748b]">
              {report.accidents.length === 0 ? 'بدون حوادث' : `${report.accidents.length} حادث`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wrench size={14} className="text-[#002f6c]" />
            <span className="text-xs text-[#64748b]">{report.serviceHistory.length} صيانة</span>
          </div>
          <div className="flex-1" />
          <span className="text-xs font-semibold text-[#002f6c] group-hover:underline">
            {'عرض التقرير'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ---- Main Page ----

interface ReportSampleProps {
  loginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  signupModalOpen: boolean;
  setSignupModalOpen: (open: boolean) => void;
}

export default function ReportSample({
  loginModalOpen,
  setLoginModalOpen,
  signupModalOpen,
  setSignupModalOpen
}: ReportSampleProps) {
  const [selectedReport, setSelectedReport] = useState<typeof sampleReports[0] | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const openLogin = () => { setSignupModalOpen(false); setLoginModalOpen(true); };
  const openSignup = () => { setLoginModalOpen(false); setSignupModalOpen(true); };

  const handleFeedbackSubmit = () => {
    if (userRating === 0) {
      toast.error('يرجى تحديد عدد النجوم لتقييم تجربتك مع عينة التقرير.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success('شكراً لمشاركتنا رأيك في عينة التقرير! تم استلام تقييمك بنجاح.');
      setUserRating(0);
      setUserComment('');
    }, 1200);
  };

  const handleSaveReport = async () => {
    try {
      // Show loading message
      toast.loading('جاري تجهيز التقرير للطباعة... يرجى الانتظار قليلاً لضمان جودة الصور.');
      
      // Wait for all images to load before printing, especially gallery images
      const images = document.querySelectorAll('img');
      const galleryImages = document.querySelectorAll('.image-gallery img, .gallery-container img, [class*="gallery"] img, [id*="gallery"] img');
      
      const imagePromises = Array.from(images).map(img => {
        const htmlImg = img as HTMLImageElement;
        return new Promise<void>((resolve) => {
          if (htmlImg.complete && htmlImg.naturalWidth > 0) {
            resolve();
          } else {
            htmlImg.onload = () => {
              // Small delay to ensure image is fully rendered
              setTimeout(resolve, 100);
            };
            htmlImg.onerror = () => resolve(); // Continue even if image fails to load
            // Force image reload if needed
            if (!htmlImg.complete) {
              const src = htmlImg.src;
              htmlImg.src = '';
              htmlImg.src = src;
            }
            // Set a timeout in case images take too long
            setTimeout(() => resolve(), 3000);
          }
        });
      });
      
      // Wait specifically for gallery images with longer timeout
      const galleryImagePromises = Array.from(galleryImages).map(img => {
        const htmlImg = img as HTMLImageElement;
        return new Promise<void>((resolve) => {
          if (htmlImg.complete && htmlImg.naturalWidth > 0) {
            setTimeout(resolve, 200); // Extra delay for gallery images
          } else {
            htmlImg.onload = () => {
              // Ensure gallery image is fully rendered
              setTimeout(resolve, 300);
            };
            htmlImg.onerror = () => resolve();
            // Force reload gallery images if needed
            if (!htmlImg.complete) {
              const src = htmlImg.src;
              htmlImg.src = '';
              htmlImg.src = src;
            }
            setTimeout(() => resolve(), 5000); // Longer timeout for gallery images
          }
        });
      });
      
      // Wait for all images to load (with extended timeout for gallery)
      await Promise.race([
        Promise.all([...imagePromises, ...galleryImagePromises]),
        new Promise(resolve => setTimeout(resolve, 8000)) // 8 second max wait for gallery images
      ]);
      
      // Add print class to body for styling
      document.body.classList.add('printing-report');
      
      // Small delay to ensure CSS is applied
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Trigger browser print dialog
      window.print();
      
      // Clear loading state immediately after print command
      toast.dismiss();
      
      // Show success message
      toast.success('تم فتح نافذة الطباعة. للحصول على أفضل نتيجة، اختر "حفظ كملف PDF" وقم بتفعيل خيار "رسومات الخلفية".');
      
      // Remove print class after a short delay
      setTimeout(() => {
        document.body.classList.remove('printing-report');
      }, 1000);
      
    } catch (error) {
      document.body.classList.remove('printing-report');
      console.error('Error opening print dialog:', error);
      toast.error('نعتذر، فشل فتح نافذة الطباعة. يرجى التأكد من إعدادات المتصفح والمحاولة مرة أخرى.');
    }
  };

  const handleSelectReport = (report: typeof sampleReports[0]) => {
    setSelectedReport(report);
    setSelectedImage(0);
    setUserRating(0);
    setUserComment('');
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } },
  };
  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
  };

  return (
    <div className="bg-[#f1f5f9]" ref={topRef}>
      <Login isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} onSwitchToSignUp={openSignup} />
      <SignUp isOpen={signupModalOpen} onClose={() => setSignupModalOpen(false)} onSwitchToLogin={openLogin} />

      {/* ===== HERO ===== */}
      <section className="relative bg-gradient-to-br from-[#001a3d] via-[#002f6c] to-[#003d85] py-10 md:py-14 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-5">
              <FileCheck size={14} className="text-[#60a5fa]" />
              <span className="text-xs font-semibold text-white/90">عينات تقارير الفحص</span>
            </div>

            {selectedReport ? (
              <>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 leading-tight">
                  {selectedReport.car.nameAr}{' '}
                  <span className="text-[#60a5fa]">{selectedReport.car.year}</span>
                </h1>
                <p className="text-white/70 text-base md:text-lg mb-1">{selectedReport.car.trim} &middot; {selectedReport.car.color}</p>
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-5 py-2.5 mt-4">
                  <Hash size={14} className="text-[#60a5fa]" />
                  <span className="font-mono text-sm md:text-base text-white tracking-widest">{selectedReport.vin}</span>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight">
                  عينة <span className="text-[#60a5fa]">التقارير</span>
                </h1>
                <p className="text-white/70 text-base md:text-lg max-w-2xl mx-auto">
                  استعرض نماذج حقيقية من تقاريرنا الاحترافية لفحص السيارات. كل تقرير يتضمن تفاصيل شاملة عن حالة السيارة، سجل الحوادث، الصيانة، وفحص الكمبيوتر.
                </p>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* ===== CONTENT ===== */}
      <main className="container mx-auto px-4 -mt-6 relative z-20 pb-12">
        <AnimatePresence mode="wait">
          {!selectedReport ? (
            /* ===== REPORTS GRID VIEW ===== */
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Info banner */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-[#002f6c]/10 flex items-center justify-center flex-shrink-0">
                  <Info size={20} className="text-[#002f6c]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-[#1e293b] mb-1">ما هي عينة التقارير؟</h3>
                  <p className="text-sm text-[#64748b] leading-relaxed">
                    هذه نماذج توضيحية لتقاريرنا الاحترافية. اختر أي تقرير للاطلاع على كافة التفاصيل بما في ذلك معرض الصور، المواصفات الفنية، سجل الحوادث والصيانة، وتشخيص الكمبيوتر.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-[#002f6c]/10 px-3 py-1.5 rounded-full flex-shrink-0">
                  <Lock size={12} className="text-[#002f6c]" />
                  <span className="text-[11px] font-semibold text-[#002f6c]">للعرض فقط</span>
                </div>
              </motion.div>

              {/* Reports grid */}
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
              >
                {sampleReports.map((report) => (
                  <motion.div key={report.id} variants={fadeUp}>
                    <ReportCard report={report} onSelect={() => handleSelectReport(report)} />
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          ) : (
            /* ===== SINGLE REPORT DETAIL VIEW ===== */
            <motion.div
              key="detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Back button */}
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelectedReport(null)}
                className="flex items-center gap-2 text-[#002f6c] hover:text-[#001a3d] font-semibold text-sm mb-5 transition-colors"
              >
                <ArrowLeft size={18} />
                العودة لجميع العينات
              </motion.button>

              <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-5 max-w-5xl mx-auto">

                {/* -- Image Gallery -- */}
                <motion.section variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-5">
                  <SectionHeading icon={<Car size={18} />} title="معرض الصور" />
                  <div className="flex flex-col md:grid md:grid-cols-[1fr_120px] lg:grid-cols-[1fr_150px] gap-4 md:h-[450px] lg:h-[550px]">
                    <button
                      onClick={() => setLightboxOpen(true)}
                      className="relative rounded-xl overflow-hidden aspect-[16/10] md:aspect-auto md:h-full w-full bg-[#f1f5f9] group"
                    >
                      <img
                        src={selectedReport.images[selectedImage].src}
                        alt={selectedReport.images[selectedImage].label}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        اضغط للتكبير
                      </span>
                    </button>
                    <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto md:h-full pr-2 custom-scrollbar">
                      {selectedReport.images.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedImage(i)}
                          className={`relative flex-shrink-0 w-20 h-16 md:w-24 md:h-[72px] rounded-lg overflow-hidden border-2 transition-all ${
                            selectedImage === i ? 'border-[#002f6c] shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={img.src} alt={img.label} className="w-full h-full object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] text-center py-0.5">
                            {img.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.section>

                {/* -- Info Cards Grid -- */}
                <motion.section variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-5">
                  <SectionHeading icon={<Info size={18} />} title="المعلومات الأساسية" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
                    <InfoChip icon={<Calendar size={16} />} label="سنة الصنع" value={String(selectedReport.car.year)} />
                    <InfoChip icon={<Gauge size={16} />} label="المسافة المقطوعة" value={selectedReport.car.mileage} />
                    <InfoChip icon={<Fuel size={16} />} label="نوع الوقود" value={selectedReport.car.fuelType} />
                    <InfoChip icon={<Cog size={16} />} label="ناقل الحركة" value={selectedReport.car.transmission} />
                    <InfoChip icon={<Car size={16} />} label="نوع الهيكل" value={selectedReport.car.bodyType} />
                    <InfoChip icon={<Layers size={16} />} label="نظام الدفع" value={selectedReport.car.drivetrain} />
                    <InfoChip icon={<Paintbrush size={16} />} label="اللون" value={selectedReport.car.color} />
                    <InfoChip icon={<Hash size={16} />} label="عدد المقاعد" value={`${selectedReport.car.seats} مقاعد`} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap size={16} className="text-[#002f6c]" />
                        <h3 className="text-sm font-bold text-[#1e293b]">المحرك</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-sm">
                        <div>
                          <p className="text-[11px] text-[#94a3b8]">النوع</p>
                          <p className="font-semibold text-[#1e293b]">{selectedReport.engine.type}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#94a3b8]">القوة</p>
                          <p className="font-semibold text-[#1e293b]">{selectedReport.engine.horsepower}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#94a3b8]">عزم الدوران</p>
                          <p className="font-semibold text-[#1e293b]">{selectedReport.engine.torque}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#94a3b8]">استهلاك الوقود</p>
                          <p className="font-semibold text-[#1e293b]">{selectedReport.engine.fuelEconomy}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Activity size={16} className="text-[#002f6c]" />
                        <h3 className="text-sm font-bold text-[#1e293b]">الهيكل والمواصفات</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-sm">
                        <div>
                          <p className="text-[11px] text-[#94a3b8]">قاعدة العجلات</p>
                          <p className="font-semibold text-[#1e293b]">{selectedReport.chassis.wheelbase}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#94a3b8]">الوزن</p>
                          <p className="font-semibold text-[#1e293b]">{selectedReport.chassis.weight}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#94a3b8]">مقاس الإطار</p>
                          <p className="font-semibold text-[#1e293b]">{selectedReport.chassis.tireSize}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#94a3b8]">الوسائد الهوائية</p>
                          <p className="font-semibold text-[#1e293b]">{selectedReport.specs.airbags} وسائد</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.section>

                {/* -- Accident History -- */}
                <motion.section variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-5">
                  <SectionHeading icon={<AlertTriangle size={18} />} title="سجل الحوادث" />
                  {selectedReport.accidents.length === 0 ? (
                    <div className="flex items-center gap-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4">
                      <CheckCircle size={20} className="text-[#10b981]" />
                      <span className="text-sm font-medium text-[#166534]">لا توجد حوادث مسجلة</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedReport.accidents.map((acc, i) => (
                        <motion.div
                          key={i}
                          whileHover={{ y: -2 }}
                          className="border border-[#e2e8f0] rounded-xl overflow-hidden bg-[#f8fafc]"
                        >
                          <div className="relative h-36 bg-[#e2e8f0]">
                            <img src={acc.image} alt={acc.type} className="w-full h-full object-cover" />
                            <span
                              className={`absolute top-2 left-2 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                acc.severity === 'خفيف' ? 'bg-[#fef9c3] text-[#854d0e]' : 'bg-[#dbeafe] text-[#1e40af]'
                              }`}
                            >
                              {acc.severity}
                            </span>
                          </div>
                          <div className="p-3">
                            <p className="text-sm font-semibold text-[#1e293b] mb-1">{acc.type}</p>
                            <p className="text-xs text-[#94a3b8]">{acc.date}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.section>

                {/* -- Service History -- */}
                <motion.section variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-5">
                  <SectionHeading icon={<Wrench size={18} />} title="سجل الصيانة" />
                  <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#f8fafc]">
                          <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748b] uppercase tracking-wider">نوع الخدمة</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748b] uppercase tracking-wider">التاريخ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReport.serviceHistory.map((s, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'}>
                            <td className="px-4 py-3 font-medium text-[#1e293b]">{s.type}</td>
                            <td className="px-4 py-3 text-[#64748b]">{s.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.section>

                {/* -- Diagnostics -- */}
                <motion.section variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-5">
                  <SectionHeading icon={<Cpu size={18} />} title="فحص الكمبيوتر (Diagnostics)" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {selectedReport.diagnostics.map((item, i) => {
                      const isReplace = item.status === 'replace';
                      const isWarning = item.status === 'warning';

                      return (
                        <motion.div
                          key={i}
                          whileHover={{ y: -2 }}
                          className={`flex items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                            isReplace
                              ? 'bg-[#fef2f2] border-[#fecaca]'
                              : isWarning
                              ? 'bg-[#fffbeb] border-[#fde68a]'
                              : 'bg-[#f0fdf4] border-[#bbf7d0]'
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isReplace
                                ? 'bg-[#ef4444] text-white'
                                : isWarning
                                ? 'bg-[#f59e0b] text-white'
                                : 'bg-[#10b981] text-white'
                            }`}
                          >
                            {isReplace ? <XCircle size={16} /> : isWarning ? <CircleAlert size={16} /> : <CheckCircle size={16} />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#1e293b] mb-0.5">{item.part}</p>
                            <p className="text-xs text-[#64748b]">{item.note}</p>
                            <span
                              className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isReplace
                                  ? 'bg-[#ef4444]/15 text-[#dc2626]'
                                  : isWarning
                                  ? 'bg-[#f59e0b]/15 text-[#d97706]'
                                  : 'bg-[#10b981]/15 text-[#059669]'
                              }`}
                            >
                              {isReplace ? 'يجب الاستبدال' : isWarning ? 'تحتاج مراقبة' : 'حالة جيدة'}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.section>

                {/* -- Car Rating -- */}
                <motion.section variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-5">
                  <SectionHeading icon={<Shield size={18} />} title="تقييم حالة السيارة" />
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <RatingGauge score={selectedReport.rating} />
                    <div className="flex-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { label: 'المحرك', value: selectedReport.rating >= 9 ? 95 : selectedReport.rating >= 8 ? 85 : 75 },
                          { label: 'الهيكل الخارجي', value: selectedReport.rating >= 9 ? 92 : selectedReport.rating >= 8 ? 80 : 70 },
                          { label: 'الداخلية', value: selectedReport.rating >= 9 ? 98 : selectedReport.rating >= 8 ? 90 : 82 },
                          { label: 'نظام الفرامل', value: selectedReport.rating >= 9 ? 96 : selectedReport.rating >= 8 ? 88 : 78 },
                        ].map((bar, i) => (
                          <div key={i} className="bg-[#f8fafc] rounded-xl p-3 border border-[#e2e8f0]">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-[#1e293b]">{bar.label}</span>
                              <span className="text-xs font-bold text-[#002f6c]">{bar.value}%</span>
                            </div>
                            <div className="h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{
                                  background:
                                    bar.value >= 80
                                      ? '#10b981'
                                      : bar.value >= 60
                                      ? '#f59e0b'
                                      : '#ef4444',
                                }}
                                initial={{ width: 0 }}
                                whileInView={{ width: `${bar.value}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.1 }}
                                viewport={{ once: true }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.section>

                {/* -- User Feedback -- */}
                <motion.section variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-5">
                  <SectionHeading icon={<ThumbsUp size={18} />} title="تقييم المستخدم" />
                  <div className="max-w-lg">
                    <p className="text-sm text-[#64748b] mb-4">شاركنا رأيك حول هذا التقرير</p>
                    <div className="mb-4">
                      <StarRating value={userRating} onChange={setUserRating} />
                    </div>
                    <textarea
                      value={userComment}
                      onChange={(e) => setUserComment(e.target.value)}
                      placeholder="اكتب تعليقك هنا (اختياري)..."
                      rows={3}
                      className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-sm text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#002f6c]/30 focus:border-[#002f6c] transition-all resize-none"
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleFeedbackSubmit}
                      disabled={isSubmitting}
                      className="mt-3 flex items-center gap-2 bg-[#002f6c] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#001a3d] transition-colors disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                      {isSubmitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
                    </motion.button>
                  </div>
                </motion.section>

                {/* -- Save Report Action -- */}
                <motion.div variants={fadeUp} className="flex justify-center pt-2 pb-4">
                  <motion.button
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSaveReport}
                    className="flex items-center gap-3 bg-gradient-to-l from-[#001a3d] to-[#002f6c] text-white px-10 py-4 rounded-2xl text-base font-bold shadow-xl shadow-[#002f6c]/25 hover:shadow-2xl hover:shadow-[#002f6c]/30 transition-all"
                  >
                    <Download size={20} />
                    حفظ تقرير الفحص
                  </motion.button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ===== LIGHTBOX ===== */}
      <AnimatePresence>
        {lightboxOpen && selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setLightboxOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedReport.images[selectedImage].src}
                alt={selectedReport.images[selectedImage].label}
                className="w-full rounded-2xl object-contain max-h-[80vh]"
              />
              <button
                onClick={() => setLightboxOpen(false)}
                className="absolute -top-3 -left-3 w-10 h-10 bg-white text-[#1e293b] rounded-full flex items-center justify-center shadow-lg hover:bg-[#f1f5f9] transition-colors"
                aria-label="Close lightbox"
              >
                <X size={20} />
              </button>
              <button
                onClick={() => setSelectedImage((selectedImage + 1) % selectedReport.images.length)}
                className="absolute top-1/2 -translate-y-1/2 right-3 w-10 h-10 bg-white/20 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                aria-label="Next image"
              >
                <ChevronRight size={20} />
              </button>
              <button
                onClick={() => setSelectedImage((selectedImage - 1 + selectedReport.images.length) % selectedReport.images.length)}
                className="absolute top-1/2 -translate-y-1/2 left-3 w-10 h-10 bg-white/20 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="absolute bottom-4 inset-x-0 flex justify-center gap-2">
                {selectedReport.images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      selectedImage === i ? 'bg-white scale-125' : 'bg-white/40'
                    }`}
                    aria-label={`Go to image ${i + 1}`}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
