"use client";

import { requireAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { emptyToNull, friendlyError } from "@/lib/supabase/errors";
import type { Empresa } from "@/lib/types";

export type EmpresaInput = {
  nome_fantasia?: string | null;
  razao_social: string;
  cnpj?: string | null;
  cnae_principal?: string | null;
};

export async function createEmpresa(
  input: EmpresaInput,
): Promise<{ data: Empresa | null; error: string | null }> {
  const auth = await requireAuthUser();
  if (!auth.user) return { data: null, error: auth.error };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("empresas")
    .insert({
      nome_fantasia: emptyToNull(input.nome_fantasia),
      razao_social: input.razao_social.trim(),
      cnpj: emptyToNull(input.cnpj?.replace(/\D/g, "")),
      cnae_principal: emptyToNull(input.cnae_principal),
      usuario_cadastro: auth.user.id,
      data_cadastro: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao criar empresa."),
    };
  }
  return { data: data as Empresa, error: null };
}

export async function updateEmpresa(
  id: string,
  input: Partial<EmpresaInput>,
): Promise<{ data: Empresa | null; error: string | null }> {
  const supabase = createClient();
  const payload: Record<string, unknown> = {};
  if (input.nome_fantasia !== undefined) {
    payload.nome_fantasia = emptyToNull(input.nome_fantasia);
  }
  if (input.razao_social !== undefined) {
    payload.razao_social = input.razao_social.trim();
  }
  if (input.cnpj !== undefined) {
    payload.cnpj = emptyToNull(input.cnpj?.replace(/\D/g, ""));
  }
  if (input.cnae_principal !== undefined) {
    payload.cnae_principal = emptyToNull(input.cnae_principal);
  }

  const { data, error } = await supabase
    .from("empresas")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao atualizar empresa."),
    };
  }
  return { data: data as Empresa, error: null };
}

export async function deleteEmpresa(
  id: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("empresas").delete().eq("id", id);
  if (error) {
    return { error: friendlyError(error.message, "Erro ao excluir empresa.") };
  }
  return { error: null };
}
