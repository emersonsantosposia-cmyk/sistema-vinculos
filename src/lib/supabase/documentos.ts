"use client";

import { requireAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import {
  emptyToNull,
  friendlyError,
  normalizeUrl,
} from "@/lib/supabase/errors";
import type { Documento, DocumentoTipo } from "@/lib/types";

export type DocumentoInput = {
  tipo?: DocumentoTipo | null;
  nome?: string | null;
  resumo?: string | null;
  data?: string | null;
  link_cronos?: string | null;
  unidade?: string | null;
};

export async function createDocumento(
  input: DocumentoInput,
): Promise<{ data: Documento | null; error: string | null }> {
  const auth = await requireAuthUser();
  if (!auth.user) return { data: null, error: auth.error };

  const unidade = input.unidade?.trim();
  if (!unidade) {
    return { data: null, error: "Informe a unidade do documento." };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("documentos")
    .insert({
      tipo: input.tipo || null,
      nome: emptyToNull(input.nome),
      resumo: emptyToNull(input.resumo),
      data: emptyToNull(input.data),
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
      error: friendlyError(error.message, "Erro ao criar documento."),
    };
  }
  return { data: data as Documento, error: null };
}

export async function updateDocumento(
  id: string,
  input: Partial<DocumentoInput>,
): Promise<{ data: Documento | null; error: string | null }> {
  const supabase = createClient();
  const payload: Record<string, unknown> = {};
  if (input.tipo !== undefined) payload.tipo = input.tipo || null;
  if (input.nome !== undefined) payload.nome = emptyToNull(input.nome);
  if (input.resumo !== undefined) payload.resumo = emptyToNull(input.resumo);
  if (input.data !== undefined) payload.data = emptyToNull(input.data);
  if (input.link_cronos !== undefined) {
    payload.link_cronos = normalizeUrl(input.link_cronos);
  }
  if (input.unidade !== undefined) {
    const unidade = input.unidade?.trim();
    if (!unidade) {
      return { data: null, error: "Informe a unidade do documento." };
    }
    payload.unidade = unidade;
  }

  const { data, error } = await supabase
    .from("documentos")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao atualizar documento."),
    };
  }
  return { data: data as Documento, error: null };
}

export async function deleteDocumento(
  id: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("documentos").delete().eq("id", id);
  if (error) {
    return {
      error: friendlyError(error.message, "Erro ao excluir documento."),
    };
  }
  return { error: null };
}

/** Retorna o conjunto de nomes que já existem na tabela (match exato). */
export async function findExistingDocumentoNomes(
  nomes: string[],
): Promise<{ nomes: Set<string>; error: string | null }> {
  const unique = [...new Set(nomes.filter(Boolean))];
  if (unique.length === 0) return { nomes: new Set(), error: null };

  const supabase = createClient();
  const existing = new Set<string>();
  const chunkSize = 100;

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("documentos")
      .select("nome")
      .in("nome", chunk);

    if (error) {
      return {
        nomes: new Set(),
        error: friendlyError(
          error.message,
          "Erro ao verificar nomes duplicados.",
        ),
      };
    }
    for (const row of data ?? []) {
      if (row.nome) existing.add(row.nome);
    }
  }

  return { nomes: existing, error: null };
}

/** Insere vários documentos de uma vez (mesmo usuário e data_cadastro). */
export async function createDocumentosBatch(
  inputs: DocumentoInput[],
): Promise<{ created: number; error: string | null }> {
  if (inputs.length === 0) return { created: 0, error: null };

  const auth = await requireAuthUser();
  if (!auth.user) return { created: 0, error: auth.error };

  const supabase = createClient();
  const now = new Date().toISOString();
  const rows: Array<{
    tipo: DocumentoTipo | null;
    nome: string | null;
    resumo: string | null;
    data: string | null;
    link_cronos: string | null;
    unidade: string;
    usuario_cadastro: string;
    data_cadastro: string;
  }> = [];

  for (const input of inputs) {
    const unidade = input.unidade?.trim();
    if (!unidade) {
      return {
        created: 0,
        error: "Informe a unidade do documento.",
      };
    }
    rows.push({
      tipo: input.tipo || null,
      nome: emptyToNull(input.nome),
      resumo: emptyToNull(input.resumo),
      data: emptyToNull(input.data),
      link_cronos: normalizeUrl(input.link_cronos),
      unidade,
      usuario_cadastro: auth.user.id,
      data_cadastro: now,
    });
  }

  const { data, error } = await supabase
    .from("documentos")
    .insert(rows)
    .select("id");

  if (error) {
    return {
      created: 0,
      error: friendlyError(error.message, "Erro ao importar documentos."),
    };
  }
  return { created: data?.length ?? 0, error: null };
}
