"use client";

import { useEffect, useState } from "react";
import { useSignedStorageUrl } from "@/lib/supabase/storage-urls";

function PlaceholderIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
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
  bucket: string;
  path?: string | null;
  alt?: string;
  size?: keyof typeof sizeClass;
  className?: string;
};

/** Avatar circular a partir de caminho em bucket privado. */
export function EntidadeStorageAvatar({
  bucket,
  path,
  alt = "Entidade",
  size = "md",
  className = "",
}: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const { url, loading } = useSignedStorageUrl(bucket, path);
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
