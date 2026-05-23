import clsx from 'clsx';

import type { InventoryListStatsBrief } from '@/lib/inventoryList';

interface StatsBarProps {
  loading: boolean;
  stats: InventoryListStatsBrief | null;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function formatPortfolioValue(amountText: string) {
  const n = Number.parseFloat(amountText);
  return currencyFormatter.format(Number.isFinite(n) ? n : 0);
}

export function StatsBar({ loading, stats }: StatsBarProps) {
  const totalItemsLabel = loading ? '\u2026' : `${stats?.totalItems ?? '0'}`;

  const totalValueLabel = loading || !stats ? '\u2026' : formatPortfolioValue(stats.totalPortfolioValue);

  const lowStockLabel = loading || !stats ? '\u2026' : `${stats.lowStockSkuCount}`;

  return (
    <section aria-label="Inventory statistics" className="grid gap-4 sm:grid-cols-3">
      <article className="card p-5">
        <p className="text-sm font-semibold text-gray-500">Total Items</p>
        <p className={clsx('mt-2 text-3xl font-semibold tracking-tight text-gray-900', loading && 'text-gray-400')}>
          {totalItemsLabel}
        </p>
        <p className="mt-3 text-xs text-gray-500">Matches filters (all inventory when filters are cleared).</p>
      </article>

      <article className="card p-5">
        <p className="text-sm font-semibold text-gray-500">Total Value</p>
        <p className={clsx('mt-2 text-3xl font-semibold tracking-tight text-gray-900', loading && 'text-gray-400')}>
          {totalValueLabel}
        </p>
        <p className="mt-3 text-xs text-gray-500">Quantity × selling price summed across filtered SKUs.</p>
      </article>

      <article className="card p-5">
        <p className="text-sm font-semibold text-gray-500">Low Stock Items</p>
        <div className="mt-2 flex items-baseline gap-2">
          <p className={clsx('text-3xl font-semibold tracking-tight text-amber-500', loading && 'text-gray-400')}>
            {lowStockLabel}
          </p>
          {!loading ? (
            <span className="text-xs uppercase tracking-wide text-amber-700">critical</span>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-gray-500">Filtered SKUs with fewer than six units remaining.</p>
      </article>
    </section>
  );
}
