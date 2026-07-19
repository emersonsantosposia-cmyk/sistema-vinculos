import { isDocumentoTipo } from "@/lib/format";
import {
  LIST_PAGE_SIZE,
  normalizePage,
  pageRange,
  type PaginatedListResult,
} from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/supabase/errors";
import { isUnidade } from "@/lib/perfis";
import type { Documento } from "@/lib/types";

export async function listDocumentos(filters: {
  q?: string;
  tipo?: string;
  unidade?: string;
  page?: number;
}): Promise<PaginatedListResult<Documento>> {
  const pageSize = LIST_PAGE_SIZE;
  const page = normalizePage(filters.page);
  const { from, to } = pageRange(page, pageSize);
  const empty: PaginatedListResult<Documento> = {
    data: [],
    total: 0,
    page,
    pageSize,
    error: null,
  };

  const supabase = await createClient();
  let query = supabase
    .from("documentos")
    .select("*", { count: "exact" })
    .order("data_cadastro", { ascending: false })
    .range(from, to);

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

  const { data, error, count } = await query;
  if (error) {
    return {
      ...empty,
      error: friendlyError(error.message, "Erro ao listar documentos."),
    };
  }
  const rows = (data ?? []) as Documento[];
  return {
    data: rows,
    total: count ?? rows.length,
    page,
    pageSize,
    error: null,
  };
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
