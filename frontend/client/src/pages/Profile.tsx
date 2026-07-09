import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, Shield, FileText, Loader2, User, Mail, 
  Calendar, Clock, CheckCircle, AlertCircle, Key,
  History, Activity, Briefcase, LogOut, Edit3, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { authService, UserProfile as UserProfileType } from '@/services/authService';
import { carService } from '@/services/carService';

interface ProfileStats {
  reports_count: number;
  saved_cars: number;
  vin_searches: number;
}

interface UserActivity {
  id: number;
  type: string;
  type_display: string;
  description: string;
  created_at: string;
}

export default function Profile() {
  const [, setLocation] = useLocation();
  const { user: globalUser, logout, updateProfile } = useAuthStore();

  const [user, setUser]           = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm]   = useState({ name: '' });

  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      try {
        const profileRes = await authService.getProfile();
        if (profileRes.success && profileRes.data?.user) {
          setUser(profileRes.data.user);
          setEditForm({
            name: profileRes.data.user.name || '',
          });
        } else {
          toast.error('عذراً، يجب عليك تسجيل الدخول أولاً للوصول إلى صفحة الملف الشخصي.');
          setLocation('/');
        }
      } catch (error: any) {
        toast.error(error.message || 'نعتذر، واجهنا مشكلة في جلب بيانات حسابك. يرجى التحقق من اتصالك والمحاولة مجدداً.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, [setLocation]);

  const handleLogout = async () => {
    await logout();
    toast.success('تم تسجيل خروجك بنجاح. نتطلع لرؤيتك مرة أخرى قريباً!');
    setLocation('/');
  };

  const handleSaveEdit = async () => {
    try {
      const result = await updateProfile(editForm);
      if (result.success) {
        setUser((prev: any) => prev ? { ...prev, ...editForm } : prev);
        toast.success('رائع! تم تحديث معلومات ملفك الشخصي بنجاح.');
        setIsEditing(false);
      }
    } catch (error: any) {
      toast.error(error.message || 'نعتذر، لم نتمكن من حفظ التغييرات حالياً. يرجى التأكد من البيانات المدخلة والمحاولة مرة أخرى.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        <p className="text-gray-500 font-medium">جاري جلب بياناتك...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc] pb-20">
      {/* Dynamic Background Header */}
      <div className="bg-gradient-to-br from-[#001a3d] via-[#002f6c] to-[#001a3d] pt-28 pb-48 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none" 
          style={{ backgroundImage: 'radial-gradient(#fff 1.5px, transparent 1.5px)', backgroundSize: '40px 40px' }} />
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" 
        />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div 
            initial={{ y: 20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }}
            className="inline-block relative mb-8"
          >
            <div className="w-36 h-36 md:w-44 md:h-44 rounded-[40px] bg-white/10 backdrop-blur-2xl border-2 border-white/20 p-2 shadow-2xl transition-transform hover:rotate-3 duration-500">
              <img src="/images/logo.png" alt="Avatar" className="w-full h-full object-contain" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-green-500 w-10 h-10 rounded-2xl border-4 border-[#002f6c] flex items-center justify-center shadow-xl">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            </div>
          </motion.div>
          
          <motion.h1 
            initial={{ y: 20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight"
          >
            {user?.name || user?.username}
          </motion.h1>
          <motion.div 
            initial={{ y: 20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-6 text-white/70"
          >
            <span className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <Mail size={16} />
              {user?.email}
            </span>
            <span className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <User size={16} />
              @{user?.username}
            </span>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-24 relative z-20">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Main Info Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Account Status Card */}
            <motion.div 
              initial={{ x: -20, opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="md:col-span-1 bg-white rounded-[40px] shadow-2xl shadow-blue-900/5 border border-gray-100 p-8 flex flex-col justify-between"
            >
              <div>
                <h3 className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-6">حالة الحساب</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">التحقق من البريد</span>
                    {user?.is_email_verified ? (
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1">
                        <CheckCircle size={12} /> موثق
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1">
                        <AlertCircle size={12} /> غير موثق
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">نشاط الحساب</span>
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-xs font-black">نشط حالياً</span>
                  </div>
                </div>
              </div>
              <div className="mt-12 pt-8 border-t border-gray-50 text-center">
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-tighter">معرف المستخدم الفريد</p>
                <p className="text-2xl font-black text-gray-900 tracking-[0.2em]">#{user?.id?.toString().padStart(6, '0')}</p>
              </div>
            </motion.div>

            {/* Detailed Info Card */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="md:col-span-2 bg-white rounded-[40px] shadow-2xl shadow-blue-900/5 border border-gray-100 p-10"
            >
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-black text-gray-900">المعلومات الشخصية</h2>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all duration-300"
                >
                  <Edit3 size={20} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">الاسم الكامل</label>
                  <p className="text-xl font-bold text-gray-900">{user?.name || '—'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">اسم المستخدم</label>
                  <p className="text-xl font-bold text-gray-900">{user?.username}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">البريد الإلكتروني</label>
                  <p className="text-xl font-bold text-gray-900 break-all">{user?.email}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">تاريخ الانضمام</label>
                  <p className="text-xl font-bold text-gray-900">{new Date(user?.date_joined).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>

              <div className="mt-12 p-6 bg-gray-50 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-blue-600">
                    <Clock size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold">آخر تسجيل دخول</p>
                    <p className="text-sm font-bold text-gray-800">{user?.last_login ? new Date(user.last_login).toLocaleString('ar-SA') : 'أول مرة لك هنا!'}</p>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full sm:w-auto px-8 py-3 bg-white text-red-500 font-bold rounded-2xl border border-red-50 sm:border-transparent hover:border-red-100 transition-all shadow-sm"
                >
                  تسجيل الخروج
                </button>
              </div>
            </motion.div>
          </div>

          {/* Additional "Everything" Data Display (Minimalistic) */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-white/40 backdrop-blur-md rounded-[40px] border border-white p-10 text-center"
          >
            <p className="text-gray-500 font-medium mb-2">هذا الملف يمثل هويتك الرقمية الكاملة في <span className="text-blue-600 font-black">Car History</span></p>
            <div className="flex justify-center gap-4 opacity-30 grayscale pointer-events-none mt-6">
              <Shield size={32} />
              <Key size={32} />
              <Activity size={32} />
            </div>
          </motion.div>

        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditing(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg relative z-10 overflow-hidden">
              <div className="p-8 border-b border-gray-50">
                <h2 className="text-3xl font-bold text-gray-900">تعديل الملف</h2>
                <p className="text-gray-500 mt-1">تحديث اسمك الشخصي</p>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 mr-2">الاسم</label>
                  <input 
                    type="text" 
                    value={editForm.name} 
                    onChange={(e) => setEditForm({ name: e.target.value })} 
                    className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-100 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium" 
                    placeholder="أدخل اسمك الكامل"
                  />
                </div>
              </div>
              <div className="p-8 bg-gray-50 flex gap-4">
                <button onClick={handleSaveEdit} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">حفظ التغييرات</button>
                <button onClick={() => setIsEditing(false)} className="flex-1 py-4 bg-white text-gray-500 rounded-2xl font-bold border border-gray-200 hover:bg-gray-100 transition-all">إلغاء</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
