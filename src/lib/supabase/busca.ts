"use client";

import { createClient } from "@/lib/supabase/client";
import { buscaGlobalWithClient } from "@/lib/supabase/busca-core";

export {
  BUSCA_TIPO_LABEL,
  type BuscaEntidadeTipo,
  type BuscaResultado,
} from "@/lib/supabase/busca-core";

export async function buscaGlobal(q: string, limitPerType = 5) {
  return buscaGlobalWithClient(createClient(), q, limitPerType);
}
