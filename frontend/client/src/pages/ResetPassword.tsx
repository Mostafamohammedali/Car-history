/**
 * @file ResetPassword.tsx
 * @description إعادة تعيين كلمة المرور - مربوطة بالكامل مع الباك إند
 * تستخدم البيانات المحفوظة في sessionStorage من خطوة OTP
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, Check, X, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services/authService';

interface ResetPasswordProps {
  isOpen?: boolean;
  onClose?: () => void;
  onResetSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export default function ResetPassword({ isOpen = true, onClose, onResetSuccess }: ResetPasswordProps) {
  const [, setLocation] = useLocation();
  const [newPassword, setNewPassword]           = useState('');
  const [confirmPassword, setConfirmPassword]   = useState('');
  const [showPassword, setShowPassword]         = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading]               = useState(false);

  const passwordStrength = {
    hasMinLength:   newPassword.length >= 8,
    hasUpperCase:   /[A-Z]/.test(newPassword),
    hasLowerCase:   /[a-z]/.test(newPassword),
    hasNumbers:     /\d/.test(newPassword),
    hasSpecialChar: /[!@#$%^&*]/.test(newPassword),
  };
  const isPasswordStrong = Object.values(passwordStrength).filter(Boolean).length >= 4;
  const passwordsMatch   = newPassword === confirmPassword && newPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) { toast.error('يرجى إدخال كلمة المرور الجديدة وتأكيدها للمتابعة.'); return; }
    if (!isPasswordStrong)  { toast.error('كلمة المرور لا تستوفي معايير الأمان المطلوبة. يرجى اتباع الإرشادات الموضحة بالأسفل.'); return; }
    if (!passwordsMatch)    { toast.error('تأكيد كلمة المرور لا يطابق كلمة المرور الجديدة. يرجى إعادة الكتابة بدقة.'); return; }

    // استرجاع البيانات المحفوظة من خطوة OTP
    const resetData = JSON.parse(sessionStorage.getItem('reset_data') || '{}');
    if (!resetData.email || !resetData.code) {
      toast.error('عذراً، انتهت صلاحية الجلسة لأسباب أمنية. يرجى طلب رمز استعادة جديد للبدء من جديد.');
      setLocation('/forgotpassword');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.resetPasswordConfirm(
        resetData.email, resetData.code, newPassword, confirmPassword
      );

      if (result.success) {
        sessionStorage.removeItem('reset_data');
        toast.success('رائع! تم تغيير كلمة المرور الخاصة بك بنجاح. يمكنك الآن استخدامها لتسجيل الدخول.');
        onResetSuccess?.();
        setTimeout(() => setLocation('/'), 60);
      } else {
        toast.error(result.message || 'نعتذر، لم نتمكن من تحديث كلمة المرور حالياً. يرجى المحاولة مرة أخرى.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'وقع خطأ غير متوقع أثناء تحديث كلمة المرور. يرجى التأكد من اتصالك والمحاولة مجدداً.');
    } finally {
      setIsLoading(false);
    }
  };

  const features = ['كلمة آمنة', 'تشفير عالي', 'حماية بيانات', 'وصول آمن'];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[8px]">
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
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
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="relative z-10">
                  <h2 className="text-4xl font-bold text-white mb-2">Car History</h2>
                  <p className="text-white/90 text-lg">كلمة مرور جديدة آمنة</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                  className="relative z-10 grid grid-cols-2 gap-4">
                  {features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-blue-500/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                        <Check size={12} className="text-white" />
                      </div>
                      <span className="text-white text-sm font-medium">{f}</span>
                    </div>
                  ))}
                </motion.div>
              </motion.div>

              {/* النموذج */}
              <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
                className="p-8 md:p-12 flex flex-col justify-center bg-white max-h-[90vh] overflow-y-auto">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">تعيين كلمة مرور جديدة</h1>
                  <p className="text-gray-600">أدخل كلمة مرور قوية وآمنة لحسابك</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* كلمة المرور الجديدة */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-900">كلمة المرور الجديدة</label>
                    <div className="relative">
                      <Lock className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 pr-12 pl-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* مؤشر القوة */}
                  {newPassword && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                      className="space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs font-semibold text-gray-700">معايير قوة كلمة المرور:</p>
                      <div className="space-y-2">
                        {[
                          { label: 'على الأقل 8 أحرف', check: passwordStrength.hasMinLength },
                          { label: 'حرف كبير (A-Z)',    check: passwordStrength.hasUpperCase },
                          { label: 'حرف صغير (a-z)',    check: passwordStrength.hasLowerCase },
                          { label: 'رقم (0-9)',         check: passwordStrength.hasNumbers },
                          { label: 'رمز خاص (!@#$%)',  check: passwordStrength.hasSpecialChar },
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${item.check ? 'bg-green-500' : 'bg-gray-300'}`}>
                              {item.check && <Check size={12} className="text-white" />}
                            </div>
                            <span className={item.check ? 'text-green-700' : 'text-gray-600'}>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* تأكيد كلمة المرور */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-900">تأكيد كلمة المرور</label>
                    <div className="relative">
                      <Lock className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 pr-12 pl-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" required />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {confirmPassword && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className={`flex items-center gap-2 p-3 rounded-lg ${passwordsMatch ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${passwordsMatch ? 'bg-green-500' : 'bg-red-500'}`}>
                        {passwordsMatch ? <Check size={14} className="text-white" /> : <X size={14} className="text-white" />}
                      </div>
                      <span className={`text-sm font-medium ${passwordsMatch ? 'text-green-700' : 'text-red-700'}`}>
                        {passwordsMatch ? 'كلمات المرور متطابقة' : 'كلمات المرور غير متطابقة'}
                      </span>
                    </motion.div>
                  )}

                  <button type="submit" disabled={isLoading || !isPasswordStrong || !passwordsMatch}
                    className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isLoading ? (
                      <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />جاري التعيين...</>
                    ) : (<>تعيين كلمة المرور <ArrowRight size={18} /></>)}
                  </button>
                </form>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
