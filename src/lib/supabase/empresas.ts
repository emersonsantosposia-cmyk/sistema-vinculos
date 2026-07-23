"use client";

import { requireAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { emptyToNull, friendlyError, normalizeUrl } from "@/lib/supabase/errors";
import type { Empresa } from "@/lib/types";

export type EmpresaInput = {
  nome_fantasia?: string | null;
  razao_social: string;
  cnpj?: string | null;
  cnae_principal?: string | null;
  website?: string | null;
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
      website: normalizeUrl(input.website),
      foto_url: null,
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
  input: Partial<EmpresaInput> & { foto_url?: string | null },
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
  if (input.website !== undefined) {
    payload.website = normalizeUrl(input.website);
  }
  if (input.foto_url !== undefined) payload.foto_url = input.foto_url;

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

export async function uploadFotoEmpresa(options: {
  empresaId: string;
  file: File;
}): Promise<{ path: string | null; error: string | null }> {
  const { empresaId, file } = options;
  const supabase = createClient();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${empresaId}/foto.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("fotos-empresas")
    .upload(path, file, {
      upsert: true,
      contentType: file.type || `image/${ext === "jpg" ? "jpeg" : ext}`,
    });

  if (uploadError) {
    return {
      path: null,
      error: friendlyError(uploadError.message, "Erro no upload da foto."),
    };
  }

  const { data, error } = await supabase
    .from("empresas")
    .update({ foto_url: path })
    .eq("id", empresaId)
    .select("foto_url")
    .maybeSingle();

  if (error) {
    return {
      path: null,
      error: friendlyError(error.message, "Erro ao salvar referência da foto."),
    };
  }
  if (!data?.foto_url) {
    return {
      path: null,
      error: "Não foi possível gravar a referência da foto na empresa.",
    };
  }

  return { path, error: null };
}
