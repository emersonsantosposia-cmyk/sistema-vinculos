"use client";

import { useEffect, useState } from "react";
import { useSignedStorageUrl } from "@/lib/supabase/storage-urls";

const BUCKET = "fotos-veiculos";

function PlaceholderIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
    </svg>
  );
}

const sizeClass = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
} as const;

const placeholderIconClass = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
} as const;

type Props = {
  path?: string | null;
  alt?: string;
  size?: keyof typeof sizeClass;
  className?: string;
};

export function VeiculoAvatar({
  path,
  alt = "Veículo",
  size = "md",
  className = "",
}: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const { url, loading } = useSignedStorageUrl(BUCKET, path);
  const box = sizeClass[size];

  useEffect(() => {
    setImgFailed(false);
  }, [path, url]);

  if (path && loading) {
    return (
      <div
        className={`${box} shrink-0 animate-pulse rounded-full bg-panel-hover ${className}`}
        aria-hidden
      />
    );
  }

  if (url && !imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        title={alt}
        className={`${box} shrink-0 overflow-hidden rounded-full border border-border object-cover bg-panel-soft ${className}`}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${box} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-panel-soft text-muted ${className}`}
      title="Sem foto"
      aria-label="Sem foto"
    >
      <PlaceholderIcon className={placeholderIconClass[size]} />
    </div>
  );
}
