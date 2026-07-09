/**
 * @file CheckVinReport.tsx
 * @description مكون صفحة تقرير VIN الشامل
 * يعرض معلومات المركبة التفصيلية والتاريخ وتقارير التحليل
 * يوفر ميزات تفاعلية مثل المشاركة والتنزيل والتنقل
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
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
  Share2,
  Eye,
  MessageSquare,
  User,
  Quote,
  Edit2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { carService } from '@/services/carService';
import { useAuthStore } from '@/store/authStore';
import { LuxuryLoadingScreen } from '@/components/report/LuxuryLoadingScreen';

// تحديد رابط السيرفر الأساسي للصور والملفات الوسائطية
const VITE_API_URL = import.meta.env.VITE_API_URL;
const BACKEND_URL = (VITE_API_URL && VITE_API_URL.startsWith('http'))
  ? VITE_API_URL.split('/api')[0]
  : 'http://localhost:8000';

/**
 * @function SectionHeading
 * @description مكون رأس القسم مع أيقونة وعنوان
 * يستخدم لتنظيم وتوحيد شكل رؤوس الأقسام في التقرير
 * @param {React.ReactNode} icon - أيقونة القسم
 * @param {string} title - عنوان القسم
 * @returns {JSX.Element} رأس القسم المنسق
 */
function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    // حاوية رأس القسم مع أيقونة دائرية وعنوان
    <div className="flex items-center gap-3 mb-5">
      {/* أيقونة القسم في خلفية زرقاء */}
      <div className="w-9 h-9 rounded-lg bg-[#002f6c] flex items-center justify-center text-white flex-shrink-0">
        {icon}
      </div>
      {/* عنوان القسم بخط عريض */}
      <h2 className="text-lg font-bold text-[#0f172a]">{title}</h2>
    </div>
  );
}

/**
 * @function InfoChip
 * @description مكون شريط المعلومات مع أيقونة وتسمية وقيمة
 * يستخدم لعرض معلومات المركبة في شكل منظم وجذاب
 * @param {React.ReactNode} icon - أيقونة المعلومة
 * @param {string} label - تسمية المعلومة
 * @param {string} value - قيمة المعلومة
 * @returns {JSX.Element} شريط المعلومات المنسق
 */
function InfoChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    // حاوية شريط المعلومات مع خلفية فاتحة وإطار
    <div className="flex items-center gap-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3">
      {/* أيقونة المعلومة في خلفية زرقاء شفافة */}
      <div className="w-8 h-8 rounded-lg bg-[#002f6c]/10 flex items-center justify-center text-[#002f6c] flex-shrink-0">
        {icon}
      </div>
      {/* منطقة النص مع تسمية وقيمة */}
      <div className="min-w-0">
        <p className="text-[11px] text-[#94a3b8] font-medium leading-none mb-1">{label}</p>
        <p className="text-sm font-semibold text-[#1e293b] truncate">{value}</p>
      </div>
    </div>
  );
}

/**
 * @function RatingGauge
 * @description مكون مؤشر التقييم الدائري المتحرك
 * يعرض تقييم المركبة بشكل بصري مع رسوم متحركة
 * @param {number} score - درجة التقييم من 0 إلى 10
 * @returns {JSX.Element} مؤشر التقييم المنسق
 */
function RatingGauge({ score }: { score: number }) {
  // حساب النسبة المئوية واللون بناءً على الدرجة
  const maxScore = 10;
  const pct = (score / maxScore) * 100;
  const color =
    score >= 8 ? '#10b981' : score >= 6 ? '#f59e0b' : '#ef4444'; // أخضر للجيد، برتقالي للمتوسط، أحمر للضعيف
  const label =
    score >= 8 ? 'ممتازة' : score >= 6 ? 'جيدة' : 'تحتاج مراجعة';

  return (
    // حاوية المؤشر الدائري
    <div className="flex flex-col items-center gap-3">
      {/* دائرة التقييم مع SVG متحرك */}
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          {/* الدائرة الخلفية الرمادية */}
          <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="10" />
          {/* الدائرة المتحركة الملونة */}
          <motion.circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 52}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 52 }} // يبدأ من الصفر
            whileInView={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - pct / 100) }} // يتحرك إلى النسبة المئوية
            transition={{ duration: 1.2, ease: 'easeOut' }} // حركة سلسة
            viewport={{ once: true }} // يعمل مرة واحدة فقط
          />
        </svg>
        {/* نص التقييم في وسط الدائرة */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>
            {score}
          </span>
          <span className="text-xs text-[#94a3b8]">/ {maxScore}</span>
        </div>
      </div>
      {/* تسمية التقييم */}
      <span className="text-sm font-bold" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

/**
 * @function StarRating
 * @description مكون تقييم النجوم التفاعلي
 * يسمح للمستخدم بتقييم التقرير من 1 إلى 5 نجوم
 * @param {number} value - القيمة الحالية للتقييم
 * @param {(v: number) => void} onChange - دالة لتحديث التقييم
 * @returns {JSX.Element} تقييم النجوم التفاعلي
 */
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    // حاوية النجوم مع تباعد صغير
    <div className="flex gap-1">
      {/* إنشاء 5 نجوم */}
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)} // تحديث التقييم عند النقر
          className="p-0.5 transition-transform hover:scale-110" // تأثير تكبير عند التمرير
          aria-label={`${s} stars`} // وصف للوصول
        >
          {/* أيقونة النجمة مع لون ديناميكي */}
          <Star
            size={28}
            className={s <= value ? 'fill-[#f59e0b] text-[#f59e0b]' : 'text-[#cbd5e1]'} // ذهبي للنجوم المحددة، رمادي للباقي
          />
        </button>
      ))}
    </div>
  );
}

/**
 * @interface CheckVinReportProps
 * @description خصائص مكون تقرير VIN
 * @property {boolean} loginModalOpen - يتحكم في ظهور نافذة تسجيل الدخول
 * @property {(open: boolean) => void} setLoginModalOpen - دالة لضبط حالة نافذة تسجيل الدخول
 * @property {boolean} signupModalOpen - يتحكم في ظهور نافذة تسجيل المستخدمين
 * @property {(open: boolean) => void} setSignupModalOpen - دالة لضبط حالة نافذة تسجيل المستخدمين
 */
interface CheckVinReportProps {
  loginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  signupModalOpen: boolean;
  setSignupModalOpen: (open: boolean) => void;
}

/**
 * @function CheckVinReport
 * @description مكون صفحة تقرير VIN الرئيسي مع عرض معلومات المركبة الشامل
 * يدير عرض التقرير ومعارض الصور وتغذية المستخدم ووظائف المشاركة
 * @param {CheckVinReportProps} props - خصائص المكون
 * @returns {JSX.Element} صفحة تقرير VIN المعروضة مع جميع الميزات
 */
