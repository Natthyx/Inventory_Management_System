'use client';

import Image from 'next/image';
import {
  type PointerEvent as GalleryPointerCapturedEventTyping,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { usePreventBodyScroll } from '@/hooks/usePreventBodyScroll';
import { cloudinaryImageLoader } from '@/lib/cloudinaryLoader';
import type { InventoryItem } from '@/lib/types';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

/** Gallery zoom limits & step apply to intrinsic canvas (better scroll UX than transform-only). */
const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value / ZOOM_STEP) * ZOOM_STEP));
}

function centerGalleryScroll(scrollportLookupRefParameter: RefObject<HTMLDivElement | null>) {
  const scrollViewportResolvedElement = scrollportLookupRefParameter.current;

  if (!scrollViewportResolvedElement) return;

  const {
    clientHeight,
    clientWidth,
    scrollHeight: scrollBoundingHeightPx,
    scrollWidth: scrollBoundingWidthPx,
  } = scrollViewportResolvedElement;

  if (clientWidth <= 1 || clientHeight <= 1) return;

  scrollViewportResolvedElement.scrollLeft = Math.max(0, (scrollBoundingWidthPx - clientWidth) / 2);
  scrollViewportResolvedElement.scrollTop = Math.max(0, (scrollBoundingHeightPx - clientHeight) / 2);
}

interface DetailImageGalleryProps {
  sizes: string;
  altText: string;
  imageUrl: string;
}

