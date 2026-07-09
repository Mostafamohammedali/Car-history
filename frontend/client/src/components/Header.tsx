/**
 * @file Header.tsx
 * @description مكون رأس التنقل الرئيسي لتطبيق Car History
 * يوفر تنقلًا متجاوبًا وعناصر تحكم مصادقة المستخدم وتنسيقًا قائمًا على التمرير
 * يتضمن قائمة الجوال والقائمة المنسدلة لملف تعريف المستخدم وتأثيرات الخلفية الديناميكية
 */

import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown, User, LogIn, UserPlus, Shield } from 'lucide-react';

/**
 * @interface HeaderProps
 * @description خصائص مكون الرأس
 * @property {() => void} onLoginClick - دالة رد النداء لفتح نافذة تسجيل الدخول
 * @property {() => void} onSignupClick - دالة رد النداء لفتح نافذة تسجيل المستخدمين
 * @property {boolean} isLoggedIn - حالة مصادقة المستخدم
 * @property {{ name: string; email: string; avatar?: string }} userProfile - معلومات ملف تعريف المستخدم
 * @property {() => void} onProfileClick - دالة رد النداء للتعامل مع نقرة ملف التعريف
 * @property {() => void} onLogout - دالة رد النداء للتعامل مع خروج المستخدم
 */
interface HeaderProps {
  onLoginClick?: () => void;
  onSignupClick?: () => void;
  isLoggedIn?: boolean;
  userProfile?: { name: string; email: string; avatar?: string; isAdmin?: boolean };
  onProfileClick?: () => void;
  onLogout?: () => void;
}

/**
 * @function Header
 * @description رأس التنقل الرئيسي مع تصميم متجاوب وعناصر تحكم المستخدم
 * يدير قائمة الجوال وتأثيرات التمرير وحالة مصادقة المستخدم
 * @param {HeaderProps} props - خصائص المكون
 * @returns {JSX.Element} مكون الرأس المعروض مع التنقل
 */
