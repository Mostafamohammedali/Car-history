/**
 * @file ErrorState.tsx
 * @description مكون حالة الخطأ مع خيارات الإجراءات
 */

import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  showRetry?: boolean;
  showGoHome?: boolean;
}

/**
 * مكون عرض حالة الخطأ
 */
export default function ErrorState({
  error,
  onRetry,
  onGoHome,
  showRetry = true,
  showGoHome = true,
}: ErrorStateProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#f1f5f9]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white p-8 rounded-3xl shadow-xl border border-[#e2e8f0] max-w-md w-full text-center"
      >
        {/* أيقونة الخطأ */}
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={40} className="text-red-500" />
        </div>

        {/* عنوان الخطأ */}
        <h2 className="text-2xl font-bold text-[#0f172a] mb-3">عذراً، حدث خطأ ما</h2>

        {/* رسالة الخطأ */}
        <p className="text-[#64748b] mb-8 leading-relaxed">{error}</p>

        {/* أزرار الإجراءات */}
        <div className="flex flex-col gap-3">
          {showRetry && onRetry && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onRetry}
              className="w-full bg-[#002f6c] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#002f6c]/20 hover:bg-[#001a3d] transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              إعادة المحاولة
            </motion.button>
          )}

          {showGoHome && onGoHome && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onGoHome}
              className="w-full bg-white text-[#64748b] py-4 rounded-2xl font-bold border border-[#e2e8f0] hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <Home size={18} />
              العودة للرئيسية
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/**
 * مكون خطأ مضمّن (للأقسام)
 */
export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
      <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm text-red-800 font-medium mb-2">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
          >
            <RefreshCw size={12} />
            إعادة المحاولة
          </button>
        )}
      </div>
    </div>
  );
}
