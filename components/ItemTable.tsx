'use client';

import clsx from 'clsx';
import Image from 'next/image';
import { useMemo, useState } from 'react';

import type { InventoryItem } from '@/lib/types';
import { cloudinaryImageLoader } from '@/lib/cloudinaryLoader';

type SortKey = 'name' | 'quantity' | 'price';
type SortDirection = 'asc' | 'desc';

interface ItemTableProps {
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  onViewDetail: (item: InventoryItem) => void;
}

function compareStrings(left: string, right: string, direction: SortDirection) {
  const comparison = left.localeCompare(right, undefined, { sensitivity: 'base' });
  if (comparison === 0) return 0;
  return direction === 'asc' ? comparison : -comparison;
}

function compareNumbers(left: number, right: number, direction: SortDirection) {
  if (left === right) return 0;
  return direction === 'asc' ? left - right : right - left;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function SortIndicator({ direction, active }: Readonly<{ direction: SortDirection; active: boolean }>) {
  if (!active) {
    return <span className="text-xs text-gray-400">↕</span>;
  }

  return <span aria-hidden>{direction === 'asc' ? '↑' : '↓'}</span>;
}

export function ItemTable({ items, onEdit, onDelete, onViewDetail }: ItemTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const toggleSort = (nextKey: SortKey) => {
    setSortKey((previousKey) => {
      if (previousKey !== nextKey) {
        setSortDirection('asc');
        return nextKey;
      }

      setSortDirection((previousDirection) => (previousDirection === 'asc' ? 'desc' : 'asc'));

      return nextKey;
    });
  };

  const sortedItems = useMemo(() => {
    const mutable = [...items];

    mutable.sort((leftItem, rightItem) => {
      if (sortKey === 'name') {
        return compareStrings(leftItem.name.toLowerCase(), rightItem.name.toLowerCase(), sortDirection);
      }

      if (sortKey === 'quantity') {
        return compareNumbers(leftItem.quantity, rightItem.quantity, sortDirection);
      }

      const leftPrice = Number.parseFloat(leftItem.price);
      const rightPrice = Number.parseFloat(rightItem.price);

      return compareNumbers(leftPrice, rightPrice, sortDirection);
    });

    return mutable;
  }, [items, sortDirection, sortKey]);

  return (
    <div className="card hidden overflow-hidden md:block">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm text-gray-700">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr className="text-left">
              <th className="px-5 py-3 font-semibold">Image</th>
              <th className="px-5 py-3 font-semibold">
                <button type="button" className="inline-flex items-center gap-2 uppercase" onClick={() => toggleSort('name')}>
                  Name
                  <SortIndicator direction={sortDirection} active={sortKey === 'name'} />
                </button>
              </th>
              <th className="px-5 py-3 font-semibold">SKU</th>
              <th className="px-5 py-3 font-semibold">Category</th>
              <th className="px-5 py-3 font-semibold">
                <button type="button" className="inline-flex items-center gap-2 uppercase" onClick={() => toggleSort('quantity')}>
                  Quantity
                  <SortIndicator direction={sortDirection} active={sortKey === 'quantity'} />
                </button>
              </th>
              <th className="px-5 py-3 font-semibold">
                <button type="button" className="inline-flex items-center gap-2 uppercase" onClick={() => toggleSort('price')}>
                  Price
                  <SortIndicator direction={sortDirection} active={sortKey === 'price'} />
                </button>
              </th>
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 bg-white">
            {sortedItems.map((inventoryItem) => (
              <tr
                key={inventoryItem.id}
                aria-label={`View details for ${inventoryItem.name}`}
                className="cursor-pointer transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                tabIndex={0}
                onClick={() => {
                  onViewDetail(inventoryItem);
                }}
                onKeyDown={(keyboardTrigger) => {
                  if (keyboardTrigger.key !== 'Enter' && keyboardTrigger.key !== ' ') {
                    return;
                  }

                  keyboardTrigger.preventDefault();

                  onViewDetail(inventoryItem);
                }}
              >
                <td className="px-5 py-4">
                  <div className="relative h-11 w-11 overflow-hidden rounded-full border border-gray-100 bg-gray-100">
                    {inventoryItem.imageUrl ? (
                      <Image
                        alt={inventoryItem.name}
                        className="object-cover"
                        fill
                        loader={cloudinaryImageLoader}
                        sizes="44px"
                        src={inventoryItem.imageUrl}
                      />
                    ) : (
                      <ThumbnailPlaceholder />
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 font-semibold text-gray-900">{inventoryItem.name}</td>
                <td className="px-5 py-4 text-gray-800">{inventoryItem.sku}</td>
                <td className="px-5 py-4 text-gray-600">{inventoryItem.category}</td>
                <td className="px-5 py-4">
                  <span
                    className={clsx(
                      'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                      inventoryItem.quantity <= 5 ? 'bg-amber-100 text-amber-900' : 'border border-transparent bg-gray-100 text-gray-800',
                    )}
                  >
                    {inventoryItem.quantity.toLocaleString()}
                    {inventoryItem.quantity <= 5 ? <span className="sr-only"> (low stock)</span> : null}
                  </span>
                </td>
                <td className="px-5 py-4 font-semibold text-gray-900">{currencyFormatter.format(Number.parseFloat(inventoryItem.price))}</td>

                <td className="px-5 py-4">
                  <div
                    role="presentation"
                    className="flex justify-end gap-2"
                    onClick={(clickEvent) => clickEvent.stopPropagation()}
                    onKeyDown={(keydownEvent) => keydownEvent.stopPropagation()}
                  >
                    <IconGlyphButton ariaLabel={`Edit ${inventoryItem.name}`} onClick={() => onEdit(inventoryItem)}>
                      <PencilGlyph />
                    </IconGlyphButton>
                    <IconGlyphButton ariaLabel={`Delete ${inventoryItem.name}`} onClick={() => onDelete(inventoryItem)}>
                      <TrashGlyph />
                    </IconGlyphButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IconGlyphButton({
  ariaLabel,
  children,
  onClick,
}: Readonly<{ ariaLabel: string; children: React.ReactNode; onClick: () => void }>) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={(pointerEvent) => {
        pointerEvent.stopPropagation();
        onClick();
      }}
      onKeyDown={(keyboardEvent) => {
        if (keyboardEvent.key === ' ' || keyboardEvent.key === 'Enter') {
          keyboardEvent.stopPropagation();
        }
      }}
      className="rounded-lg border border-gray-200 bg-white p-2 text-gray-700 transition hover:border-accent hover:bg-accent hover:text-white"
    >
      {children}
    </button>
  );
}

function ThumbnailPlaceholder() {
  return (
    <svg className="h-full w-full p-3 text-gray-400" aria-hidden viewBox="0 0 64 64">
      <rect height={42} rx={10} ry={10} stroke="currentColor" strokeDasharray="6 10" strokeWidth={3} width={42} x={11} y={11} fill="none" />
      <circle cx={28} cy={28} fill="white" r={8} stroke="currentColor" strokeWidth={2} />
      <path d="m36 40 12 11" stroke="currentColor" strokeLinecap="round" strokeWidth={3} />
    </svg>
  );
}

function PencilGlyph() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden stroke="currentColor" fill="none" strokeWidth={1.65}>
      <path d="M12 20h9M4 20l5.586-5.586a2 2 0 011.414-.586H16a3 3 0 003-3V8.414a2 2 0 00-.586-1.414l-6.586 6.586a2 2 0 00-.586 1.414z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 5 19 7" strokeLinecap="round" />
    </svg>
  );
}

function TrashGlyph() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden stroke="currentColor" fill="none" strokeWidth={1.65}>
      <polyline points="3 6 5 6 21 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 13v7M15 13v7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 21h8m-13-15h17l-2 17H7L5 6z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 6 10 5h6l1 1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
