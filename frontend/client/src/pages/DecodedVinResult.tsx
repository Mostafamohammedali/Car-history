import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import {
  BadgeInfo,
  Hash,
  ShieldAlert,
  Globe,
  Factory,
  Car,
  Cpu,
  Zap,
  Cog,
  Shield,
  Activity,
  Calendar,
  FileCheck,
  ChevronLeft,
} from 'lucide-react';
import Login from './Login';
import SignUp from './SignUp';
import { carService } from '@/services/carService';
import { Loader2 } from 'lucide-react';

interface DecodedVinResultProps {
  loginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  signupModalOpen: boolean;
  setSignupModalOpen: (open: boolean) => void;
}

interface DecodedData {
  vin: string;
  make: string;
  model: string;
  year: string;
  country: string;
  bodyType: string;
  fuelType: string;
  transmission: string;
  plant: string;
  confidence: string;
  processingTime: string;
  decodedMessage: string;
  note: string;
  decodeMethod?: string;
  metadata?: any;
  nhtsaData?: any;
  rawData?: any;
  decodeInfo: any;
}

/**
 * @function SectionHeading
 * @description مكون رأس القسم مع أيقونة وعنوان (مستوحى من CheckVinReport)
 */
function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-[#002f6c] flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-[#002f6c]/20">
        {icon}
      </div>
      <h2 className="text-xl font-bold text-[#0f172a]">{title}</h2>
    </div>
  );
}

/**
 * @function InfoChip
 * @description مكون شريط المعلومات (مستوحى من CheckVinReport)
 */
function InfoChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl px-4 py-3.5 hover:border-[#002f6c]/30 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-[#002f6c]/5 flex items-center justify-center text-[#002f6c] flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-[#94a3b8] font-bold uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm font-bold text-[#1e293b] truncate">{value}</p>
      </div>
    </div>
  );
}

function formatValue(value: any): string {
  if (value === null || value === undefined || value === '') {
    return 'غير متوفر';
  }

  if (typeof value === 'boolean') {
    return value ? 'نعم' : 'لا';
  }

  if (Array.isArray(value)) {
    return value.length ? value.join('، ') : 'غير متوفر';
  }

  return String(value);
}

function translateBodyType(value: string): string {
  const map: Record<string, string> = {
    Sedan: 'سيدان',
    SUV: 'دفع رباعي / SUV',
    Coupe: 'كوبيه',
    Hatchback: 'هاتشباك',
    Pickup: 'شاحنة / بيك أب',
    Wagon: 'واجن',
  };

  return map[value] || value || 'غير متوفر';
}

function translateFuelType(value: string): string {
  const map: Record<string, string> = {
    Gasoline: 'بنزين',
    Gas: 'بنزين',
    Diesel: 'ديزل',
    Hybrid: 'هجين',
    Electric: 'كهربائي',
    PHEV: 'هجين قابل للشحن (PHEV)',
  };

  return map[value] || value || 'غير متوفر';
}

function translateTransmission(value: string): string {
  const map: Record<string, string> = {
    Manual: 'يدوي',
    MT: 'يدوي',
    Automatic: 'أوتوماتيك',
    AT: 'أوتوماتيك',
    CVT: 'ناقل حركة مستمر (CVT)',
    DCT: 'ناقل حركة مزدوج القابض (DCT)',
  };

  return map[value] || value || 'غير متوفر';
}

function translateDriveType(value: string): string {
  const map: Record<string, string> = {
    FWD: 'دفع أمامي FWD',
    RWD: 'دفع خلفي RWD',
    AWD: 'دفع رباعي مستمر AWD',
    '4WD': 'دفع رباعي 4WD',
  };

  return map[value] || value || 'غير متوفر';
}

function deriveVehicleType(bodyType: string): string {
  if (!bodyType || bodyType === 'Unknown') return 'غير متوفر';
  const lowerType = bodyType.toLowerCase();
  if (lowerType.includes('pickup')) return 'شاحنة / بيك أب';
  if (lowerType.includes('suv')) return 'سيارة ركاب متعددة الاستخدام (SUV)';
  if (lowerType.includes('sedan')) return 'سيارة ركاب (سيدان)';
  if (lowerType.includes('coupe')) return 'سيارة ركاب (كوبيه)';
  return bodyType;
}

