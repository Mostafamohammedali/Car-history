/**
 * @file main.tsx
 * @description نقطة الدخول الرئيسية لتطبيق Car History
 * يقوم بتهيئة وتصيير التطبيق في عنصر الجذر
 * يستخدم React 18 createRoot API للأداء المحسن
 */

// استيراد مكتبات React اللازمة
import { createRoot } from "react-dom/client";

// استيراد المكون الرئيسي والأنماط
import App from "./App";
import "./index.css";

/**
 * @description تهيئة وتصيير التطبيق
 * يقوم بإنشاء جذر React وتصيير المكون الرئيسي
 * في عنصر DOM بالمعرف 'root'
 */
createRoot(document.getElementById("root")!).render(<App />);
