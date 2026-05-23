'use client';

import clsx from 'clsx';

import type { InventoryListPaginationBrief } from '@/lib/inventoryList';
import { INVENTORY_PAGE_SIZE_DEFAULT, INVENTORY_PAGE_SIZE_MAXIMUM } from '@/lib/inventoryList';

interface InventoryPaginationBannerProps {
  pagination: InventoryListPaginationBrief;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (nextSize: number) => void;
  disabled?: boolean;
}

const ALLOWED_ROW_STRIDE_CHOICES = [10, INVENTORY_PAGE_SIZE_DEFAULT, 50, INVENTORY_PAGE_SIZE_MAXIMUM];

/** Unique sorted page-size options */
const UNIQUE_PAGE_SIZE_LOOKUP = [...new Set(ALLOWED_ROW_STRIDE_CHOICES)].sort((left, right) => left - right);

export function InventoryPaginationBanner(props: InventoryPaginationBannerProps) {
  const { pagination, onPageChange, onPageSizeChange, disabled = false } = props;

  const rowRangeStartInclusive = pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const rowRangeEndInclusive = Math.min(pagination.totalItems, pagination.page * pagination.pageSize);

  return (
    <nav
      aria-label="Pagination"
      className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm tabular-nums text-gray-600">
        Showing{' '}
        <span className="font-semibold text-gray-900">
          {rowRangeStartInclusive}-{rowRangeEndInclusive}
        </span>{' '}
        of <span className="font-semibold text-gray-900">{pagination.totalItems}</span>{' '}
        {pagination.totalItems === 1 ? 'item' : 'items'}
      </p>

      <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
        Rows / page
        <select
          aria-label="Items per page"
          className="input-field py-2 text-[13px] font-normal"
          disabled={disabled}
          value={pagination.pageSize}
          onChange={(event) => onPageSizeChange(Number.parseInt(event.target.value, 10))}
        >
          {UNIQUE_PAGE_SIZE_LOOKUP.map((stride) => (
            <option key={stride} value={stride}>
              {stride}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          className={clsx('btn-secondary min-w-[88px]', disabled || !pagination.hasPreviousPage ? 'pointer-events-none opacity-40' : '')}
          disabled={disabled || !pagination.hasPreviousPage}
          onClick={() => onPageChange(1)}
        >
          First
        </button>

        <button
          type="button"
          className={clsx('btn-secondary min-w-[88px]', disabled || !pagination.hasPreviousPage ? 'pointer-events-none opacity-40' : '')}
          disabled={disabled || !pagination.hasPreviousPage}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          Previous
        </button>

        <span className="min-w-[6.5rem] text-center text-sm tabular-nums text-gray-700">
          Page {pagination.page} / {pagination.totalPages}
        </span>

        <button
          type="button"
          className={clsx('btn-secondary min-w-[88px]', disabled || !pagination.hasNextPage ? 'pointer-events-none opacity-40' : '')}
          disabled={disabled || !pagination.hasNextPage}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          Next
        </button>

        <button
          type="button"
          className={clsx('btn-secondary min-w-[88px]', disabled || !pagination.hasNextPage ? 'pointer-events-none opacity-40' : '')}
          disabled={disabled || !pagination.hasNextPage}
          onClick={() => onPageChange(pagination.totalPages)}
        >
          Last
        </button>
      </div>
    </nav>
  );
}
