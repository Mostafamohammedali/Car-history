/**
 * @file OTPVerification.tsx
 * @description التحقق برمز OTP - مربوط بالكامل مع الباك إند
 * للتسجيل: يتحقق من الرمز ثم يكمل إنشاء الحساب
 * لإعادة التعيين: يتحقق من الرمز ثم ينتقل لصفحة كلمة المرور الجديدة
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ArrowRight, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

interface OTPVerificationProps {
  isOpen?: boolean;
  email?: string;
  onClose?: () => void;
  onVerificationSuccess?: () => void;
  onResendOTP?: () => void;
  type?: 'signup' | 'reset';
}

export default function OTPVerification({
  isOpen = true, email = '', onClose, onVerificationSuccess, onResendOTP, type = 'signup',
}: OTPVerificationProps) {
  const [locationPath, setLocation] = useLocation();
  const { checkAuth } = useAuthStore();

  const [otp, setOtp]           = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft]   = useState(60); // صلاحية الرمز 15 دقيقة
  const [resendTimer, setResendTimer] = useState(60); // وقت انتظار إعادة الإرسال 60 ثانية
  const [canResend, setCanResend] = useState(false);
  
  // منطق الحظر (Lockout)
  const [lockoutTime, setLockoutTime] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  // استخراج المعاملات من الرابط بشكل أكثر موثوقية
  const getParam = (name: string) => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get(name)) return searchParams.get(name);
    
    // محاولة الاستخراج من الجزء بعد الـ # إذا كان موجوداً (للتوافق مع بعض أنظمة التوجيه)
    const hash = window.location.hash;
    if (hash.includes('?')) {
      const hashParams = new URLSearchParams(hash.split('?')[1]);
      if (hashParams.get(name)) return hashParams.get(name);
    }
    return '';
  };

  const emailFromUrl    = getParam('email') || email;
  const verificationType = (getParam('type') || type) as 'signup' | 'reset';

  useEffect(() => {
    // التحقق مما إذا كان المستخدم محظوراً بالفعل عند الدخول (من معلمات URL)
    const wasLocked = getParam('locked') === 'true';
    const remaining = parseInt(getParam('remaining') || '0');

    if (wasLocked && remaining > 0) {
      setLockoutTime(remaining);
      setIsLocked(true);
      setCanResend(false);
      toast.error(`نظراً لمحاولات عديدة خاطئة، هذا البريد محظور حالياً. يرجى الانتظار ${remaining} ثانية.`);
    }

    if (!emailFromUrl) {
      toast.error('لم يتم توفير بريد إلكتروني للتحقق. سيتم إرجاعك للصفحة السابقة.');
      setTimeout(() => setLocation('/'), 3000);
    }
  }, [emailFromUrl, setLocation]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // مؤقت إعادة الإرسال منفصل
  useEffect(() => {
    if (resendTimer <= 0) { setCanResend(true); return; }
    setCanResend(false);
    const timer = setInterval(() => setResendTimer((p) => p - 1), 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  // مؤقت الحظر
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (lockoutTime > 0) {
      setIsLocked(true);
      timer = setInterval(() => {
        setLockoutTime((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutTime]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(0, 1);
    setOtp(next);
    if (value && index < 5) {
      (document.getElementById(`otp-${index + 1}`) as HTMLInputElement)?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      (document.getElementById(`otp-${index - 1}`) as HTMLInputElement)?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) { toast.error('الرمز المدخل غير مكتمل. يرجى إدخال جميع الأرقام الستة المكونة لرمز التحقق.'); return; }
    if (isLocked) { 
      toast.error('نظراً لمحاولات عديدة خاطئة، تم قفل الحساب مؤقتاً لحمايتك.'); 
      toast.error('نظراً لمحاولات عديدة خاطئة، تم قفل الحساب مؤقتاً لحمايتك.'); 
      return; 
    }

    setIsLoading(true);
    try {
      const result = await authService.verifyEmail(emailFromUrl, code, verificationType);

      if (result.success) {
        toast.success(result.message || 'رائع! تم التحقق من هويتك بنجاح. يمكنك الآن المتابعة.');
        if (verificationType === 'signup') {
          sessionStorage.removeItem('signup_data');
          
          // حفظ التوكنات فوراً لضمان تسجيل الدخول التلقائي
          if (result.data?.tokens) {
            localStorage.setItem('access_token', result.data.tokens.access);
            localStorage.setItem('refresh_token', result.data.tokens.refresh);
          }
          
          // تحديث حالة المصادقة فوراً ليتغير شريط التنقل
          await checkAuth();
          onVerificationSuccess?.();
          
          // توجيه المستخدم للصفحة الرئيسية كعضو مسجل
          setLocation('/');
          if (onClose) setTimeout(onClose, 100);
        } else {
          sessionStorage.setItem('reset_data', JSON.stringify({ email: emailFromUrl, code }));
          setLocation('/reset-password');
        }
      } else {
        toast.error(result.message || 'الرمز الذي أدخلته غير صحيح. يرجى التأكد من الرمز المرسل إليك والمحاولة مرة أخرى.');
      }
    } catch (err: any) {
      const data = err?.response?.data;
      const message = data?.message || 'رمز التحقق غير صحيح أو منتهي الصلاحية';
      
      if (data?.data?.locked) {
        // استخدام الوقت الحقيقي من الخادم
        const remaining = data.data.remaining_seconds || 60;
        setLockoutTime(remaining);
        setIsLocked(true);
        setCanResend(false);
        toast.error('عذراً، لقد استنفدت عدد المحاولات المسموح بها. تم قفل الحساب مؤقتاً لأغراض أمنية.', { duration: 5000 });

      } else if (data?.data?.remaining_attempts !== undefined) {
        toast.error(`${message} — متبقي ${data.data.remaining_attempts} محاولات`);
      } else {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    // منع إعادة الإرسال إذا كان الحظر لا يزال سارياً
    if (isLocked || lockoutTime > 0) {
      toast.error(`يرجى الانتظار لانتهاء الحظر.`);
      return;
    }
    if (!canResend) return;

    try {
      let result;
      if (verificationType === 'reset') {
        result = await authService.passwordReset(emailFromUrl);
      } else {
        const signupData = JSON.parse(sessionStorage.getItem('signup_data') || '{}');
        result = await authService.sendVerificationCode({
          email: emailFromUrl,
          username: signupData.username || emailFromUrl.split('@')[0],
          password: signupData.password,
          first_name: signupData.first_name,
        });
      }

      if (result.success) {
        toast.success('تم إرسال رمز تحقق جديد بنجاح! يرجى فحص بريدك الإلكتروني الآن.');
        setTimeLeft(60);
        setResendTimer(60);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        onResendOTP?.();
      } else {
        // الخادم رفض الطلب — قد يكون الحظر لا يزال سارياً
        const data = (result as any)?.data;
        if (data?.locked) {
          const remaining = data.remaining_seconds || 180;
          setLockoutTime(remaining);
          setIsLocked(true);
          setCanResend(false);
        }
        toast.error(result.message || 'لم نتمكن من إعادة إرسال الرمز حالياً. يرجى المحاولة بعد قليل أو التأكد من استقرار اتصالك.');
      }
    } catch (err: any) {
      const data = err?.response?.data?.data;
      if (data?.locked) {
        const remaining = data.remaining_seconds || 60;
        setLockoutTime(remaining);
        setIsLocked(true);
        setCanResend(false);
        toast.error('هذا البريد محظور حالياً من طلب رموز جديدة.');
      }
      toast.error(err?.response?.data?.message || 'فشل إعادة إرسال الرمز');
    }
  };




  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const features = ['تحقق آمن', 'رمز OTP', 'صلاحية محدودة', 'حماية عالية'];

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="otp-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[8px]"
          onClick={onClose}
        >
          <motion.div
            key="otp-modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
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
                  <p className="text-white/90 text-lg">التحقق الآمن من هويتك</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}
                  className="relative z-10 grid grid-cols-2 gap-4">
                  {features.map((feature, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }} className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-blue-500/40 backdrop-blur-md rounded-full flex items-center justify-center flex-shrink-0 border border-white/20">
                        <Check size={12} className="text-white" />
                      </div>
                      <span className="text-white text-sm font-medium">{feature}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>

              {/* النموذج */}
              <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
                className="p-8 md:p-12 flex flex-col justify-center bg-white">
                
                {isLocked ? (
                  <div className="text-center space-y-6 py-8">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-100">
                      <Clock size={40} className="text-red-500 animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">تجاوزت المحاولات المسموح بها</h2>
                      <p className="text-gray-600 px-4">
                        يرجى إرسال رمز جديد والمحاولة مرة أخرى بعد انتهاء العد التنازلي التالي:
                      </p>
                    </div>
                    
                    <div className="text-6xl font-black text-red-600 font-mono tracking-tighter bg-red-50 py-4 rounded-2xl border border-red-100 shadow-inner">
                      {formatTime(lockoutTime)}
                    </div>

                    <div className="pt-6">
                      <button 
                        type="button" 
                        onClick={onClose}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-all underline underline-offset-4"
                      >
                        العودة والمحاولة لاحقاً
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-8">
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">التحقق من البريد</h1>
                      <p className="text-gray-600">
                        أدخل رمز التحقق المرسل إلى <span className="font-semibold text-gray-900">{emailFromUrl}</span>
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-900">رمز التحقق (OTP)</label>
                        <div className="flex gap-2 justify-center">
                          {otp.map((digit, i) => (
                            <motion.input key={i} id={`otp-${i}`} type="text" inputMode="numeric" maxLength={1}
                              value={digit} onChange={(e) => handleOtpChange(i, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(i, e)}
                              className="w-12 h-12 text-center text-2xl font-bold bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                              whileFocus={{ scale: 1.05 }} />
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-2 text-sm text-gray-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                        <Clock size={16} className="text-amber-600" />
                        <span>انتهاء الصلاحية في: <span className="font-bold text-amber-600">{formatTime(timeLeft)}</span></span>
                      </div>

                      <button type="submit" disabled={isLoading}
                        className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2">
                        {isLoading ? (
                          <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />جاري التحقق...</>
                        ) : (<>تحقق من الرمز <ArrowRight size={18} /></>)}
                      </button>

                      <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-200">
                        <span className="text-sm text-gray-600">لم تستقبل الرمز؟</span>
                        <button type="button" onClick={handleResend} disabled={!canResend}
                          className={`text-sm font-semibold transition-all ${canResend ? 'text-blue-600 hover:text-blue-700 cursor-pointer' : 'text-gray-400 cursor-not-allowed'}`}>
                          {canResend ? 'إعادة إرسال الرمز' : `إعادة الإرسال بعد ${formatTime(resendTimer)}`}
                        </button>
                      </div>

                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button type="button" onClick={() => setLocation('/')}
                          className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                          عد إلى الصفحة الرئيسية
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
