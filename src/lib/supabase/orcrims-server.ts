import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/supabase/errors";
import { isUF } from "@/lib/format";
import type { Orcrim } from "@/lib/types";

export async function listOrcrims(filters: {
  q?: string;
  estado?: string;
}): Promise<{ data: Orcrim[]; error: string | null }> {
  const supabase = await createClient();
  let query = supabase
    .from("orcrims")
    .select("*")
    .order("data_cadastro", { ascending: false });

  if (filters.q?.trim()) {
    const term = filters.q.trim().replace(/[%_,]/g, "");
    if (term) {
      query = query.or(`nome.ilike.%${term}%,sigla.ilike.%${term}%`);
    }
  }

  if (filters.estado && isUF(filters.estado)) {
    query = query.eq("estado_origem", filters.estado);
  }

  const { data, error } = await query;
  if (error) {
    return {
      data: [],
      error: friendlyError(error.message, "Erro ao listar orcrims."),
    };
  }
  return { data: (data ?? []) as Orcrim[], error: null };
}

export async function getOrcrimById(
  id: string,
): Promise<{ data: Orcrim | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orcrims")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao buscar orcrim."),
    };
  }
  return { data: (data as Orcrim | null) ?? null, error: null };
}
