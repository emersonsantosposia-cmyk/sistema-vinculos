import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/supabase/errors";
import type { Endereco } from "@/lib/types";

export async function listEnderecos(filters: {
  q?: string;
}): Promise<{ data: Endereco[]; error: string | null }> {
  const supabase = await createClient();
  let query = supabase
    .from("enderecos")
    .select("*")
    .order("data_cadastro", { ascending: false });

  if (filters.q?.trim()) {
    const term = filters.q.trim().replace(/[%_,]/g, "");
    if (term) {
      query = query.or(
        `nome.ilike.%${term}%,logradouro.ilike.%${term}%,cidade.ilike.%${term}%,bairro.ilike.%${term}%,cep.ilike.%${term}%`,
      );
    }
  }

  const { data, error } = await query;
  if (error) {
    return {
      data: [],
      error: friendlyError(error.message, "Erro ao listar endereços."),
    };
  }
  return { data: (data ?? []) as Endereco[], error: null };
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
