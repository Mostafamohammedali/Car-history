/**
 * @file ImageGallerySection.tsx
 * @description مكون معرض الصور المحسّن مع Lightbox
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Car, X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { useImageGallery, VehicleImage } from '@/hooks/useImageGallery';
import { useState } from 'react';

interface ImageGallerySectionProps {
  images: VehicleImage[];
}

/**
 * مكون الصورة مع Lazy Loading
 */
function LazyImage({ src, alt, className, onClick }: {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {!loaded && !error && (
        <div className="absolute inset-0 bg-slate-100 animate-pulse rounded-xl" />
      )}
      <img
        src={error ? '/placeholder-car.png' : src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        onClick={onClick}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}

/**
 * مكون Lightbox
 */
function Lightbox({
  images,
  selectedIndex,
  onClose,
  onNext,
  onPrev,
}: {
  images: VehicleImage[];
  selectedIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* زر الإغلاق */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors flex items-center justify-center"
        aria-label="إغلاق"
      >
        <X size={24} className="text-white" />
      </button>

      {/* عداد الصور */}
      <div className="absolute top-4 left-4 z-10 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-semibold">
        {selectedIndex + 1} / {images.length}
      </div>

      {/* الصورة الرئيسية */}
      <motion.div
        key={selectedIndex}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
        className="max-w-7xl max-h-[90vh] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={images[selectedIndex].src}
          alt={images[selectedIndex].alt || images[selectedIndex].label}
          className="max-w-full max-h-[90vh] object-contain rounded-lg"
        />
      </motion.div>

      {/* أزرار التنقل */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors flex items-center justify-center"
            aria-label="الصورة السابقة"
          >
            <ChevronRight size={24} className="text-white" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors flex items-center justify-center"
            aria-label="الصورة التالية"
          >
            <ChevronLeft size={24} className="text-white" />
          </button>
        </>
      )}
    </motion.div>
  );
}

/**
 * مكون رأس القسم
 */
function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-lg bg-[#002f6c] flex items-center justify-center text-white flex-shrink-0">
        {icon}
      </div>
      <h2 className="text-lg font-bold text-[#0f172a]">{title}</h2>
    </div>
  );
}

/**
 * مكون معرض الصور الرئيسي
 */
export default function ImageGallerySection({ images }: ImageGallerySectionProps) {
  const {
    selectedIndex,
    lightboxOpen,
    openLightbox,
    closeLightbox,
    nextImage,
    prevImage,
    selectImage,
  } = useImageGallery(images);

  if (!images || images.length === 0) {
    return (
      <section className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-5">
        <SectionHeading icon={<Car size={18} />} title="معرض الصور" />
        <div className="flex items-center justify-center h-64 bg-slate-50 rounded-xl">
          <p className="text-slate-400">لا توجد صور متاحة</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-5">
        <SectionHeading icon={<Car size={18} />} title="معرض الصور" />

        <div className="flex flex-col md:grid md:grid-cols-[1fr_120px] lg:grid-cols-[1fr_150px] gap-4 md:h-[450px] lg:h-[550px]">
          {/* الصورة الرئيسية */}
          <button
            onClick={() => openLightbox(selectedIndex)}
            className="relative rounded-xl overflow-hidden aspect-[16/10] md:aspect-auto md:h-full w-full bg-[#f1f5f9] group cursor-pointer"
          >
            <LazyImage
              src={images[selectedIndex].src}
              alt={images[selectedIndex].alt || images[selectedIndex].label}
              className="w-full h-full"
            />

            {/* تأثير التمرير */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* أيقونة التكبير */}
            <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
              <ZoomIn size={16} />
              <span className="text-xs font-semibold">اضغط للتكبير</span>
            </div>
          </button>

          {/* الصور المصغرة */}
          <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto md:h-full pr-2 custom-scrollbar">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => selectImage(i)}
                className={`relative flex-shrink-0 w-20 h-16 md:w-24 md:h-[72px] rounded-lg overflow-hidden border-2 transition-all ${
                  selectedIndex === i
                    ? 'border-[#002f6c] shadow-md scale-105'
                    : 'border-transparent opacity-70 hover:opacity-100 hover:scale-105'
                }`}
              >
                <LazyImage
                  src={img.src}
                  alt={img.alt || img.label}
                  className="w-full h-full"
                />
                <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] text-center py-0.5 truncate px-1">
                  {img.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <Lightbox
            images={images}
            selectedIndex={selectedIndex}
            onClose={closeLightbox}
            onNext={nextImage}
            onPrev={prevImage}
          />
        )}
      </AnimatePresence>
    </>
  );
}
