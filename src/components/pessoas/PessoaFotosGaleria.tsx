"use client";

import { EmptyState } from "@/components/ui/Form";
import { useSignedStorageUrls } from "@/lib/supabase/storage-urls";
import type { PessoaFoto } from "@/lib/types";

type Props = {
  fotos: PessoaFoto[];
};

/** Galeria de fotos tipo "outra" (a foto de perfil fica no topo da página). */
export function PessoaFotosGaleria({ fotos }: Props) {
  const outras = fotos.filter((f) => f.tipo !== "perfil");
  const paths = outras.map((f) => f.url_arquivo);
  const { urls } = useSignedStorageUrls("fotos-pessoas", paths);

  if (outras.length === 0) {
    return <EmptyState>Nenhuma foto adicional na galeria.</EmptyState>;
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
      {outras.map((foto) => (
        <div
          key={foto.id}
          className="aspect-square overflow-hidden rounded border border-border bg-zinc-100"
        >
          {foto.url_arquivo && urls[foto.url_arquivo] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={urls[foto.url_arquivo]}
              alt="Foto da galeria"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-muted">
              …
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