export default function Header({ onLoginClick, onSignupClick, isLoggedIn = false, userProfile, onProfileClick, onLogout }: HeaderProps) {
  const [location, setLocation] = useLocation();
  
  // إدارة حالة الواجهة للعناصر التفاعلية
  const [isOpen, setIsOpen] = useState(false); // حالة قائمة الجوال
  const [isScrolled, setIsScrolled] = useState(false); // حالة التنسيق القائم على التمرير
  const [isProfileOpen, setIsProfileOpen] = useState(false); // حالة القائمة المنسدلة للملف الشخصي
  const [isAuthOpen, setIsAuthOpen] = useState(false); // حالة قائمة تسجيل الدخول/التسجيل

  /**
   * @function useEffect
   * @description معالج التمرير المحسن مع اختناق الأداء
   * يحدث تنسيق الرأس بناءً على موقع التمرير باستخدام requestAnimationFrame
   * يستخدم عتبة 30 بكسل لتقليل إعادة العرض غير الضرورية
   */
  useEffect(() => {
    let ticking = false;
    let lastScrollY = 0;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          // تحسين الأداء: تحديث الحالة فقط إذا تغير التمرير بشكل كبير
          if (Math.abs(currentScrollY - lastScrollY) > 30) {
            setIsScrolled(currentScrollY > 20);
            lastScrollY = currentScrollY;
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    
    // إضافة مستمع حدث سلبي لأداء أفضل
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /**
   * @constant navItems
   * @description عناصر قائمة التنقل مع العلامات والمسارات
   * هيكل تنقل محدث دون فك شفرة VIN والتقييمات/المراجعات
   */
  const navItems = [
    { label: 'الرئيسية', href: '/' },
    { label: 'عينة التقارير', href: '/reports' },
    { label: 'معلومات VIN', href: '/vin-info' },
    { label: 'من نحن', href: '/about' },
    { label: 'اتصل بنا', href: '/contact' },
  ];

  const isActive = (href: string) => location === href;

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`sticky top-0 z-[80] transition-all duration-200 ${
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-white'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-14 h-14 flex items-center justify-center group-hover:scale-105 transition-transform">
              <img
                src="/images/logo.png"
                alt="Car History Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-primary leading-none">Car History</span>
              <span className="text-[10px] text-gray-500 font-medium tracking-widest uppercase">Inspect Platform</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg font-bold transition-all duration-300 relative ${
                  isActive(item.href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 hover:text-primary hover:bg-gray-50'
                }`}
              >
                {item.label}
                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-primary transition-all duration-300 ${
                  isActive(item.href) ? 'w-8' : 'hover:w-6'
                }`} />
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3">
            {isLoggedIn && userProfile ? (
              // ===== مستخدم مسجل: أيقونة احترافية مع قائمة منسدلة =====
              <div className="relative">
                <motion.button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="relative flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-gradient-to-br from-[#002f6c] to-[#0055b8] text-white shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 hover:from-[#003580] hover:to-[#0066cc] transition-all duration-300 group"
                >
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center border border-white/30 font-bold text-sm group-hover:bg-white/30 transition-all">
                    {userProfile.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold max-w-[80px] truncate">{userProfile.name.split(' ')[0]}</span>
                  <ChevronDown size={14} className={`text-white/70 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
                </motion.button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <>
                      <div className="fixed inset-0 z-[180]" onClick={() => setIsProfileOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -6 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="absolute top-[calc(100%+10px)] right-0 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[200]"
                      >
                        <div className="px-5 py-4 bg-gradient-to-br from-[#001a3d] via-[#002f6c] to-[#0044aa]">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30 text-xl font-bold text-white">
                              {userProfile.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-white text-sm truncate">{userProfile.name}</p>
                              <p className="text-white/60 text-xs mt-0.5 truncate">{userProfile.email}</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-3 space-y-1">
                          <button
                            onClick={() => { setIsProfileOpen(false); setLocation('/profile'); }}
                            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all text-right group"
                          >
                            <div className="w-8 h-8 rounded-xl bg-[#002f6c]/8 group-hover:bg-[#002f6c]/15 flex items-center justify-center transition-colors">
                              <User size={16} className="text-[#002f6c]" />
                            </div>
                            <span className="font-semibold text-gray-800 text-sm">الملف الشخصي</span>
                          </button>
                          {userProfile.isAdmin && (
                            <button
                              onClick={() => {
                                setIsProfileOpen(false);
                                const VITE_API_URL = import.meta.env.VITE_API_URL;
                                const backendUrl = (VITE_API_URL && VITE_API_URL.startsWith('http'))
                                  ? VITE_API_URL.split('/api')[0]
                                  : 'http://localhost:8000';
                                window.open(`${backendUrl}/admin/`, '_blank');
                              }}
                              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all text-right group"
                            >
                              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <Shield size={16} className="text-blue-600" />
                              </div>
                              <span className="font-semibold text-blue-600 text-sm">إدارة التطبيق</span>
                            </button>
                          )}
                          <div className="border-t border-gray-100 my-1" />
                          <button onClick={() => { onLogout?.(); setIsProfileOpen(false); }}
                            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100 transition-all text-right group">
                            <div className="w-8 h-8 rounded-xl bg-red-500/10 group-hover:bg-red-500/15 flex items-center justify-center transition-colors">
                              <LogIn size={16} className="text-red-500 rotate-180" />
                            </div>
                            <span className="font-semibold text-red-500 text-sm">تسجيل الخروج</span>
                          </button>
                        </div>
                        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
                          <p className="text-center text-[10px] text-gray-400">Car History © 2025</p>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              // ===== غير مسجل: زرا تسجيل الدخول وإنشاء الحساب =====
              <>
                <motion.button
                  onClick={onLoginClick}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-5 py-2.5 text-[#002f6c] font-bold hover:bg-[#002f6c]/8 rounded-xl transition-all border border-[#002f6c]/15 hover:border-[#002f6c]/30"
                >
                  تسجيل الدخول
                </motion.button>
                <motion.button
                  onClick={onSignupClick}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#002f6c] to-[#0055b8] text-white rounded-xl font-bold hover:from-[#003580] hover:to-[#0066cc] transition-all shadow-md shadow-blue-900/25 flex items-center gap-2"
                >
                  <UserPlus size={17} />
                  إنشاء حساب
                </motion.button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden overflow-hidden bg-white border-t border-gray-100 mt-3"
            >
              <div className="flex flex-col gap-2 py-6">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`px-4 py-4 rounded-xl font-bold transition-all ${
                      isActive(item.href)
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="flex flex-col gap-3 mt-5 px-2">
                  {!isLoggedIn ? (
                    <>
                      <button
                        onClick={() => { setIsOpen(false); onLoginClick?.(); }}
                        className="flex items-center justify-center gap-3 py-4 text-[#002f6c] font-bold border-2 border-[#002f6c]/20 rounded-xl hover:bg-[#002f6c]/5 transition-all"
                      >
                        <LogIn size={18} />
                        تسجيل الدخول
                      </button>
                      <button
                        onClick={() => { setIsOpen(false); onSignupClick?.(); }}
                        className="flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-[#002f6c] to-[#0055b8] text-white font-bold rounded-xl shadow-lg shadow-blue-900/25"
                      >
                        <UserPlus size={18} />
                        إنشاء حساب جديد
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/profile"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-[#002f6c] to-[#0055b8] text-white font-bold rounded-xl shadow-lg shadow-blue-900/25"
                    >
                      <User size={18} />
                      الملف الشخصي
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
