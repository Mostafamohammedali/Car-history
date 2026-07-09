/**
 * @file UserProfileCard.tsx
 * @description مكون بطاقة الملف الشخصي لتطبيق Car History
 * يعرض معلومات المستخدم الشخصية مع خيارات التفاعل
 * يتضمن رسوم متحركة وتصميم زجاجي عصري
 */

// استيراد المكتبات والمكونات اللازمة
import { motion } from 'framer-motion';
import { LogOut, Settings, Edit2, Mail, User, Shield, Calendar } from 'lucide-react';

/**
 * @interface UserProfileCardProps
 * @description خصائص مكون بطاقة الملف الشخصي
 * @property {string} userName - اسم المستخدم
 * @property {string} userEmail - البريد الإلكتروني للمستخدم
 * @property {string} userAvatar - صورة المستخدم
 * @property {string} joinDate - تاريخ انضمام المستخدم
 * @property {() => void} onLogout - دالة رد النداء لتسجيل الخروج
 * @property {() => void} onSettings - دالة رد النداء للإعدادات
 * @property {() => void} onEdit - دالة رد النداء للتعديل
 */
interface UserProfileCardProps {
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  joinDate?: string;
  onLogout?: () => void;
  onSettings?: () => void;
  onEdit?: () => void;
}

/**
 * @function UserProfileCard
 * @description بطاقة الملف الشخصي الرئيسية مع معلومات المستخدم
 * يعرض بيانات المستخدم مع خيارات التفاعل والرسوم المتحركة
 * @param {UserProfileCardProps} props - خصائص المكون
 * @returns {JSX.Element} بطاقة الملف الشخصي المعروضة
 */
export default function UserProfileCard({
  userName = 'أحمد محمد', // اسم المستخدم الافتراضي
  userEmail = 'ahmed@example.com', // البريد الإلكتروني الافتراضي
  userAvatar = '/images/logo.png', // صورة المستخدم الافتراضية
  joinDate = '2024-01-15', // تاريخ الانضمام الافتراضي
  onLogout,
  onSettings,
  onEdit,
}: UserProfileCardProps) {
  /**
   * @constant containerVariants
   * @description متغيرات الرسوم المتحركة للحاوية الرئيسية
   * يوفر حركة انزلاق من الأسفل للأعلى
   */
  const containerVariants = {
    hidden: { opacity: 0, y: 20 }, // الحالة الأولية: مخفي ومنزاح للأسفل
    visible: { opacity: 1, y: 0 }, // الحالة النهائية: ظاهر في مكانه
  };

  /**
   * @constant itemVariants
   * @description متغيرات الرسوم المتحركة للعناصر الفردية
   * يوفر حركة انزلاق من اليسار لليمين
   */
  const itemVariants = {
    hidden: { opacity: 0, x: -10 }, // الحالة الأولية: مخفي ومنزاح لليسار
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } }, // الحالة النهائية: ظاهر في مكانه
  };

  /**
   * @function formatDate
   * @description يقوم بتنسيق التاريخ باللغة العربية
   * @param {string} dateString - سلسلة تاريخ الإدخال
   * @returns {string} التاريخ المنسق باللغة العربية
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-md"
    >
      {/* Premium Glassmorphism Card */}
      <div className="relative group">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0066cc]/20 via-[#001a3d]/10 to-[#0099ff]/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />

        {/* Main Card */}
        <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#0066cc]/5 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#001a3d]/5 rounded-full blur-3xl -z-10" />

          {/* Header Section with Avatar */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center mb-8"
          >
            {/* Avatar Circle */}
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="relative mb-6"
            >
              <div className="w-24 h-24 rounded-full border-4 border-white/30 overflow-hidden shadow-xl backdrop-blur-sm bg-gradient-to-br from-[#0066cc]/20 to-[#001a3d]/20 p-1">
                <img
                  src={userAvatar}
                  alt={userName}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              {/* Online Status Indicator */}
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-3 border-white shadow-lg" />
            </motion.div>

            {/* User Name */}
            <motion.h2
              variants={itemVariants}
              className="text-2xl font-bold text-white text-center mb-1"
            >
              {userName}
            </motion.h2>

            {/* Premium Badge */}
            <motion.div
              variants={itemVariants}
              className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-[#0066cc]/30 to-[#0099ff]/30 border border-[#0099ff]/50 rounded-full backdrop-blur-sm"
            >
              <Shield size={14} className="text-[#60a5fa]" />
              <span className="text-xs font-semibold text-[#60a5fa]">مستخدم موثق</span>
            </motion.div>
          </motion.div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-6" />

          {/* User Info Section */}
          <motion.div
            variants={itemVariants}
            className="space-y-4 mb-8"
          >
            {/* Email */}
            <motion.div
              whileHover={{ x: -5 }}
              className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 border border-white/10 hover:border-white/20"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0066cc]/30 to-[#0099ff]/30 flex items-center justify-center border border-[#0099ff]/30">
                <Mail size={18} className="text-[#60a5fa]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/60 mb-1">البريد الإلكتروني</p>
                <p className="text-sm font-semibold text-white truncate">{userEmail}</p>
              </div>
            </motion.div>

            {/* Join Date */}
            <motion.div
              whileHover={{ x: -5 }}
              className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 border border-white/10 hover:border-white/20"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0066cc]/30 to-[#0099ff]/30 flex items-center justify-center border border-[#0099ff]/30">
                <Calendar size={18} className="text-[#60a5fa]" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-white/60 mb-1">تاريخ الانضمام</p>
                <p className="text-sm font-semibold text-white">{formatDate(joinDate)}</p>
              </div>
            </motion.div>

            {/* Account Status */}
            <motion.div
              whileHover={{ x: -5 }}
              className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 border border-white/10 hover:border-white/20"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center border border-green-500/30">
                <Shield size={18} className="text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-white/60 mb-1">حالة الحساب</p>
                <p className="text-sm font-semibold text-green-400">نشط ومفعل</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-6" />

          {/* Action Buttons */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-3 gap-3"
          >
            {/* Edit Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onEdit}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-[#0066cc]/30 to-[#0099ff]/30 border border-[#0099ff]/50 hover:border-[#0099ff]/80 transition-all duration-200 hover:shadow-lg hover:shadow-[#0099ff]/20"
            >
              <Edit2 size={20} className="text-[#60a5fa]" />
              <span className="text-xs font-semibold text-[#60a5fa]">تعديل</span>
            </motion.button>

            {/* Settings Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSettings}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-[#0066cc]/30 to-[#0099ff]/30 border border-[#0099ff]/50 hover:border-[#0099ff]/80 transition-all duration-200 hover:shadow-lg hover:shadow-[#0099ff]/20"
            >
              <Settings size={20} className="text-[#60a5fa]" />
              <span className="text-xs font-semibold text-[#60a5fa]">الإعدادات</span>
            </motion.button>

            {/* Logout Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onLogout}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-red-500/30 to-pink-500/30 border border-red-500/50 hover:border-red-500/80 transition-all duration-200 hover:shadow-lg hover:shadow-red-500/20"
            >
              <LogOut size={20} className="text-red-400" />
              <span className="text-xs font-semibold text-red-400">تسجيل الخروج</span>
            </motion.button>
          </motion.div>

          {/* Footer Info */}
          <motion.div
            variants={itemVariants}
            className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 text-center"
          >
            <p className="text-xs text-white/60">
              حسابك محمي بتشفير عالي المستوى
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
