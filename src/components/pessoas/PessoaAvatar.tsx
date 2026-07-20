"use client";

import { useState } from "react";
import { useSignedStorageUrl } from "@/lib/supabase/storage-urls";
import { ImageLightbox } from "@/components/shared/ImageLightbox";

const BUCKET = "fotos-pessoas";

function PlaceholderIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 12a4.5 4.5 0 100-9 4.5 4.5 0 000 9zm0 1.5c-4.1 0-7.5 2.4-7.5 5.25V20a1 1 0 001 1h13a1 1 0 001-1v-1.25c0-2.85-3.4-5.25-7.5-5.25z" />
    </svg>
  );
}

const sizeClass = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  /** Grade desktop de pessoas vinculadas (4 por linha). */
  compact: "h-11 w-11",
  card: "h-24 w-24",
  lg: "h-28 w-28 sm:h-36 sm:w-36",
} as const;

const placeholderIconClass = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  compact: "h-5 w-5",
  card: "h-10 w-10",
  lg: "h-14 w-14",
} as const;

type Props = {
  path?: string | null;
  nome?: string;
  size?: keyof typeof sizeClass;
  className?: string;
  expandable?: boolean;
};

export function PessoaAvatar({
  path,
  nome = "Pessoa",
  size = "sm",
  className = "",
  expandable = false,
}: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { url, loading } = useSignedStorageUrl(BUCKET, path);
  const box = sizeClass[size];

  if (path && (loading || !url)) {
    return (
      <div
        className={`${box} shrink-0 animate-pulse rounded-full bg-panel-hover ${className}`}
        aria-hidden
      />
    );
  }

  if (url) {
    if (expandable) {
      return (
        <>
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className={`${box} shrink-0 overflow-hidden rounded-full border border-border bg-panel-soft p-0 transition hover:border-border-strong hover:ring-2 hover:ring-gold/40 ${className}`}
            title="Ver foto maior"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={nome}
              className="h-full w-full object-cover"
            />
          </button>
          {lightboxOpen ? (
            <ImageLightbox
              src={url}
              alt={nome}
              onClose={() => setLightboxOpen(false)}
            />
          ) : null}
        </>
      );
    }

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={nome}
        className={`${box} shrink-0 rounded-full border border-border object-cover bg-panel-soft ${className}`}
      />
    );
  }

  return (
    <div
      className={`${box} flex shrink-0 items-center justify-center rounded-full border border-border bg-panel-soft text-muted ${className}`}
      title="Sem foto de perfil"
      aria-label="Sem foto de perfil"
    >
      <PlaceholderIcon className={placeholderIconClass[size]} />
    </div>
  );
}
