import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/supabase/errors";
import type { Veiculo } from "@/lib/types";

export async function listVeiculos(filters: {
  q?: string;
}): Promise<{ data: Veiculo[]; error: string | null }> {
  const supabase = await createClient();
  let query = supabase
    .from("veiculos")
    .select("*")
    .order("data_cadastro", { ascending: false });

  if (filters.q?.trim()) {
    const term = filters.q.trim().replace(/[%_,]/g, "");
    if (term) {
      query = query.or(
        `placa.ilike.%${term}%,marca.ilike.%${term}%,modelo.ilike.%${term}%,cor.ilike.%${term}%`,
      );
    }
  }

  const { data, error } = await query;
  if (error) {
    return {
      data: [],
      error: friendlyError(error.message, "Erro ao listar veículos."),
    };
  }
  return { data: (data ?? []) as Veiculo[], error: null };
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
