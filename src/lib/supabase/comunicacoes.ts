"use client";

import { requireAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { emptyToNull, friendlyError } from "@/lib/supabase/errors";
import { comunicacaoMostraOperadora } from "@/lib/format";
import type {
  Comunicacao,
  ComunicacaoStatus,
  ComunicacaoTipo,
} from "@/lib/types";

export type ComunicacaoInput = {
  tipo: ComunicacaoTipo;
  valor: string;
  operadora_provedor?: string | null;
  status: ComunicacaoStatus;
  fonte?: string | null;
  observacao_geral?: string | null;
};

function normalizeOperadora(
  tipo: ComunicacaoTipo,
  operadora: string | null | undefined,
): string | null {
  if (!comunicacaoMostraOperadora(tipo)) return null;
  return emptyToNull(operadora);
}

export async function createComunicacao(
  input: ComunicacaoInput,
): Promise<{ data: Comunicacao | null; error: string | null }> {
  const auth = await requireAuthUser();
  if (!auth.user) return { data: null, error: auth.error };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("comunicacoes")
    .insert({
      tipo: input.tipo,
      valor: input.valor.trim(),
      operadora_provedor: normalizeOperadora(
        input.tipo,
        input.operadora_provedor,
      ),
      status: input.status,
      fonte: emptyToNull(input.fonte),
      observacao_geral: emptyToNull(input.observacao_geral),
      usuario_cadastro: auth.user.id,
      data_cadastro: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao criar comunicação."),
    };
  }
  return { data: data as Comunicacao, error: null };
}

export async function updateComunicacao(
  id: string,
  input: Partial<ComunicacaoInput> & { tipo?: ComunicacaoTipo },
): Promise<{ data: Comunicacao | null; error: string | null }> {
  const supabase = createClient();
  const payload: Record<string, unknown> = {};

  if (input.tipo !== undefined) payload.tipo = input.tipo;
  if (input.valor !== undefined) payload.valor = input.valor.trim();
  if (input.status !== undefined) payload.status = input.status;
  if (input.fonte !== undefined) payload.fonte = emptyToNull(input.fonte);
  if (input.observacao_geral !== undefined) {
    payload.observacao_geral = emptyToNull(input.observacao_geral);
  }
  if (input.operadora_provedor !== undefined || input.tipo !== undefined) {
    const tipo = input.tipo;
    if (tipo) {
      payload.operadora_provedor = normalizeOperadora(
        tipo,
        input.operadora_provedor,
      );
    } else if (input.operadora_provedor !== undefined) {
      payload.operadora_provedor = emptyToNull(input.operadora_provedor);
    }
  }

  const { data, error } = await supabase
    .from("comunicacoes")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao atualizar comunicação."),
    };
  }
  return { data: data as Comunicacao, error: null };
}

export async function deleteComunicacao(
  id: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("comunicacoes").delete().eq("id", id);
  if (error) {
    return {
      error: friendlyError(error.message, "Erro ao excluir comunicação."),
    };
  }
  return { error: null };
}
