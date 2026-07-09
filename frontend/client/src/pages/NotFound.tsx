/**
 * @file NotFound.tsx
 * @description مكون صفحة 404 غير موجود لتطبيق Car History
 * يوفر واجهة خطأ أنيقة عند عدم العثور على الصفحة المطلوبة
 * يتضمن رسوم متحركة وأزرار تنقل للعودة إلى الصفحة الرئيسية
 */

import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';

/**
 * @function NotFound
 * @description صفحة الخطأ 404 الرئيسية مع واجهة مستخدم أنيقة
 * يعرض رسالة خطأ واضحة مع خيارات للعودة إلى الصفحة الرئيسية
 * @returns {JSX.Element} صفحة الخطأ 404 المعروضة مع رسالة وأزرار التنقل
 */
export default function NotFound() {
  return (
    // حاوية الصفحة الرئيسية مع خلفية بيضاء
    <div className="bg-white">
      {/* المحتوى الرئيسي المركزي */}
      <main className="flex items-center justify-center py-12 px-4">
        <div className="text-center max-w-md">
          {/* أيقونة الخطأ مع خلفية حمراء */}
          <div className="w-16 h-16 bg-destructive text-white rounded-lg flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} />
          </div>
          {/* رمز الخطأ 404 */}
          <h1 className="text-4xl font-bold text-primary mb-4">404</h1>
          {/* رسالة الخطأ الرئيسية */}
          <p className="text-xl text-foreground mb-2">الصفحة غير موجودة</p>
          {/* وصف تفصيلي للخطأ */}
          <p className="text-muted-foreground mb-8">
            عذراً، الصفحة التي تبحث عنها غير موجودة أو تم حذفها
          </p>
          {/* رابط العودة إلى الصفحة الرئيسية */}
          <Link href="/">
            <a className="btn-primary inline-block">العودة إلى الرئيسية</a>
          </Link>
        </div>
      </main>
    </div>
  );
}
