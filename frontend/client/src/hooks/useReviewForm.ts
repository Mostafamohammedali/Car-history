/**
 * @file useReviewForm.ts
 * @description Custom hook لإدارة نموذج التقييم
 */

import { useState, useCallback } from 'react';
import { carService } from '@/services/carService';
import { toast } from 'sonner';

export interface ReviewFormData {
  rating: number;
  comment: string;
  pros: string;
  cons: string;
  wouldRecommend: boolean;
}

interface UseReviewFormReturn {
  formData: ReviewFormData;
  isSubmitting: boolean;
  errors: Partial<Record<keyof ReviewFormData, string>>;
  setRating: (rating: number) => void;
  setComment: (comment: string) => void;
  setPros: (pros: string) => void;
  setCons: (cons: string) => void;
  setWouldRecommend: (recommend: boolean) => void;
  validateForm: () => boolean;
  submitReview: (vin: string) => Promise<boolean>;
  resetForm: () => void;
}

const initialFormData: ReviewFormData = {
  rating: 0,
  comment: '',
  pros: '',
  cons: '',
  wouldRecommend: true,
};

/**
 * Custom hook لإدارة نموذج التقييم
 * @returns وظائف وحالة نموذج التقييم
 */
export function useReviewForm(): UseReviewFormReturn {
  const [formData, setFormData] = useState<ReviewFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ReviewFormData, string>>>({});

  const setRating = useCallback((rating: number) => {
    setFormData((prev) => ({ ...prev, rating }));
    if (errors.rating) {
      setErrors((prev) => ({ ...prev, rating: undefined }));
    }
  }, [errors.rating]);

  const setComment = useCallback((comment: string) => {
    setFormData((prev) => ({ ...prev, comment }));
  }, []);

  const setPros = useCallback((pros: string) => {
    setFormData((prev) => ({ ...prev, pros }));
  }, []);

  const setCons = useCallback((cons: string) => {
    setFormData((prev) => ({ ...prev, cons }));
  }, []);

  const setWouldRecommend = useCallback((wouldRecommend: boolean) => {
    setFormData((prev) => ({ ...prev, wouldRecommend }));
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof ReviewFormData, string>> = {};

    if (formData.rating === 0) {
      newErrors.rating = 'يرجى اختيار تقييم بالنجوم';
    }

    if (formData.rating < 1 || formData.rating > 5) {
      newErrors.rating = 'التقييم يجب أن يكون بين 1 و 5';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData.rating]);

  const submitReview = useCallback(async (vin: string): Promise<boolean> => {
    if (!validateForm()) {
      toast.error('يرجى تصحيح الأخطاء في النموذج');
      return false;
    }

    setIsSubmitting(true);

    try {
      const response = await carService.submitEvaluation({
        vin,
        rate: formData.rating,
        comment: formData.comment || undefined,
        pros: formData.pros || undefined,
        cons: formData.cons || undefined,
        would_recommend: formData.wouldRecommend,
      });

      if (response.success) {
        toast.success('شكراً لك! تم إرسال تقييمك بنجاح');
        resetForm();
        return true;
      } else {
        toast.error(response.message || 'حدث خطأ أثناء إرسال التقييم');
        return false;
      }
    } catch (err: any) {
      console.error('Error submitting evaluation:', err);
      const errorMsg = err.response?.data?.message || 'فشل الاتصال بالسيرفر، يرجى المحاولة لاحقاً';
      toast.error(errorMsg);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm]);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setErrors({});
  }, []);

  return {
    formData,
    isSubmitting,
    errors,
    setRating,
    setComment,
    setPros,
    setCons,
    setWouldRecommend,
    validateForm,
    submitReview,
    resetForm,
  };
}
