"use client";

import { requireAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { emptyToNull, friendlyError } from "@/lib/supabase/errors";
import { normalizePlaca } from "@/lib/format";
import type { Veiculo } from "@/lib/types";

export type VeiculoInput = {
  placa?: string | null;
  marca?: string | null;
  modelo?: string | null;
  cor?: string | null;
  ano_fabricacao?: number | null;
  ano_modelo?: number | null;
};

export async function createVeiculo(
  input: VeiculoInput,
): Promise<{ data: Veiculo | null; error: string | null }> {
  const auth = await requireAuthUser();
  if (!auth.user) return { data: null, error: auth.error };

  const supabase = createClient();
  const placa = input.placa ? normalizePlaca(input.placa) : "";
  const { data, error } = await supabase
    .from("veiculos")
    .insert({
      placa: placa || null,
      marca: emptyToNull(input.marca),
      modelo: emptyToNull(input.modelo),
      cor: emptyToNull(input.cor),
      ano_fabricacao: input.ano_fabricacao ?? null,
      ano_modelo: input.ano_modelo ?? null,
      foto_url: null,
      usuario_cadastro: auth.user.id,
      data_cadastro: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao criar veículo."),
    };
  }
  return { data: data as Veiculo, error: null };
}

export async function updateVeiculo(
  id: string,
  input: Partial<VeiculoInput> & { foto_url?: string | null },
): Promise<{ data: Veiculo | null; error: string | null }> {
  const supabase = createClient();
  const payload: Record<string, unknown> = {};
  if (input.placa !== undefined) {
    const placa = input.placa ? normalizePlaca(input.placa) : "";
    payload.placa = placa || null;
  }
  if (input.marca !== undefined) payload.marca = emptyToNull(input.marca);
  if (input.modelo !== undefined) payload.modelo = emptyToNull(input.modelo);
  if (input.cor !== undefined) payload.cor = emptyToNull(input.cor);
  if (input.ano_fabricacao !== undefined) {
    payload.ano_fabricacao = input.ano_fabricacao;
  }
  if (input.ano_modelo !== undefined) payload.ano_modelo = input.ano_modelo;
  if (input.foto_url !== undefined) payload.foto_url = input.foto_url;

  const { data, error } = await supabase
    .from("veiculos")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao atualizar veículo."),
    };
  }
  return { data: data as Veiculo, error: null };
}

export async function deleteVeiculo(
  id: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("veiculos").delete().eq("id", id);
  if (error) {
    return { error: friendlyError(error.message, "Erro ao excluir veículo.") };
  }
  return { error: null };
}

export async function uploadFotoVeiculo(options: {
  veiculoId: string;
  file: File;
}): Promise<{ path: string | null; error: string | null }> {
  const { veiculoId, file } = options;
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${veiculoId}/modelo.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("fotos-veiculos")
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    return {
      path: null,
      error: friendlyError(uploadError.message, "Erro no upload da foto."),
    };
  }

  const { error } = await supabase
    .from("veiculos")
    .update({ foto_url: path })
    .eq("id", veiculoId);

  if (error) {
    return {
      path: null,
      error: friendlyError(error.message, "Erro ao salvar referência da foto."),
    };
  }

  return { path, error: null };
}
