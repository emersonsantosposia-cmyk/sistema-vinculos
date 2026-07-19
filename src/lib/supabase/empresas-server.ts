import {
  LIST_PAGE_SIZE,
  normalizePage,
  pageRange,
  type PaginatedListResult,
} from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/supabase/errors";
import type { Empresa } from "@/lib/types";

export async function listEmpresas(filters: {
  q?: string;
  page?: number;
}): Promise<PaginatedListResult<Empresa>> {
  const pageSize = LIST_PAGE_SIZE;
  const page = normalizePage(filters.page);
  const { from, to } = pageRange(page, pageSize);
  const empty: PaginatedListResult<Empresa> = {
    data: [],
    total: 0,
    page,
    pageSize,
    error: null,
  };

  const supabase = await createClient();
  let query = supabase
    .from("empresas")
    .select("*", { count: "exact" })
    .order("data_cadastro", { ascending: false })
    .range(from, to);

  if (filters.q?.trim()) {
    const term = filters.q.trim().replace(/[%_,]/g, "");
    if (term) {
      query = query.or(
        `nome_fantasia.ilike.%${term}%,razao_social.ilike.%${term}%,cnpj.ilike.%${term}%`,
      );
    }
  }

  const { data, error, count } = await query;
  if (error) {
    return {
      ...empty,
      error: friendlyError(error.message, "Erro ao listar empresas."),
    };
  }
  const rows = (data ?? []) as Empresa[];
  return {
    data: rows,
    total: count ?? rows.length,
    page,
    pageSize,
    error: null,
  };
}

export async function getEmpresaById(
  id: string,
): Promise<{ data: Empresa | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empresas")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao buscar empresa."),
    };
  }
  return { data: (data as Empresa | null) ?? null, error: null };
}
