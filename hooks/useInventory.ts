'use client';

import { useCallback, useEffect, useState } from 'react';

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

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/items', {
        cache: 'no-store',
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, 'Failed to load inventory items.');
        throw new Error(message);
      }

      type ApiInventoryRow = Omit<InventoryItem, 'quantity' | 'price'> & {
        quantity: unknown;
        price: unknown;
      };

      type ItemsResponse = { items?: ApiInventoryRow[] };
      const payload = (await response.json()) as ItemsResponse;

      if (!payload.items || !Array.isArray(payload.items)) {
        throw new Error('Unexpected response payload while loading inventory.');
      }

      function normalizeCurrency(value: unknown): string {
        if (typeof value === 'string') return value;

        if (typeof value === 'number' && Number.isFinite(value)) {
          return value.toFixed(2);
        }

        return String(value);
      }

      const normalized = payload.items.map((item): InventoryItem => ({
        ...item,
        quantity: Number(item.quantity),
        price: normalizeCurrency(item.price),
      }));

      setItems(normalized);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Failed to fetch inventory.';
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

      await fetchItems();
    },
    [fetchItems],
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

      await fetchItems();
    },
    [fetchItems],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      const response = await fetch(`/api/items/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to delete item.'));
      }

      await fetchItems();
    },
    [fetchItems],
  );

  /* eslint-disable react-hooks/set-state-in-effect -- hydrate StockFlow workspaces with Neon payloads on bootstrap */
  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return {
    items,
    loading,
    error,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
  };
}
