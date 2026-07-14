import { buscaGlobalWithClient } from "@/lib/supabase/busca-core";
import { createClient } from "@/lib/supabase/server";

export {
  BUSCA_TIPO_LABEL,
  type BuscaEntidadeTipo,
  type BuscaResultado,
} from "@/lib/supabase/busca-core";

export async function buscaGlobal(q: string, limitPerType = 5) {
  const supabase = await createClient();
  return buscaGlobalWithClient(supabase, q, limitPerType);
}
