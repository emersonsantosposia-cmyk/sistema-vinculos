import { normalizeListSort } from "@/lib/list-sort";
import {
  LIST_PAGE_SIZE,
  normalizePage,
  pageRange,
  type PaginatedListResult,
} from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/supabase/errors";
import type { Veiculo } from "@/lib/types";

export async function listVeiculos(filters: {
  q?: string;
  page?: number;
  sort?: string;
  dir?: string;
}): Promise<PaginatedListResult<Veiculo>> {
  const pageSize = LIST_PAGE_SIZE;
  const page = normalizePage(filters.page);
  const { from, to } = pageRange(page, pageSize);
  const { column, ascending } = normalizeListSort(
    "veiculos",
    filters.sort,
    filters.dir,
  );
  const empty: PaginatedListResult<Veiculo> = {
    data: [],
    total: 0,
    page,
    pageSize,
    error: null,
  };

  const supabase = await createClient();
  let query = supabase
    .from("veiculos")
    .select("*", { count: "exact" })
    .order(column, { ascending })
    .range(from, to);

  if (filters.q?.trim()) {
    const term = filters.q.trim().replace(/[%_,]/g, "");
    if (term) {
      query = query.or(
        `placa.ilike.%${term}%,marca.ilike.%${term}%,modelo.ilike.%${term}%,cor.ilike.%${term}%`,
      );
    }
  }

  const { data, error, count } = await query;
  if (error) {
    return {
      ...empty,
      error: friendlyError(error.message, "Erro ao listar veículos."),
    };
  }
  const rows = (data ?? []) as Veiculo[];
  return {
    data: rows,
    total: count ?? rows.length,
    page,
    pageSize,
    error: null,
  };
}

export async function getVeiculoById(
  id: string,
): Promise<{ data: Veiculo | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("veiculos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao buscar veículo."),
    };
  }
  return { data: (data as Veiculo | null) ?? null, error: null };
}
