'use client';

export function InventorySearchEmpty() {
  return (
    <section className="card flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="rounded-full bg-gray-100 p-6 text-accent" aria-hidden>
        <svg className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-lg font-semibold text-gray-900">No SKUs match this search.</p>
      <p className="max-w-md text-sm text-gray-500">
        Adjust the search text or category filter—you still have inventory, but none of those rows satisfy the filters you applied.
      </p>
    </section>
  );
}
