'use client';

import clsx from 'clsx';
import Image from 'next/image';

import type { InventoryItem } from '@/lib/types';
import { cloudinaryImageLoader } from '@/lib/cloudinaryLoader';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

interface ItemCardProps {
  item: InventoryItem;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  onViewDetail: (item: InventoryItem) => void;
}

function FieldHeading({ labelText }: Readonly<{ labelText: string }>) {
  return (
    <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{labelText}</span>
  );
}

export function ItemCard({ item, onEdit, onDelete, onViewDetail }: ItemCardProps) {
  const hasLowShelfStock = item.quantity <= 5;
  const descriptionPreview = item.description?.trim() ?? '';

  return (
    <article
      className={clsx(
        'card overflow-hidden rounded-2xl shadow-[0px_24px_60px_-40px_rgb(36_48_104_/_45%)]',
        hasLowShelfStock && 'border-amber-400/70',
      )}
    >
      <button
        type="button"
        className="flex w-full flex-col gap-4 p-5 text-left transition-colors hover:bg-gray-50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
        onClick={() => {
          onViewDetail(item);
        }}
      >
        <div className="relative mx-auto h-36 w-full max-w-[240px] overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
          {item.imageUrl ? (
            <Image alt={`${item.name} thumbnail`} className="object-cover" fill loader={cloudinaryImageLoader} sizes="240px" src={item.imageUrl} />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] text-gray-500">
              <span>No image</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 border-t border-gray-100 pt-4">
          <div className="space-y-1">
            <FieldHeading labelText="Name" />
            <h3 className="text-lg font-bold leading-snug tracking-tight text-gray-900">{item.name}</h3>
          </div>

          <div className="space-y-1">
            <FieldHeading labelText="SKU" />
            <p className="font-mono text-sm font-semibold text-gray-800">{item.sku}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-y border-gray-100 py-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Qty</span>
                {hasLowShelfStock ? (
                  <span className="rounded-full bg-amber-100 px-2 py-[1px] text-[9px] font-bold uppercase tracking-wider text-amber-900">Low</span>
                ) : null}
              </div>
              <p className="text-lg font-semibold tabular-nums text-gray-900">{item.quantity.toLocaleString()}</p>
            </div>

            <div className="space-y-1 border-l border-gray-100 pl-4">
              <FieldHeading labelText="Price" />
              <p className="text-lg font-semibold tabular-nums text-gray-900">{currencyFormatter.format(Number.parseFloat(item.price))}</p>
            </div>
          </div>

          <div className="space-y-2">
            <FieldHeading labelText="Description" />
            <p className={clsx('text-sm leading-relaxed text-gray-700', descriptionPreview ? 'line-clamp-4' : 'italic text-gray-400')}>
              {descriptionPreview || 'No description yet.'}
            </p>
          </div>
        </div>
      </button>

      <footer className="flex gap-3 border-t border-gray-100 p-5 pt-4">
        <button type="button" className="btn-secondary flex-1" onClick={() => onEdit(item)}>
          Edit
        </button>
        <button type="button" className="btn-danger flex-1" onClick={() => onDelete(item)}>
          Delete
        </button>
      </footer>
    </article>
  );
}
