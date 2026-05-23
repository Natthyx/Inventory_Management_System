'use client';

import { useEffect } from 'react';

/**
 * Prevents background page scroll while a modal is open.
 * Keeps wheel / touch gestures on the centered overlay scroll container instead.
 */
export function usePreventBodyScroll(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) {
      return;
    }

    const htmlReference = document.documentElement;
    const bodyReference = document.body;

    const previousHtmlOverflow = htmlReference.style.overflow;
    const previousBodyOverflow = bodyReference.style.overflow;

    htmlReference.style.overflow = 'hidden';
    bodyReference.style.overflow = 'hidden';

    return () => {
      htmlReference.style.overflow = previousHtmlOverflow;
      bodyReference.style.overflow = previousBodyOverflow;
    };
  }, [isLocked]);
}
