'use client';

import clsx from 'clsx';
import type { FormEvent, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { InventoryItem, ItemFormData } from '@/lib/types';
import { CATEGORIES } from '@/lib/types';

import { usePreventBodyScroll } from '@/hooks/usePreventBodyScroll';

import { ImageUpload } from './ImageUpload';

interface FieldErrors {
  name?: string;
  sku?: string;
  category?: string;
  quantity?: string;
  price?: string;
  description?: string;
}

interface ItemModalProps {
  open: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onSubmit: (payload: ItemFormData) => Promise<void>;
}

type DraftState = {
  name: string;
  sku: string;
  category: string;
  quantity: string;
  price: string;
  description: string;
};

const createBlankDraft = (): DraftState => ({
  name: '',
  sku: '',
  category: CATEGORIES[0],
  quantity: '',
  price: '',
  description: '',
});

function validateQuantityInput(rawQuantity: string) {
  const trimmedQuantity = rawQuantity.trim();

  if (!trimmedQuantity) {
    return { ok: false as const, message: 'Quantity is required.' };
  }

  if (!/^\d+$/.test(trimmedQuantity)) {
    return { ok: false as const, message: 'Quantity must be an integer.' };
  }

  const parsedQuantity = Number.parseInt(trimmedQuantity, 10);

  if (parsedQuantity < 0) {
    return { ok: false as const, message: 'Quantity cannot be negative.' };
  }

  return { ok: true as const, quantity: parsedQuantity };
}

function validatePriceInput(rawPrice: string) {
  const trimmedPrice = rawPrice.trim();

  if (!trimmedPrice) {
    return { ok: false as const, message: 'Price is required.' };
  }

  const parsedPrice = Number.parseFloat(trimmedPrice);

  if (!Number.isFinite(parsedPrice)) {
    return { ok: false as const, message: 'Enter a valid price.' };
  }

  if (parsedPrice < 0) {
    return { ok: false as const, message: 'Price cannot be negative.' };
  }

  return { ok: true as const, price: parsedPrice.toFixed(2) };
}

export function ItemModal({ open, onClose, item, onSubmit }: ItemModalProps) {
  usePreventBodyScroll(open);

  const nameFieldReference = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<DraftState>(() => createBlankDraft());
  const [imageAttachment, setImageAttachment] = useState<File | null>(null);
  const [persistedCloudinaryUrl, setPersistedCloudinaryUrl] = useState('');
  const [fieldIssues, setFieldIssues] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- hydrate draft snapshots when dialog props reshuffle externally */
  useEffect(() => {
    if (!open) {
      setDraft(createBlankDraft());
      setImageAttachment(null);
      setPersistedCloudinaryUrl('');
      setFieldIssues({});
      setIsSaving(false);

      return;
    }

    if (item) {
      setDraft({
        name: item.name,
        sku: item.sku,
        category: item.category,
        quantity: `${item.quantity}`,
        price: item.price,
        description: item.description ?? '',
      });
      setPersistedCloudinaryUrl(item.imageUrl ?? '');
    } else {
      setDraft(createBlankDraft());
      setPersistedCloudinaryUrl('');
    }

    setImageAttachment(null);
    setFieldIssues({});
    setIsSaving(false);

    queueMicrotask(() => {
      nameFieldReference.current?.focus();
    });
  }, [item, open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    function handleEscapeDismissal(event: KeyboardEvent) {
      if (!open || event.repeat || event.key !== 'Escape') {
        return;
      }

      event.preventDefault();

      if (!isSaving) {
        onClose();
      }
    }

    window.addEventListener('keydown', handleEscapeDismissal);

    return () => window.removeEventListener('keydown', handleEscapeDismissal);
  }, [isSaving, onClose, open]);

  const persistedPreviewHref = useMemo(() => {
    const trimmedHref = persistedCloudinaryUrl.trim();

    return trimmedHref.length ? trimmedHref : null;
  }, [persistedCloudinaryUrl]);

  if (!open) {
    return null;
  }

  async function persistInventoryRecord(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();

    const nextIssues: FieldErrors = {};

    if (!draft.name.trim()) nextIssues.name = 'Name is required.';
    if (!draft.sku.trim()) nextIssues.sku = 'SKU is required.';
    if (!draft.category.trim()) nextIssues.category = 'Category is required.';

    const quantityOutcome = validateQuantityInput(draft.quantity);
    if (!quantityOutcome.ok) nextIssues.quantity = quantityOutcome.message;

    const priceOutcome = validatePriceInput(draft.price);
    if (!priceOutcome.ok) nextIssues.price = priceOutcome.message;

    if (draft.description.trim().length > 5000) {
      nextIssues.description = 'Description is limited to five thousand characters.';
    }

    setFieldIssues(nextIssues);

    if (Object.keys(nextIssues).length || !quantityOutcome.ok || !priceOutcome.ok) {
      return;
    }

    const payload: ItemFormData = {
      name: draft.name.trim(),
      sku: draft.sku.trim(),
      category: draft.category.trim(),
      quantity: quantityOutcome.quantity,
      price: priceOutcome.price,
      description: draft.description.trim(),
      imageFile: imageAttachment,
      imageUrl: persistedCloudinaryUrl,
    };

    try {
      setIsSaving(true);

      await onSubmit(payload);

      onClose();

      setDraft(createBlankDraft());
      setPersistedCloudinaryUrl('');
      setImageAttachment(null);
      setFieldIssues({});
    } catch {
      // Toast messaging happens at the orchestration layer.
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 py-6 sm:py-10">
      <button
        type="button"
        aria-label="Close inventory dialog"
        className="fixed inset-0 z-0 bg-slate-900/60 backdrop-blur-sm transition-colors"
        tabIndex={-1}
        onClick={() => {
          if (!isSaving) {
            onClose();
          }
        }}
      />

      <div className="relative z-[1] w-full max-w-lg pb-6 pt-2 lg:max-w-[1200px]" role="presentation">
        <div
          aria-labelledby="inventory-dialog-title"
          aria-modal="true"
          className={clsx(
            'card flex flex-col overflow-hidden rounded-3xl border border-gray-50 shadow-xl',
            'lg:max-h-[min(820px,calc(100vh-2.5rem))] lg:flex-row lg:items-stretch lg:divide-x lg:divide-gray-100',
          )}
          role="dialog"
        >
          {/* Match view/detail modal: image & media left on desktop */}
          <div className="relative flex min-h-[16rem] w-full shrink-0 flex-col border-b border-gray-100 bg-white lg:min-h-0 lg:w-1/2 lg:border-b-0 lg:p-6">
            <div className="flex min-h-[16rem] flex-1 flex-col justify-center lg:min-h-0">
              <section aria-label="Item media upload" className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-5 lg:flex-1 lg:p-0">
                <ImageUpload
                  disabled={isSaving}
                  existingUrl={persistedPreviewHref}
                  selectedFile={imageAttachment}
                  onFileChosen={(nextFile) => {
                    setImageAttachment(nextFile);
                    setPersistedCloudinaryUrl(nextFile ? '' : '');
                  }}
                />
                <p className="text-xs text-gray-500">Cloudinary ingestion enforces JPG/PNG/WebP/GIF under five megabytes.</p>
              </section>
            </div>
          </div>

          {/* Form column */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:overflow-hidden">
            <header className="flex shrink-0 flex-col gap-4 border-b border-gray-100 p-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:pb-6 sm:pt-8">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">StockFlow HQ</p>
                <h2 id="inventory-dialog-title" className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
                  {item ? 'Edit Item' : 'Add New Item'}
                </h2>
              </div>
              <button type="button" className="btn-secondary w-full justify-center sm:w-auto" disabled={isSaving} onClick={() => !isSaving && onClose()}>
                Cancel
              </button>
            </header>

            <form className="flex min-h-0 flex-1 flex-col lg:overflow-hidden" noValidate onSubmit={(event) => void persistInventoryRecord(event)}>
              <div className="min-h-0 flex-1 space-y-10 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8">
                <section aria-label="Baseline catalog fields" className="grid gap-5 md:grid-cols-2">
                  <LabeledControl controlId="inventory-name" error={fieldIssues.name} label="Name" requiredDecoration>
                    <input
                      ref={nameFieldReference}
                      className={clsx('input-field', fieldIssues.name ? 'border-red-500 focus-visible:ring-red-500' : '')}
                      id="inventory-name"
                      maxLength={255}
                      placeholder="Example: Industrial rolling cart"
                      value={draft.name}
                      disabled={isSaving}
                      onChange={(event) => setDraft((previous) => ({ ...previous, name: event.target.value }))}
                    />
                  </LabeledControl>

                  <LabeledControl controlId="inventory-sku" error={fieldIssues.sku} label="SKU" requiredDecoration>
                    <input
                      id="inventory-sku"
                      className={clsx('input-field', fieldIssues.sku ? 'border-red-500 focus-visible:ring-red-500' : '')}
                      maxLength={100}
                      placeholder="Example: INV-98231"
                      value={draft.sku}
                      disabled={isSaving}
                      onChange={(event) => setDraft((previous) => ({ ...previous, sku: event.target.value }))}
                    />
                  </LabeledControl>

                  <LabeledControl controlId="inventory-category" error={fieldIssues.category} label="Category" requiredDecoration>
                    <select
                      id="inventory-category"
                      value={draft.category}
                      disabled={isSaving}
                      className={clsx('input-field', fieldIssues.category ? 'border-red-500 focus-visible:ring-red-500' : '')}
                      onChange={(event) => setDraft((previous) => ({ ...previous, category: event.target.value }))}
                    >
                      {CATEGORIES.map((catalogCategory) => (
                        <option key={catalogCategory} value={catalogCategory}>
                          {catalogCategory}
                        </option>
                      ))}
                    </select>
                  </LabeledControl>

                  <LabeledControl controlId="inventory-qty" error={fieldIssues.quantity} label="Quantity" requiredDecoration>
                    <input
                      id="inventory-qty"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className={clsx('input-field', fieldIssues.quantity ? 'border-red-500 focus-visible:ring-red-500' : '')}
                      value={draft.quantity}
                      disabled={isSaving}
                      onChange={(event) => setDraft((previous) => ({ ...previous, quantity: event.target.value }))}
                    />
                  </LabeledControl>

                  <LabeledControl controlId="inventory-price" error={fieldIssues.price} helperText="Reported values round to cents." label="Price" requiredDecoration>
                    <input
                      id="inventory-price"
                      disabled={isSaving}
                      step="0.01"
                      type="number"
                      min={0}
                      value={draft.price}
                      className={clsx('input-field', fieldIssues.price ? 'border-red-500 focus-visible:ring-red-500' : '')}
                      onChange={(event) => setDraft((previous) => ({ ...previous, price: event.target.value }))}
                    />
                  </LabeledControl>
                </section>

                <section className="space-y-3">
                  <LabeledPlain hint="Optional" htmlFor="inventory-description" label="Description">
                    <textarea
                      id="inventory-description"
                      disabled={isSaving}
                      value={draft.description}
                      placeholder="Operational notes tailored for warehouse collaborators…"
                      maxLength={5000}
                      rows={6}
                      className={clsx('input-field', fieldIssues.description ? 'border-red-500 focus-visible:ring-red-500' : '')}
                      onChange={(event) => setDraft((previous) => ({ ...previous, description: event.target.value }))}
                    />
                    {fieldIssues.description ? <InlineError>{fieldIssues.description}</InlineError> : null}
                  </LabeledPlain>
                </section>
              </div>

              <footer className="flex shrink-0 flex-col gap-3 border-t border-gray-100 px-6 py-6 sm:flex-row sm:justify-end sm:px-8">
                <button type="button" className={clsx('btn-secondary justify-center')} disabled={isSaving} onClick={() => !isSaving && onClose()}>
                  Discard edits
                </button>
                <button type="submit" className={clsx('btn-primary inline-flex items-center justify-center gap-3', isSaving && 'cursor-wait')} disabled={isSaving}>
                  {isSaving ? <span aria-hidden className="h-5 w-5 animate-spin rounded-full border-2 border-white/70 border-r-transparent" /> : null}
                  {isSaving ? (item ? 'Saving changes…' : 'Creating SKU…') : item ? 'Save changes' : 'Create item'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function LabeledPlain({
  children,
  hint,
  htmlFor,
  label,
}: Readonly<{ children: ReactNode; hint?: string; htmlFor?: string; label: string }>) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-800" htmlFor={htmlFor}>
        {label}{' '}
        {hint ? <span className="text-[11px] font-normal uppercase tracking-[0.32em] text-gray-400">{hint}</span> : null}
      </label>
      {children}
    </div>
  );
}

function LabeledControl({
  children,
  controlId,
  error,
  helperText,
  label,
  requiredDecoration,
}: Readonly<{ children: React.ReactNode; controlId: string; error?: string; helperText?: string; label: string; requiredDecoration?: boolean }>) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-800" htmlFor={controlId}>
        {label}
        {requiredDecoration ? <span className="text-accent">*</span> : null}
      </label>
      {children}

      {helperText ? <p className="text-[11px] text-gray-500">{helperText}</p> : null}
      {error ? <InlineError>{error}</InlineError> : null}
    </div>
  );
}

function InlineError({ children }: Readonly<{ children: string }>) {
  return <p className="text-xs font-semibold text-red-600">{children}</p>;
}
