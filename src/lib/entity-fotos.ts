import type { EntidadeTipo } from "@/lib/types";

/** Buckets privados de foto ilustrativa (caminho em `foto_url`). */
export const ENTIDADE_FOTO_BUCKET = {
  veiculo: "fotos-veiculos",
  empresa: "fotos-empresas",
  endereco: "fotos-enderecos",
  orcrim: "fotos-orcrims",
} as const satisfies Partial<Record<EntidadeTipo, string>>;

export type EntidadeComFotoBucket = keyof typeof ENTIDADE_FOTO_BUCKET;

export function fotoBucketForEntidade(
  tipo: EntidadeTipo,
): string | null {
  if (tipo in ENTIDADE_FOTO_BUCKET) {
    return ENTIDADE_FOTO_BUCKET[tipo as EntidadeComFotoBucket];
  }
  return null;
}
