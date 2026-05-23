'use client';

import clsx from 'clsx';
import Image from 'next/image';
import { useEffect, useId, useMemo, useState } from 'react';

import { cloudinaryImageLoader } from '@/lib/cloudinaryLoader';

const ACCEPT_ATTRIBUTE = '.jpg,.jpeg,.png,.webp,.gif';

interface ImageUploadProps {
  disabled?: boolean;
  existingUrl: string | null;
  selectedFile: File | null;
  onFileChosen: (file: File | null) => void;
}

function validatesAcceptance(fileCandidate: File) {
  const typeAllowed =
    fileCandidate.type === 'image/jpeg' ||
    fileCandidate.type === 'image/png' ||
    fileCandidate.type === 'image/webp' ||
    fileCandidate.type === 'image/gif';

  if (!typeAllowed) {
    return false;
  }

  return fileCandidate.size <= 5 * 1024 * 1024;
}

export function ImageUpload({ disabled, existingUrl, selectedFile, onFileChosen }: ImageUploadProps) {
  const browseInputIdentity = useId();
  const [dragLayerActive, setDragLayerActive] = useState(false);
  const [uploadHint, setUploadHint] = useState<string | null>(null);

  const ephemeralPreviewHref = useMemo(() => {
    if (!selectedFile) {
      return null;
    }

    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (ephemeralPreviewHref) {
        URL.revokeObjectURL(ephemeralPreviewHref);
      }
    };
  }, [ephemeralPreviewHref]);

  const remotePreviewEligible = !!(existingUrl && !ephemeralPreviewHref);

  function ingestFiles(fileCandidates?: FileList | null) {
    if (!fileCandidates || disabled) {
      return;
    }

    const nextSelection = Array.from(fileCandidates).find(validatesAcceptance);

    if (!nextSelection) {
      setUploadHint('Use JPG, PNG, WEBP or GIF uploads under five megabytes.');

      return;
    }

    setUploadHint(null);

    onFileChosen(nextSelection);
  }

  return (
    <div className="space-y-3">
      <div
        aria-busy={disabled}
        aria-grabbed={dragLayerActive}
        aria-label="Inventory image drag and drop receiver"
        className={clsx(
          'flex min-h-[12rem] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center transition',
          dragLayerActive ? 'border-accent bg-accent/5' : '',
          disabled ? 'pointer-events-none opacity-70' : '',
        )}
        onDragEnter={(dragEvent) => {
          dragEvent.preventDefault();
          if (!disabled) {
            setDragLayerActive(true);
          }
        }}
        onDragLeave={() => setDragLayerActive(false)}
        onDragOver={(dragEvent) => {
          dragEvent.preventDefault();

          dragEvent.dataTransfer.dropEffect = disabled ? 'none' : 'copy';

          if (!disabled) setDragLayerActive(true);
        }}
        onDrop={(dropEvent) => {
          dropEvent.preventDefault();
          setDragLayerActive(false);
          ingestFiles(dropEvent.dataTransfer.files);
        }}
      >
        <figure className="relative mx-auto flex max-h-[220px] min-h-[200px] w-full max-w-md items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-white">
          {!existingUrl && !ephemeralPreviewHref ? (
            <figcaption className="space-y-1 px-4 text-center text-sm text-gray-600">
              <p className="font-semibold text-gray-900">Drag & drop an image here</p>
              <p className="text-xs text-gray-500">JPEG • PNG • WEBP • GIF under five megabytes</p>
            </figcaption>
          ) : null}

          {ephemeralPreviewHref ? (
            // Blob previews intentionally use img for object URLs handled outside Next Image optimizations.
            // eslint-disable-next-line @next/next/no-img-element -- local object previews are not routed through Remote Patterns
            <img alt="Staging preview" src={ephemeralPreviewHref} className="max-h-[220px] w-full object-contain" />
          ) : null}

          {remotePreviewEligible ? (
            <div className="relative h-[220px] w-full bg-gray-100">
              <Image
                alt="Existing Cloudinary thumbnail"
                className="object-contain"
                fill
                loader={cloudinaryImageLoader}
                sizes="480px"
                src={existingUrl ?? ''}
              />
            </div>
          ) : null}
        </figure>

        <menu className="flex flex-wrap items-center justify-center gap-2 px-4">
          <li>
            <label
              aria-disabled={disabled}
              htmlFor={browseInputIdentity}
              className={clsx('btn-secondary cursor-pointer px-6 text-xs font-semibold', disabled ? 'opacity-60' : '')}
            >
              Browse files
            </label>
            <input
              id={browseInputIdentity}
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              className="sr-only"
              disabled={disabled}
              onChange={(inputEvent) => {
                ingestFiles(inputEvent.target.files);
                inputEvent.target.value = '';
              }}
            />
          </li>

          {(selectedFile || existingUrl) && (
            <li>
              <button
                disabled={disabled}
                type="button"
                className="btn-secondary border-red-400 text-red-600 hover:bg-red-50"
                onClick={() => {
                  setUploadHint(null);
                  onFileChosen(null);
                }}
              >
                Remove image
              </button>
            </li>
          )}
        </menu>
      </div>

      {uploadHint ? <p className="text-xs font-semibold text-red-600">{uploadHint}</p> : null}
    </div>
  );
}
