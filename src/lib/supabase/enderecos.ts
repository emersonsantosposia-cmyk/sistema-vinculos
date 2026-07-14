"use client";

import { requireAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { emptyToNull, friendlyError } from "@/lib/supabase/errors";
import type { Endereco } from "@/lib/types";

export type EnderecoInput = {
  nome?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  complemento?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export async function createEndereco(
  input: EnderecoInput,
): Promise<{ data: Endereco | null; error: string | null }> {
  const auth = await requireAuthUser();
  if (!auth.user) return { data: null, error: auth.error };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("enderecos")
    .insert({
      nome: emptyToNull(input.nome),
      logradouro: emptyToNull(input.logradouro),
      numero: emptyToNull(input.numero),
      bairro: emptyToNull(input.bairro),
      complemento: emptyToNull(input.complemento),
      cidade: emptyToNull(input.cidade),
      estado: emptyToNull(input.estado),
      cep: emptyToNull(input.cep?.replace(/\D/g, "")),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      usuario_cadastro: auth.user.id,
      data_cadastro: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao criar endereço."),
    };
  }
  return { data: data as Endereco, error: null };
}

export async function updateEndereco(
  id: string,
  input: Partial<EnderecoInput>,
): Promise<{ data: Endereco | null; error: string | null }> {
  const supabase = createClient();
  const payload: Record<string, unknown> = {};
  if (input.nome !== undefined) payload.nome = emptyToNull(input.nome);
  if (input.logradouro !== undefined) {
    payload.logradouro = emptyToNull(input.logradouro);
  }
  if (input.numero !== undefined) payload.numero = emptyToNull(input.numero);
  if (input.bairro !== undefined) payload.bairro = emptyToNull(input.bairro);
  if (input.complemento !== undefined) {
    payload.complemento = emptyToNull(input.complemento);
  }
  if (input.cidade !== undefined) payload.cidade = emptyToNull(input.cidade);
  if (input.estado !== undefined) payload.estado = emptyToNull(input.estado);
  if (input.cep !== undefined) {
    payload.cep = emptyToNull(input.cep?.replace(/\D/g, ""));
  }
  if (input.latitude !== undefined) payload.latitude = input.latitude;
  if (input.longitude !== undefined) payload.longitude = input.longitude;

  const { data, error } = await supabase
    .from("enderecos")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao atualizar endereço."),
    };
  }
  return { data: data as Endereco, error: null };
}

export async function deleteEndereco(
  id: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("enderecos").delete().eq("id", id);
  if (error) {
    return { error: friendlyError(error.message, "Erro ao excluir endereço.") };
  }
  return { error: null };
}
