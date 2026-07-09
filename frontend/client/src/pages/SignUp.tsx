/**
 * @file SignUp.tsx
 * @description مكون التسجيل - مربوط بالكامل مع الباك إند
 * الخطوة 1: إرسال رمز التحقق → الخطوة 2: OTP
 */

import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';

interface SignUpProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSwitchToLogin?: () => void;
}

export default function SignUp({ isOpen = true, onClose, onSwitchToLogin }: SignUpProps) {
  const [, setLocation] = useLocation();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword]             = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms]                 = useState(false);
  const [isLoading, setIsLoading]                   = useState(false);
  const [imageLoaded, setImageLoaded]               = useState(false);
  const [passwordStrength, setPasswordStrength]     = useState(0);

  const calculateStrength = (pass: string) => {
    let s = 0;
    if (pass.length >= 8) s++;
    if (/[A-Z]/.test(pass)) s++;
    if (/[a-z]/.test(pass)) s++;
    if (/[0-9]/.test(pass)) s++;
    if (/[^A-Za-z0-9]/.test(pass)) s++;
    setPasswordStrength(s);
  };

  useEffect(() => {
    calculateStrength(formData.password);
  }, [formData.password]);

  useEffect(() => {
    const img = new Image();
    img.src   = '/images/logn.jpg';
    img.onload = () => setImageLoaded(true);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      toast.error('يرجى إكمال جميع البيانات المطلوبة لإنشاء حسابك الجديد.'); return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast.error('تنسيق البريد الإلكتروني غير صحيح. يرجى التأكد من كتابته بشكل سليم (مثال: name@example.com).'); return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('كلمة المرور وتأكيدها غير متطابقين. يرجى التأكد من كتابة نفس كلمة المرور في كلا الحقلين.'); return;
    }
    if (formData.password.length < 8) {
      toast.error('كلمة المرور ضعيفة جداً. يجب أن تحتوي على 8 أحرف على الأقل لضمان أمن حسابك.'); return;
    }
    if (!agreeTerms) {
      toast.error('للمتابعة، يرجى قراءة والموافقة على الشروط والأحكام وسياسة الخصوصية الخاصة بنا.'); return;
    }

    setIsLoading(true);
    try {
      // الخطوة 1: إرسال رمز التحقق وحفظ البيانات مؤقتاً في الباك إند
      const result = await authService.sendVerificationCode({
        email: formData.email.trim().toLowerCase(),
        username: formData.email.trim().split('@')[0], // استخدام جزء من البريد كاسم مستخدم مبدئي
        password: formData.password,
        first_name: formData.fullName.trim(),
      });

      if (result.success) {
        toast.success(result.message || 'خطوة واحدة تفصلك! تم إرسال رمز التحقق إلى بريدك الإلكتروني، يرجى التحقق من صندوق الوارد (أو البريد المزعج).');

        // حفظ بيانات التسجيل في sessionStorage لاستخدامها في OTP
        sessionStorage.setItem('signup_data', JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          confirm_password: formData.confirmPassword,
          first_name: formData.fullName.trim(),
        }));

        // ننتقل لصفحة OTP أولاً، ثم نغلق المودال لتجنب تعارض الـ Rendering
        setLocation(`/otp-verification?email=${encodeURIComponent(formData.email)}&type=signup`);
        if (onClose) {
          // تأخير بسيط لضمان بدء التنقل قبل تغيير حالة المودال في الصفحة الرئيسية
          setTimeout(onClose, 100);
        }
      } else {
        toast.error(result.message || 'لم نتمكن من إرسال رمز التحقق حالياً. يرجى المحاولة مرة أخرى أو التواصل مع الدعم إذا استمرت المشكلة.');
      }
    } catch (err: any) {
      console.error('Signup error detail:', err);
      const data = err?.response?.data;
      
      // التحقق من وجود رسالة في الاستجابة أو في الخطأ نفسه
      const errorMessage = 
        data?.message || 
        data?.detail || 
        err?.message || 
        'حدث خطأ غير متوقع أثناء محاولة التسجيل. يرجى التحقق من اتصالك والمحاولة مجدداً.';
      
      toast.error(errorMessage);

      // إذا كان الحساب محظوراً، نوجهه لصفحة الـ OTP ليظهر له العداد التنازلي
      if (data?.data?.locked) {
        const remaining = data.data.remaining_seconds || 60;
        setLocation(`/otp-verification?email=${encodeURIComponent(formData.email)}&type=signup&locked=true&remaining=${remaining}`);
        if (onClose) setTimeout(onClose, 100);
      }
    } finally {
      setIsLoading(false);
    }
  }, [formData, agreeTerms, onClose, setLocation]);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="signup-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30"
          onClick={onClose}
        >
          <motion.div
            key="signup-modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.2 }}
            className="w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 bg-white rounded-2xl shadow-2xl overflow-hidden relative">
              <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.95 }} onClick={onClose}
                className="absolute top-4 right-4 z-[110] text-gray-900 hover:text-red-600 transition-all bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-md border border-gray-100">
                <X size={20} />
              </motion.button>

              {/* الصورة */}
              <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, duration: 0.3 }}
                className="hidden lg:flex flex-col p-8 relative overflow-hidden h-full min-h-[600px]"
                style={{ backgroundImage: imageLoaded ? 'url(/images/logn.jpg)' : 'none', backgroundColor: imageLoaded ? 'transparent' : '#1e40af', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.3 }} className="relative z-10">
                  <h2 className="text-4xl font-bold text-white mb-2">Car History</h2>
                  <p className="text-white/90 text-lg">انضم إلينا اليوم</p>
                </motion.div>
              </motion.div>

              {/* النموذج */}
              <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.3 }}
                className="p-8 md:p-12 flex flex-col justify-center bg-white overflow-y-auto max-h-[90vh]">
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">إنشاء حساب</h1>
                  <p className="text-gray-600">ابدأ رحلتك معنا للحصول على تقارير دقيقة</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* الاسم */}
                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-900">الاسم</label>
                    <div className="relative">
                      <User className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input type="text" placeholder="أدخل اسمك" value={formData.fullName}
                        onChange={update('fullName')}
                        className="w-full px-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" required />
                    </div>
                  </div>

                  {/* البريد */}
                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-900">البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input type="email" placeholder="example@mail.com" value={formData.email}
                        onChange={update('email')}
                        className="w-full px-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        required dir="ltr" autoComplete="email" />
                    </div>
                  </div>

                  {/* كلمتا المرور */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-900">كلمة المرور</label>
                      <div className="relative">
                        <Lock className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={formData.password}
                          onChange={update('password')}
                          className={`w-full px-4 pr-12 pl-14 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${formData.password && passwordStrength < 3 ? 'border-red-300' : 'border-gray-200'}`} required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1.5">
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      
                      {/* Password Strength Bar */}
                      {formData.password && (
                        <div className="mt-2 space-y-1">
                          <div className="flex gap-1 h-1">
                            {[1, 2, 3, 4, 5].map((level) => (
                              <div key={level} className={`flex-1 rounded-full transition-all duration-500 ${level <= passwordStrength ? (passwordStrength <= 2 ? 'bg-red-500' : passwordStrength <= 3 ? 'bg-yellow-500' : 'bg-green-500') : 'bg-gray-200'}`} />
                            ))}
                          </div>
                          <p className={`text-[10px] font-bold ${passwordStrength <= 2 ? 'text-red-500' : passwordStrength <= 3 ? 'text-yellow-600' : 'text-green-600'}`}>
                            قوة كلمة المرور: {passwordStrength === 1 ? 'ضعيفة جداً' : passwordStrength === 2 ? 'ضعيفة' : passwordStrength === 3 ? 'متوسطة' : passwordStrength === 4 ? 'قوية' : 'قوية جداً'}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-900">تأكيد كلمة المرور</label>
                      <div className="relative">
                        <Lock className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" value={formData.confirmPassword}
                          onChange={update('confirmPassword')}
                          className={`w-full px-4 pr-12 pl-14 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-300' : 'border-gray-200'}`} required />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1.5">
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">كلمات المرور غير متطابقة</p>
                      )}
                    </div>
                  </div>

                  {/* الموافقة على الشروط */}
                  <div className="flex items-start gap-2 pt-2">
                    <input type="checkbox" id="agree" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="w-4 h-4 mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <label htmlFor="agree" className="text-sm text-gray-600">
                      أوافق على{' '}
                      <button type="button" className="text-blue-600 font-bold hover:underline">الشروط والأحكام</button>
                      {' '}و{' '}
                      <button type="button" className="text-blue-600 font-bold hover:underline">سياسة الخصوصية</button>
                    </label>
                  </div>

                  <button type="submit" disabled={isLoading}
                    className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2 mt-4">
                    {isLoading ? (
                      <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />جاري إرسال رمز التحقق...</>
                    ) : 'إرسال رمز التحقق'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-gray-600">
                    لديك حساب بالفعل؟{' '}
                    <button onClick={onSwitchToLogin} className="text-blue-600 font-bold hover:underline">تسجيل الدخول</button>
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
