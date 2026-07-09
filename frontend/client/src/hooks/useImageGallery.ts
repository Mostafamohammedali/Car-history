/**
 * @file useImageGallery.ts
 * @description Custom hook لإدارة معرض الصور مع Lightbox
 */

import { useState, useEffect, useCallback } from 'react';

export interface VehicleImage {
  src: string;
  label: string;
  alt?: string;
}

interface UseImageGalleryReturn {
  selectedIndex: number;
  lightboxOpen: boolean;
  setSelectedIndex: (index: number) => void;
  openLightbox: (index: number) => void;
  closeLightbox: () => void;
  nextImage: () => void;
  prevImage: () => void;
  selectImage: (index: number) => void;
}

/**
 * Custom hook لإدارة معرض الصور
 * @param images - مصفوفة الصور
 * @returns وظائف وحالة معرض الصور
 */
export function useImageGallery(images: VehicleImage[]): UseImageGalleryReturn {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);

  // التأكد من أن الفهرس ضمن الحدود
  useEffect(() => {
    if (selectedIndex >= images.length) {
      setSelectedIndex(Math.max(0, images.length - 1));
    }
  }, [selectedIndex, images.length]);

  const openLightbox = useCallback((index: number) => {
    setSelectedIndex(index);
    setLightboxOpen(true);
    // منع التمرير في الخلفية
    document.body.style.overflow = 'hidden';
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    // إعادة تفعيل التمرير
    document.body.style.overflow = '';
  }, []);

  const nextImage = useCallback(() => {
    setSelectedIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback(() => {
    setSelectedIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const selectImage = useCallback((index: number) => {
    if (index >= 0 && index < images.length) {
      setSelectedIndex(index);
    }
  }, [images.length]);

  // دعم لوحة المفاتيح
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowLeft':
          prevImage();
          break;
        case 'ArrowRight':
          nextImage();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, closeLightbox, nextImage, prevImage]);

  // تنظيف عند unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return {
    selectedIndex,
    lightboxOpen,
    setSelectedIndex,
    openLightbox,
    closeLightbox,
    nextImage,
    prevImage,
    selectImage,
  };
}
