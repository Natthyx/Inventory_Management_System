'use client';

import Image from 'next/image';
import { useEffect } from 'react';

import { usePreventBodyScroll } from '@/hooks/usePreventBodyScroll';
import { cloudinaryImageLoader } from '@/lib/cloudinaryLoader';
import type { InventoryItem } from '@/lib/types';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

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

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 py-6 sm:py-10">
      <button
        type="button"
        aria-label="Close item details"
        className="fixed inset-0 z-0 bg-slate-900/60 backdrop-blur-sm transition-colors"
        tabIndex={-1}
        onClick={onClose}
      />

      <div className="relative z-[1] w-full max-w-lg pb-8 pt-2" role="presentation">
        <article
          aria-labelledby="item-detail-heading"
          aria-modal="true"
          className="card overflow-hidden rounded-3xl border border-gray-100 shadow-2xl"
          role="dialog"
        >
          <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-gray-100 to-gray-200">
            {item.imageUrl ? (
              <Image
                alt={`${item.name} product photo`}
                className="object-contain"
                fill
                loader={cloudinaryImageLoader}
                priority
                sizes="(max-width: 768px) 100vw, 512px"
                src={item.imageUrl}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-400">
                <svg className="h-16 w-16" aria-hidden fill="none" stroke="currentColor" strokeWidth={1.25} viewBox="0 0 64 64">
                  <rect height={42} rx={10} ry={10} strokeDasharray="6 12" strokeWidth={3} width={42} x={11} y={11} />
                  <circle cx={28} cy={28} r={9} strokeWidth={2} />
                  <path d="M36 41 48 53" strokeLinecap="round" strokeWidth={3} />
                </svg>
                <span className="text-sm font-medium">No product image</span>
              </div>
            )}
          </div>

          <div className="space-y-5 p-6 sm:space-y-6 sm:p-8">
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
        </article>
      </div>
    </div>
  );
}