function DetailImageGallery({ sizes, altText, imageUrl }: Readonly<DetailImageGalleryProps>) {
  const shellRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const draggingPointerIdentityRef = useRef(false);
  const dragLatestClientPositionStoredRef = useRef({ recordedClientCoordinateXAxis: 0, recordedClientCoordinateYAxis: 0 });
  const [zoom, setZoom] = useState(1);
  const [{ width: containerWidthPx, height: containerHeightPx }, setShellSizePx] = useState({ height: 0, width: 0 });
  const [handPanInteractModeChosen, setHandPanInteractModeChosen] = useState(false);

  /** After zoom the flex-centered content grows asymmetrically vs scroll origin — snap view to geometric center.p */
  useLayoutEffect(() => {
    centerGalleryScroll(viewportRef);
  }, [zoom]);

  useEffect(() => {
    const shellEl = shellRef.current;

    if (!shellEl) return;

    function measureShell() {
      const shellMeasureTargetCapturedElementDom = shellRef.current;

      if (!shellMeasureTargetCapturedElementDom) return;

      const shellRectBounding = shellMeasureTargetCapturedElementDom.getBoundingClientRect();
      const nextHeight = shellRectBounding.height;
      const nextWidth = shellRectBounding.width;

      setShellSizePx((previousMeasured) =>
        previousMeasured.width !== nextWidth || previousMeasured.height !== nextHeight ? { height: nextHeight, width: nextWidth } : previousMeasured,
      );
    }

    measureShell();

    const resizeObservation = new ResizeObserver(measureShell);
    resizeObservation.observe(shellEl);

    return () => resizeObservation.disconnect();
  }, []);

  useEffect(() => {
    const viewportScrollEl = viewportRef.current;

    if (!viewportScrollEl) return;

    function interceptWheel(scrollEvent: WheelEvent) {
      scrollEvent.preventDefault();
      const nextDeltaPositive = scrollEvent.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom((previousZoomLevel) => clampZoom(previousZoomLevel + nextDeltaPositive));
    }

    viewportScrollEl.addEventListener('wheel', interceptWheel, { passive: false });

    return () => viewportScrollEl.removeEventListener('wheel', interceptWheel);
  }, []);

  function decreaseZoomTap() {
    setZoom((previousZoomLevel) => clampZoom(previousZoomLevel - ZOOM_STEP));
  }

  function increaseZoomTap() {
    setZoom((previousZoomLevel) => clampZoom(previousZoomLevel + ZOOM_STEP));
  }

  function viewportPointerPrimaryDownCaptured(primaryPointerDownEvt: GalleryPointerCapturedEventTyping<HTMLDivElement>) {
    if (!handPanInteractModeChosen) return;

    if (primaryPointerDownEvt.button !== 0) return;

    primaryPointerDownEvt.preventDefault();

    draggingPointerIdentityRef.current = true;
    dragLatestClientPositionStoredRef.current = {
      recordedClientCoordinateXAxis: primaryPointerDownEvt.clientX,
      recordedClientCoordinateYAxis: primaryPointerDownEvt.clientY,
    };

    primaryPointerDownEvt.currentTarget.setPointerCapture(primaryPointerDownEvt.pointerId);
  }

  function viewportPointerPrimaryMovedNavigate(navPointerMoveCapturedEvt: GalleryPointerCapturedEventTyping<HTMLDivElement>) {
    if (!handPanInteractModeChosen || !draggingPointerIdentityRef.current) return;

    const viewportPinnedScrollDomElementResolved = viewportRef.current;

    if (!viewportPinnedScrollDomElementResolved) return;

    const deltaPointerDisplacementHorizontalNavigate =
      navPointerMoveCapturedEvt.clientX - dragLatestClientPositionStoredRef.current.recordedClientCoordinateXAxis;
    const deltaPointerDisplacementVerticalNavigate =
      navPointerMoveCapturedEvt.clientY - dragLatestClientPositionStoredRef.current.recordedClientCoordinateYAxis;

    viewportPinnedScrollDomElementResolved.scrollLeft -= deltaPointerDisplacementHorizontalNavigate;
    viewportPinnedScrollDomElementResolved.scrollTop -= deltaPointerDisplacementVerticalNavigate;

    dragLatestClientPositionStoredRef.current = {
      recordedClientCoordinateXAxis: navPointerMoveCapturedEvt.clientX,
      recordedClientCoordinateYAxis: navPointerMoveCapturedEvt.clientY,
    };
  }

  function viewportPointerPrimaryNavigateRelease(navPointerCapturedReleaseEvt: GalleryPointerCapturedEventTyping<HTMLDivElement>) {
    draggingPointerIdentityRef.current = false;

    if (navPointerCapturedReleaseEvt.currentTarget.hasPointerCapture(navPointerCapturedReleaseEvt.pointerId)) {
      navPointerCapturedReleaseEvt.currentTarget.releasePointerCapture(navPointerCapturedReleaseEvt.pointerId);
    }
  }

  const measuredWidthBaseline = containerWidthPx > 0 ? containerWidthPx : 320;
  const measuredHeightBaseline = containerHeightPx > 0 ? containerHeightPx : 240;

  const zoomedPaintWidthPx = measuredWidthBaseline * zoom;
  const zoomedPaintHeightPx = measuredHeightBaseline * zoom;

  const zoomShownPercentRounded = Math.round(zoom * 100);

  return (
    <div ref={shellRef} className="relative h-full w-full bg-white">
      <div
        ref={viewportRef}
        aria-label={
          handPanInteractModeChosen
            ? 'Image pane — grab and drag with your pointer (hand tool on). Wheel still zooms.'
            : 'Image pane — toggle hand tool below to grab and reposition. Wheel zooms centered.'
        }
        className={[
          'absolute inset-0 overflow-auto overscroll-contain outline-none touch-pan-x touch-pan-y',
          handPanInteractModeChosen ? 'cursor-grab active:cursor-grabbing' : '',
        ].join(' ')}
        style={handPanInteractModeChosen ? { touchAction: 'none' } : undefined}
        tabIndex={-1}
        onPointerCancel={viewportPointerPrimaryNavigateRelease}
        onPointerDown={viewportPointerPrimaryDownCaptured}
        onPointerMove={viewportPointerPrimaryMovedNavigate}
        onPointerUp={viewportPointerPrimaryNavigateRelease}
      >
        <div className="pointer-events-none flex min-h-full min-w-full items-center justify-center p-4 lg:p-3">
          <div
            className="relative shrink-0 rounded-sm bg-white shadow-sm ring-1 ring-gray-200/60 lg:shadow-none lg:ring-0"
            style={{ height: zoomedPaintHeightPx, width: zoomedPaintWidthPx }}
          >
            <Image
              fill
              alt={altText}
              className="select-none bg-white object-contain"
              draggable={false}
              loader={cloudinaryImageLoader}
              priority
              sizes={sizes}
              src={imageUrl}
            />
          </div>
        </div>
      </div>

      <p className="pointer-events-none absolute left-4 top-3 max-w-[14rem] text-[10px] font-medium uppercase leading-snug tracking-wider text-gray-400 lg:left-6">
        {handPanInteractModeChosen
          ? 'Hand tool on — drag the image · wheel zooms centered'
          : 'Wheel zooms centered · tap hand icon to grab & reposition'}
      </p>

      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex justify-center lg:inset-x-4 lg:bottom-4">
        <div className="pointer-events-auto inline-flex flex-wrap items-center gap-2 rounded-full border border-gray-200/90 bg-white/95 px-2 py-2 text-[13px] shadow-lg shadow-gray-900/10 backdrop-blur-sm">
          <button
            type="button"
            aria-label={`Zoom out, currently ${zoomShownPercentRounded} percent`}
            className="inline-flex size-10 items-center justify-center rounded-full font-semibold text-gray-900 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-35"
            disabled={zoom <= MIN_ZOOM}
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              decreaseZoomTap();
            }}
          >
            −
          </button>

          <span className="min-w-[4rem] text-center tabular-nums text-gray-600">{`${zoomShownPercentRounded}%`}</span>

          <button
            type="button"
            aria-label={`Zoom in, currently ${zoomShownPercentRounded} percent`}
            className="inline-flex size-10 items-center justify-center rounded-full font-semibold text-gray-900 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-35"
            disabled={zoom >= MAX_ZOOM}
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              increaseZoomTap();
            }}
          >
            +
          </button>

          <span className="mx-1 hidden h-6 w-px bg-gray-200 sm:block" aria-hidden />

          <button
            type="button"
            aria-pressed={handPanInteractModeChosen}
            aria-label={handPanInteractModeChosen ? 'Turn off hand tool (grab to pan)' : 'Turn on hand tool (grab and drag image)'}
            className={`inline-flex size-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100 ${
              handPanInteractModeChosen ? 'bg-accent/15 ring-2 ring-accent text-accent ring-offset-2' : 'font-semibold text-gray-900'
            }`}
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              setHandPanInteractModeChosen((previousHandChosenState) => !previousHandChosenState);
            }}
            title={handPanInteractModeChosen ? 'Hand tool on' : 'Hand tool · drag image'}
          >
            <span aria-hidden className="text-lg font-normal leading-none">
              ✋
            </span>
          </button>

          <span className="mx-1 hidden h-6 w-px bg-gray-200 sm:block" aria-hidden />

          <button
            type="button"
            className="rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-700 transition-colors hover:bg-gray-100"
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              setZoom(1);
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

