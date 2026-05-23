'use client';

import clsx from 'clsx';
import { useDeferredValue, useState } from 'react';

import { DeleteModal } from '@/components/DeleteModal';
import { InventoryEmpty } from '@/components/InventoryEmpty';
import { InventoryPaginationBanner } from '@/components/InventoryPagination';
import { InventorySearchEmpty } from '@/components/InventorySearchEmpty';
import { ItemCard } from '@/components/ItemCard';
import { ItemDetailModal } from '@/components/ItemDetailModal';
import { ItemModal } from '@/components/ItemModal';
import { ItemTable } from '@/components/ItemTable';
import { SearchBar } from '@/components/SearchBar';
import { StatsBar } from '@/components/StatsBar';
import { useToast } from '@/components/Toast';
import { useInventory } from '@/hooks/useInventory';
import type { InventoryItem, ItemFormData } from '@/lib/types';

export default function HomePage() {
  const showToast = useToast();

  const [searchInputValue, setSearchInputValue] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [createModalRequested, setCreateModalRequested] = useState(false);
  const [editingInventoryRecord, setEditingInventoryRecord] = useState<InventoryItem | null>(null);

  const [inventoryPendingDeletion, setInventoryPendingDeletion] = useState<InventoryItem | null>(null);
  const [inventoryDeletionBusy, setInventoryDeletionBusy] = useState(false);
  const [inventoryDetailPeek, setInventoryDetailPeek] = useState<InventoryItem | null>(null);

  const deferredSearchLowercase = useDeferredValue(searchInputValue.trim().toLowerCase());

  const { items, loading, error, createItem, updateItem, deleteItem, pagination, stats, setPage, setPageSize } = useInventory({
    category: selectedCategoryFilter,
    searchQueryLowercase: deferredSearchLowercase,
  });

  const filtersActive = Boolean(searchInputValue.trim()) || Boolean(selectedCategoryFilter);

  const initialListLoading = loading && pagination === null && !error;

  const showEmptyWarehouse = !loading && stats !== null && stats.totalItems === 0 && !filtersActive;

  const showNoSearchMatches = !loading && stats !== null && stats.totalItems === 0 && filtersActive;

  async function handleInventoryUpsert(existingRecord: InventoryItem | null, payload: ItemFormData) {
    try {
      if (existingRecord) {
        await updateItem(existingRecord.id, payload);

        showToast('Inventory SKU updated securely.', 'success');
      } else {
        await createItem(payload);

        showToast('New inventory record stored in Neon Postgres.', 'success');
      }
    } catch (caughtIssue) {
      const failureDescription =
        caughtIssue instanceof Error ? caughtIssue.message : 'Unable to reconcile this inventory mutation.';

      showToast(failureDescription, 'error');

      throw caughtIssue;
    }
  }

  async function finalizeInventoryRemoval() {
    if (!inventoryPendingDeletion || inventoryDeletionBusy) return;

    try {
      setInventoryDeletionBusy(true);
      await deleteItem(inventoryPendingDeletion.id);

      showToast(`${inventoryPendingDeletion.name} removed from dashboards.`, 'success');

      const removedCatalogId = inventoryPendingDeletion.id;

      setInventoryPendingDeletion(null);

      setInventoryDetailPeek((currentDetail) => (currentDetail?.id === removedCatalogId ? null : currentDetail));
    } catch (workflowIssue) {
      const explanation =
        workflowIssue instanceof Error ? workflowIssue.message : 'Removal request could not resolve on the server.';
      showToast(explanation, 'error');
    } finally {
      setInventoryDeletionBusy(false);
    }
  }

  function beginInventoryCreation() {
    setEditingInventoryRecord(null);
    setCreateModalRequested(true);
  }

  function beginInventoryEdit(target: InventoryItem) {
    setCreateModalRequested(true);
    setEditingInventoryRecord(target);
  }

  return (
    <>
      <HeaderBar onPrimaryAction={beginInventoryCreation} />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 pb-16 pt-10 xl:max-w-[1180px]">
        {!loading && error ? (
          <section className="rounded-3xl border border-red-200 bg-white p-8 text-red-700 shadow-xl shadow-red-50">
            <p className="text-sm font-semibold">Inventory datastore unavailable</p>
            <p className="mt-3 text-xs text-red-600">{error}</p>
          </section>
        ) : null}

        <StatsBar loading={loading} stats={stats} />

        <SearchBar
          categoryFilter={selectedCategoryFilter}
          onCategoryChange={(nextCategorySelection) => setSelectedCategoryFilter(nextCategorySelection)}
          searchQuery={searchInputValue}
          onSearchQueryChange={(nextRawQuery) => setSearchInputValue(nextRawQuery)}
        />

        {initialListLoading ? (
          <LoadingShell />
        ) : showEmptyWarehouse ? (
          <InventoryEmpty />
        ) : showNoSearchMatches ? (
          <InventorySearchEmpty />
        ) : pagination ? (
          <>
            <p className="hidden text-xs text-gray-600 md:block" role="note">
              Click any row for full SKU details—icons edit or delete without leaving the sheet.
            </p>

            <div className="relative hidden md:block">
              {loading ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] bg-white/55 backdrop-blur-[1px] transition-opacity"
                />
              ) : null}

              <ItemTable
                items={items}
                onDelete={(record) => setInventoryPendingDeletion(record)}
                onEdit={(record) => beginInventoryEdit(record)}
                onViewDetail={(inspectTarget) => setInventoryDetailPeek(inspectTarget)}
              />
            </div>

            <div className="relative space-y-5 md:hidden" aria-live="polite">
              {loading ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 z-10 flex min-h-[120px] items-start justify-center rounded-3xl bg-white/55 pt-6 backdrop-blur-[1px]"
                />
              ) : null}

              {items.map((snapshotEntry) => (
                <ItemCard
                  item={snapshotEntry}
                  key={snapshotEntry.id}
                  onDelete={(record) => setInventoryPendingDeletion(record)}
                  onEdit={(record) => beginInventoryEdit(record)}
                  onViewDetail={(inspectTarget) => setInventoryDetailPeek(inspectTarget)}
                />
              ))}
            </div>

            <InventoryPaginationBanner
              disabled={loading}
              pagination={pagination}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        ) : null}
      </main>

      <ItemDetailModal
        item={inventoryDetailPeek}
        open={Boolean(inventoryDetailPeek)}
        onClose={() => setInventoryDetailPeek(null)}
        onEdit={(reviseSnapshot) => {
          setInventoryDetailPeek(null);

          beginInventoryEdit(reviseSnapshot);
        }}
      />

      <ItemModal
        item={editingInventoryRecord}
        onClose={() => {
          setCreateModalRequested(false);
          setEditingInventoryRecord(null);
        }}
        onSubmit={(payload) => handleInventoryUpsert(editingInventoryRecord, payload)}
        open={(Boolean(editingInventoryRecord) || createModalRequested) && !initialListLoading}
      />

      <DeleteModal
        loading={inventoryDeletionBusy}
        open={Boolean(inventoryPendingDeletion)}
        itemName={inventoryPendingDeletion?.name ?? ''}
        onClose={() => {
          if (inventoryDeletionBusy) return;

          setInventoryPendingDeletion(null);
        }}
        onConfirm={() => finalizeInventoryRemoval()}
      />
    </>
  );
}