export default function CheckVinReport({
  loginModalOpen,
  setLoginModalOpen,
  signupModalOpen,
  setSignupModalOpen
}: CheckVinReportProps) {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuthStore();

  // إدارة حالة الواجهة للميزات التفاعلية
  const [selectedImage, setSelectedImage] = useState(0); // الصورة المحددة في معرض الصور
  const [lightboxOpen, setLightboxOpen] = useState(false); // حالة فتح نافذة الصور المكبرة
  const [accidentLightboxOpen, setAccidentLightboxOpen] = useState(false); // حالة فتح نافذة صور الحوادث
  const [selectedAccidentImage, setSelectedAccidentImage] = useState(0); // صورة الحادث المحددة
  const [userRating, setUserRating] = useState(0); // تقييم المستخدم للنجوم
  const [userComment, setUserComment] = useState(''); // تعليق المستخدم
  const [userPros, setUserPros] = useState(''); // الإيجابيات
  const [userCons, setUserCons] = useState(''); // السلبيات
  const [userRecommend, setUserRecommend] = useState(true); // هل يوصي بها
  const [isSubmitting, setIsSubmitting] = useState(false); // حالة إرسال التغذية
  const [editingId, setEditingId] = useState<number | null>(null); // معرف التقييم قيد التعديل
  const [deleteModalOpen, setDeleteModalOpen] = useState(false); // نافذة تأكيد الحذف
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null); // معرف التقييم المراد حذفه
  const [isDeleting, setIsDeleting] = useState(false); // حالة الحذف
  const topRef = useRef<HTMLDivElement>(null); // مرجع لأعلى الصفحة للتمرير
  const feedbackRef = useRef<HTMLDivElement>(null); // مرجع لقسم التقييم

  // إدارة حالة جلب البيانات من API
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dynamicReportData, setDynamicReportData] = useState<any>(null);
  // حالة التأكد من مرور الحد الأدنى لوقت التحميل (5 ثواني)
  const [isMinimumLoadingTimeMet, setIsMinimumLoadingTimeMet] = useState(false);

  // الحصول على VIN من معلمات URL لتعريف التقرير
  const [vin, setVin] = useState('');



  /**
   * @function useEffect
   * @description يستخرج VIN من معلمات استعلام URL
   * يضمن تنسيق VIN بشكل صحيح (أحرف كبيرة) للعرض
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vinParam = params.get('vin');
    if (vinParam) {
      const upperVin = vinParam.toUpperCase();
      setVin(upperVin);
      fetchVehicleReport(upperVin);
    } else {
      setIsLoading(false);
      setError('يرجى توفير رقم VIN للبحث');
    }
  }, [location]);

  // ref لحفظ بيانات الاستجابة مؤقتاً حتى ينتهي المؤقت
  const pendingDataRef = useRef<any>(null);
  const pendingErrorRef = useRef<string | null>(null);
  const pendingRedirectRef = useRef<string | null>(null);

  /**
   * @function fetchVehicleReport
   * @description يجلب بيانات التقرير من Backend API مع الحد الأدنى لوقت التحميل (5 ثواني)
   * @param {string} targetVin - رقم VIN المراد البحث عنه
   */
  const fetchVehicleReport = async (targetVin: string) => {
    setIsLoading(true);
    setIsMinimumLoadingTimeMet(false);
    setError(null);
    pendingDataRef.current = null;
    pendingErrorRef.current = null;
    pendingRedirectRef.current = null;

    // بدء المؤقت لمدة 5 ثواني (5000 ميلي ثانية)
    setTimeout(() => {
      setIsMinimumLoadingTimeMet(true);
    }, 5000);

    try {
      const response = await carService.integratedSearch(targetVin);
      const apiResponse = response;

      if (apiResponse.success && apiResponse.data) {
        const vehicleData = apiResponse.data;

        if (vehicleData.result_type === 'decoded' || vehicleData.source === 'vin_decoder') {
          // حفظ عملية إعادة التوجيه مؤقتاً
          pendingRedirectRef.current = `/decoded-vin-result?vin=${encodeURIComponent(targetVin)}`;
          return;
        }

        const mappedData = mapBackendToFrontend(vehicleData);
        pendingDataRef.current = mappedData;
      } else {
        pendingErrorRef.current = apiResponse.message || 'فشل في العثور على التقرير المطلوب لهذه السيارة.';
      }
    } catch (err: any) {
      console.error('Error fetching report:', err);
      if (err.response && err.response.status === 401) {
        pendingErrorRef.current = err.response.data?.message || 'قم بتسجيل حسابك للبحث عن سياره';
      } else if (err.response && err.response.status === 404) {
        pendingErrorRef.current = 'لم نتمكن من العثور على بيانات لهذه السيارة في قاعدة بياناتنا أو عبر خدمات التشفير الخارجية.';
      } else {
        pendingErrorRef.current = 'حدث خطأ أثناء الاتصال بالخادم. يرجى التأكد من اتصالك بالإنترنت والمحاولة لاحقاً.';
      }
    }
  };

  /**
   * @effect processPendingData
   * @description يعالج البيانات المعلقة عندما يكتمل المؤقت الزمني (5 ثواني)
   */
  useEffect(() => {
    if (isMinimumLoadingTimeMet && isLoading) {
      // المؤقت اكتمل، الآن نطبق البيانات المعلقة
      if (pendingRedirectRef.current) {
        setIsLoading(false);
        setLocation(pendingRedirectRef.current);
        return;
      }

      if (pendingErrorRef.current) {
        setError(pendingErrorRef.current);
      } else if (pendingDataRef.current) {
        setDynamicReportData(pendingDataRef.current);
      }

      setIsLoading(false);
    }
  }, [isMinimumLoadingTimeMet, isLoading]);

  /**
   * @function mapBackendToFrontend
   * @description يحول هيكل بيانات Backend إلى التنسيق الذي يتوقعه المكون
   * @param {any} data - البيانات الخام من API
   * @returns {any} البيانات المنسقة للواجهة
   */
  const mapBackendToFrontend = (data: any) => {
    const { car, report, images, accident_images, repair_shops, evaluations, risk_assessment_data } = data;

    // مساعدين للترجمة
    const translateFuel = (fuel: string) => {
      const mapping: Record<string, string> = {
        'gasoline': 'بنزين',
        'diesel': 'ديزل',
        'electric': 'كهرباء',
        'hybrid': 'هجين',
        'Gasoline': 'بنزين',
        'Diesel': 'ديزل',
      };
      return mapping[fuel] || (fuel ? mapping[fuel.toLowerCase()] : '') || fuel || 'غير محدد';
    };

    const translateTransmission = (transmission: any) => {
      if (transmission === 2 || transmission === '2' || transmission === 'Automatic' || transmission === 'أوتوماتيك') {
        return 'أوتوماتيك';
      }
      return 'يدوي';
    };

    return {
      vin: car.vin,
      car: {
        name: car.name_car,
        nameAr: car.name_car, // Backend doesn't have Arabic name yet, using name_car
        make: car.make,
        year: car.year,
        trim: report?.summary || '',
        color: car.color || 'غير محدد',
        mileage: car.mileage ? `${car.mileage.toLocaleString()} كم` : '0 كم',
        fuelType: translateFuel(car.fuel_type),
        transmission: translateTransmission(car.gear_type),
        drivetrain: car.drive_type || 'دفع ثنائي',
        bodyType: car.body_type || 'سيدان',
        seats: car.seating_capacity || 5,
      },
      engine: {
        num_cylinders: car.num_cylinders || car.engine?.num_cylinders || 'غير متوفر',
        engine_capacity: car.engine_capacity || car.engine?.engine_capacity || 'غير متوفر',
      },
      chassis: {
        customsNum: car.customs_num || car.chassis?.customsNum || 'غير متوفر',
        customsDate: car.customs_date
          ? new Date(car.customs_date).toLocaleDateString('ar-SA')
          : car.chassis?.customsDate || 'غير متوفر',
        receiptNum: car.receipt_number || car.chassis?.receiptNum || 'غير متوفر',
        receiptDate: car.receipt_date
          ? new Date(car.receipt_date).toLocaleDateString('ar-SA')
          : car.chassis?.receiptDate || 'غير متوفر',
      },
      images: (images && images.length > 0)
        ? images.map((img: any) => ({
          src: img.image_url && (img.image_url.startsWith('http') || img.image_url.startsWith('data:'))
            ? img.image_url
            : `${BACKEND_URL}${img.image_url}`,
          label: "صورة السيارة"
        }))
        : [{ src: '/placeholder-car.png', label: 'لا توجد صورة' }],
      accidents: (accident_images && accident_images.length > 0)
        ? accident_images.map((img: any) => {
          const aiData = img.ai_analysis_data || {};
          return {
            image: img.image_url && (img.image_url.startsWith('http') || img.image_url.startsWith('data:'))
              ? img.image_url
              : `${BACKEND_URL}${img.image_url}`,
            type: img.ai_description || aiData.accident_type || 'معلومات الحادث',
            description: aiData.damage_description || img.ai_description || '',
            damagedParts: aiData.damaged_parts || [],
            date: img.created_at ? img.created_at.split('T')[0] : 'غير محدد',
            severity: aiData.severity_label || (img.ai_accident_type === 'major' ? 'جسيم' : img.ai_accident_type === 'minor' ? 'بسيط' : 'متوسط')
          };
        }).sort((a: any, b: any) => {
          if (a.date === 'غير محدد') return 1;
          if (b.date === 'غير محدد') return -1;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        })
        : [],
      evaluations: evaluations && Array.isArray(evaluations)
        ? [...evaluations].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        : [],

      serviceHistory: (repair_shops && repair_shops.length > 0)
        ? repair_shops.filter((s: any) => s.mech_insp_desc).map((shop: any) => ({
          type: shop.mech_insp_desc,
          date: shop.created_at ? shop.created_at.split('T')[0] : 'غير محدد'
        })).sort((a: any, b: any) => {
          if (a.date === 'غير محدد') return 1;
          if (b.date === 'غير محدد') return -1;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        })
        : [],
      diagnostics: (repair_shops && repair_shops.length > 0)
        ? repair_shops.filter((s: any) => s.comp_scan_desc).map((shop: any) => {
          const status = (shop.comp_scan_desc.includes('تالف') || shop.comp_scan_desc.includes('استبدال') || shop.comp_scan_desc.includes('خلل'))
            ? 'replace'
            : (shop.comp_scan_desc.includes('تحذير') || shop.comp_scan_desc.includes('مراقبة') || shop.comp_scan_desc.includes('ضعيف'))
              ? 'warning'
              : 'ok';
          return {
            part: 'فحص كمبيوتر',
            status,
            note: shop.comp_scan_desc
          };
        }).sort((a: any, b: any) => {
          const priority: Record<string, number> = { 'replace': 0, 'warning': 1, 'ok': 2 };
          return priority[a.status] - priority[b.status];
        })
        : [],
      report: {
        detailed_report: report?.detailed_report || '',
        risk_assessment: risk_assessment_data || report?.risk_assessment_data || null,
        overall_ai_score: report?.overall_ai_score || 0,
        accident_severity_score: report?.accident_severity_score || 0,
      },
      rating: report?.overall_ai_score || 0,
    };
  };

  /**
   * @function openLogin
   * @description يفتح نافذة تسجيل الدخول ويغلق نافذة تسجيل المستخدمين
   * يضمن فتح نافذة واحدة فقط في كل مرة
   */
  const openLogin = () => { setSignupModalOpen(false); setLoginModalOpen(true); };

  /**
   * @function openSignup
   * @description يفتح نافذة تسجيل المستخدمين ويغلق نافذة تسجيل الدخول
   * يضمن فتح نافذة واحدة فقط في كل مرة
   */
  const openSignup = () => { setLoginModalOpen(false); setSignupModalOpen(true); };

  // مرجع لبيانات التقرير للوصول الأسهل
  const d = dynamicReportData || {
    vin: '',
    car: { name: '', nameAr: '', year: 0, trim: '', color: '', mileage: '', fuelType: '', transmission: '', drivetrain: '', bodyType: '', seats: 0 },
    engine: { num_cylinders: '', engine_capacity: '' },
    chassis: { customsNum: '', customsDate: '', receiptNum: '', receiptDate: '' },
    images: [],
    accidents: [],
    serviceHistory: [],
    diagnostics: [],
    report: { detailed_report: '', risk_assessment: null, overall_ai_score: 0, accident_severity_score: 0 },
    rating: 0
  };

  /**
   * @function handleFeedbackSubmit
   * @description يعالج إرسال تغذية المستخدم مع التقييم والتعليق للسيرفر
   * يتحقق من الإدخال ويقوم بالاتصال بالـ API مع معالجة حالات الخطأ والنجاح
   */
  const handleFeedbackSubmit = async () => {
    if (!isAuthenticated) {
      toast.error('عذراً، يجب تسجيل الدخول أولاً لتتمكن من إضافة تقييمك للمركبة.');
      setLoginModalOpen(true);
      return;
    }

    const userExistingReview = user && d.evaluations ? d.evaluations.find((ev: any) => ev.user?.id === user.id || ev.user_id === user.id) : null;
    if (userExistingReview && !editingId) {
      toast.error('لقد قمت بإضافة تقييم مسبقاً لهذه السيارة. يرجى تعديل تقييمك الحالي.');
      handleEditEvaluation(userExistingReview);
      return;
    }

    if (userRating === 0) {
      toast.error('يرجى تحديد عدد النجوم لتقييم حال المركبة قبل إرسال النموذج.');
      return;
    }

    setIsSubmitting(true);
    try {
      // إرسال التقييم إلى الباك اند
      const response = await carService.submitEvaluation({
        vin: vin,
        rate: userRating,
        comment: userComment,
        pros: userPros,
        cons: userCons,
        would_recommend: userRecommend
      });

      if (response.success) {
        const savedEval = response.data;

        // تحديث الحالة المحلية فوراً بدون إعادة تحميل الصفحة
        setDynamicReportData((prev: any) => {
          if (!prev) return prev;
          const newEval = {
            id: savedEval?.evaluation_id || savedEval?.id || Date.now(),
            user: user?.full_name || user?.username || 'أنت',
            user_id: user?.id,
            rating: userRating,
            comment: userComment,
            pros: userPros,
            cons: userCons,
            would_recommend: userRecommend,
            created_at: new Date().toISOString()
          };

          let updatedEvals;
          if (editingId) {
            // تحديث التقييم الموجود
            updatedEvals = (prev.evaluations || []).map((ev: any) =>
              (ev.id === editingId || ev.evaluation_id === editingId) ? { ...ev, ...newEval, id: ev.id } : ev
            );
          } else {
            // إضافة تقييم جديد في الأعلى
            updatedEvals = [newEval, ...(prev.evaluations || [])];
          }

          return { ...prev, evaluations: updatedEvals };
        });

        toast.success(editingId ? 'تم تحديث تقييمك بنجاح.' : 'شكراً لمشاركتنا رأيك! تم استلام تقييمك بنجاح.');
        // تفريغ المدخلات بعد النجاح
        setUserRating(0);
        setUserComment('');
        setUserPros('');
        setUserCons('');
        setUserRecommend(true);
        setEditingId(null);
      } else {
        toast.error(response.message || 'نعتذر، لم نتمكن من حفظ تقييمك حالياً. يرجى المحاولة مرة أخرى لاحقاً.');
      }
    } catch (err: any) {
      console.error('Error submitting evaluation:', err);
      // عرض رسالة خطأ مفصلة من السيرفر إذا وجدت
      const errorMsg = err.response?.data?.message || 'تعذر الاتصال بالخادم لإرسال التقييم. يرجى التحقق من اتصالك والمحاولة مجدداً.';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * @function handleEditEvaluation
   * @description يملأ نموذج التقييم ببيانات التقييم الحالي للتعديل
   * @param {any} review - بيانات التقييم المراد تعديله
   */
  const handleEditEvaluation = (review: any) => {
    setUserRating(review.rating);
    setUserComment(review.comment || '');
    setUserPros(review.pros || '');
    setUserCons(review.cons || '');
    setUserRecommend(review.would_recommend);
    setEditingId(review.id || review.evaluation_id);

    // التمرير إلى نموذج التقييم
    feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    toast.info('يمكنك الآن تعديل تقييمك من النموذج أدناه.');
  };



  /**
   * @function handleDeleteEvaluation
   * @description يفتح نافذة التأكيد المخصصة لحذف التقييم
   * @param {number} evaluationId - معرف التقييم المراد حذفه
   */
  const handleDeleteEvaluation = (evaluationId: number) => {
    setDeleteTargetId(evaluationId);
    setDeleteModalOpen(true);
  };

  /**
   * @function confirmDeleteEvaluation
   * @description ينفذ الحذف الفعلي بعد تأكيد المستخدم من النافذة المخصصة
   */
  const confirmDeleteEvaluation = async () => {
    if (!deleteTargetId) return;

    setIsDeleting(true);
    try {
      const response = await carService.deleteEvaluation(deleteTargetId);
      if (response.success) {
        // تحديث الحالة المحلية فوراً بدون إعادة تحميل
        setDynamicReportData((prev: any) => {
          if (!prev) return prev;
          const updatedEvals = (prev.evaluations || []).filter(
            (ev: any) => ev.id !== deleteTargetId && ev.evaluation_id !== deleteTargetId
          );
          return { ...prev, evaluations: updatedEvals };
        });
        toast.success('تم حذف التقييم بنجاح.');
      } else {
        toast.error(response.message || 'فشل في حذف التقييم.');
      }
    } catch (err: any) {
      console.error('Error deleting evaluation:', err);
      toast.error('حدث خطأ أثناء محاولة حذف التقييم.');
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setDeleteTargetId(null);
    }
  };

  /**
   * @function handleSaveReport
   * @description يفتح نافذة الطباعة مع الانتظار لتحميل جميع الصور أولاً
   * يدعم الطباعة المباشرة والحفظ كـ PDF عبر خيارات المتصفح
   */
  const handleSaveReport = async () => {
    try {
      toast.loading('جاري تجهيز التقرير للطباعة... يرجى الانتظار قليلاً لضمان جودة الصور.');

      const images = document.querySelectorAll('img');
      const imagePromises = Array.from(images).map(img => {
        const htmlImg = img as HTMLImageElement;
        return new Promise<void>((resolve) => {
          if (htmlImg.complete && htmlImg.naturalWidth > 0) {
            resolve();
          } else {
            htmlImg.onload = () => setTimeout(resolve, 100);
            htmlImg.onerror = () => resolve();
            if (!htmlImg.complete) {
              const src = htmlImg.src;
              htmlImg.src = '';
              htmlImg.src = src;
            }
            setTimeout(() => resolve(), 3000);
          }
        });
      });

      await Promise.race([
        Promise.all(imagePromises),
        new Promise(resolve => setTimeout(resolve, 8000))
      ]);

      document.body.classList.add('printing-report');
      await new Promise(resolve => setTimeout(resolve, 500));

      window.print();

      toast.dismiss();
      toast.success('تم فتح نافذة الطباعة. للحصول على أفضل نتيجة، اختر "حفظ كملف PDF" وقم بتفعيل خيار "رسومات الخلفية".');

      setTimeout(() => {
        document.body.classList.remove('printing-report');
      }, 1000);

    } catch (error) {
      document.body.classList.remove('printing-report');
      console.error('Error opening print dialog:', error);
      toast.dismiss();
      toast.error('نعتذر، فشل فتح نافذة الطباعة. يرجى التأكد من إعدادات المتصفح والمحاولة مرة أخرى.');
    }
  };

  /**
   * @function handleShareReport
   * @description يعالج مشاركة التقرير عبر API المشاركة الأصلي أو الحافظة
   * ينشئ نص التقرير المنسق ويستخدم طرق المشاركة المتاحة
   */
  const handleShareReport = () => {
    const shareUrl = window.location.href;
    const reportText = `تقرير فحص ${d.car.nameAr} ${d.car.year}\nVIN: ${d.vin}\nالحالة: ${d.rating}/10\n\nشاهد التقرير الكامل هنا:\n${shareUrl}`;

    if (navigator.share) {
      navigator.share({
        title: 'تقرير فحص السيارة',
        text: `تقرير فحص ${d.car.nameAr} - الحالة: ${d.rating}/10`,
        url: shareUrl,
      }).catch(() => {
        navigator.clipboard.writeText(reportText);
        toast.success('تم نسخ رابط التقرير الكامل إلى الحافظة. يمكنك الآن مشاركته بسهولة.');
      });
    } else {
      navigator.clipboard.writeText(reportText);
      toast.success('تم نسخ رابط التقرير الكامل إلى الحافظة. يمكنك الآن مشاركته بسهولة.');
    }
  };

  /**
   * @constant stagger
   * @description متغير الرسوم المتحركة للرسوم المتحركة المتعاقبة للأبناء
   * يوفر رسومًا متحركة متسلسلة سلسة لعناصر القائمة
   */
  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } },
  };

  /**
   * @constant fadeUp
   * @description متغير الرسوم المتحركة لتأثير التلاشي للأعلى
   * يوفر رسومًا متحركة للدخول سلسة لعناصر المحتوى
   */
  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
  };

  const userExistingReview = user && d.evaluations ? d.evaluations.find((ev: any) => ev.user?.id === user.id || ev.user_id === user.id) : null;
  const hasSubmittedReview = userExistingReview && !editingId;

  return (
    <div className="bg-[#f1f5f9]" ref={topRef}>
      <Login isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} onSwitchToSignUp={openSignup} />
      <SignUp isOpen={signupModalOpen} onClose={() => setSignupModalOpen(false)} onSwitchToLogin={openLogin} />

      {/* ===== Custom Delete Confirmation Modal ===== */}
      <AnimatePresence>
        {deleteModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            onClick={() => !isDeleting && setDeleteModalOpen(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
              className="relative bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] max-w-sm w-full p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Trash Icon */}
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                <Trash2 size={28} className="text-red-500" />
              </div>

              <h3 className="text-lg font-bold text-[#0f172a] mb-2">حذف التقييم</h3>
              <p className="text-sm text-[#64748b] mb-6 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف هذا التقييم؟
                <br />
                <span className="text-red-500 font-medium text-xs">لا يمكن التراجع عن هذا الإجراء.</span>
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => { setDeleteModalOpen(false); setDeleteTargetId(null); }}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 rounded-xl border border-[#e2e8f0] text-sm font-bold text-[#475569] bg-white hover:bg-[#f8fafc] transition-colors disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmDeleteEvaluation}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                      جارٍ الحذف...
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      حذف نهائي
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && <LuxuryLoadingScreen />}

      {error && !isLoading && (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#f1f5f9]">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-[#e2e8f0] max-w-md w-full text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-[#0f172a] mb-3">عذراً، حدث خطأ ما</h2>
            <p className="text-[#64748b] mb-8">{error}</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.location.href = '/'}
              className="w-full bg-[#002f6c] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#002f6c]/20 hover:bg-[#001a3d] transition-colors"
            >
              العودة للرئيسية
            </motion.button>
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <>
          {/* ===== HERO ===== */}
          <section className="relative bg-gradient-to-br from-[#001a3d] via-[#002f6c] to-[#003d85] py-10 md:py-14 overflow-hidden">
            {/* Subtle decorative pattern */}
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

            <div className="container mx-auto px-4 relative z-10">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-5">
                  <FileCheck size={14} className="text-[#60a5fa]" />
                  <span className="text-xs font-semibold text-white/90">تقرير فحص معتمد</span>
                </div>

                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 leading-tight">
                  {d.car.nameAr}
                  <pre></pre>
                  <span className="text-[#60a5fa]">{d.car.year}</span>
                  <pre></pre>
                  <p className="text-white/100 text-base md:text-lg mb-1"> {d.car.make}</p>
                </h1>
                <p className="text-white/70 text-base md:text-lg mb-1">{d.car.color}</p>

                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-5 py-2.5 mt-4">
                  <Hash size={14} className="text-[#60a5fa]" />
                  <span className="font-mono text-sm md:text-base text-white tracking-widest">{vin || d.vin}</span>
                </div>
              </motion.div>
            </div>
          </section>

          {/* ===== CONTENT ===== */}
          <main className="container mx-auto px-4 -mt-6 relative z-20 pb-12">
            <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-5 max-w-5xl mx-auto">

              {/* -- Image Gallery -- */}
              <motion.section variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-5">
                <SectionHeading icon={<Car size={18} />} title="معرض الصور" />
                <div className="flex flex-col md:grid md:grid-cols-[1fr_120px] lg:grid-cols-[1fr_150px] gap-4 md:h-[450px] lg:h-[550px]">
                  {/* Main Image */}
                  <button
                    onClick={() => setLightboxOpen(true)}
                    className="relative rounded-xl overflow-hidden aspect-[16/10] md:aspect-auto md:h-full w-full bg-[#f1f5f9] group"
                  >
                    <img
                      src={d.images[selectedImage]?.src || d.images[0]?.src || '/placeholder-car.png'}
                      alt={d.images[selectedImage]?.label || 'Car image'}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      اضغط للتكبير
                    </span>
                  </button>


                  {/* Thumbnails */}
                  <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto md:h-full pr-2 custom-scrollbar">
                    {d.images.map((img: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(i)}
                        className={`relative flex-shrink-0 w-20 h-16 md:w-24 md:h-[72px] rounded-lg overflow-hidden border-2 transition-all ${selectedImage === i ? 'border-[#002f6c] shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
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
                <div className="flex items-center justify-between mb-5">
                  <SectionHeading icon={<Info size={18} />} title="المعلومات الأساسية" />


                </div>


                {/* Car Specs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
                  <InfoChip icon={<Calendar size={16} />} label="سنة الصنع" value={String(d.car.year)} />
                  <InfoChip icon={<Gauge size={16} />} label="المسافة المقطوعة" value={d.car.mileage} />
                  <InfoChip icon={<Fuel size={16} />} label="نوع الوقود" value={d.car.fuelType} />
                  <InfoChip icon={<Cog size={16} />} label="ناقل الحركة" value={d.car.transmission} />
                  <InfoChip icon={<Car size={16} />} label="نوع الهيكل" value={d.car.bodyType} />
                  <InfoChip icon={<Layers size={16} />} label="نظام الدفع" value={d.car.drivetrain} />
                  <InfoChip icon={<Paintbrush size={16} />} label="اللون" value={d.car.color} />
                  <InfoChip icon={<Hash size={16} />} label="عدد المقاعد" value={`${d.car.seats} مقاعد`} />
                </div>

                {/* Engine & Chassis Sub-sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Engine */}
                  <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap size={16} className="text-[#002f6c]" />
                      <h3 className="text-sm font-bold text-[#1e293b]">المحرك</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-sm">
                      <div>
                        <p className="text-[11px] text-[#94a3b8]">عدد الاسطوانات</p>
                        <p className="font-semibold text-[#1e293b]">{d.engine.num_cylinders}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#94a3b8]">سعة المحرك</p>
                        <p className="font-semibold text-[#1e293b]">{d.engine.engine_capacity}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#94a3b8]">نوع الوقود</p>
                        <p className="font-semibold text-[#1e293b]">{d.car.transmission}</p>
                      </div>
                    </div>
                  </div>

                  {/* Chassis */}
                  <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity size={16} className="text-[#002f6c]" />
                      <h3 className="text-sm font-bold text-[#1e293b]">بيان الجمرك</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-sm">
                      <div>
                        <p className="text-[11px] text-[#94a3b8]">رقم البيان</p>
                        <p className="font-semibold text-[#1e293b]">{d.chassis.customsNum}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#94a3b8]">رقم الايصال</p>
                        <p className="font-semibold text-[#1e293b]">{d.chassis.receiptNum}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#94a3b8]">تاريخ البيان</p>
                        <p className="font-semibold text-[#1e293b]">{d.chassis.customsDate}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#94a3b8]">تاريخ الايصال</p>
                        <p className="font-semibold text-[#1e293b]">{d.chassis.receiptDate}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>


              {/* -- Accident History -- */}
              <motion.section variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-5">
                <SectionHeading icon={<AlertTriangle size={18} />} title="سجل الحوادث" />
                {d.accidents.length === 0 ? (
                  <div className="flex items-center gap-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4">
                    <CheckCircle size={20} className="text-[#10b981]" />
                    <span className="text-sm font-medium text-[#166534]">لا توجد حوادث مسجلة</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {d.accidents.map((acc, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ y: -3 }}
                        className="border border-[#e2e8f0] rounded-xl overflow-hidden bg-[#f8fafc] group cursor-pointer transition-all"
                      >
                        <div className="relative h-40 bg-[#e2e8f0] overflow-hidden">
                          <img src={acc.image} alt={acc.type} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => { setSelectedAccidentImage(i); setAccidentLightboxOpen(true); }}
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                              <Eye size={24} className="text-[#002f6c]" />
                            </div>
                          </motion.button>
                          <span
                            className={`absolute top-3 left-3 text-[11px] font-bold px-3 py-1.5 rounded-full backdrop-blur-sm ${acc.severity === 'خفيف' ? 'bg-[#fef9c3]/90 text-[#854d0e]' : 'bg-[#dbeafe]/90 text-[#1e40af]'
                              }`}
                          >
                            {acc.severity}
                          </span>
                        </div>
                        <div className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-sm font-bold text-[#1e293b]">{acc.type}</p>
                            <span className="text-[10px] text-[#94a3b8] flex items-center gap-1">
                              <Calendar size={10} />
                              {acc.date}
                            </span>
                          </div>

                          {acc.description && (
                            <p className="text-xs text-[#64748b] leading-relaxed mb-3 text-justify">
                              {acc.description}
                            </p>
                          )}

                          {acc.damagedParts && acc.damagedParts.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {acc.damagedParts.map((part: string, idx: number) => (
                                <span key={idx} className="text-[10px] bg-[#f1f5f9] text-[#475569] px-2 py-0.5 rounded-md border border-[#e2e8f0]">
                                  {part}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.section>

              {/* -- Service History -- */}
              <motion.section variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-6">
                <SectionHeading icon={<Wrench size={18} />} title="سجل الصيانة والخدمات" />

                {d.serviceHistory.length === 0 ? (
                  <div className="flex items-center gap-3 bg-white border border-dashed border-[#e2e8f0] rounded-xl p-8 justify-center">
                    <p className="text-sm text-[#94a3b8]">لا توجد سجلات صيانة مسجلة لهذه المركبة</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#f1f5f9]">
                    {d.serviceHistory.map((s, i) => (
                      <div key={i} className="py-5 first:pt-0 last:pb-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="mt-1.5 w-2 h-2 rounded-full bg-[#1e293b] flex-shrink-0" />
                            <div>
                              <h4 className="text-base font-bold text-[#0f172a] mb-1">{s.type}</h4>
                              <div className="flex items-center gap-3 text-xs text-[#64748b]">
                                <div className="flex items-center gap-1">
                                  <Calendar size={14} />
                                  <span>{s.date}</span>
                                </div>
                                <span className="w-1 h-1 rounded-full bg-[#cbd5e1]" />
                                <span className="font-medium">مركز خدمة معتمد</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 self-start sm:self-center px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-[11px] font-bold text-[#1e293b] bg-[#f8fafc]">
                            <CheckCircle size={14} />
                            مكتملة
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.section>

              {/* -- Diagnostics -- */}
              <motion.section variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-6">
                <SectionHeading icon={<Cpu size={18} />} title="نتائج فحص الكمبيوتر" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {d.diagnostics.map((item, i) => {
                    const isReplace = item.status === 'replace';
                    const isWarning = item.status === 'warning';

                    const statusStyles = isReplace
                      ? "border-[#1e293b] bg-white text-[#1e293b]"
                      : isWarning
                        ? "border-[#64748b] bg-white text-[#64748b]"
                        : "border-[#e2e8f0] bg-white text-[#1e293b]";

                    return (
                      <motion.div
                        key={i}
                        whileHover={{ y: -3 }}
                        className={`flex flex-col gap-4 rounded-2xl border p-5 transition-all hover:shadow-md hover:border-[#1e293b] ${statusStyles}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${isReplace ? 'bg-[#1e293b] text-white' : isWarning ? 'bg-[#64748b] text-white' : 'bg-[#f1f5f9] text-[#1e293b]'}`}>
                            {isReplace ? <XCircle size={20} /> : isWarning ? <CircleAlert size={20} /> : <CheckCircle size={20} />}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#0f172a] mb-2">{item.part}</p>
                          <p className="text-xs text-[#64748b] leading-relaxed line-clamp-2 hover:line-clamp-none transition-all">
                            {item.note}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.section>

              {/* -- AI Assessment Summary & Rating -- */}
              <motion.section variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden">
                <div className="bg-[#002f6c] p-6 text-white">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                      <Shield size={22} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">تقييم الذكاء الاصطناعي الشامل</h2>
                      <p className="text-white/70 text-xs">تحليل دقيق بناءً على البيانات التقنية وتاريخ المركبة</p>
                    </div>
                  </div>

                  {d.report.summary && (
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10 mb-2">
                      <div className="flex items-start gap-3">
                        <Quote size={20} className="text-[#60a5fa] mt-1 flex-shrink-0" />
                        <p className="text-sm md:text-base leading-relaxed text-white/90 font-medium">
                          {d.report.summary}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="flex flex-col lg:flex-row gap-10 items-center lg:items-start">
                    {/* Gauge Column */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-4">
                      <RatingGauge score={d.rating} />
                      <div className="text-center">
                        <p className="text-xs text-[#64748b] mb-1">حالة المخاطر</p>
                        <div className={`px-4 py-1.5 rounded-full text-xs font-bold ${d.rating >= 8 ? 'bg-green-50 text-green-600 border border-green-100' :
                          d.rating >= 6 ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                            'bg-red-50 text-red-600 border border-red-100'
                          }`}>
                          {d.rating >= 8 ? 'مخاطر منخفضة' : d.rating >= 6 ? 'مخاطر متوسطة' : 'مخاطر عالية'}
                        </div>
                      </div>
                    </div>

                    {/* Bars Column */}
                    <div className="flex-1 w-full">
                      <h3 className="text-sm font-bold text-[#1e293b] mb-4 flex items-center gap-2">
                        <Activity size={16} className="text-[#002f6c]" />
                        تفاصيل الحالة التقنية
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(d.report.risk_assessment?.radar_chart || [
                          { subject: 'المحرك', value: 85 },
                          { subject: 'الهيكل', value: 70 },
                          { subject: 'الأمان', value: 90 },
                          { subject: 'الإلكترونيات', value: 85 },
                          { subject: 'الحالة التشغيلية', value: 80 },
                        ]).map((bar: any, i: number) => {
                          const hasData = bar.value !== null && bar.value !== undefined;
                          return (
                            <div key={i} className={`bg-[#f8fafc] rounded-xl p-4 border border-[#e2e8f0] transition-all hover:shadow-sm ${!hasData ? 'opacity-80 grayscale-[50%]' : ''}`}>
                              <div className="flex items-center justify-between mb-2.5">
                                <span className="text-xs font-bold text-[#1e293b]">{bar.subject}</span>
                                {hasData ? (
                                  <span className={`text-xs font-black ${bar.value >= 80 ? 'text-[#10b981]' :
                                    bar.value >= 50 ? 'text-[#f59e0b]' :
                                      'text-[#ef4444]'
                                    }`}>{bar.value}%</span>
                                ) : (
                                  <span className="text-[10px] font-bold text-[#94a3b8] bg-[#f1f5f9] px-2 py-0.5 rounded border border-[#e2e8f0]">N/A</span>
                                )}
                              </div>

                              {hasData ? (
                                <div className="h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
                                  <motion.div
                                    className="h-full rounded-full"
                                    style={{
                                      background:
                                        bar.value >= 80
                                          ? 'linear-gradient(90deg, #10b981, #34d399)'
                                          : bar.value >= 50
                                            ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                                            : 'linear-gradient(90deg, #ef4444, #f87171)',
                                    }}
                                    initial={{ width: 0 }}
                                    whileInView={{ width: `${bar.value}%` }}
                                    transition={{ duration: 1, ease: 'easeOut', delay: i * 0.1 }}
                                    viewport={{ once: true }}
                                  />
                                </div>
                              ) : (
                                <div className="mt-1">
                                  <div className="h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                                    <div className="h-full w-full bg-[#cbd5e1] opacity-50"></div>
                                  </div>
                                  <p className="text-[9px] text-[#64748b] mt-1.5 font-medium text-center">لا توجد بيانات لهذا التقييم</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>


                </div>
              </motion.section>

              {/* -- User Reviews List -- */}
              {d.evaluations && d.evaluations.length > 0 && (
                <motion.section variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-5">
                  <SectionHeading icon={<MessageSquare size={18} />} title="تقييمات وآراء المستخدمين" />
                  <div className="space-y-4 mt-4">
                    {d.evaluations.map((review: any, idx: number) => (
                      <motion.div
                        key={review.id || idx}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-4 rounded-xl border border-[#f1f5f9] bg-[#f8fafc]/30 hover:bg-[#f8fafc] transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#002f6c]/10 flex items-center justify-center text-[#002f6c]">
                              <User size={16} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-[#1e293b]">{review.user?.full_name || review.user?.username || (typeof review.user === 'string' ? review.user : 'مستخدم')}</h4>
                                {review.would_recommend && (
                                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#ecfdf5] text-[#059669] text-[9px] font-bold border border-[#d1fae5]">
                                    <ThumbsUp size={8} /> ينصح بها
                                  </span>
                                )}
                              </div>
                              <p className="text-[9px] text-[#94a3b8]">
                                {review.created_at ? new Date(review.created_at).toLocaleDateString('ar-SA') : 'تاريخ غير معروف'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {user && (review.user_id === user.id || review.user?.id === user.id) && (
                              <div className="flex items-center gap-1.5 ml-2 border-l border-[#f1f5f9] pl-3">
                                <button
                                  onClick={() => handleEditEvaluation(review)}
                                  className="p-1.5 text-[#64748b] hover:text-[#002f6c] hover:bg-white rounded-lg transition-all"
                                  title="تعديل التقييم"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteEvaluation(review.evaluation_id || review.id)}
                                  className="p-1.5 text-[#64748b] hover:text-red-500 hover:bg-white rounded-lg transition-all"
                                  title="حذف التقييم"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                            <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-[#e2e8f0] shadow-sm">
                              <Star size={10} className="text-yellow-500 fill-yellow-500" />
                              <span className="text-[11px] font-bold text-[#0f172a]">{review.rating}/5</span>
                            </div>
                          </div>
                        </div>

                        {review.comment && (
                          <div className="mb-3">
                            <p className="text-xs text-[#475569] leading-relaxed">
                              {review.comment}
                            </p>
                          </div>
                        )}

                        {(review.pros || review.cons) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {review.pros && (
                              <div className="flex items-start gap-2 bg-white/50 p-2 rounded-lg border border-[#f1f5f9]">
                                <CheckCircle size={10} className="mt-0.5 text-[#059669]" />
                                <div>
                                  <span className="block text-[10px] font-bold text-[#1e293b] mb-0.5">الإيجابيات</span>
                                  <p className="text-[10px] text-[#64748b] leading-tight">{review.pros}</p>
                                </div>
                              </div>
                            )}
                            {review.cons && (
                              <div className="flex items-start gap-2 bg-white/50 p-2 rounded-lg border border-[#f1f5f9]">
                                <XCircle size={10} className="mt-0.5 text-[#e11d48]" />
                                <div>
                                  <span className="block text-[10px] font-bold text-[#1e293b] mb-0.5">السلبيات</span>
                                  <p className="text-[10px] text-[#64748b] leading-tight">{review.cons}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}

              {/* -- User Feedback Form -- */}
              <motion.section variants={fadeUp} ref={feedbackRef} className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-4 overflow-hidden">
                <div className="flex items-center justify-between mb-4 border-b border-[#f1f5f9] pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#002f6c]/10 flex items-center justify-center text-[#002f6c]">
                      <ThumbsUp size={16} />
                    </div>
                    <h3 className="text-sm font-bold text-[#1e293b]">تقييمك للسيارة</h3>
                  </div>
                  <StarRating value={userRating} onChange={setUserRating} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-8 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#64748b] flex items-center gap-1 uppercase tracking-wider">
                          <CheckCircle size={12} className="text-[#059669]" /> الإيجابيات
                        </label>
                        <textarea
                          value={userPros}
                          onChange={(e) => setUserPros(e.target.value)}
                          placeholder="ما الذي أعجبك؟"
                          rows={2}
                          className="w-full rounded-xl border border-[#f1f5f9] bg-[#f8fafc]/50 px-3 py-2 text-xs text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:ring-1 focus:ring-[#002f6c] focus:bg-white transition-all resize-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#64748b] flex items-center gap-1 uppercase tracking-wider">
                          <XCircle size={12} className="text-[#e11d48]" /> السلبيات
                        </label>
                        <textarea
                          value={userCons}
                          onChange={(e) => setUserCons(e.target.value)}
                          placeholder="ما هي العيوب؟"
                          rows={2}
                          className="w-full rounded-xl border border-[#f1f5f9] bg-[#f8fafc]/50 px-3 py-2 text-xs text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:ring-1 focus:ring-[#002f6c] focus:bg-white transition-all resize-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">التعليق العام</label>
                      <textarea
                        value={userComment}
                        onChange={(e) => setUserComment(e.target.value)}
                        placeholder="رأيك النهائي حول السيارة..."
                        rows={2}
                        className="w-full rounded-xl border border-[#f1f5f9] bg-[#f8fafc]/50 px-3 py-2 text-xs text-[#1e293b] placeholder-[#94a3b8] focus:outline-none focus:ring-1 focus:ring-[#002f6c] focus:bg-white transition-all resize-none"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-4 flex flex-col justify-between gap-3">
                    <div className="bg-[#f8fafc] p-3 rounded-xl border border-[#f1f5f9]">
                      <span className="block text-[10px] font-bold text-[#64748b] mb-2 uppercase tracking-wider">هل تنصح بها؟</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setUserRecommend(true)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all ${userRecommend ? 'bg-[#059669] text-white shadow-sm' : 'bg-white text-[#64748b] border border-[#e2e8f0] hover:bg-gray-50'
                            }`}
                        >
                          <ThumbsUp size={12} /> نعم
                        </button>
                        <button
                          type="button"
                          onClick={() => setUserRecommend(false)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all ${!userRecommend ? 'bg-[#e11d48] text-white shadow-sm' : 'bg-white text-[#64748b] border border-[#e2e8f0] hover:bg-gray-50'
                            }`}
                        >
                          <AlertTriangle size={12} /> لا
                        </button>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleFeedbackSubmit}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 bg-[#002f6c] text-white py-3 rounded-xl text-xs font-bold hover:bg-[#001a3d] transition-all shadow-lg shadow-[#002f6c]/10 disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        hasSubmittedReview ? <Edit2 size={14} /> : <Send size={14} />
                      )}
                      {isSubmitting ? 'جاري الإرسال...' : hasSubmittedReview ? 'تعديل التقييم الحالي' : editingId ? 'تحديث التقييم' : 'نشر التقييم'}
                    </motion.button>
                  </div>
                </div>
              </motion.section>

              {/* -- Save & Share Report Actions -- */}
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row justify-center gap-4 pt-2 pb-4">
                <motion.button
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSaveReport}
                  className="flex items-center justify-center gap-3 bg-gradient-to-l from-[#001a3d] to-[#002f6c] text-white px-8 py-4 rounded-2xl text-base font-bold shadow-xl shadow-[#002f6c]/25 hover:shadow-2xl hover:shadow-[#002f6c]/30 transition-all"
                >
                  <Download size={20} />
                  حفظ التقرير
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleShareReport}
                  className="flex items-center justify-center gap-3 bg-gradient-to-r from-[#0066cc] to-[#004da6] text-white px-8 py-4 rounded-2xl text-base font-bold shadow-xl shadow-[#0066cc]/25 hover:shadow-2xl hover:shadow-[#0066cc]/30 transition-all"
                >
                  <Share2 size={20} />
                  مشاركة التقرير
                </motion.button>
              </motion.div>

            </motion.div>
          </main>
        </>
      )}

      {/* ===== LIGHTBOX FOR MAIN IMAGES ===== */}
      <AnimatePresence>
        {lightboxOpen && (
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
                src={d.images[selectedImage].src}
                alt={d.images[selectedImage].label}
                className="w-full rounded-2xl object-contain max-h-[80vh]"
              />
              <button
                onClick={() => setLightboxOpen(false)}
                className="absolute -top-3 -left-3 w-10 h-10 bg-white text-[#1e293b] rounded-full flex items-center justify-center shadow-lg hover:bg-[#f1f5f9] transition-colors"
                aria-label="Close lightbox"
              >
                <X size={20} />
              </button>
              {/* Navigation */}
              <button
                onClick={() => setSelectedImage((selectedImage + 1) % d.images.length)}
                className="absolute top-1/2 -translate-y-1/2 right-3 w-10 h-10 bg-white/20 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                aria-label="Next image"
              >
                <ChevronRight size={20} />
              </button>
              <button
                onClick={() => setSelectedImage((selectedImage - 1 + d.images.length) % d.images.length)}
                className="absolute top-1/2 -translate-y-1/2 left-3 w-10 h-10 bg-white/20 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft size={20} />
              </button>
              {/* Dots */}
              <div className="absolute bottom-4 inset-x-0 flex justify-center gap-2">
                {d.images.map((img: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${selectedImage === i ? 'bg-white scale-125' : 'bg-white/40'
                      }`}
                    aria-label={`Go to image ${i + 1}`}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== LIGHTBOX FOR ACCIDENT IMAGES ===== */}
      <AnimatePresence>
        {accidentLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setAccidentLightboxOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={d.accidents[selectedAccidentImage].image}
                alt={d.accidents[selectedAccidentImage].type}
                className="w-full rounded-2xl object-contain max-h-[80vh]"
              />
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white px-6 py-4 rounded-xl text-sm font-medium max-w-[90%] w-full sm:w-auto">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-bold">{d.accidents[selectedAccidentImage].type}</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{d.accidents[selectedAccidentImage].severity}</span>
                  </div>
                  {d.accidents[selectedAccidentImage].description && (
                    <p className="text-xs text-white/80 border-t border-white/10 pt-2">
                      {d.accidents[selectedAccidentImage].description}
                    </p>
                  )}
                  {d.accidents[selectedAccidentImage].damagedParts && d.accidents[selectedAccidentImage].damagedParts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {d.accidents[selectedAccidentImage].damagedParts.map((part: string, idx: number) => (
                        <span key={idx} className="text-[10px] bg-white/10 px-2 py-0.5 rounded">
                          {part}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setAccidentLightboxOpen(false)}
                className="absolute -top-3 -left-3 w-10 h-10 bg-white text-[#1e293b] rounded-full flex items-center justify-center shadow-lg hover:bg-[#f1f5f9] transition-colors"
                aria-label="Close lightbox"
              >
                <X size={20} />
              </button>
              {/* Navigation */}
              <button
                onClick={() => setSelectedAccidentImage((selectedAccidentImage + 1) % d.accidents.length)}
                className="absolute top-1/2 -translate-y-1/2 right-3 w-10 h-10 bg-white/20 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                aria-label="Next image"
              >
                <ChevronRight size={20} />
              </button>
              <button
                onClick={() => setSelectedAccidentImage((selectedAccidentImage - 1 + d.accidents.length) % d.accidents.length)}
                className="absolute top-1/2 -translate-y-1/2 left-3 w-10 h-10 bg-white/20 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft size={20} />
              </button>
              {/* Dots */}
              <div className="absolute bottom-20 inset-x-0 flex justify-center gap-2">
                {d.accidents.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedAccidentImage(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${selectedAccidentImage === i ? 'bg-white scale-125' : 'bg-white/40'
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
