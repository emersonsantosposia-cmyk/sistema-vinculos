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
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          aria-label="Fechar"
          title="Fechar"
          className="h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 px-0 text-base leading-none !text-white hover:!bg-white/10 hover:!text-white sm:h-8 sm:w-auto sm:min-h-0 sm:min-w-0 sm:px-3 sm:text-sm"
        >
          <span className="sm:hidden" aria-hidden>
            ×
          </span>
          <span className="hidden sm:inline">Fechar</span>
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
