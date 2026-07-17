"use client";

import { requireAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { emptyToNull, friendlyError } from "@/lib/supabase/errors";
import type { Orcrim } from "@/lib/types";

export type OrcrimInput = {
  nome: string;
  sigla?: string | null;
  estado_origem?: string | null;
  descricao?: string | null;
};

export async function createOrcrim(
  input: OrcrimInput,
): Promise<{ data: Orcrim | null; error: string | null }> {
  const auth = await requireAuthUser();
  if (!auth.user) return { data: null, error: auth.error };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcrims")
    .insert({
      nome: input.nome.trim(),
      sigla: emptyToNull(input.sigla),
      estado_origem: emptyToNull(input.estado_origem),
      descricao: emptyToNull(input.descricao),
      usuario_cadastro: auth.user.id,
      data_cadastro: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao criar orcrim."),
    };
  }
  return { data: data as Orcrim, error: null };
}

export async function updateOrcrim(
  id: string,
  input: Partial<OrcrimInput>,
): Promise<{ data: Orcrim | null; error: string | null }> {
  const supabase = createClient();
  const payload: Record<string, unknown> = {};
  if (input.nome !== undefined) payload.nome = input.nome.trim();
  if (input.sigla !== undefined) payload.sigla = emptyToNull(input.sigla);
  if (input.estado_origem !== undefined) {
    payload.estado_origem = emptyToNull(input.estado_origem);
  }
  if (input.descricao !== undefined) {
    payload.descricao = emptyToNull(input.descricao);
  }

  const { data, error } = await supabase
    .from("orcrims")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao atualizar orcrim."),
    };
  }
  return { data: data as Orcrim, error: null };
}

export async function deleteOrcrim(
  id: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("orcrims").delete().eq("id", id);
  if (error) {
    return { error: friendlyError(error.message, "Erro ao excluir orcrim.") };
  }
  return { error: null };
}