function LoadingShell() {
  return (
    <section className="card rounded-3xl border border-gray-100 bg-white px-8 py-20 text-center shadow-inner shadow-black/10">
      <div className="mx-auto flex flex-col items-center gap-6">
        <span aria-hidden className="inline-flex h-16 w-16 animate-spin rounded-full border-[4px] border-gray-100 border-t-accent" />
        <div className="space-y-2">
          <p className="text-lg font-semibold text-gray-900">Pulling SKU intelligence from Neon Postgres…</p>
          <p className="text-sm text-gray-500">Drizzle ORM merges relational inventory rows with blazing HTTP fetch drivers.</p>
        </div>
      </div>
    </section>
  );
}

function HeaderBar(props: Readonly<{ onPrimaryAction: () => void }>) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-black/40 bg-[#1a1a2e] text-white shadow-xl shadow-black/20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-6 sm:flex-row sm:items-center sm:justify-between xl:max-w-[1180px]">
        <div className="flex items-center gap-4">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <StockFlowGlyph />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/55">Operational inventory cockpit</p>
            <div className="flex flex-wrap items-end gap-3">
              <h1 className="font-[family-name:var(--font-geist-sans)] text-[32px] font-bold tracking-tight">StockFlow</h1>
              
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => props.onPrimaryAction()}
          className={clsx('btn-primary w-full px-10 py-[11px] text-base tracking-tight shadow-lg shadow-accent/35 sm:w-auto')}
        >
          + Add Item
        </button>
      </div>
    </header>
  );
}

function StockFlowGlyph() {
  return (
    <svg width={44} height={44} viewBox="0 0 64 64" role="presentation" aria-hidden focusable={false}>
      <rect fill="#ffffff12" height={44} rx={13} ry={13} stroke="#ffffff4d" strokeWidth={3} width={44} x={10} y={10} />
      <path d="m18 45 12-34 14 41" opacity={0.15} />
      <path d="M21 43h34" stroke="white" strokeLinecap="round" strokeOpacity={0.85} strokeWidth={3} />
      <path d="m22 18 21 32" opacity={0.12} />
      <path d="m24 43 8-34 8 24" opacity={0.12} />

      <rect fill="white" height={31} rx={10} ry={10} stroke="#e94560" strokeWidth={2.85} width={29} x={21} y={21} />

      <path d="M28 45h17" stroke="#e94560" strokeDasharray="6 11" strokeLinecap="round" strokeWidth={2.6} />

      <path d="M35 40v17" stroke="white" strokeLinecap="round" strokeOpacity={0.74} strokeWidth={2} />
      <circle cx={45} cy={28} fill="#ffd9e1" opacity={0.35} r={4} />
    </svg>
  );
}
