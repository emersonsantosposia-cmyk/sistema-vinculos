import { isDocumentoTipo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/supabase/errors";
import { isUnidade } from "@/lib/perfis";
import type { Documento } from "@/lib/types";

export async function listDocumentos(filters: {
  q?: string;
  tipo?: string;
  unidade?: string;
}): Promise<{ data: Documento[]; error: string | null }> {
  const supabase = await createClient();
  let query = supabase
    .from("documentos")
    .select("*")
    .order("data_cadastro", { ascending: false });

  if (filters.tipo && isDocumentoTipo(filters.tipo)) {
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
      error: friendlyError(error.message, "Erro ao listar documentos."),
    };
  }
  return { data: (data ?? []) as Documento[], error: null };
}

export async function getDocumentoById(
  id: string,
): Promise<{ data: Documento | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documentos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao buscar documento."),
    };
  }
  return { data: (data as Documento | null) ?? null, error: null };
}
