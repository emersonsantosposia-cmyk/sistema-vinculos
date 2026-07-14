"use client";

import { requireAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import type {
  Pessoa,
  PessoaFoto,
  PessoaRedeSocial,
  PessoaTipo,
} from "@/lib/types";

export type PessoaInput = {
  tipo: PessoaTipo;
  nome: string;
  cpf?: string | null;
  data_nascimento?: string | null;
  nome_mae?: string | null;
  nome_pai?: string | null;
  profissao?: string | null;
};

export type RedeSocialInput = {
  rede?: string | null;
  link?: string | null;
};

function friendlyError(message: string, fallback: string): string {
  if (message.includes("row-level security") || message.includes("JWT")) {
    return "Sem permissão. Faça login com um usuário autenticado.";
  }
  return message || fallback;
}

function emptyToNull(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function createPessoa(
  input: PessoaInput,
): Promise<{ data: Pessoa | null; error: string | null }> {
  const auth = await requireAuthUser();
  if (!auth.user) return { data: null, error: auth.error };

  const supabase = createClient();

  const { data, error } = await supabase
    .from("pessoas")
    .insert({
      tipo: input.tipo,
      nome: input.nome.trim(),
      cpf: emptyToNull(input.cpf),
      data_nascimento: emptyToNull(input.data_nascimento),
      nome_mae: emptyToNull(input.nome_mae),
      nome_pai: emptyToNull(input.nome_pai),
      profissao: emptyToNull(input.profissao),
      usuario_cadastro: auth.user.id,
      data_cadastro: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao criar pessoa."),
    };
  }

  return { data: data as Pessoa, error: null };
}

export async function updatePessoa(
  id: string,
  input: Partial<PessoaInput>,
): Promise<{ data: Pessoa | null; error: string | null }> {
  const supabase = createClient();

  const payload: Record<string, unknown> = {};
  if (input.tipo !== undefined) payload.tipo = input.tipo;
  if (input.nome !== undefined) payload.nome = input.nome.trim();
  if (input.cpf !== undefined) payload.cpf = emptyToNull(input.cpf);
  if (input.data_nascimento !== undefined) {
    payload.data_nascimento = emptyToNull(input.data_nascimento);
  }
  if (input.nome_mae !== undefined) {
    payload.nome_mae = emptyToNull(input.nome_mae);
  }
  if (input.nome_pai !== undefined) {
    payload.nome_pai = emptyToNull(input.nome_pai);
  }
  if (input.profissao !== undefined) {
    payload.profissao = emptyToNull(input.profissao);
  }

  const { data, error } = await supabase
    .from("pessoas")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao atualizar pessoa."),
    };
  }

  return { data: data as Pessoa, error: null };
}

export async function deletePessoa(
  id: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("pessoas").delete().eq("id", id);
  if (error) {
    return { error: friendlyError(error.message, "Erro ao excluir pessoa.") };
  }
  return { error: null };
}

export async function addRedesSociais(
  pessoaId: string,
  redes: RedeSocialInput[],
): Promise<{ data: PessoaRedeSocial[]; error: string | null }> {
  const rows = redes
    .map((r) => ({
      pessoa_id: pessoaId,
      rede: emptyToNull(r.rede),
      link: emptyToNull(r.link),
    }))
    .filter((r) => r.rede || r.link);

  if (rows.length === 0) {
    return { data: [], error: null };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("pessoas_redes_sociais")
    .insert(rows)
    .select("*");

  if (error) {
    return {
      data: [],
      error: friendlyError(error.message, "Erro ao salvar redes sociais."),
    };
  }

  return { data: (data ?? []) as PessoaRedeSocial[], error: null };
}

export async function removeRedeSocial(
  redeId: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("pessoas_redes_sociais")
    .delete()
    .eq("id", redeId);

  if (error) {
    return {
      error: friendlyError(error.message, "Erro ao remover rede social."),
    };
  }
  return { error: null };
}

export async function uploadFotoPessoa(options: {
  pessoaId: string;
  file: File;
  tipo: "perfil" | "outra";
  pathSuffix?: string;
}): Promise<{ data: PessoaFoto | null; error: string | null }> {
  const { pessoaId, file, tipo, pathSuffix } = options;
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path =
    tipo === "perfil"
      ? `${pessoaId}/perfil.${ext}`
      : `${pessoaId}/${pathSuffix ?? `galeria-${Date.now()}`}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("fotos-pessoas")
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    return {
      data: null,
      error: friendlyError(uploadError.message, "Erro no upload da foto."),
    };
  }

  // Garante no máximo uma foto de perfil por pessoa
  if (tipo === "perfil") {
    const { data: existentes } = await supabase
      .from("pessoas_fotos")
      .select("id, url_arquivo")
      .eq("pessoa_id", pessoaId)
      .eq("tipo", "perfil");

    if (existentes && existentes.length > 0) {
      const ids = existentes.map((f) => f.id);
      const pathsToRemove = existentes
        .map((f) => f.url_arquivo)
        .filter((p): p is string => Boolean(p) && p !== path);
      if (pathsToRemove.length > 0) {
        await supabase.storage.from("fotos-pessoas").remove(pathsToRemove);
      }
      await supabase.from("pessoas_fotos").delete().in("id", ids);
    }
  }

  const { data, error } = await supabase
    .from("pessoas_fotos")
    .insert({
      pessoa_id: pessoaId,
      url_arquivo: path,
      tipo,
      data_upload: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao registrar foto."),
    };
  }

  return { data: data as PessoaFoto, error: null };
}

export async function removeFotoPessoa(
  fotoId: string,
  storagePath?: string | null,
): Promise<{ error: string | null }> {
  const supabase = createClient();

  if (storagePath) {
    await supabase.storage.from("fotos-pessoas").remove([storagePath]);
  }

  const { error } = await supabase
    .from("pessoas_fotos")
    .delete()
    .eq("id", fotoId);

  if (error) {
    return { error: friendlyError(error.message, "Erro ao remover foto.") };
  }
  return { error: null };
}
