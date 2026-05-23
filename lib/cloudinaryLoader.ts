import type { ImageLoaderProps } from 'next/image';

const CLOUDINARY_UPLOAD_SEGMENT = '/upload/';

/**
 * Loads Cloudinary URLs with width/quality/f_auto directly from the CDN instead of
 * `/_next/image` (avoids optimizer 500s under Turbopack in some dev setups).
 */
export function cloudinaryImageLoader({ src, width, quality }: ImageLoaderProps): string {
  if (!src.includes('res.cloudinary.com') || !src.includes('/image/upload')) {
    return src;
  }

  const segmentIndex = src.indexOf(CLOUDINARY_UPLOAD_SEGMENT);

  if (segmentIndex === -1) {
    return src;
  }

  const head = src.slice(0, segmentIndex + CLOUDINARY_UPLOAD_SEGMENT.length);
  const tail = src.slice(segmentIndex + CLOUDINARY_UPLOAD_SEGMENT.length);

  if (!tail) {
    return src;
  }

  const safeQuality = Math.min(100, Math.max(quality ?? 75, 1));

  if (/^w_/.test(tail)) {
    return src;
  }

  return `${head}w_${Math.round(width)},q_${safeQuality},c_limit,f_auto/${tail}`;
}
