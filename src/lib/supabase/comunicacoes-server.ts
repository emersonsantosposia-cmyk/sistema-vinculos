import {
  isComunicacaoStatus,
  isComunicacaoTipo,
} from "@/lib/format";
import { normalizeListSort } from "@/lib/list-sort";
import {
  LIST_PAGE_SIZE,
  normalizePage,
  pageRange,
  type PaginatedListResult,
} from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/supabase/errors";
import type { Comunicacao } from "@/lib/types";

export async function listComunicacoes(filters: {
  q?: string;
  tipo?: string;
  status?: string;
  page?: number;
  sort?: string;
  dir?: string;
}): Promise<PaginatedListResult<Comunicacao>> {
  const pageSize = LIST_PAGE_SIZE;
  const page = normalizePage(filters.page);
  const { from, to } = pageRange(page, pageSize);
  const { column, ascending } = normalizeListSort(
    "comunicacoes",
    filters.sort,
    filters.dir,
  );
  const empty: PaginatedListResult<Comunicacao> = {
    data: [],
    total: 0,
    page,
    pageSize,
    error: null,
  };

  const supabase = await createClient();
  let query = supabase
    .from("comunicacoes")
    .select("*", { count: "exact" })
    .order(column, { ascending })
    .range(from, to);

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

  const { data, error, count } = await query;
  if (error) {
    return {
      ...empty,
      error: friendlyError(error.message, "Erro ao listar comunicações."),
    };
  }
  const rows = (data ?? []) as Comunicacao[];
  return {
    data: rows,
    total: count ?? rows.length,
    page,
    pageSize,
    error: null,
  };
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
