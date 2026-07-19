import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/supabase/errors";
import { isUF } from "@/lib/format";
import {
  LIST_PAGE_SIZE,
  normalizePage,
  pageRange,
  type PaginatedListResult,
} from "@/lib/pagination";
import type { Orcrim } from "@/lib/types";

export async function listOrcrims(filters: {
  q?: string;
  estado?: string;
  page?: number;
}): Promise<PaginatedListResult<Orcrim>> {
  const pageSize = LIST_PAGE_SIZE;
  const page = normalizePage(filters.page);
  const { from, to } = pageRange(page, pageSize);
  const empty: PaginatedListResult<Orcrim> = {
    data: [],
    total: 0,
    page,
    pageSize,
    error: null,
  };

  const supabase = await createClient();
  let query = supabase
    .from("orcrims")
    .select("*", { count: "exact" })
    .order("data_cadastro", { ascending: false })
    .range(from, to);

  if (filters.q?.trim()) {
    const term = filters.q.trim().replace(/[%_,]/g, "");
    if (term) {
      query = query.or(`nome.ilike.%${term}%,sigla.ilike.%${term}%`);
    }
  }

  if (filters.estado && isUF(filters.estado)) {
    query = query.eq("estado_origem", filters.estado);
  }

  const { data, error, count } = await query;
  if (error) {
    return {
      ...empty,
      error: friendlyError(error.message, "Erro ao listar orcrims."),
    };
  }
  const rows = (data ?? []) as Orcrim[];
  return {
    data: rows,
    total: count ?? rows.length,
    page,
    pageSize,
    error: null,
  };
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
