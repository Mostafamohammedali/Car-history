/**
 * @file UnderstandingVIN.tsx
 * @description مكون تعليمي لمعلومات فك شفرة VIN
 * يوفر تحليلاً شاملاً لهيكل رقم تعريف المركبة
 * يعرض أقسام VIN مع تمثيل بصري ملون بالألوان وشروحات
 */

import { motion } from 'framer-motion';
import { 
  Info, 
  Shield, 
  Globe,
  Search
} from 'lucide-react';

/**
 * @interface VINDecoding
 * @description بنية بيانات لمعلومات قسم VIN
 * @property {string} position - مواضع الأحرف في VIN (مثل '1-3', '4-8')
 * @property {string} range - اختصار قسم VIN (مثل 'WMI', 'VDS')
 * @property {string} meaning - وصف ما يمثله القسم
 * @property {string} color - فئات التدرج CSS Tailwind للتنسيق البصري
 */
interface VINDecoding {
  position: string;
  range: string;
  meaning: string;
  color: string;
}

/**
 * @function UnderstandingVIN
 * @description مكون VIN التعليمي الرئيسي مع أقسام تفاعلية
 * يعرض تحليل هيكل VIN الشامل مع مؤشرات بصرية
 * @returns {JSX.Element} مكون فهم VIN المعروض مع جميع الأقسام
 */