function buildEngineDescription(decodeInfo: any): string {
  const engine = decodeInfo?.engine_performance || decodeInfo?.technical_specs?.engine || decodeInfo?.vehicle_info?.engine_info || {};
  const parts = [
    engine.displacement_l && engine.displacement_l !== 'Unknown' ? engine.displacement_l : engine.displacement_liters && engine.displacement_liters !== 'Unknown' ? engine.displacement_liters : null,
    engine.engine_model && engine.engine_model !== 'Unknown' ? `(${engine.engine_model})` : null,
    engine.cylinders && engine.cylinders !== 'Unknown' ? `${engine.cylinders} سلندر` : null,
    engine.valve_count && engine.valve_count !== 'Unknown' ? `${engine.valve_count} صمام` : null,
    translateFuelType(engine.fuel_type_primary || engine.fuel_type),
  ].filter(Boolean);

  return parts.length ? parts.join(' ') : 'غير متوفر';
}

function buildTransmissionDescription(decodeInfo: any): string {
  const transmission = decodeInfo?.technical_specs?.transmission || decodeInfo?.vehicle_info?.transmission_info || {};
  const parts = [
    translateTransmission(transmission.type),
    transmission.speed_count && transmission.speed_count !== 'Unknown' ? transmission.speed_count : null,
    transmission.gear_count && transmission.gear_count !== 'Unknown' ? `${transmission.gear_count} سرعات` : null,
    transmission.control && transmission.control !== 'Unknown' ? transmission.control : null,
  ].filter(Boolean);

  return parts.length ? parts.join(' - ') : 'غير متوفر';
}

function buildBodyDescription(decodeInfo: any): string {
  const body = decodeInfo?.body_manufacturing || decodeInfo?.technical_specs?.chassis || decodeInfo?.vehicle_info?.body_info || {};
  const rawType = body.body_class || body.type || null;
  const translatedType = rawType && rawType !== 'Unknown' ? translateBodyType(rawType) : null;
  const style = body.style && body.style !== 'Unknown' ? body.style : null;
  const doors = body.number_of_doors && body.number_of_doors !== 'Unknown' ? `${body.number_of_doors} أبواب` : body.doors && body.doors !== 'Unknown' ? `${body.doors} أبواب` : null;
  const wheelbase = body.wheelbase && body.wheelbase !== 'Unknown' ? `قاعدة عجلات: ${body.wheelbase}` : null;
  const gvwr = body.gvwr_class && body.gvwr_class !== 'Unknown' ? `فئة الوزن: ${body.gvwr_class}` : null;
  const series = body.series && body.series !== 'Unknown' ? `السلسلة: ${body.series}` : null;

  const parts = [translatedType, style, doors, series, wheelbase, gvwr].filter(Boolean);

  return parts.length ? parts.join(' - ') : 'غير متوفر';
}

