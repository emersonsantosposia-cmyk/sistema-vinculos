"use client";

import { requireAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/supabase/errors";
import type { EntidadeTipo, Observacao } from "@/lib/types";

export async function listObservacoes(
  entidadeTipo: EntidadeTipo,
  entidadeId: string,
): Promise<{ data: Observacao[]; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("observacoes")
    .select("*")
    .eq("entidade_tipo", entidadeTipo)
    .eq("entidade_id", entidadeId)
    .order("data_hora", { ascending: false });

  if (error) {
    return {
      data: [],
      error: friendlyError(error.message, "Erro ao carregar observações."),
    };
  }

  return { data: (data ?? []) as Observacao[], error: null };
}

export async function createObservacao(input: {
  entidadeTipo: EntidadeTipo;
  entidadeId: string;
  mensagem: string;
}): Promise<{ data: Observacao | null; error: string | null }> {
  const auth = await requireAuthUser();
  if (!auth.user) return { data: null, error: auth.error };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("observacoes")
    .insert({
      entidade_tipo: input.entidadeTipo,
      entidade_id: input.entidadeId,
      usuario: auth.user.id,
      mensagem: input.mensagem.trim(),
      data_hora: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao salvar observação."),
    };
  }

  return { data: data as Observacao, error: null };
}

export async function resolveUserDisplayNames(
  userIds: string[],
): Promise<Record<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return {};

  const supabase = createClient();
  const map: Record<string, string> = {};

  const { data, error } = await supabase.rpc("get_user_display_names", {
    ids: unique,
  });

  if (!error && Array.isArray(data)) {
    for (const row of data as { id: string; display_name: string }[]) {
      map[row.id] = row.display_name;
    }
    return map;
  }

  // Fallback se a migration ainda não foi aplicada
  const {
    data: { user },
  } = await supabase.auth.getUser();
  for (const id of unique) {
    if (user?.id === id) {
      map[id] =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        user.email?.split("@")[0] ||
        user.email ||
        "Você";
    } else {
      map[id] = `Usuário ${id.slice(0, 8)}`;
    }
  }
  return map;
}
