/**
 * @file ErrorBoundary.tsx
 * @description مكون حدود الخطأ لتطبيق Car History
 * يلتقط الأخطاء في المكونات الفرعية ويعرض واجهة خطأ مناسبة
 * يوفر تجربة مستخدم أفضل عند حدوث أخطاء غير متوقعة
 */

// استيراد المكتبات والمكونات اللازمة
import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

/**
 * @interface Props
 * @description خصائص مكون حدود الخطأ
 * @property {ReactNode} children - المكونات الفرعية التي سيتم حمايتها
 */
interface Props {
  children: ReactNode;
}

/**
 * @interface State
 * @description حالة مكون حدود الخطأ
 * @property {boolean} hasError - يحدد ما إذا كان هناك خطأ
 * @property {Error | null} error - كائن الخطأ الذي حدث
 */
interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * @class ErrorBoundary
 * @description فئة مكون حدود الخطأ
 * ترث من Component وتوفر حماية للمكونات الفرعية من الأخطاء
 */
class ErrorBoundary extends Component<Props, State> {
  /**
   * @function constructor
   * @description مُنشئ المكون يقوم بتهيئة الحالة الأولية
   * @param {Props} props - خصائص المكون
   */
  constructor(props: Props) {
    super(props);
    // تهيئة الحالة الأولية بدون أخطاء
    this.state = { hasError: false, error: null };
  }

  /**
   * @function getDerivedStateFromError
   * @description دالة ثابتة لتحديث الحالة عند حدوث خطأ
   * @param {Error} error - الخطأ الذي حدث
   * @returns {State} الحالة المحدثة مع معلومات الخطأ
   */
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  /**
   * @function render
   * @description يعرض المحتوى بناءً على حالة الخطأ
   * @returns {ReactNode} المحتوى المعروض
   */
  render() {
    // التحقق من وجود خطأ لعرض واجهة الخطأ
    if (this.state.hasError) {
      return (
        // حاوية واجهة الخطأ المركزية
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            {/* أيقونة التحذير */}
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            {/* رسالة الخطأ */}
            <h2 className="text-xl mb-4"><span>An unexpected error occurred.</span></h2>

            {/* عرض تفاصيل الخطأ للمطورين */}
            <div className="p-4 w-full rounded bg-muted overflow-auto mb-6">
              <pre className="text-sm text-muted-foreground whitespace-break-spaces">
                {this.state.error?.stack}
              </pre>
            </div>

            {/* زر إعادة تحميل الصفحة */}
            <button
              onClick={() => window.location.reload()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                "bg-primary text-primary-foreground",
                "hover:opacity-90 cursor-pointer"
              )}
            >
              <RotateCcw size={16} />
              <span>Reload Page</span>
            </button>
          </div>
        </div>
      );
    }

    // عرض المكونات الفرعية عند عدم وجود أخطاء
    return this.props.children;
  }
}

export default ErrorBoundary;
