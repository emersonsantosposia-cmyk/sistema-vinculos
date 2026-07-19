"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Form";

type Props = {
  src: string;
  alt: string;
  onClose: () => void;
};

export function ImageLightbox({ src, alt, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
    >
      <div
        className="relative flex max-h-full w-full flex-col items-end gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <Button type="button" variant="ghost" onClick={onClose}>
          Fechar
        </Button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-h-full w-full rounded border border-border bg-panel-soft object-contain"
        />
      </div>
    </div>
  );
}
