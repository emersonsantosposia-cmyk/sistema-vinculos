import { normalizeListSort } from "@/lib/list-sort";
import {
  LIST_PAGE_SIZE,
  normalizePage,
  pageRange,
  type PaginatedListResult,
} from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/supabase/errors";
import type { Endereco } from "@/lib/types";

export async function listEnderecos(filters: {
  q?: string;
  page?: number;
  sort?: string;
  dir?: string;
}): Promise<PaginatedListResult<Endereco>> {
  const pageSize = LIST_PAGE_SIZE;
  const page = normalizePage(filters.page);
  const { from, to } = pageRange(page, pageSize);
  const { column, ascending } = normalizeListSort(
    "enderecos",
    filters.sort,
    filters.dir,
  );
  const empty: PaginatedListResult<Endereco> = {
    data: [],
    total: 0,
    page,
    pageSize,
    error: null,
  };

  const supabase = await createClient();
  let query = supabase
    .from("enderecos")
    .select("*", { count: "exact" })
    .order(column, { ascending })
    .range(from, to);

  if (filters.q?.trim()) {
    const term = filters.q.trim().replace(/[%_,]/g, "");
    if (term) {
      query = query.or(
        `nome.ilike.%${term}%,logradouro.ilike.%${term}%,cidade.ilike.%${term}%,bairro.ilike.%${term}%,cep.ilike.%${term}%`,
      );
    }
  }

  const { data, error, count } = await query;
  if (error) {
    return {
      ...empty,
      error: friendlyError(error.message, "Erro ao listar endereços."),
    };
  }
  const rows = (data ?? []) as Endereco[];
  return {
    data: rows,
    total: count ?? rows.length,
    page,
    pageSize,
    error: null,
  };
}

export async function getEnderecoById(
  id: string,
): Promise<{ data: Endereco | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enderecos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao buscar endereço."),
    };
  }
  return { data: (data as Endereco | null) ?? null, error: null };
}
