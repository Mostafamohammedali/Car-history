/**
 * @file carService.ts
 * @description خدمة السيارات - ربط البحث والتقارير والتقييم مع الباك إند
 */

import api from './api';

// ===== أنواع البيانات =====

export interface SearchResponse {
  success: boolean;
  message?: string;
  data?: any;
  report?: any;
}

export interface EvaluationData {
  vin: string;
  rate: number;
  rating?: number; // kept for legacy
  comment?: string;
  pros?: string;
  cons?: string;
  would_recommend?: boolean;
}

// ===== دوال الخدمة =====

export const carService = {
  /** البحث عن سيارة بالـ VIN */
  searchCar: async (vin: string, localOnly = false): Promise<SearchResponse> => {
    const response = await api.get('/cars/search/', { params: { vin, local_only: localOnly } });
    return response.data;
  },

  /** البحث المتكامل (المسار الرئيسي: محلي → خارجي → تقرير) */
  integratedSearch: async (vin: string): Promise<SearchResponse> => {
    const response = await api.post('/cars/integrated-search/', { vin });
    return response.data;
  },

  /** جلب التقرير الكامل */
  getCompleteReport: async (vin: string): Promise<SearchResponse> => {
    const response = await api.get(`/cars/complete-report/${vin}`);
    return response.data;
  },

  /** فك تشفير VIN */
  decodeVIN: async (vin: string, includeDetails = true): Promise<SearchResponse> => {
    const response = await api.post('/cars/vin-decode/', { vin, include_details: includeDetails });
    return response.data;
  },

  /** التحقق من صحة VIN */
  validateVIN: async (vin: string): Promise<SearchResponse> => {
    const response = await api.post('/cars/vin-validate/', { vin });
    return response.data;
  },

  /** فك تشفير متعدد */
  batchDecodeVIN: async (vinList: string[]): Promise<SearchResponse> => {
    const response = await api.post('/cars/vin-batch-decode/', { vin_list: vinList });
    return response.data;
  },

  /** جلب الشركات المصنّعة المدعومة */
  getSupportedManufacturers: async (): Promise<SearchResponse> => {
    const response = await api.get('/cars/vin-supported-manufacturers/');
    return response.data;
  },

  /** إنشاء أو تحديث تقرير */
  createOrUpdateReport: async (vin: string): Promise<SearchResponse> => {
    const response = await api.post(`/cars/report/create/${vin}`);
    return response.data;
  },

  /** إحصائيات التقرير */
  getReportStatistics: async (vin: string): Promise<SearchResponse> => {
    const response = await api.get(`/cars/report/statistics/${vin}`);
    return response.data;
  },

  /** إرسال تقييم المستخدم للتقرير */
  submitEvaluation: async (data: EvaluationData): Promise<SearchResponse> => {
    const response = await api.post('/cars/evaluation/create/', data);
    return response.data;
  },

  /** حذف تقييم المستخدم */
  deleteEvaluation: async (evaluationId: number): Promise<SearchResponse> => {
    const response = await api.delete(`/cars/evaluation/delete/${evaluationId}/`);
    return response.data;
  },

  /** إحصائيات المنصة (عامة) */
  getPlatformStats: async (): Promise<SearchResponse> => {
    const response = await api.get('/cars/platform-stats/');
    return response.data;
  },

  /** السيارات الأخيرة (عامة) */
  getRecentCars: async (limit = 8): Promise<SearchResponse> => {
    const response = await api.get('/cars/recent-cars/', { params: { limit } });
    return response.data;
  },

  /** إحصائيات المستخدم */
  getUserStats: async (): Promise<SearchResponse> => {
    const response = await api.get('/cars/user-stats/');
    return response.data;
  },
};

export default carService;
