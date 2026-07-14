import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/supabase/errors";
import type { Empresa } from "@/lib/types";

export async function listEmpresas(filters: {
  q?: string;
}): Promise<{ data: Empresa[]; error: string | null }> {
  const supabase = await createClient();
  let query = supabase
    .from("empresas")
    .select("*")
    .order("data_cadastro", { ascending: false });

  if (filters.q?.trim()) {
    const term = filters.q.trim().replace(/[%_,]/g, "");
    if (term) {
      query = query.or(
        `nome_fantasia.ilike.%${term}%,razao_social.ilike.%${term}%,cnpj.ilike.%${term}%`,
      );
    }
  }

  const { data, error } = await query;
  if (error) {
    return {
      data: [],
      error: friendlyError(error.message, "Erro ao listar empresas."),
    };
  }
  return { data: (data ?? []) as Empresa[], error: null };
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
