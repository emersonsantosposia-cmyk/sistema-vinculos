import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/supabase/errors";
import type { Caso } from "@/lib/types";

export async function listCasos(filters: {
  q?: string;
}): Promise<{ data: Caso[]; error: string | null }> {
  const supabase = await createClient();
  let query = supabase
    .from("casos")
    .select("*")
    .order("data_cadastro", { ascending: false });

  if (filters.q?.trim()) {
    const term = filters.q.trim().replace(/[%_,]/g, "");
    if (term) {
      query = query.or(`numero.ilike.%${term}%,nome.ilike.%${term}%`);
    }
  }

  const { data, error } = await query;
  if (error) {
    return {
      data: [],
      error: friendlyError(error.message, "Erro ao listar casos."),
    };
  }
  return { data: (data ?? []) as Caso[], error: null };
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