interface ItemDetailModalProps {
  item: InventoryItem | null;
  open: boolean;
  onClose: () => void;
  onEdit: (record: InventoryItem) => void;
}

function describeWhen(isoExtended: string) {
  const instant = new Date(isoExtended);

  if (Number.isNaN(instant.getTime())) return isoExtended;

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(instant);
}

export function ItemDetailModal(props: ItemDetailModalProps) {
  const { item, open, onClose, onEdit } = props;

  usePreventBodyScroll(open);

  useEffect(() => {
    function dismissOnEscape(scanEvent: KeyboardEvent) {
      if (!open || scanEvent.repeat || scanEvent.key !== 'Escape') return;

      scanEvent.preventDefault();
      onClose();
    }

    window.addEventListener('keydown', dismissOnEscape);

    return () => window.removeEventListener('keydown', dismissOnEscape);
  }, [onClose, open]);

  if (!open || !item) {
    return null;
  }

  const lowObservation = item.quantity <= 5;

  const detailSizes =
    '(max-width: 1023px) min(100vw, 520px), (max-width: 1536px) 50vw, 640px';

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 py-6 sm:py-10">
      <button
        type="button"
        aria-label="Close item details"
        className="fixed inset-0 z-0 bg-slate-900/60 backdrop-blur-sm transition-colors"
        tabIndex={-1}
        onClick={onClose}
      />

      <div className="relative z-[1] w-full max-w-lg pb-8 pt-2 lg:max-w-[1200px]" role="presentation">
        <article
          aria-labelledby="item-detail-heading"
          aria-modal="true"
          className="card flex flex-col overflow-hidden rounded-3xl border border-gray-100 shadow-2xl lg:max-h-[min(820px,calc(100vh-2.5rem))] lg:flex-row lg:items-stretch lg:divide-x lg:divide-gray-100"
          role="dialog"
        >
          {/* Mobile: image on top • Desktop: gallery left */}
          <div className="relative w-full shrink-0 overflow-hidden border-b border-gray-100 bg-white lg:min-h-0 lg:w-1/2 lg:min-w-0 lg:border-b-0">
            <div className="relative aspect-[4/3] w-full min-h-[12rem] bg-white lg:absolute lg:inset-0 lg:aspect-auto lg:min-h-0">
              {item.imageUrl ? (
                <DetailImageGallery
                  altText={`${item.name} product photo`}
                  imageUrl={item.imageUrl}
                  key={`${item.id}-${item.imageUrl}`}
                  sizes={detailSizes}
                />
              ) : (
                <div className="flex h-full min-h-[12rem] w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-50 to-gray-100 px-6 text-gray-400 lg:min-h-[min(820px,calc(100vh-2.5rem))] lg:bg-gradient-to-b lg:from-neutral-50 lg:to-neutral-100">
                  <svg className="h-16 w-16" aria-hidden fill="none" stroke="currentColor" strokeWidth={1.25} viewBox="0 0 64 64">
                    <rect height={42} rx={10} ry={10} strokeDasharray="6 12" strokeWidth={3} width={42} x={11} y={11} />
                    <circle cx={28} cy={28} r={9} strokeWidth={2} />
                    <path d="M36 41 48 53" strokeLinecap="round" strokeWidth={3} />
                  </svg>
                  <span className="text-sm font-medium">No product image</span>
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:overflow-hidden">
            <div className="space-y-5 p-6 sm:space-y-6 sm:p-8 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Name</p>
                <h2 id="item-detail-heading" className="text-2xl font-bold leading-snug tracking-tight text-gray-900 sm:text-[28px]">
                  {item.name}
                </h2>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">SKU</p>
                <p className="font-mono text-sm font-semibold text-gray-800">{item.sku}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Category</p>
                <p className="text-sm font-semibold text-gray-800">{item.category}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-y border-gray-100 py-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Qty</span>
                    {lowObservation ? (
                      <span className="rounded-full bg-amber-100 px-2 py-[1px] text-[9px] font-bold uppercase tracking-wider text-amber-900">Low</span>
                    ) : null}
                  </div>
                  <p className="text-xl font-semibold tabular-nums text-gray-900">{item.quantity.toLocaleString()}</p>
                </div>
                <div className="space-y-1 border-l border-gray-100 pl-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Price</p>
                  <p className="text-xl font-semibold tabular-nums text-gray-900">{currencyFormatter.format(Number.parseFloat(item.price))}</p>
                </div>
              </div>

              <section className="rounded-2xl bg-gray-50 p-5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Description</h3>
                <div className="mt-3 text-sm leading-relaxed text-gray-800">
                  {item.description?.trim() ? (
                    <p className="whitespace-pre-wrap">{item.description.trim()}</p>
                  ) : (
                    <p className="italic text-gray-500">No description provided.</p>
                  )}
                </div>
              </section>

              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Line value</p>
                <p className="text-xl font-semibold tabular-nums text-accent">
                  {currencyFormatter.format(item.quantity * Number.parseFloat(item.price))}
                </p>
              </div>

              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Created</dt>
                  <dd className="mt-2 text-sm text-gray-700">{describeWhen(item.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Last updated</dt>
                  <dd className="mt-2 text-sm text-gray-700">{describeWhen(item.updatedAt)}</dd>
                </div>
              </dl>

              <footer className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end">
                <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onClose}>
                  Close
                </button>
                <button
                  type="button"
                  className="btn-primary w-full sm:w-auto"
                  onClick={() => {
                    onEdit(item);
                  }}
                >
                  Edit item
                </button>
              </footer>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