function buildSafetyDescription(decodeInfo: any): string {
  const safety = decodeInfo?.safety_tech || decodeInfo?.safety_and_manufacturing?.safety || decodeInfo?.vehicle_info?.safety_system || {};
  const airBagLocations = Array.isArray(safety.air_bag_locations) ? safety.air_bag_locations.map((item: any) => item.value || item.location).filter(Boolean) : [];
  const parts = [
    safety.brake_system_type && safety.brake_system_type !== 'Unknown' ? `الفرامل: ${safety.brake_system_type}` : null,
    safety.bus_floor_config_type && safety.bus_floor_config_type !== 'Unknown' ? `هيكل الحافلة: ${safety.bus_floor_config_type}` : null,
    safety.abs && safety.abs !== 'Unknown' ? `ABS: ${safety.abs}` : null,
    airBagLocations.length ? `وسائد هوائية: ${airBagLocations.join('، ')}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join(' | ') : 'غير متوفر';
}

export default function DecodedVinResult({
  loginModalOpen,
  setLoginModalOpen,
  signupModalOpen,
  setSignupModalOpen,
}: DecodedVinResultProps) {
  const [location, setLocation] = useLocation();
  const [vin, setVin] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decodedData, setDecodedData] = useState<DecodedData | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vinParam = params.get('vin');

    if (!vinParam) {
      setError('يرجى توفير رقم VIN للبحث');
      setIsLoading(false);
      return;
    }

    const normalizedVin = vinParam.toUpperCase();
    setVin(normalizedVin);
  }, [location]);

  useEffect(() => {
    if (!vin) {
      return;
    }

    const fetchDecodedResult = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await carService.integratedSearch(vin);

        if (!response.success || !response.data) {
          setError(response.message || 'تعذر جلب بيانات فك التشفير لهذا الرقم.');
          return;
        }

        const result = response.data;

        if (result.result_type === 'report') {
          setLocation(`/check-vin-report?vin=${encodeURIComponent(vin)}`);
          return;
        }

        if (result.result_type !== 'decoded' && result.source !== 'vin_decoder') {
          setError('البيانات المتاحة لهذا الرقم ليست من نوع فك التشفير.');
          return;
        }

        const headerInfo = result.decode_info?.header_info || {};
        const enginePerformance = result.decode_info?.engine_performance || {};
        const bodyManufacturing = result.decode_info?.body_manufacturing || {};
        const safetyTech = result.decode_info?.safety_tech || {};
        const vehicleInfo = result.decode_info?.vehicle_info || {};
        const basicInfo = result.decode_info?.basic_info || vehicleInfo || headerInfo || {};
        const manufacturing = result.decode_info?.safety_and_manufacturing?.manufacturing || {};
        const metadata = result.decode_info?.metadata || {};

        setDecodedData({
          vin,
          make: headerInfo.make || basicInfo.make || vehicleInfo.make || result.car?.make || 'غير متوفر',
          model: headerInfo.model || basicInfo.model || vehicleInfo.model || result.car?.model || 'غير متوفر',
          year: String(headerInfo.model_year || basicInfo.year || vehicleInfo.year || result.car?.year || 'غير متوفر'),
          country: bodyManufacturing.plant_country || basicInfo.country || vehicleInfo.country || result.car?.country || 'غير متوفر',
          bodyType: bodyManufacturing.body_class || basicInfo.body_type || vehicleInfo.body_type || 'غير متوفر',
          fuelType: enginePerformance.fuel_type_primary || vehicleInfo.fuel_type || basicInfo.fuel_type || result.car?.fuel_type || 'غير متوفر',
          transmission: enginePerformance.drive_type || vehicleInfo.transmission || basicInfo.transmission || result.car?.transmission || 'غير متوفر',
          plant: bodyManufacturing.manufacturer_name || manufacturing.plant || vehicleInfo.plant || 'غير متوفر',
          confidence: metadata.decode_confidence || 'غير متوفر',
          processingTime: result.decode_info?.processing_time || result.processing_time || 'غير متوفر',
          decodedMessage: result.decode_info?.message || result.report?.detailed_report || 'تم استخراج هذه البيانات من رقم الهيكل.',
          note: 'هذه الصفحة تعرض بيانات فك التشفير المستخرجة من رقم الهيكل فقط، ولا تمثل تقرير تاريخ سيارة من قاعدة البيانات.',
          decodeMethod: result.decode_info?.decode_method || '',
          metadata,
          nhtsaData: result.decode_info?.nhtsa_data || {},
          rawData: result.decode_info?.raw_data || {},
          decodeInfo: result.decode_info || {},
        });
      } catch (err: any) {
        console.error('Error fetching decoded VIN data:', err);

        if (err.response?.status === 404) {
          setError('لم يتم العثور على بيانات تقرير أو بيانات فك تشفير لهذا الرقم.');
        } else {
          setError('حدث خطأ أثناء جلب بيانات فك التشفير. يرجى المحاولة لاحقاً.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDecodedResult();
  }, [vin, setLocation]);

  const title = useMemo(() => {
    if (!decodedData) {
      return 'بيانات فك التشفير';
    }

    return `${decodedData.make} ${decodedData.model}`.trim();
  }, [decodedData]);

  const openLogin = () => {
    setSignupModalOpen(false);
    setLoginModalOpen(true);
  };

  const openSignup = () => {
    setLoginModalOpen(false);
    setSignupModalOpen(true);
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
    <div className="min-h-screen bg-[#f1f5f9]">
      <Login
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSwitchToSignUp={openSignup}
      />
      <SignUp
        isOpen={signupModalOpen}
        onClose={() => setSignupModalOpen(false)}
        onSwitchToLogin={openLogin}
      />

      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center">
          <Loader2 size={48} className="text-[#002f6c] animate-spin mb-4" />
          <p className="text-lg font-bold text-[#002f6c]">جاري فك تشفير رقم الهيكل...</p>
          <p className="text-sm text-[#64748b] mt-2">يرجى الانتظار قليلاً</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-[#e2e8f0] max-w-md w-full text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldAlert size={40} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-[#0f172a] mb-3">عذراً، حدث خطأ ما</h2>
            <p className="text-[#64748b] mb-8">{error}</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setLocation('/')}
              className="w-full bg-[#002f6c] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#002f6c]/20 hover:bg-[#001a3d] transition-colors"
            >
              العودة للرئيسية
            </motion.button>
          </div>
        </div>
      )}

      {!isLoading && !error && decodedData && (
        <>
          {/* ===== HERO ===== */}
          <section className="relative bg-gradient-to-br from-[#001a3d] via-[#002f6c] to-[#003d85] py-14 overflow-hidden">
            {/* Subtle decorative pattern */}
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

            <div className="container mx-auto px-4 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-5">
                  <BadgeInfo size={14} className="text-[#60a5fa]" />
                  <span className="text-xs font-semibold text-white/90">واجهة بيانات فك التشفير</span>
                </div>

                <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 leading-tight">
                  {decodedData.make !== 'غير متوفر' ? decodedData.make : ''} <span className="text-[#60a5fa]">{decodedData.model !== 'غير متوفر' ? decodedData.model : ''}</span>
                  {decodedData.make === 'غير متوفر' && decodedData.model === 'غير متوفر' && 'بيانات فك التشفير'}
                </h1>

                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-5 py-2.5 mt-4">
                  <Hash size={14} className="text-[#60a5fa]" />
                  <span className="font-mono text-sm md:text-base text-white tracking-widest">{decodedData.vin}</span>
                </div>

                <p className="max-w-2xl mx-auto text-white/70 text-sm md:text-base mt-6 leading-relaxed">
                  {decodedData.note}
                </p>
                {(() => {
                  const parts = [];
                  const method = decodedData.decodeInfo?.decode_method || decodedData.decodeMethod;
                  if (method && method !== 'غير محددة' && method !== 'غير متوفر') parts.push(`طريقة فك التشفير: ${method}`);
                  
                  const engineVersion = decodedData.decodeInfo?.metadata?.engine_version;
                  if (engineVersion) parts.push(`إصدار المحرك: ${engineVersion}`);
                  
                  const dataSources = decodedData.decodeInfo?.metadata?.data_sources;
                  if (dataSources) {
                    const sources = Object.entries(dataSources).filter(([, enabled]) => enabled).map(([key]) => key).join('، ');
                    if (sources) parts.push(`المصادر: ${sources}`);
                  }
                  
                  if (parts.length === 0) return null;
                  return (
                    <p className="max-w-2xl mx-auto text-white/70 text-sm md:text-base mt-3 leading-relaxed">
                      {parts.join(' · ')}
                    </p>
                  );
                })()}
              </motion.div>
            </div>
          </section>

          {/* ===== CONTENT ===== */}
          <main className="container mx-auto px-4 -mt-8 relative z-20 pb-16">
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-6 max-w-5xl mx-auto"
            >
              {/* -- Manufacturing Info -- */}
              {(() => {
                const chips = [
                  { icon: <Globe size={16} />, label: "بلد المنشأ", value: formatValue(decodedData.decodeInfo?.body_manufacturing?.plant_country || decodedData.country) },
                  { icon: <Car size={16} />, label: "الشركة المصنعة", value: formatValue(decodedData.decodeInfo?.header_info?.make || decodedData.make) },
                  { icon: <FileCheck size={16} />, label: "نوع المركبة", value: deriveVehicleType(decodedData.bodyType) },
                  { icon: <Hash size={16} />, label: "رمز WMI", value: formatValue(decodedData.decodeInfo?.vin_codes?.wmi || decodedData.decodeInfo?.vin_codes?.wmi_code) },
                  { icon: <Activity size={16} />, label: "المصنع", value: formatValue(decodedData.decodeInfo?.body_manufacturing?.manufacturer_name || decodedData.plant) },
                  { icon: <Calendar size={16} />, label: "سنة الموديل", value: formatValue(decodedData.decodeInfo?.header_info?.model_year || decodedData.year) },
                ].filter(chip => chip.value && chip.value !== 'غير متوفر' && chip.value !== 'غير محدد');

                if (chips.length === 0) return null;

                return (
                  <motion.section variants={fadeUp} className="bg-white rounded-3xl shadow-sm border border-[#e2e8f0] p-6 md:p-8">
                    <SectionHeading icon={<Factory size={20} />} title="بيانات الهوية والتصنيع" />
                    <p className="text-sm text-[#64748b] mb-6 -mt-2">هذه البيانات مرتبطة بهوية السيارة ومصدر تصنيعها، وتعتمد بشكل أساسي على بداية رقم الهيكل WMI.</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {chips.map((chip, idx) => (
                        <InfoChip key={idx} icon={chip.icon} label={chip.label} value={chip.value} />
                      ))}
                    </div>
                  </motion.section>
                );
              })()}

              {/* -- Technical Specs -- */}
              {(() => {
                const engineDesc = buildEngineDescription(decodedData.decodeInfo);
                const transDesc = buildTransmissionDescription(decodedData.decodeInfo);
                const driveType = translateDriveType(decodedData.decodeInfo?.technical_specs?.drivetrain?.drive_type || decodedData.decodeInfo?.vehicle_info?.drive_type || '');
                const bodyDesc = buildBodyDescription(decodedData.decodeInfo);
                const doors = decodedData.decodeInfo?.technical_specs?.chassis?.doors;
                const gvwr = decodedData.decodeInfo?.technical_specs?.chassis?.gvwr_class;

                const hasEngine = engineDesc && engineDesc !== 'غير متوفر';
                const hasTransOrDrive = (transDesc && transDesc !== 'غير متوفر') || (driveType && driveType !== 'غير متوفر' && driveType !== '');
                const hasBody = (bodyDesc && bodyDesc !== 'غير متوفر') || (doors && doors !== 'Unknown') || (gvwr && gvwr !== 'Unknown');

                if (!hasEngine && !hasTransOrDrive && !hasBody) return null;

                return (
                  <motion.section variants={fadeUp} className="bg-white rounded-3xl shadow-sm border border-[#e2e8f0] p-6 md:p-8">
                    <SectionHeading icon={<Cpu size={20} />} title="المواصفات الفنية والميكانيكية" />
                    <p className="text-sm text-[#64748b] mb-6 -mt-2">يجمع هذا القسم أهم المواصفات التقنية المستخرجة من الجزء الوصفي VDS في رقم VIN.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {(hasEngine || hasTransOrDrive) && (
                        <div className="space-y-4">
                          {hasEngine && (
                            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-5">
                              <div className="flex items-center gap-2 mb-4">
                                <Zap size={18} className="text-[#002f6c]" />
                                <h3 className="text-sm font-bold text-[#1e293b]">المحرك والوقود</h3>
                              </div>
                              <p className="text-base font-bold text-[#0f172a] mb-1">{engineDesc}</p>
                              <p className="text-xs text-[#64748b]">يتضمن الإزاحة، عدد الأسطوانات، ونوع الوقود.</p>
                            </div>
                          )}

                          {hasTransOrDrive && (
                            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-5">
                              <div className="flex items-center gap-2 mb-4">
                                <Cog size={18} className="text-[#002f6c]" />
                                <h3 className="text-sm font-bold text-[#1e293b]">ناقل الحركة والدفع</h3>
                              </div>
                              <div className="space-y-3">
                                {transDesc && transDesc !== 'غير متوفر' && (
                                  <div>
                                    <p className="text-[11px] text-[#94a3b8] font-bold uppercase mb-0.5">ناقل الحركة</p>
                                    <p className="text-sm font-bold text-[#1e293b]">{transDesc}</p>
                                  </div>
                                )}
                                {driveType && driveType !== 'غير متوفر' && driveType !== '' && (
                                  <div>
                                    <p className="text-[11px] text-[#94a3b8] font-bold uppercase mb-0.5">نظام الدفع</p>
                                    <p className="text-sm font-bold text-[#1e293b]">{driveType}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {hasBody && (
                        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-5 flex flex-col">
                          <div className="flex items-center gap-2 mb-4">
                            <Car size={18} className="text-[#002f6c]" />
                            <h3 className="text-sm font-bold text-[#1e293b]">الهيكل والشكل الخارجي</h3>
                          </div>
                          <div className="flex-1 space-y-4">
                            {bodyDesc && bodyDesc !== 'غير متوفر' && (
                              <div>
                                <p className="text-[11px] text-[#94a3b8] font-bold uppercase mb-1">وصف الهيكل</p>
                                <p className="text-sm font-bold text-[#1e293b] leading-relaxed">{bodyDesc}</p>
                              </div>
                            )}
                            {((doors && doors !== 'Unknown') || (gvwr && gvwr !== 'Unknown')) && (
                              <div className="grid grid-cols-2 gap-4 pt-2">
                                {doors && doors !== 'Unknown' && (
                                  <div>
                                    <p className="text-[11px] text-[#94a3b8] font-bold uppercase mb-0.5">عدد الأبواب</p>
                                    <p className="text-sm font-bold text-[#1e293b]">{doors}</p>
                                  </div>
                                )}
                                {gvwr && gvwr !== 'Unknown' && (
                                  <div>
                                    <p className="text-[11px] text-[#94a3b8] font-bold uppercase mb-0.5">فئة الوزن</p>
                                    <p className="text-sm font-bold text-[#1e293b]">{gvwr}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.section>
                );
              })()}

              {/* -- Safety Equipment -- */}
              {(() => {
                const safetyDesc = buildSafetyDescription(decodedData.decodeInfo);
                const brakingSys = formatValue(decodedData.decodeInfo?.safety_and_manufacturing?.safety?.braking_systems || decodedData.decodeInfo?.vehicle_info?.safety_system?.abs);

                const hasSafetyDesc = safetyDesc && safetyDesc !== 'غير متوفر';
                const hasBrakingSys = brakingSys && brakingSys !== 'غير متوفر';

                if (!hasSafetyDesc && !hasBrakingSys) return null;

                return (
                  <motion.section variants={fadeUp} className="bg-white rounded-3xl shadow-sm border border-[#e2e8f0] p-6 md:p-8">
                    <SectionHeading icon={<Shield size={20} />} title="معدات السلامة" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {hasSafetyDesc && (
                        <div className="flex items-start gap-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-5">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#002f6c] border border-[#e2e8f0] shadow-sm">
                            <Activity size={18} />
                          </div>
                          <div>
                            <p className="text-[11px] text-[#94a3b8] font-bold uppercase mb-1">أنظمة الأمان والوسائد</p>
                            <p className="text-sm font-bold text-[#1e293b] leading-relaxed">{safetyDesc}</p>
                          </div>
                        </div>
                      )}
                      {hasBrakingSys && (
                        <div className="flex items-start gap-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-5">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#002f6c] border border-[#e2e8f0] shadow-sm">
                            <Zap size={18} />
                          </div>
                          <div>
                            <p className="text-[11px] text-[#94a3b8] font-bold uppercase mb-1">نظام الفرامل</p>
                            <p className="text-sm font-bold text-[#1e293b] leading-relaxed">{brakingSys}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.section>
                );
              })()}

              {/* -- Verification Details -- */}
              {(() => {
                const checkDigitRaw = decodedData.vin?.[8];
                const checkDigitVal = checkDigitRaw ? `${checkDigitRaw} (${decodedData.decodeInfo?.vin_codes?.checksum_valid ? 'صحيح' : 'غير مؤكد'})` : 'غير متوفر';
                const chips = [
                  { icon: <Activity size={16} />, label: "رقم التحقق Check Digit", value: checkDigitVal },
                  { icon: <Factory size={16} />, label: "رمز المصنع Plant Code", value: formatValue(decodedData.decodeInfo?.vin_codes?.plant_code) },
                  { icon: <Hash size={16} />, label: "الرقم المتسلسل", value: formatValue(decodedData.decodeInfo?.vin_codes?.serial) },
                  { icon: <Cpu size={16} />, label: "رمز VDS", value: formatValue(decodedData.decodeInfo?.vin_codes?.vds_code) },
                  { icon: <FileCheck size={16} />, label: "درجة الثقة", value: decodedData.confidence },
                  { icon: <Zap size={16} />, label: "زمن المعالجة", value: decodedData.processingTime },
                ].filter(chip => chip.value && chip.value !== 'غير متوفر' && chip.value !== 'غير محدد');

                if (chips.length === 0) return null;

                return (
                  <motion.section variants={fadeUp} className="bg-white rounded-3xl shadow-sm border border-[#e2e8f0] p-6 md:p-8">
                    <SectionHeading icon={<ShieldAlert size={20} />} title="بيانات التحقق والتسلسل" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {chips.map((chip, idx) => (
                        <InfoChip key={idx} icon={chip.icon} label={chip.label} value={chip.value} />
                      ))}
                    </div>
                  </motion.section>
                );
              })()}

              {/* -- Actions -- */}
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setLocation('/')}
                  className="flex items-center justify-center gap-3 bg-white border border-[#cbd5e1] text-[#0f172a] px-8 py-4 rounded-2xl text-base font-bold shadow-sm hover:bg-[#f8fafc] transition-all"
                >
                  <ChevronLeft size={20} />
                  العودة للرئيسية
                </motion.button>
              </motion.div>
            </motion.div>
          </main>
        </>
      )}
    </div>
  );
}
