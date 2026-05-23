export function InventoryEmpty() {
  return (
    <section className="card flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <WarehouseIllustration />
      <p className="text-lg font-semibold text-gray-900">No items found. Add your first item.</p>
      <p className="max-w-xl text-sm text-gray-500">Use StockFlow anytime you receive purchase orders or replenish shelves so everyone sees the newest inventory totals.</p>
    </section>
  );
}

function WarehouseIllustration() {
  return (
    <svg className="h-48 w-full max-w-xs text-accent" aria-hidden viewBox="0 0 360 220">
      <rect x={30} y={40} width={300} height={150} rx={16} fill="#fdeeed" stroke="#e94560" strokeWidth={4} />
      <path d="M90 154h178" stroke="#1a1a2e" strokeWidth={10} strokeLinecap="round" />
      <rect x={70} y={70} width={90} height={90} rx={12} fill="#ffffff" stroke="#1a1a2e" strokeWidth={6} />
      <circle cx={118} cy={116} fill="#e94560" r={14} />
      <polygon points="220,160 250,94 286,160" fill="#fdf3ef" stroke="#1a1a2e" strokeWidth={8} strokeLinejoin="round" />
    </svg>
  );
}
