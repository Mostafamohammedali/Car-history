/**
 * @file authService.ts
 * @description خدمة المصادقة - ربط واجهة المستخدم بـ API الخاص بالحسابات
 * جميع الدوال مربوطة بشكل كامل مع الباك إند عبر axios مع معالجة الأخطاء
 */

import api from './api';

// ===== أنواع البيانات =====

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_email_verified: boolean;
  date_joined?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user?: UserProfile;
    session_id?: string;
    email?: string;
    verification_code?: string; // فقط في وضع DEBUG
    authenticated?: boolean;
    tokens?: {
      access: string;
      refresh: string;
    };
  };
}

export interface RegisterData {
  email: string;
  verification_code: string;
  password: string;
  confirm_password: string;
  first_name?: string;
  username?: string;
}

// ===== دوال الخدمة =====

export const authService = {
  /**
   * إرسال رمز التحقق للبريد الإلكتروني (قبل التسجيل)
   * نقوم بإرسال كافة البيانات ليتم تخزينها مؤقتاً في الباك إند
   */
  sendVerificationCode: async (userData: {
    email: string;
    username: string;
    password?: string;
    first_name?: string;
    last_name?: string;
  }): Promise<AuthResponse> => {
    const response = await api.post('/accounts/send-verification-code/', userData);
    return response.data;
  },

  /**
   * إتمام التسجيل بعد التحقق من الرمز
   */
  registerWithVerification: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post('/accounts/verify-email/', {
      ...data,
      verification_type: 'signup'
    });
    return response.data;
  },

  /**
   * إعادة إرسال رمز التحقق
   */
  resendVerification: async (email: string, type: 'signup' | 'reset' = 'signup'): Promise<AuthResponse> => {
    const response = await api.post('/accounts/resend-verification/', { email, type });
    return response.data;
  },

  /**
   * تسجيل الدخول باستخدام البريد الإلكتروني أو اسم المستخدم
   */
  login: async (loginField: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/accounts/login/', { login_field: loginField, password });
    return response.data;
  },

  /**
   * تسجيل الخروج
   */
  logout: async (): Promise<AuthResponse> => {
    const response = await api.post('/accounts/logout/');
    return response.data;
  },

  /**
   * التحقق من رمز OTP (للتسجيل أو إعادة تعيين كلمة المرور)
   */
  verifyEmail: async (
    email: string,
    code: string,
    verificationType: 'signup' | 'reset' = 'signup'
  ): Promise<AuthResponse> => {
    const response = await api.post('/accounts/verify-email/', {
      email,
      code,
      verification_type: verificationType,
    });
    return response.data;
  },

  /**
   * إرسال رمز إعادة تعيين كلمة المرور
   */
  passwordReset: async (email: string): Promise<AuthResponse> => {
    const response = await api.post('/accounts/password-reset/', { email });
    return response.data;
  },

  /**
   * تأكيد إعادة تعيين كلمة المرور
   */
  resetPasswordConfirm: async (
    email: string,
    code: string,
    password1: string,
    password2: string
  ): Promise<AuthResponse> => {
    const response = await api.post('/accounts/reset-password-confirm/', {
      email,
      code,
      password1,
      password2,
    });
    return response.data;
  },

  /**
   * التحقق من حالة تسجيل الدخول
   */
  checkAuthStatus: async (): Promise<AuthResponse> => {
    const response = await api.get('/accounts/auth/status/');
    return response.data;
  },

  /**
   * جلب بيانات الملف الشخصي
   */
  getProfile: async (): Promise<AuthResponse> => {
    const response = await api.get('/accounts/profile/');
    return response.data;
  },

  /**
   * تحديث بيانات الملف الشخصي
   */
  updateProfile: async (data: Partial<UserProfile>): Promise<AuthResponse> => {
    const response = await api.put('/accounts/profile/update/', data);
    return response.data;
  },
  
  /** جلب سجل نشاط المستخدم */
  getUserActivities: async (): Promise<AuthResponse> => {
    const response = await api.get('/accounts/profile/activities/');
    return response.data;
  },

  /**
   * تسجيل دخول الأدمن
   */
  adminLogin: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/accounts/admin/login/', { email, password });
    return response.data;
  },

  /**
   * التحقق من صلاحيات الأدمن
   */
  adminVerify: async (): Promise<AuthResponse> => {
    const response = await api.get('/accounts/admin/verify/');
    return response.data;
  },
};

export default authService;
