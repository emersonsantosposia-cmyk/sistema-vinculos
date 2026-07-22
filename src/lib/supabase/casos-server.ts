import { normalizeListSort } from "@/lib/list-sort";
import {
  LIST_PAGE_SIZE,
  normalizePage,
  pageRange,
  type PaginatedListResult,
} from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/supabase/errors";
import { isUnidade } from "@/lib/perfis";
import type { Caso } from "@/lib/types";

export async function listCasos(filters: {
  q?: string;
  unidade?: string;
  page?: number;
  sort?: string;
  dir?: string;
}): Promise<PaginatedListResult<Caso>> {
  const pageSize = LIST_PAGE_SIZE;
  const page = normalizePage(filters.page);
  const { from, to } = pageRange(page, pageSize);
  const { column, ascending } = normalizeListSort(
    "casos",
    filters.sort,
    filters.dir,
  );
  const empty: PaginatedListResult<Caso> = {
    data: [],
    total: 0,
    page,
    pageSize,
    error: null,
  };

  const supabase = await createClient();
  let query = supabase
    .from("casos")
    .select("*", { count: "exact" })
    .order(column, { ascending })
    .range(from, to);

  if (filters.unidade && isUnidade(filters.unidade)) {
    query = query.eq("unidade", filters.unidade);
  }

  if (filters.q?.trim()) {
    const term = filters.q.trim().replace(/[%_,]/g, "");
    if (term) {
      query = query.or(`numero.ilike.%${term}%,nome.ilike.%${term}%`);
    }
  }

  const { data, error, count } = await query;
  if (error) {
    return {
      ...empty,
      error: friendlyError(error.message, "Erro ao listar casos."),
    };
  }
  const rows = (data ?? []) as Caso[];
  return {
    data: rows,
    total: count ?? rows.length,
    page,
    pageSize,
    error: null,
  };
}

export async function getCasoById(
  id: string,
): Promise<{ data: Caso | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("casos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao buscar caso."),
    };
  }
  return { data: (data as Caso | null) ?? null, error: null };
}
