/**
 * @file index.ts
 * @description نقطة دخول الخادم الرئيسية لتطبيق Car History
 * يوفر تكوين خادم Express وتقديم الملفات الثابتة
 * يعالج توجيه العميل وتكوينات خاصة بالبيئة
 */

import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

// توافق وحدة ES لـ __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @function startServer
 * @description يهيئ ويبدأ خادم Express
 * يكوين تقديم الملفات الثابتة وتوجيه العميل
 * يعالج بيئات التطوير والإنتاج
 */
async function startServer() {
  // تهيئة تطبيق Express وخادم HTTP
  const app = express();
  const server = createServer(app);

  /**
   * تكوين تقديم الملفات الثابتة
   * يقدم أصول الواجهة الأمامية المبنية من مسارات مختلفة بناءً على البيئة
   * - الإنتاج: يقدم من دليل server/public
   * - التطوير: يقدم من دليل dist/public
   */
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  // تقديم الملفات الثابتة (CSS, JS, صور، إلخ)
  app.use(express.static(staticPath));

  /**
   * معالج توجيه العميل
   * يلتقط جميع طلبات GET ويقدم index.html
   * يمكّن React Router من التعامل مع التنقل من جانب العميل
   * ضروري لعمل تطبيق الصفحة الواحدة (SPA)
   */
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  // تكوين منفذ الخادم مع الرجوع إلى 3000
  const port = process.env.PORT || 3000;

  // بدء الخادم وتسجيل بدء التشغيل الناجح
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

// بدء الخادم مع معالجة الأخطاء
startServer().catch(console.error);
