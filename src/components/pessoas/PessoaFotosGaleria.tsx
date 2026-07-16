"use client";

import { useState } from "react";
import { EmptyState } from "@/components/ui/Form";
import { ImageLightbox } from "@/components/shared/ImageLightbox";
import { useSignedStorageUrls } from "@/lib/supabase/storage-urls";
import type { PessoaFoto } from "@/lib/types";

type Props = {
  fotos: PessoaFoto[];
};

/** Galeria de fotos tipo "outra" (a foto de perfil fica no topo da página). */
export function PessoaFotosGaleria({ fotos }: Props) {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(
    null,
  );
  const outras = fotos.filter((f) => f.tipo !== "perfil");
  const paths = outras.map((f) => f.url_arquivo);
  const { urls } = useSignedStorageUrls("fotos-pessoas", paths);

  if (outras.length === 0) {
    return <EmptyState>Nenhuma foto adicional na galeria.</EmptyState>;
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {outras.map((foto, index) => {
          const src = foto.url_arquivo ? urls[foto.url_arquivo] : null;

          return (
            <button
              key={foto.id}
              type="button"
              className="aspect-square overflow-hidden rounded border border-border bg-panel-soft transition hover:border-border-strong hover:ring-2 hover:ring-gold/30 disabled:cursor-default disabled:hover:ring-0"
              onClick={() => {
                if (src) {
                  setLightbox({ src, alt: `Foto da galeria ${index + 1}` });
                }
              }}
              disabled={!src}
              title={src ? "Ver foto maior" : undefined}
            >
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={`Foto da galeria ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] text-muted">
                  …
                </div>
              )}
            </button>
          );
        })}
      </div>

      {lightbox ? (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </>
  );
}
