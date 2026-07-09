/**
 * @file api.ts
 * @description إعداد axios الأساسي للتواصل مع الباك إند
 * - يضيف CSRF token تلقائياً من الكوكيز لكل طلب
 * - يدير timeout وbase URL بشكل مركزي
 */

import axios from 'axios';

// ===== Base URL =====
// في التطوير: proxy في vite.config يوجه /api إلى Django
// في الإنتاج: يجب تعيين VITE_API_URL
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
});

// ===== دالة استخراج CSRF من الكوكيز =====
function getCsrfToken(): string | null {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : null;
}

// ===== Interceptor: إضافة التوكن و CSRF لكل طلب =====
api.interceptors.request.use((config) => {
  // 1. إضافة JWT Token إذا وجد
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // 2. إضافة CSRF Token للعمليات التعديلية
  const method = config.method?.toUpperCase();
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method || '');

  if (isMutating) {
    const csrf = getCsrfToken();
    if (csrf) {
      config.headers['X-CSRFToken'] = csrf;
    }
  }

  return config;
}, (error) => Promise.reject(error));

// متغير لمنع تكرار محاولات التجديد المتوازية
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ===== Interceptor: معالجة موحدة للاستجابات والأخطاء وتجديد التوكن =====
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 1. التعامل مع انقطاع الاتصال أو خادم متوقف
    if (!error.response) {
      console.error('Network Error / Server Offline');
      return Promise.reject({
        message: 'عذراً، تعذر الاتصال بالخادم. يرجى التأكد من اتصال الإنترنت.',
        success: false
      });
    }

    const status = error.response.status;
    const data = error.response.data;

    // 2. انتهاء صلاحية التوكن (401) ومحاولة التجديد
    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/accounts/token/refresh/`, {
            refresh: refreshToken
          });

          if (response.status === 200) {
            const newAccessToken = response.data.access;
            localStorage.setItem('access_token', newAccessToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            processQueue(null, newAccessToken);
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
          // إذا فشل التجديد، نقوم بتسجيل الخروج وتفريغ البيانات
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.dispatchEvent(new Event('unauthorized'));
        } finally {
          isRefreshing = false;
        }
      } else {
        // لا يوجد refresh token، توجيه للمصادقة
        window.dispatchEvent(new Event('unauthorized'));
      }
    }

    // 3. خطأ في الصلاحيات (403)
    if (status === 403) {
      console.warn('API: 403 Forbidden - CSRF error or insufficient permissions');
    }

    // 4. أخطاء الخادم العامة (500+)
    if (status >= 500) {
      console.error('Server Error:', status, data);
      error.message = data?.message || 'حدث خطأ في الخادم، يرجى المحاولة لاحقاً.';
      return Promise.reject(error);
    }

    // إرجاع الخطأ كما هو لمعالجته في الخدمة المحددة (مع الحفاظ على بنية axios)
    if (data?.message) {
      error.message = data.message;
    }
    return Promise.reject(error);
  }
);

export default api;
