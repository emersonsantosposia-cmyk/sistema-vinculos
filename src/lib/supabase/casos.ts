"use client";

import { requireAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import {
  emptyToNull,
  friendlyError,
  normalizeUrl,
} from "@/lib/supabase/errors";
import type { Caso, CasoStatus } from "@/lib/types";

export type CasoInput = {
  numero?: string | null;
  nome?: string | null;
  data_abertura?: string | null;
  status?: CasoStatus | null;
  data_encerramento?: string | null;
  link_cronos?: string | null;
  unidade?: string | null;
};

export async function createCaso(
  input: CasoInput,
): Promise<{ data: Caso | null; error: string | null }> {
  const auth = await requireAuthUser();
  if (!auth.user) return { data: null, error: auth.error };

  const unidade = input.unidade?.trim();
  if (!unidade) {
    return { data: null, error: "Informe a unidade do caso." };
  }

  const status: CasoStatus = input.status ?? "em_andamento";
  if (status === "encerrado" && !emptyToNull(input.data_encerramento)) {
    return {
      data: null,
      error: "Informe a data de encerramento.",
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("casos")
    .insert({
      numero: emptyToNull(input.numero),
      nome: emptyToNull(input.nome),
      data_abertura: emptyToNull(input.data_abertura),
      status,
      data_encerramento:
        status === "encerrado"
          ? emptyToNull(input.data_encerramento)
          : null,
      link_cronos: normalizeUrl(input.link_cronos),
      unidade,
      usuario_cadastro: auth.user.id,
      data_cadastro: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao criar caso."),
    };
  }
  return { data: data as Caso, error: null };
}

export async function updateCaso(
  id: string,
  input: Partial<CasoInput>,
): Promise<{ data: Caso | null; error: string | null }> {
  const supabase = createClient();
  const payload: Record<string, unknown> = {};
  if (input.numero !== undefined) payload.numero = emptyToNull(input.numero);
  if (input.nome !== undefined) payload.nome = emptyToNull(input.nome);
  if (input.data_abertura !== undefined) {
    payload.data_abertura = emptyToNull(input.data_abertura);
  }
  if (input.status !== undefined) {
    const status = input.status ?? "em_andamento";
    payload.status = status;
    if (status === "encerrado") {
      const dataEncerramento =
        input.data_encerramento !== undefined
          ? emptyToNull(input.data_encerramento)
          : undefined;
      if (dataEncerramento !== undefined) {
        if (!dataEncerramento) {
          return {
            data: null,
            error: "Informe a data de encerramento.",
          };
        }
        payload.data_encerramento = dataEncerramento;
      }
    } else {
      payload.data_encerramento = null;
    }
  } else if (input.data_encerramento !== undefined) {
    payload.data_encerramento = emptyToNull(input.data_encerramento);
  }
  if (input.link_cronos !== undefined) {
    payload.link_cronos = normalizeUrl(input.link_cronos);
  }
  if (input.unidade !== undefined) {
    const unidade = input.unidade?.trim();
    if (!unidade) {
      return { data: null, error: "Informe a unidade do caso." };
    }
    payload.unidade = unidade;
  }

  const { data, error } = await supabase
    .from("casos")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao atualizar caso."),
    };
  }
  return { data: data as Caso, error: null };
}

export async function deleteCaso(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("casos").delete().eq("id", id);
  if (error) {
    return { error: friendlyError(error.message, "Erro ao excluir caso.") };
  }
  return { error: null };
}
