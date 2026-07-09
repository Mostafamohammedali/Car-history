/**
 * @file ThemeContext.tsx
 * @description سياق السمة لتطبيق Car History
 * يوفر إدارة السمة الفاتحة والداكنة للتطبيق
 * يتضمن التخزين المحلي والتبديل الديناميكي بين السمات
 */

// استيراد مكتبات React اللازمة
import React, { createContext, useContext, useEffect, useState } from "react";

/**
 * @type Theme
 * @description أنواع السمات المتاحة في التطبيق
 * @property {"light"} light - السمة الفاتحة
 * @property {"dark"} dark - السمة الداكنة
 */
type Theme = "light" | "dark";

/**
 * @interface ThemeContextType
 * @description نوع سياق السمة
 * @property {Theme} theme - السمة الحالية
 * @property {() => void} toggleTheme - دالة لتبديل السمة
 * @property {boolean} switchable - ما إذا كان يمكن تبديل السمة
 */
interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
}

/**
 * @constant ThemeContext
 * @description سياق السمة الرئيسي
 * يوفر السمة الحالية ووظائف التبديل للمكونات الفرعية
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * @interface ThemeProviderProps
 * @description خصائص مزود السمة
 * @property {React.ReactNode} children - المكونات الفرعية
 * @property {Theme} defaultTheme - السمة الافتراضية
 * @property {boolean} switchable - ما إذا كان يمكن تبديل السمة
 */
interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

/**
 * @function ThemeProvider
 * @description مزود السمة الرئيسي
 * يدير حالة السمة ويوفرها لجميع المكونات الفرعية
 * @param {ThemeProviderProps} props - خصائص المزود
 * @returns {JSX.Element} مزود السمة مع المكونات الفرعية
 */
export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  /**
   * @function useState
   * @description حالة السمة الحالية
   * يقوم بتهيئة السمة من التخزين المحلي إذا كان التبديل ممكناً
   */
  const [theme, setTheme] = useState<Theme>(() => {
    if (switchable) {
      // استرجاع السمة المخزنة في التخزين المحلي
      const stored = localStorage.getItem("theme");
      return (stored as Theme) || defaultTheme;
    }
    return defaultTheme;
  });

  /**
   * @function useEffect
   * @description يطبق السمة على عنصر الجذر ويخزنها في التخزين المحلي
   * يقوم بإضافة/إزالة فئة 'dark' من عنصر الجذر
   */
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark"); // إضافة فئة السمة الداكنة
    } else {
      root.classList.remove("dark"); // إزالة فئة السمة الداكنة
    }

    // تخزين السمة في التخزين المحلي إذا كان التبديل ممكناً
    if (switchable) {
      localStorage.setItem("theme", theme);
    }
  }, [theme, switchable]);

  /**
   * @function toggleTheme
   * @description دالة تبديل السمة
   * تقوم بالتبديل بين السمة الفاتحة والداكنة
   * متوفرة فقط إذا كان التبديل ممكناً
   */
  const toggleTheme = switchable
    ? () => {
        setTheme(prev => (prev === "light" ? "dark" : "light"));
      }
    : undefined;

  // إرجاع مزود السياق مع قيمة السمة
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * @function useTheme
 * @description خطاف مخصص لاستخدام سياق السمة
 * يوفر سهولة الوصول إلى سياق السمة في المكونات
 * @returns {ThemeContextType} سياق السمة الحالي
 * @throws {Error} إذا تم استخدامه خارج ThemeProvider
 */
export function useTheme() {
  // الحصول على سياق السمة
  const context = useContext(ThemeContext);
  
  // التحقق من وجود السياق
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  
  return context;
}
