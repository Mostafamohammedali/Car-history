/**
 * @file aiService.ts
 * @description خدمة الذكاء الاصطناعي - ربط المحادثة مع الباك إند
 */

import api from './api';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  car_vin?: string;
}

export interface ChatResponse {
  success: boolean;
  message?: string;
  response?: string;
  session_id?: string;
  data?: any;
}

export const aiService = {
  /**
   * إرسال رسالة للذكاء الاصطناعي
   * @param message - نص الرسالة
   * @param sessionId - معرف الجلسة (اختياري)
   * @param carVin - رقم الهيكل المرتبط (اختياري)
   */
  sendMessage: async (message: string, sessionId: string | null = null, carVin: string | null = null): Promise<ChatResponse> => {
    const response = await api.post('/chat/send_message/', {
      message,
      session_id: sessionId,
      car_vin: carVin
    });
    return response.data;
  },

  /**
   * جلب سجل المحادثات لمستخدم
   */
  getSessions: async (): Promise<ChatResponse> => {
    const response = await api.get('/chat/sessions/');
    return response.data;
  },

  /**
   * جلب رسائل جلسة معينة
   */
  getSessionMessages: async (sessionId: string): Promise<ChatResponse> => {
    const response = await api.get(`/chat/messages/${sessionId}/`);
    return response.data;
  },

  /**
   * حذف جلسة محادثة
   */
  deleteSession: async (sessionId: string): Promise<ChatResponse> => {
    const response = await api.delete(`/chat/session/${sessionId}/`);
    return response.data;
  },

  /**
   * طلب تحليل ذكي لسيارة معينة
   */
  analyzeCar: async (vin: string): Promise<ChatResponse> => {
    const response = await api.post('/chat/analyze_car/', { vin });
    return response.data;
  }
};

export default aiService;
