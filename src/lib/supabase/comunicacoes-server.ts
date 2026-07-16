import {
  isComunicacaoStatus,
  isComunicacaoTipo,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/supabase/errors";
import type { Comunicacao } from "@/lib/types";

export async function listComunicacoes(filters: {
  q?: string;
  tipo?: string;
  status?: string;
}): Promise<{ data: Comunicacao[]; error: string | null }> {
  const supabase = await createClient();
  let query = supabase
    .from("comunicacoes")
    .select("*")
    .order("data_cadastro", { ascending: false });

  if (filters.tipo && isComunicacaoTipo(filters.tipo)) {
    query = query.eq("tipo", filters.tipo);
  }

  if (filters.status && isComunicacaoStatus(filters.status)) {
    query = query.eq("status", filters.status);
  }

  if (filters.q?.trim()) {
    const term = filters.q.trim().replace(/[%_,]/g, "");
    if (term) {
      query = query.ilike("valor", `%${term}%`);
    }
  }

  const { data, error } = await query;
  if (error) {
    return {
      data: [],
      error: friendlyError(error.message, "Erro ao listar comunicações."),
    };
  }
  return { data: (data ?? []) as Comunicacao[], error: null };
}

export async function getComunicacaoById(
  id: string,
): Promise<{ data: Comunicacao | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comunicacoes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao buscar comunicação."),
    };
  }
  return { data: (data as Comunicacao | null) ?? null, error: null };
}
