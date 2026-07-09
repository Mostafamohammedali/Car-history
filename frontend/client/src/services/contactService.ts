/**
 * @file contactService.ts
 * @description خدمة اتصل بنا - ربط واجهة المستخدم بـ API الرسائل
 */

import api from './api';

export interface ContactData {
  name: string;
  email: string;
  subject: string;
  message: string;
  phone?: string;
  vin?: string;
}

export interface ContactResponse {
  success: boolean;
  message: string;
  data?: {
    reference_number?: string;
    [key: string]: any;
  };
}

export const contactService = {
  /**
   * إرسال رسالة تواصل جديدة
   */
  sendMessage: async (data: ContactData): Promise<ContactResponse> => {
    const response = await api.post('/cars/contact/', data);
    return response.data;
  },
};

// Aliases for backward compatibility and extra helpers
export const submitContactMessage = contactService.sendMessage;

/**
 * دالة للتحقق من صحة بيانات نموذج الاتصال (Frontend validation)
 */
export const validateContactForm = (data: Partial<ContactData>) => {
  const errors: Record<string, string> = {};

  if (!data.name?.trim()) {
    errors.name = 'الاسم مطلوب';
  }

  if (!data.email?.trim()) {
    errors.email = 'البريد الإلكتروني مطلوب';
  } else if (!/^\S+@\S+\.\S+$/.test(data.email)) {
    errors.email = 'البريد الإلكتروني غير صالح';
  }

  if (!data.subject?.trim()) {
    errors.subject = 'الموضوع مطلوب';
  }

  if (!data.message?.trim()) {
    errors.message = 'الرسالة مطلوبة';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export default contactService;
