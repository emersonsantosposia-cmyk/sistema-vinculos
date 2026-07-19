"use client";

import { requireAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/supabase/errors";
import { resolveUserDisplayNames } from "@/lib/supabase/observacoes";
import { formatPlaca, labelComunicacaoTipo } from "@/lib/format";
import type { EntidadeTipo } from "@/lib/types";
import type {
  EntidadeOpcao,
  VinculoCard,
  VinculoDiagramItem,
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
          .select("id, nome, logradouro, numero, cidade, estado, cep")
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
            subtitulo: [
              [row.logradouro, row.numero].filter(Boolean).join(", "),
              [row.cidade, row.estado].filter(Boolean).join(" · "),
            ]
              .filter(Boolean)
              .join(", "),
          })),
          error: null,
        };
      }
      case "veiculo": {
        let query = supabase
          .from("veiculos")
          .select("id, placa, marca, modelo, cor, foto_url")
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
            foto_url: row.foto_url,
          })),
          error: null,
        };
      }
      case "documento": {
        let query = supabase
          .from("documentos")
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
      case "comunicacao": {
        let query = supabase
          .from("comunicacoes")
          .select("id, tipo, valor, operadora_provedor, status")
          .order("data_cadastro", { ascending: false })
          .limit(limit);
        if (term) {
          query = query.or(
            `valor.ilike.%${term}%,operadora_provedor.ilike.%${term}%`,
          );
        }
        const { data, error } = await query;
        if (error) throw error;
        return {
          data: (data ?? []).map((row) => ({
            id: row.id,
            titulo: pickTitle(row.valor),
            subtitulo: [
              labelComunicacaoTipo(row.tipo),
              row.operadora_provedor,
            ]
              .filter(Boolean)
              .join(" · "),
          })),
          error: null,
        };
      }
      case "orcrim": {
        let query = supabase
          .from("orcrims")
          .select("id, nome, sigla, estado_origem")
          .order("nome", { ascending: true })
          .limit(limit);
        if (term) {
          query = query.or(`nome.ilike.%${term}%,sigla.ilike.%${term}%`);
        }
        const { data, error } = await query;
        if (error) throw error;
        return {
          data: (data ?? []).map((row) => ({
            id: row.id,
            titulo: pickTitle(row.nome),
            subtitulo: [row.sigla, row.estado_origem]
              .filter(Boolean)
              .join(" · "),
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

function resumoKey(tipo: EntidadeTipo, id: string): string {
  return `${tipo}:${id}`;
}

type ResumoRef = { tipo: EntidadeTipo; id: string };

/**
 * Resolve resumos em lote: no máximo uma query por tipo de entidade
 * (`.in('id', …)`), independente de quantos IDs existam no grupo.
 */
export async function getEntidadesResumoBatch(
  refs: ResumoRef[],
): Promise<Map<string, EntidadeOpcao>> {
  const result = new Map<string, EntidadeOpcao>();
  if (refs.length === 0) return result;

  const byTipo = new Map<EntidadeTipo, Set<string>>();
  for (const ref of refs) {
    if (!ref.id) continue;
    let set = byTipo.get(ref.tipo);
    if (!set) {
      set = new Set();
      byTipo.set(ref.tipo, set);
    }
    set.add(ref.id);
  }

  const supabase = createClient();

  await Promise.all(
    [...byTipo.entries()].map(async ([tipo, idSet]) => {
      const ids = [...idSet];
      if (ids.length === 0) return;

      switch (tipo) {
        case "pessoa": {
          const { data } = await supabase
            .from("pessoas")
            .select("id, nome, cpf, tipo, pessoas_fotos(url_arquivo, tipo)")
            .in("id", ids);
          for (const row of data ?? []) {
            result.set(resumoKey(tipo, row.id), {
              id: row.id,
              titulo: pickTitle(row.nome),
              subtitulo: row.cpf || row.tipo,
              foto_perfil_path: pickPerfilPath(
                row.pessoas_fotos as Array<{
                  url_arquivo: string | null;
                  tipo: string | null;
                }> | null,
              ),
            });
          }
          break;
        }
        case "empresa": {
          const { data } = await supabase
            .from("empresas")
            .select("id, nome_fantasia, razao_social, cnpj")
            .in("id", ids);
          for (const row of data ?? []) {
            result.set(resumoKey(tipo, row.id), {
              id: row.id,
              titulo: pickTitle(row.nome_fantasia, row.razao_social),
              subtitulo: row.cnpj || row.razao_social,
            });
          }
          break;
        }
        case "endereco": {
          const { data } = await supabase
            .from("enderecos")
            .select("id, nome, logradouro, numero, cidade, estado")
            .in("id", ids);
          for (const row of data ?? []) {
            result.set(resumoKey(tipo, row.id), {
              id: row.id,
              titulo: pickTitle(
                row.nome,
                [row.logradouro, row.cidade].filter(Boolean).join(", "),
              ),
              subtitulo: [
                [row.logradouro, row.numero].filter(Boolean).join(", "),
                [row.cidade, row.estado].filter(Boolean).join(" · "),
              ]
                .filter(Boolean)
                .join(", "),
            });
          }
          break;
        }
        case "veiculo": {
          const { data } = await supabase
            .from("veiculos")
            .select("id, placa, marca, modelo, cor, foto_url")
            .in("id", ids);
          for (const row of data ?? []) {
            result.set(resumoKey(tipo, row.id), {
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
              foto_url: row.foto_url,
            });
          }
          break;
        }
        case "documento": {
          const { data } = await supabase
            .from("documentos")
            .select("id, nome, tipo")
            .in("id", ids);
          for (const row of data ?? []) {
            result.set(resumoKey(tipo, row.id), {
              id: row.id,
              titulo: pickTitle(row.nome, row.tipo),
              subtitulo: row.tipo,
            });
          }
          break;
        }
        case "caso": {
          const { data } = await supabase
            .from("casos")
            .select("id, numero, nome")
            .in("id", ids);
          for (const row of data ?? []) {
            result.set(resumoKey(tipo, row.id), {
              id: row.id,
              titulo: pickTitle(row.nome, row.numero),
              subtitulo: row.numero,
            });
          }
          break;
        }
        case "comunicacao": {
          const { data } = await supabase
            .from("comunicacoes")
            .select("id, tipo, valor, operadora_provedor, status")
            .in("id", ids);
          for (const row of data ?? []) {
            result.set(resumoKey(tipo, row.id), {
              id: row.id,
              titulo: pickTitle(row.valor),
              subtitulo: [
                labelComunicacaoTipo(row.tipo),
                row.operadora_provedor,
              ]
                .filter(Boolean)
                .join(" · "),
            });
          }
          break;
        }
        case "orcrim": {
          const { data } = await supabase
            .from("orcrims")
            .select("id, nome, sigla, estado_origem")
            .in("id", ids);
          for (const row of data ?? []) {
            result.set(resumoKey(tipo, row.id), {
              id: row.id,
              titulo: pickTitle(row.nome),
              subtitulo: [row.sigla, row.estado_origem]
                .filter(Boolean)
                .join(" · "),
            });
          }
          break;
        }
        default:
          break;
      }
    }),
  );

  return result;
}

export async function getEntidadeResumo(
  tipo: EntidadeTipo,
  id: string,
): Promise<EntidadeOpcao | null> {
  const map = await getEntidadesResumoBatch([{ tipo, id }]);
  return map.get(resumoKey(tipo, id)) ?? null;
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

  const outros: ResumoRef[] = rows.map((row) => {
    const isOrigem =
      row.entidade_origem_tipo === entidadeTipo &&
      row.entidade_origem_id === entidadeId;
    return {
      tipo: isOrigem ? row.entidade_destino_tipo : row.entidade_origem_tipo,
      id: isOrigem ? row.entidade_destino_id : row.entidade_origem_id,
    };
  });

  const [names, resumos] = await Promise.all([
    resolveUserDisplayNames(
      rows
        .map((r) => r.usuario_cadastro)
        .filter((id): id is string => Boolean(id)),
    ),
    getEntidadesResumoBatch(outros),
  ]);

  const cards: VinculoCard[] = rows.map((row, index) => {
    const { tipo: outroTipo, id: outroId } = outros[index]!;
    const resumo = resumos.get(resumoKey(outroTipo, outroId)) ?? null;
    const restrito =
      !resumo && (outroTipo === "documento" || outroTipo === "caso");

    return {
      id: row.id,
      tipo_vinculo: row.tipo_vinculo,
      // Não vazar fundamentação quando o outro lado é doc/caso inacessível.
      fundamentacao: restrito ? null : row.observacao,
      usuario_cadastro: row.usuario_cadastro,
      data_cadastro: row.data_cadastro,
      usuario_nome: restrito
        ? null
        : row.usuario_cadastro
          ? (names[row.usuario_cadastro] ?? null)
          : null,
      outroTipo,
      outroId,
      titulo: restrito
        ? outroTipo === "documento"
          ? "Documento restrito"
          : "Caso restrito"
        : (resumo?.titulo ?? "Entidade não encontrada"),
      subtitulo: restrito ? null : (resumo?.subtitulo ?? null),
      restrito,
      foto_perfil_path: restrito ? null : (resumo?.foto_perfil_path ?? null),
      foto_url: restrito ? null : (resumo?.foto_url ?? null),
    };
  });

  return { data: cards, error: null };
}

/** Vínculos de uma entidade para o diagrama interativo (origem ou destino). */
export async function buscarVinculosDaEntidade(
  entidadeTipo: EntidadeTipo,
  entidadeId: string,
): Promise<{ data: VinculoDiagramItem[]; error: string | null }> {
  const { data, error } = await listVinculosDaEntidade(
    entidadeTipo,
    entidadeId,
  );
  if (error) return { data: [], error };
  return {
    data: data.map((card) => ({
      vinculoId: card.id,
      outroTipo: card.outroTipo,
      outroId: card.outroId,
      tipo_vinculo: card.tipo_vinculo,
      titulo: card.titulo,
      subtitulo: card.subtitulo,
      restrito: Boolean(card.restrito),
      foto_perfil_path: card.foto_perfil_path,
      foto_url: card.foto_url,
    })),
    error: null,
  };
}

export async function createVinculo(input: {
  origemTipo: EntidadeTipo;
  origemId: string;
  destinoTipo: EntidadeTipo;
  destinoId: string;
  tipoVinculo?: string | null;
  fundamentacao?: string | null;
}): Promise<{ error: string | null }> {
  if (
    input.origemTipo === input.destinoTipo &&
    input.origemId === input.destinoId
  ) {
    return { error: "Não é possível vincular uma entidade a ela mesma." };
  }

  const fundamentacao = input.fundamentacao?.trim() || "";
  if (!fundamentacao) {
    return { error: "Informe a fundamentação do vínculo." };
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
    observacao: fundamentacao,
    usuario_cadastro: auth.user.id,
    data_cadastro: new Date().toISOString(),
  });

  if (error) {
    return { error: friendlyError(error.message, "Erro ao salvar vínculo.") };
  }
  return { error: null };
}

export async function updateVinculo(
  id: string,
  input: {
    tipoVinculo?: string | null;
    fundamentacao?: string | null;
  },
): Promise<{ error: string | null }> {
  const fundamentacao = input.fundamentacao?.trim() || "";
  if (!fundamentacao) {
    return { error: "Informe a fundamentação do vínculo." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("vinculos")
    .update({
      tipo_vinculo: input.tipoVinculo?.trim() || null,
      observacao: fundamentacao,
    })
    .eq("id", id);

  if (error) {
    return { error: friendlyError(error.message, "Erro ao atualizar vínculo.") };
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
