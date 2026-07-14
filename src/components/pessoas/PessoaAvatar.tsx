"use client";

import { useSignedStorageUrl } from "@/lib/supabase/storage-urls";

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
  lg: "h-28 w-28 sm:h-36 sm:w-36",
} as const;

type Props = {
  path?: string | null;
  nome?: string;
  size?: keyof typeof sizeClass;
  className?: string;
};

export function PessoaAvatar({
  path,
  nome = "Pessoa",
  size = "sm",
  className = "",
}: Props) {
  const { url, loading } = useSignedStorageUrl(BUCKET, path);
  const box = sizeClass[size];

  if (path && (loading || !url)) {
    return (
      <div
        className={`${box} shrink-0 animate-pulse rounded-full bg-zinc-200 ${className}`}
        aria-hidden
      />
    );
  }

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={nome}
        className={`${box} shrink-0 rounded-full border border-border object-cover bg-zinc-100 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${box} flex shrink-0 items-center justify-center rounded-full border border-border bg-zinc-100 text-zinc-400 ${className}`}
      title="Sem foto de perfil"
      aria-label="Sem foto de perfil"
    >
      <PlaceholderIcon
        className={
          size === "lg" ? "h-14 w-14" : size === "md" ? "h-6 w-6" : "h-4 w-4"
        }
      />
    </div>
  );
}