export default function UnderstandingVIN() {

  /**
   * @constant vinDecoding
   * @description تحليل هيكل VIN الكامل مع جميع 17 موضعًا
   * كل قسم يتضمن نطاق الموضع والاختصار والمعنى والتنسيق البصري
   * يستخدم لتثقيف المستخدمين حول فك شفرة VIN وهيكلها
   */
  const vinDecoding: VINDecoding[] = [
    {
      position: '1-3',
      range: 'WMI',
      meaning: 'رمز المصنع العالمي - دولة وتصنيع',
      color: 'from-blue-500 to-blue-600'
    },
    {
      position: '4-8',
      range: 'VDS',
      meaning: 'وصف المركبة - الطراز والمواصفات',
      color: 'from-purple-500 to-purple-600'
    },
    {
      position: '9',
      range: 'Check',
      meaning: 'رقم التحقق - للتأكد من صحة VIN',
      color: 'from-green-500 to-green-600'
    },
    {
      position: '10',
      range: 'Year',
      meaning: 'سنة الصنع - رمز السنة',
      color: 'from-amber-500 to-amber-600'
    },
    {
      position: '11',
      range: 'Plant',
      meaning: 'رمز المصنع - مكان التصنيع',
      color: 'from-red-500 to-red-600'
    },
    {
      position: '12-17',
      range: 'VIS',
      meaning: 'رقم التسلسل - الرقم التسلسلي للمركبة',
      color: 'from-indigo-500 to-indigo-600'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  const sampleVIN = '1HGBH41JXMN109186';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fc] via-white to-[#f0f2f7] py-16">
      <div className="container mx-auto px-4">
        
        

        {/* What is VIN Section */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-20"
        >
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0066cc] to-[#004da6] flex items-center justify-center">
                <Info className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">؟VIN ماهو رقم</h2>
            </div>
            
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              هو رمز فريد مكون من 17 حرفا يعمل كبصمة ليسارتك  يحتوي هذا الرقم علئ معلومات حيوبة عن المصنع والطراز والمواصفات الفنية وسنة الصنع VIN رقم التعريف المركبة 
              
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200" 
              >
                <Shield className="w-8 h-8 text-blue-600 mb-4" />
                <h3 className="font-bold text-gray-900 mb-2">فريد عالمياً</h3>
                <p className="text-gray-600 text-sm"> فريد يستخدم في جميع انحاء العالم VIN كل سيارة لها رقم </p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200"
              >
                <Globe className="w-8 h-8 text-purple-600 mb-4" />
                <h3 className="font-bold text-gray-900 mb-2">معيار عالمي</h3>
                <p className="text-gray-600 text-sm"> العالمي ISO 3779يتبع معيار  </p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200"
              >
                <Search className="w-8 h-8 text-green-600 mb-4" />
                <h3 className="font-bold text-gray-900 mb-2">تتبع شامل</h3>
                <p className="text-gray-600 text-sm">يسمح بتتبع تاريخ السيارة بالكامل</p>
              </motion.div>
            </div>
          </motion.div>
        </motion.section>

        {/* Educational Image Section */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-20"
        >
          <motion.div
            variants={itemVariants}
            className="relative w-full"
          >
            {/* Compact image container */}
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 md:p-6 scale-75 origin-center">
              <div className="relative rounded-2xl p-4">
                <img
                  src="/images/about-2.jpg"
                  alt="Information VIN"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
            
            {/* Subtle decorative elements */}
            <div className="absolute -bottom-6 left-8 w-24 h-24 bg-gradient-to-br from-[#0066cc]/10 to-[#004da6]/10 rounded-full blur-xl" />
            <div className="absolute -top-6 right-8 w-32 h-32 bg-gradient-to-br from-[#60a5fa]/10 to-[#3b82f6]/10 rounded-full blur-xl" />
          </motion.div>
        </motion.section>

        {/* VIN Decoding Guide Section */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-20"
        >
          <motion.h2
            variants={itemVariants}
            className="text-3xl font-bold text-gray-900 mb-12 text-center"
          >
           VIN دليل فك تشفير 
          </motion.h2>

          <motion.div
            variants={itemVariants}
            className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12"
          >
            {/* Sample VIN Display */}
            <div className="mb-12">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">مثال: {sampleVIN}</h3>
              <div className="flex flex-wrap justify-center gap-2">
                {sampleVIN.split('').map((char, index) => {
                  const decoding = vinDecoding.find(d => {
                    const [start, end] = d.position.split('-').map(Number);
                    return index >= start - 1 && index <= (end || start) - 1;
                  });
                  const colorClass = decoding?.color || 'from-gray-400 to-gray-500';
                  
                  return (
                    <motion.div
                      key={index}
                      whileHover={{ scale: 1.1, y: -2 }}
                      className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClass} text-white font-bold flex items-center justify-center shadow-md`}
                    >
                      {char}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Decoding Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vinDecoding.map((item, index) => (
                <motion.div
                  key={item.position}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  className="relative"
                >
                  <div className={`p-6 rounded-xl bg-gradient-to-br ${item.color} text-white shadow-lg`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold">{item.position}</span>
                      <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
                        {item.range}
                      </span>
                    </div>
                    <h4 className="font-bold text-lg mb-2">{item.meaning}</h4>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.section>

        {/* Tips Section */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            variants={itemVariants}
            className="bg-gradient-to-br from-[#0066cc] to-[#004da6] rounded-3xl p-8 md:p-12 text-white"
          >
            <h2 className="text-3xl font-bold mb-8 text-center">نصائح هامة</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm font-bold">1</span>
                </div>
                <div>
                  <h3 className="font-bold mb-2">تحقق دائماً</h3>
                  <p className="text-white/80 text-sm"> في جميع مستندات السيارة VIN تاكد من مطابقة رقم </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm font-bold">2</span>
                </div>
                <div>
                  <h3 className="font-bold mb-2">لا تشاركه</h3>
                  <p className="text-white/80 text-sm">  في مكان امن ولا تشاركة مع الغرباء VIN احتفظ برقم </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm font-bold">3</span>
                </div>
                <div>
                  <h3 className="font-bold mb-2">استخدمه بحذر</h3>
                  <p className="text-white/80 text-sm">  فقط لتحقق من تاريخ السيارة VIN استخدم رقم </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm font-bold">4</span>
                </div>
                <div>
                  <h3 className="font-bold mb-2">توثيق</h3>
                  <p className="text-white/80 text-sm"> مع صور واضحة من جميع المواقع VIN وثق رقم </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.section>

      </div>
    </div>
  );
}
