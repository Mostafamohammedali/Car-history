/**
 * @file useVehicleReport.ts
 * @description Custom hook لجلب وإدارة بيانات تقرير السيارة
 */

import { useState, useEffect, useCallback } from 'react';
import { carService } from '@/services/carService';

export interface ReportData {
  vin: string;
  car: {
    name: string;
    nameAr: string;
    make: string;
    year: number;
    trim: string;
    color: string;
    mileage: string;
    fuelType: string;
    transmission: string;
    drivetrain: string;
    bodyType: string;
    seats: number;
  };
  engine: {
    num_cylinders: string;
    engine_capacity: string;
  };
  chassis: {
    customsNum: string;
    customsDate: string;
    receiptNum: string;
    receiptDate: string;
  };
  images: Array<{
    src: string;
    label: string;
  }>;
  accidents: Array<{
    image: string;
    type: string;
    date: string;
    severity: 'minor' | 'moderate' | 'major';
  }>;
  evaluations: any[];
  serviceHistory: Array<{
    type: string;
    date: string;
  }>;
  diagnostics: Array<{
    part: string;
    status: 'ok' | 'warning' | 'replace';
    note: string;
  }>;
  report: {
    detailed_report: string;
    risk_assessment: any;
    overall_ai_score: number;
    accident_severity_score: number;
  };
  rating: number;
}

interface UseVehicleReportReturn {
  data: ReportData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook لجلب بيانات تقرير السيارة
 * @param vin - رقم VIN للسيارة
 * @returns بيانات التقرير وحالة التحميل والأخطاء
 */
export function useVehicleReport(vin: string): UseVehicleReportReturn {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (!vin) {
      setError('يرجى توفير رقم VIN للبحث');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await carService.integratedSearch(vin);

      if (response.success && response.data) {
        const mappedData = mapBackendToFrontend(response.data);
        setData(mappedData);
      } else {
        setError(response.message || 'فشل في العثور على التقرير المطلوب لهذه السيارة.');
      }
    } catch (err: any) {
      console.error('Error fetching report:', err);

      if (err.response?.status === 404) {
        setError('لم نتمكن من العثور على بيانات لهذه السيارة في قاعدة بياناتنا أو عبر خدمات التشفير الخارجية.');
      } else if (err.response?.status === 500) {
        setError('خطأ في السيرفر، يرجى المحاولة لاحقاً');
      } else if (!navigator.onLine) {
        setError('لا يوجد اتصال بالإنترنت');
      } else {
        setError('حدث خطأ أثناء الاتصال بالخادم. يرجى التأكد من اتصالك بالإنترنت والمحاولة لاحقاً.');
      }
    } finally {
      setLoading(false);
    }
  }, [vin]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const refetch = useCallback(async () => {
    await fetchReport();
  }, [fetchReport]);

  return { data, loading, error, refetch };
}

/**
 * تحويل بيانات Backend إلى تنسيق Frontend
 */
function mapBackendToFrontend(data: any): ReportData {
  const { car, report, images, accident_images, repair_shops, evaluations, risk_assessment_data } = data;

  const VITE_API_URL = import.meta.env.VITE_API_URL;
  const BACKEND_URL = (VITE_API_URL && VITE_API_URL.startsWith('http'))
    ? VITE_API_URL.split('/api')[0]
    : 'http://localhost:8000';

  // دوال الترجمة
  const translateFuel = (fuel: string): string => {
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

  const translateTransmission = (transmission: any): string => {
    if (transmission === 2 || transmission === '2' || transmission === 'Automatic' || transmission === 'أوتوماتيك') {
      return 'أوتوماتيك';
    }
    return 'يدوي';
  };

  const normalizeImageUrl = (url: string): string => {
    if (!url) return '/placeholder-car.png';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `${BACKEND_URL}${url}`;
  };

  const mapSeverity = (type: string): 'minor' | 'moderate' | 'major' => {
    if (type === 'major') return 'major';
    if (type === 'minor') return 'minor';
    return 'moderate';
  };

  return {
    vin: car.vin,
    car: {
      name: car.name_car,
      nameAr: car.name_car,
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
      num_cylinders: car.num_cylinders || 'غير متوفر',
      engine_capacity: car.engine_capacity || 'غير متوفر',
    },
    chassis: {
      customsNum: car.customs_num || 'غير متوفر',
      customsDate: car.customs_date || 'غير متوفر',
      receiptNum: car.receipt_number || 'غير متوفر',
      receiptDate: car.receipt_date || 'غير متوفر',
    },
    images: (images && images.length > 0)
      ? images.map((img: any) => ({
        src: normalizeImageUrl(img.image_url),
        label: "صورة السيارة"
      }))
      : [{ src: '/placeholder-car.png', label: 'لا توجد صورة' }],
    accidents: (accident_images && accident_images.length > 0)
      ? accident_images.map((img: any) => ({
        image: normalizeImageUrl(img.image_url),
        type: img.ai_description || 'معلومات الحادث',
        date: img.created_at ? img.created_at.split('T')[0] : 'غير محدد',
        severity: mapSeverity(img.ai_accident_type)
      }))
      : [],
    evaluations: evaluations && Array.isArray(evaluations) ? evaluations : [],
    serviceHistory: (repair_shops && repair_shops.length > 0)
      ? repair_shops.filter((s: any) => s.mech_insp_desc).map((shop: any) => ({
        type: shop.mech_insp_desc,
        date: shop.created_at ? shop.created_at.split('T')[0] : 'غير محدد'
      }))
      : [],
    diagnostics: (repair_shops && repair_shops.length > 0)
      ? repair_shops.filter((s: any) => s.comp_scan_desc).map((shop: any) => ({
        part: 'فحص كمبيوتر',
        status: (shop.comp_scan_desc.includes('تالف') || shop.comp_scan_desc.includes('استبدال') || shop.comp_scan_desc.includes('خلل'))
          ? 'replace'
          : (shop.comp_scan_desc.includes('تحذير') || shop.comp_scan_desc.includes('مراقبة') || shop.comp_scan_desc.includes('ضعيف'))
            ? 'warning'
            : 'ok',
        note: shop.comp_scan_desc
      }))
      : [],
    report: {
      detailed_report: report?.detailed_report || '',
      risk_assessment: risk_assessment_data || null,
      overall_ai_score: report?.overall_ai_score || 0,
      accident_severity_score: report?.accident_severity_score || 0,
    },
    rating: report?.overall_ai_score || 0,
  };
}
