'use client';

import clsx from 'clsx';

import { usePreventBodyScroll } from '@/hooks/usePreventBodyScroll';

interface DeleteModalProps {
  open: boolean;
  itemName: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export function DeleteModal({ open, itemName, loading, onClose, onConfirm }: DeleteModalProps) {
  usePreventBodyScroll(open);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 py-10">
      <button
        type="button"
        aria-label="Close delete modal"
        className="fixed inset-0 z-0 bg-slate-900/60 backdrop-blur-sm transition"
        tabIndex={-1}
        onClick={() => {
          if (loading) return;

          onClose();
        }}
      />

      <div className="relative z-[1] mt-24 w-full max-w-md pb-12">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
          <h2 id="delete-item-heading" className="text-xl font-semibold text-gray-900">
            Delete <span className="text-accent">{itemName}</span>?
          </h2>

          <p className="mt-3 text-sm text-gray-600">This action cannot be undone.</p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              className={clsx('btn-secondary w-full sm:w-auto', loading && 'cursor-not-allowed opacity-75')}
              disabled={loading}
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="button"
              className={clsx('btn-danger flex w-full items-center justify-center gap-2 sm:w-auto')}
              disabled={loading}
              onClick={() => void Promise.resolve(onConfirm())}
            >
              {loading ? (
                <>
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/60 border-l-white"></span>
                  Deleting...
                </>
              ) : (
                <>Delete permanently</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
