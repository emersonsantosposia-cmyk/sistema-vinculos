import { isProcedimentoTipo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/supabase/errors";
import { isUnidade } from "@/lib/perfis";
import type { Procedimento } from "@/lib/types";

export async function listProcedimentos(filters: {
  q?: string;
  tipo?: string;
  unidade?: string;
}): Promise<{ data: Procedimento[]; error: string | null }> {
  const supabase = await createClient();
  let query = supabase
    .from("procedimentos")
    .select("*")
    .order("data_cadastro", { ascending: false });

  if (filters.tipo && isProcedimentoTipo(filters.tipo)) {
    query = query.eq("tipo", filters.tipo);
  }

  if (filters.unidade && isUnidade(filters.unidade)) {
    query = query.eq("unidade", filters.unidade);
  }

  if (filters.q?.trim()) {
    const term = filters.q.trim().replace(/[%_,]/g, "");
    if (term) {
      query = query.or(`nome.ilike.%${term}%,resumo.ilike.%${term}%`);
    }
  }

  const { data, error } = await query;
  if (error) {
    return {
      data: [],
      error: friendlyError(error.message, "Erro ao listar procedimentos."),
    };
  }
  return { data: (data ?? []) as Procedimento[], error: null };
}

export async function getProcedimentoById(
  id: string,
): Promise<{ data: Procedimento | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("procedimentos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao buscar procedimento."),
    };
  }
  return { data: (data as Procedimento | null) ?? null, error: null };
}
