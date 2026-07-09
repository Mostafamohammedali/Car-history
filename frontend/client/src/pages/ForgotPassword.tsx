/**
 * @file ForgotPassword.tsx
 * @description صفحة نسيت كلمة المرور - مربوطة بالكامل مع الباك إند
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Check, X, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services/authService';

interface ForgotPasswordProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSwitchToLogin?: () => void;
}

export default function ForgotPassword({ isOpen = true, onClose }: ForgotPasswordProps) {
  const [, setLocation] = useLocation();
  const [email, setEmail]       = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('يرجى كتابة البريد الإلكتروني الخاص بك لنتمكن من إرسال رمز الاستعادة.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('البريد الإلكتروني المدخل غير صالح. يرجى التأكد من كتابته بشكل صحيح (مثال: name@example.com).'); return;
    }

    setIsLoading(true);
    try {
      const result = await authService.passwordReset(email.trim().toLowerCase());

      if (result.success) {
        toast.success(result.message || 'تم إرسال رمز التحقق بنجاح! يرجى فحص بريدك الإلكتروني لإكمال عملية استعادة كلمة المرور.');
        // الانتقال إلى صفحة OTP مع نوع reset
        setLocation(`/otp-verification?email=${encodeURIComponent(email)}&type=reset`);
      } else {
        toast.error(result.message || 'نعتذر، واجهنا مشكلة في إرسال الرمز. يرجى المحاولة مرة أخرى بعد قليل أو التأكد من صحة البريد.');
      }
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = data?.message || 'حدث خطأ غير متوقع. يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.';
      toast.error(msg);
      
      // إذا كان الحساب محظوراً، نوجهه لصفحة الـ OTP ليظهر له العداد التنازلي
      if (data?.data?.locked) {
        const remaining = data.data.remaining_seconds || 60;
        setLocation(`/otp-verification?email=${encodeURIComponent(email)}&type=reset&locked=true&remaining=${remaining}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const features = ['استعادة بسهولة', 'تحقق OTP', 'كلمة آمنة', 'حماية عالية'];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[8px]" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', duration: 0.5 }}
            className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 bg-white rounded-2xl shadow-2xl overflow-hidden relative">
              <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.95 }} onClick={onClose}
                className="absolute top-4 right-4 z-[110] text-gray-900 hover:text-red-600 transition-all bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-md border border-gray-100">
                <X size={20} />
              </motion.button>

              {/* الصورة */}
              <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
                className="hidden lg:flex flex-col justify-between p-8 relative overflow-hidden h-full min-h-[600px]"
                style={{ backgroundImage: 'url(/images/car-ho.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }} className="relative z-10">
                  <h2 className="text-4xl font-bold text-white mb-2">Car History</h2>
                  <p className="text-white/90 text-lg">استعادة حسابك بأمان</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}
                  className="relative z-10 grid grid-cols-2 gap-4">
                  {features.map((f, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.1 }} className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-blue-500/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                        <Check size={12} className="text-white" />
                      </div>
                      <span className="text-white text-sm font-medium">{f}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>

              {/* النموذج */}
              <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
                className="p-8 md:p-12 flex flex-col justify-center bg-white">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">نسيت كلمة المرور؟</h1>
                  <p className="text-gray-600">أدخل بريدك الإلكتروني لاستعادة حسابك</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-900">البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input type="email" placeholder="example@mail.com" value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        required dir="ltr" autoComplete="email" />
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 bg-blue-50 p-4 rounded-xl border border-blue-100">
                    سنرسل رمز التحقق (OTP) إلى بريدك الإلكتروني. استخدمه للتحقق من هويتك وتعيين كلمة مرور جديدة.
                  </p>

                  <button type="submit" disabled={isLoading}
                    className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />جاري الإرسال...</>
                    ) : (<>إرسال رمز التحقق <ArrowRight size={18} /></>)}
                  </button>

                  <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-200">
                    <span className="text-sm text-gray-600">هل تتذكر كلمة المرور؟</span>
                    <button type="button" onClick={() => setLocation('/')}
                      className="text-sm text-blue-600 font-semibold hover:text-blue-700">
                      عد إلى الصفحة الرئيسية
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
