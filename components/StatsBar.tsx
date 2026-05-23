import type { InventoryItem } from "@/lib/types";

interface StatsBarProps {
  items: InventoryItem[];
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function computeTotals(items: InventoryItem[]) {
  const totalQuantity = items.length;
  const totalValue = items.reduce((accumulator, item) => accumulator + item.quantity * Number.parseFloat(item.price), 0);
  const lowStock = items.reduce((accumulator, item) => accumulator + (item.quantity <= 5 ? 1 : 0), 0);

  return { totalQuantity, totalValue, lowStock };
}

export function StatsBar({ items }: StatsBarProps) {
  const { totalQuantity, totalValue, lowStock } = computeTotals(items);

  return (
    <section aria-label="Inventory statistics" className="grid gap-4 sm:grid-cols-3">
      <article className="card p-5">
        <p className="text-sm font-semibold text-gray-500">Total Items</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{totalQuantity}</p>
        <p className="mt-3 text-xs text-gray-500">Tracked SKUs registered in StockFlow.</p>
      </article>

      <article className="card p-5">
        <p className="text-sm font-semibold text-gray-500">Total Value</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{currencyFormatter.format(totalValue)}</p>
        <p className="mt-3 text-xs text-gray-500">Quantity × selling price summed across SKUs.</p>
      </article>

      <article className="card p-5">
        <p className="text-sm font-semibold text-gray-500">Low Stock Items</p>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-3xl font-semibold tracking-tight text-amber-500">{lowStock}</p>
          <span className="text-xs uppercase tracking-wide text-amber-700">critical</span>
        </div>
        <p className="mt-3 text-xs text-gray-500">Items with fewer than six units remaining.</p>
      </article>
    </section>
  );
}
