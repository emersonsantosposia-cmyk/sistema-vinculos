"use client";

import { requireAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/supabase/errors";
import { formatPlaca } from "@/lib/format";
import type { EntidadeTipo } from "@/lib/types";
import type {
  EntidadeOpcao,
  VinculoCard,
  VinculoRow,
} from "@/lib/vinculos-types";

function sanitizeTerm(q: string): string {
  return q.trim().replace(/[%_,]/g, "");
}

function pickTitle(...parts: Array<string | null | undefined>): string {
  const found = parts.map((p) => p?.trim()).find((p) => p);
  return found || "Sem identificação";
}

function pickPerfilPath(
  fotos: Array<{ url_arquivo: string | null; tipo: string | null }> | null,
): string | null {
  if (!fotos?.length) return null;
  const perfil = fotos.find((f) => f.tipo === "perfil" && f.url_arquivo);
  return perfil?.url_arquivo ?? null;
}

export async function searchEntidades(
  tipo: EntidadeTipo,
  q: string,
): Promise<{ data: EntidadeOpcao[]; error: string | null }> {
  const supabase = createClient();
  const term = sanitizeTerm(q);
  const limit = 12;

  try {
    switch (tipo) {
      case "pessoa": {
        let query = supabase
          .from("pessoas")
          .select("id, nome, cpf, tipo")
          .order("nome")
          .limit(limit);
        if (term) query = query.or(`nome.ilike.%${term}%,cpf.ilike.%${term}%`);
        const { data, error } = await query;
        if (error) throw error;
        return {
          data: (data ?? []).map((row) => ({
            id: row.id,
            titulo: pickTitle(row.nome),
            subtitulo: row.cpf || row.tipo,
          })),
          error: null,
        };
      }
      case "empresa": {
        let query = supabase
          .from("empresas")
          .select("id, nome_fantasia, razao_social, cnpj")
          .order("razao_social")
          .limit(limit);
        if (term) {
          query = query.or(
            `nome_fantasia.ilike.%${term}%,razao_social.ilike.%${term}%,cnpj.ilike.%${term}%`,
          );
        }
        const { data, error } = await query;
        if (error) throw error;
        return {
          data: (data ?? []).map((row) => ({
            id: row.id,
            titulo: pickTitle(row.nome_fantasia, row.razao_social),
            subtitulo: row.cnpj || row.razao_social,
          })),
          error: null,
        };
      }
      case "endereco": {
        let query = supabase
          .from("enderecos")
          .select("id, nome, logradouro, cidade, estado, cep")
          .order("data_cadastro", { ascending: false })
          .limit(limit);
        if (term) {
          query = query.or(
            `nome.ilike.%${term}%,logradouro.ilike.%${term}%,cidade.ilike.%${term}%,cep.ilike.%${term}%`,
          );
        }
        const { data, error } = await query;
        if (error) throw error;
        return {
          data: (data ?? []).map((row) => ({
            id: row.id,
            titulo: pickTitle(
              row.nome,
              [row.logradouro, row.cidade].filter(Boolean).join(", "),
            ),
            subtitulo: [row.cidade, row.estado].filter(Boolean).join(" · "),
          })),
          error: null,
        };
      }
      case "veiculo": {
        let query = supabase
          .from("veiculos")
          .select("id, placa, marca, modelo, cor")
          .order("data_cadastro", { ascending: false })
          .limit(limit);
        if (term) {
          query = query.or(
            `placa.ilike.%${term}%,marca.ilike.%${term}%,modelo.ilike.%${term}%`,
          );
        }
        const { data, error } = await query;
        if (error) throw error;
        return {
          data: (data ?? []).map((row) => ({
            id: row.id,
            titulo: pickTitle(
              formatPlaca(row.placa) !== "—"
                ? formatPlaca(row.placa)
                : undefined,
              [row.marca, row.modelo].filter(Boolean).join(" "),
            ),
            subtitulo: [row.marca, row.modelo, row.cor]
              .filter(Boolean)
              .join(" · "),
          })),
          error: null,
        };
      }
      case "procedimento": {
        let query = supabase
          .from("procedimentos")
          .select("id, nome, tipo, data")
          .order("data_cadastro", { ascending: false })
          .limit(limit);
        if (term) {
          query = query.or(`nome.ilike.%${term}%,resumo.ilike.%${term}%`);
        }
        const { data, error } = await query;
        if (error) throw error;
        return {
          data: (data ?? []).map((row) => ({
            id: row.id,
            titulo: pickTitle(row.nome, row.tipo),
            subtitulo: row.tipo,
          })),
          error: null,
        };
      }
      case "caso": {
        let query = supabase
          .from("casos")
          .select("id, numero, nome")
          .order("data_cadastro", { ascending: false })
          .limit(limit);
        if (term) {
          query = query.or(`numero.ilike.%${term}%,nome.ilike.%${term}%`);
        }
        const { data, error } = await query;
        if (error) throw error;
        return {
          data: (data ?? []).map((row) => ({
            id: row.id,
            titulo: pickTitle(row.nome, row.numero),
            subtitulo: row.numero,
          })),
          error: null,
        };
      }
      default:
        return { data: [], error: "Tipo de entidade inválido." };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro na busca.";
    return { data: [], error: friendlyError(message, "Erro na busca.") };
  }
}

export async function getEntidadeResumo(
  tipo: EntidadeTipo,
  id: string,
): Promise<EntidadeOpcao | null> {
  const supabase = createClient();

  switch (tipo) {
    case "pessoa": {
      const { data } = await supabase
        .from("pessoas")
        .select("id, nome, cpf, tipo, pessoas_fotos(url_arquivo, tipo)")
        .eq("id", id)
        .maybeSingle();
      if (!data) return null;
      return {
        id: data.id,
        titulo: pickTitle(data.nome),
        subtitulo: data.cpf || data.tipo,
        foto_perfil_path: pickPerfilPath(
          data.pessoas_fotos as Array<{
            url_arquivo: string | null;
            tipo: string | null;
          }> | null,
        ),
      };
    }
    case "empresa": {
      const { data } = await supabase
        .from("empresas")
        .select("id, nome_fantasia, razao_social, cnpj")
        .eq("id", id)
        .maybeSingle();
      if (!data) return null;
      return {
        id: data.id,
        titulo: pickTitle(data.nome_fantasia, data.razao_social),
        subtitulo: data.cnpj || data.razao_social,
      };
    }
    case "endereco": {
      const { data } = await supabase
        .from("enderecos")
        .select("id, nome, logradouro, cidade, estado")
        .eq("id", id)
        .maybeSingle();
      if (!data) return null;
      return {
        id: data.id,
        titulo: pickTitle(
          data.nome,
          [data.logradouro, data.cidade].filter(Boolean).join(", "),
        ),
        subtitulo: [data.cidade, data.estado].filter(Boolean).join(" · "),
      };
    }
    case "veiculo": {
      const { data } = await supabase
        .from("veiculos")
        .select("id, placa, marca, modelo, cor")
        .eq("id", id)
        .maybeSingle();
      if (!data) return null;
      return {
        id: data.id,
        titulo: pickTitle(
          formatPlaca(data.placa) !== "—" ? formatPlaca(data.placa) : undefined,
          [data.marca, data.modelo].filter(Boolean).join(" "),
        ),
        subtitulo: [data.marca, data.modelo, data.cor]
          .filter(Boolean)
          .join(" · "),
      };
    }
    case "procedimento": {
      const { data } = await supabase
        .from("procedimentos")
        .select("id, nome, tipo")
        .eq("id", id)
        .maybeSingle();
      if (!data) return null;
      return {
        id: data.id,
        titulo: pickTitle(data.nome, data.tipo),
        subtitulo: data.tipo,
      };
    }
    case "caso": {
      const { data } = await supabase
        .from("casos")
        .select("id, numero, nome")
        .eq("id", id)
        .maybeSingle();
      if (!data) return null;
      return {
        id: data.id,
        titulo: pickTitle(data.nome, data.numero),
        subtitulo: data.numero,
      };
    }
    default:
      return null;
  }
}

export async function listVinculosDaEntidade(
  entidadeTipo: EntidadeTipo,
  entidadeId: string,
): Promise<{ data: VinculoCard[]; error: string | null }> {
  const supabase = createClient();

  const [asOrigem, asDestino] = await Promise.all([
    supabase
      .from("vinculos")
      .select("*")
      .eq("entidade_origem_tipo", entidadeTipo)
      .eq("entidade_origem_id", entidadeId)
      .order("data_cadastro", { ascending: false }),
    supabase
      .from("vinculos")
      .select("*")
      .eq("entidade_destino_tipo", entidadeTipo)
      .eq("entidade_destino_id", entidadeId)
      .order("data_cadastro", { ascending: false }),
  ]);

  if (asOrigem.error || asDestino.error) {
    return {
      data: [],
      error: friendlyError(
        asOrigem.error?.message || asDestino.error?.message || "",
        "Erro ao carregar vínculos.",
      ),
    };
  }

  const seen = new Set<string>();
  const rows: VinculoRow[] = [];
  for (const row of [...(asOrigem.data ?? []), ...(asDestino.data ?? [])]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    rows.push(row as VinculoRow);
  }
  rows.sort(
    (a, b) =>
      new Date(b.data_cadastro).getTime() - new Date(a.data_cadastro).getTime(),
  );
  const cards: VinculoCard[] = [];

  for (const row of rows) {
    const isOrigem =
      row.entidade_origem_tipo === entidadeTipo &&
      row.entidade_origem_id === entidadeId;
    const outroTipo = isOrigem
      ? row.entidade_destino_tipo
      : row.entidade_origem_tipo;
    const outroId = isOrigem
      ? row.entidade_destino_id
      : row.entidade_origem_id;

    const resumo = await getEntidadeResumo(outroTipo, outroId);
    cards.push({
      id: row.id,
      tipo_vinculo: row.tipo_vinculo,
      observacao: row.observacao,
      outroTipo,
      outroId,
      titulo: resumo?.titulo ?? "Entidade não encontrada",
      subtitulo: resumo?.subtitulo ?? null,
      foto_perfil_path: resumo?.foto_perfil_path ?? null,
    });
  }

  return { data: cards, error: null };
}

export async function createVinculo(input: {
  origemTipo: EntidadeTipo;
  origemId: string;
  destinoTipo: EntidadeTipo;
  destinoId: string;
  tipoVinculo?: string | null;
  observacao?: string | null;
}): Promise<{ error: string | null }> {
  if (input.origemTipo === input.destinoTipo && input.origemId === input.destinoId) {
    return { error: "Não é possível vincular uma entidade a ela mesma." };
  }

  const auth = await requireAuthUser();
  if (!auth.user) return { error: auth.error };

  const supabase = createClient();
  const { error } = await supabase.from("vinculos").insert({
    entidade_origem_tipo: input.origemTipo,
    entidade_origem_id: input.origemId,
    entidade_destino_tipo: input.destinoTipo,
    entidade_destino_id: input.destinoId,
    tipo_vinculo: input.tipoVinculo?.trim() || null,
    observacao: input.observacao?.trim() || null,
    usuario_cadastro: auth.user.id,
    data_cadastro: new Date().toISOString(),
  });

  if (error) {
    return { error: friendlyError(error.message, "Erro ao salvar vínculo.") };
  }
  return { error: null };
}

export async function deleteVinculo(
  id: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("vinculos").delete().eq("id", id);
  if (error) {
    return { error: friendlyError(error.message, "Erro ao remover vínculo.") };
  }
  return { error: null };
}
