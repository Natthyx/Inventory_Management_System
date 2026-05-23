'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { InventoryListPaginationBrief, InventoryListStatsBrief } from '@/lib/inventoryList';
import { INVENTORY_PAGE_SIZE_DEFAULT } from '@/lib/inventoryList';
import type { InventoryItem, ItemFormData } from '@/lib/types';

interface ApiErrorPayload {
  error?: string;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const json = (await response.json()) as ApiErrorPayload;
    if (json.error && typeof json.error === 'string') return json.error;
    return fallback;
  } catch {
    return fallback;
  }
}

async function uploadImageFile(imageFile: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', imageFile);
  formData.append('filename', imageFile.name || 'inventory-image');

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const message = await readErrorMessage(response, 'Image upload failed.');
    throw new Error(message);
  }

  type UploadResponse = { url?: unknown };
  const json = (await response.json()) as UploadResponse;

  if (typeof json.url === 'string' && json.url.length > 0) {
    return json.url;
  }

  throw new Error('Upload succeeded but Cloudinary URL was missing.');
}

function buildUpsertPayload(data: ItemFormData, imageUrl: string | null) {
  return {
    name: data.name,
    sku: data.sku,
    category: data.category,
    quantity: data.quantity,
    price: data.price,
    description: data.description.trim().length > 0 ? data.description.trim() : null,
    imageUrl,
  };
}

async function upsertInventoryImage(imageFile?: File | null, imagePreference?: string): Promise<string | null> {
  if (imageFile instanceof File) {
    return uploadImageFile(imageFile);
  }

  if (typeof imagePreference === 'string') {
    const trimmed = imagePreference.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return null;
}

interface UseInventoryOptions {
  /** Lowercase substring for name/SKU filters (defer on the caller). */
  searchQueryLowercase: string;
  category: string;
}

export function useInventory({ searchQueryLowercase, category }: Readonly<UseInventoryOptions>) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(INVENTORY_PAGE_SIZE_DEFAULT);
  const [pagination, setPagination] = useState<InventoryListPaginationBrief | null>(null);
  const [stats, setStats] = useState<InventoryListStatsBrief | null>(null);

  /** Tracks the last fetched search/category/pageSize triple to detect filter changes without an effect-driven setPage reset. */
  const listFiltersKeyRef = useRef<string | null>(null);

  const fetchPage = useCallback(async (pageOverrideExplicit?: number) => {
      setLoading(true);
      setError(null);

      let pageForRequest: number;

      if (typeof pageOverrideExplicit === 'number') {
        pageForRequest = pageOverrideExplicit;
      } else {
        const bundleKeyAggregatedConstructed = `${searchQueryLowercase}||${category}||${pageSize}`;

        if (listFiltersKeyRef.current !== bundleKeyAggregatedConstructed) {
          listFiltersKeyRef.current = bundleKeyAggregatedConstructed;
          pageForRequest = 1;
        } else {
          pageForRequest = page;
        }
      }

      try {
        const params = new URLSearchParams({
          category,
          page: String(pageForRequest),
          pageSize: String(pageSize),
          q: searchQueryLowercase,
        });

        const response = await fetch(`/api/items?${params.toString()}`, { cache: 'no-store' });

        if (!response.ok) {
          throw new Error(await readErrorMessage(response, 'Failed to load inventory items.'));
        }

        type ApiInventoryRow = Omit<InventoryItem, 'quantity' | 'price'> & {
          quantity: unknown;
          price: unknown;
        };

        type Payload = {
          items: ApiInventoryRow[];
          pagination: InventoryListPaginationBrief;
          stats: InventoryListStatsBrief;
        };

        const payload = (await response.json()) as Payload;

        if (!payload.items || !Array.isArray(payload.items)) {
          throw new Error('Unexpected response payload while loading inventory.');
        }

        if (!payload.pagination || !payload.stats) {
          throw new Error('Incomplete list response from server.');
        }

        function normalizeCurrency(value: unknown): string {
          if (typeof value === 'string') return value;

          if (typeof value === 'number' && Number.isFinite(value)) {
            return value.toFixed(2);
          }

          return String(value);
        }

        const normalized = payload.items.map(
          (row): InventoryItem => ({
            ...row,
            quantity: Number(row.quantity),
            price: normalizeCurrency(row.price),
          }),
        );

        setItems(normalized);
        setPagination(payload.pagination);
        setStats(payload.stats);
        setPage(payload.pagination.page);
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : 'Failed to fetch inventory.';
        setError(message);
        setItems([]);
        setPagination(null);
        setStats(null);
      } finally {
        setLoading(false);
      }
    },
    [category, page, pageSize, searchQueryLowercase],
  );

  /* eslint-disable react-hooks/set-state-in-effect -- refetch after page / filters / pageSize change */
  useEffect(() => {
    void fetchPage();
  }, [fetchPage]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const createItem = useCallback(
    async (data: ItemFormData) => {
      const resolvedImageUrl = await upsertInventoryImage(data.imageFile, data.imageUrl);

      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildUpsertPayload(data, resolvedImageUrl)),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to create item.'));
      }

      await fetchPage(1);
    },
    [fetchPage],
  );

  const updateItem = useCallback(
    async (id: string, data: ItemFormData) => {
      const resolvedImageUrl = await upsertInventoryImage(data.imageFile, data.imageUrl);

      const response = await fetch(`/api/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildUpsertPayload(data, resolvedImageUrl)),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to update item.'));
      }

      await fetchPage();
    },
    [fetchPage],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      const response = await fetch(`/api/items/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to delete item.'));
      }

      await fetchPage();
    },
    [fetchPage],
  );

  return {
    items,
    loading,
    error,
    pagination,
    stats,
    page,
    pageSize,
    setPage,
    setPageSize,
    fetchItems: fetchPage,
    createItem,
    updateItem,
    deleteItem,
  };
}
