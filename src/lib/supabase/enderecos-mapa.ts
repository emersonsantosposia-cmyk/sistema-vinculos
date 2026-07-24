/**
 * Coleta endereços relacionados a um caso ou documento.
 *
 * - Caso e documento: direto + 1 intermediário (2 saltos), em lote (padrão C3).
 * - Somente caso: também órbita dos documentos vinculados
 *   (doc → endereço e doc → entidade → endereço), após filtrar documentos
 *   pela RLS de `documentos` (documentos restritos são ignorados em silêncio).
 */

"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/supabase/errors";
import { formatEnderecoResumo, formatEnderecoTitulo } from "@/lib/format";
import { formatTipoVinculoLabel } from "@/lib/vinculos-format";
import {
  ENTIDADE_HREFS,
  ENTIDADE_LABELS,
  type VinculoRow,
} from "@/lib/vinculos-types";
import type { EntidadeTipo } from "@/lib/types";
import { getEntidadesResumoBatch } from "@/lib/supabase/vinculos";

const PAGE = 1000;

/** Tipos intermediários (não-endereço) no 1º nível a partir do caso/documento. */
const INTERMEDIARIOS: EntidadeTipo[] = [
  "pessoa",
  "empresa",
  "veiculo",
  "comunicacao",
  "orcrim",
  "documento",
  "caso",
];

/** Entidades cuja órbita de endereço entra no mapa do caso via documento. */
const ENTIDADES_ORBITA_DOC: EntidadeTipo[] = [
  "pessoa",
  "empresa",
  "veiculo",
  "comunicacao",
  "orcrim",
];

export type EnderecoMapaCaminho = {
  modo: "direto" | "via";
  /** Rótulo do vínculo raiz → endereço (direto) ou raiz → intermediário/documento. */
  tipoVinculoRaiz: string | null;
  /**
   * Presente quando o caminho é caso → documento → entidade → endereço.
   * (caso → documento → endereço usa só `intermediario` = documento.)
   */
  viaDocumento?: {
    id: string;
    titulo: string;
    href: string;
    /** Vínculo documento → entidade intermediária. */
    tipoVinculoDocEntidade: string | null;
  };
  intermediario?: {
    tipo: EntidadeTipo;
    id: string;
    titulo: string;
    href: string;
    /** Perspectiva intermediário → endereço (ex.: "Reside em"). */
    tipoParaEndereco: string | null;
    /** Inverso (papel do endereço, ex.: "Residência de"). */
    tipoDoEndereco: string | null;
  };
};

export type EnderecoMapaItem = {
  enderecoId: string;
  titulo: string;
  resumo: string;
  /** Tipo do endereço (secundário no popup). */
  tipo: string | null;
  href: string;
  latitude: number | null;
  longitude: number | null;
  caminhos: EnderecoMapaCaminho[];
};

export type ColetarEnderecosResult = {
  comCoords: EnderecoMapaItem[];
  semCoords: EnderecoMapaItem[];
  raizLabel: string;
};

function resolveTipos(row: VinculoRow): {
  aParaB: string | null;
  bParaA: string | null;
} {
  const legado = row.tipo_vinculo?.trim() || null;
  return {
    aParaB: row.tipo_a_para_b?.trim() || legado,
    bParaA: row.tipo_b_para_a?.trim() || legado,
  };
}

function perspectivaDe(
  row: VinculoRow,
  deTipo: EntidadeTipo,
  deId: string,
): {
  paraTipo: EntidadeTipo;
  paraId: string;
  tipo: string | null;
  inverso: string | null;
} {
  const { aParaB, bParaA } = resolveTipos(row);
  if (row.entidade_origem_tipo === deTipo && row.entidade_origem_id === deId) {
    return {
      paraTipo: row.entidade_destino_tipo,
      paraId: row.entidade_destino_id,
      tipo: aParaB,
      inverso: bParaA,
    };
  }
  return {
    paraTipo: row.entidade_origem_tipo,
    paraId: row.entidade_origem_id,
    tipo: bParaA,
    inverso: aParaB,
  };
}

async function fetchVinculosDaRaiz(
  supabase: SupabaseClient,
  raizTipo: EntidadeTipo,
  raizId: string,
): Promise<VinculoRow[]> {
  const [asOrigem, asDestino] = await Promise.all([
    supabase
      .from("vinculos")
      .select("*")
      .eq("entidade_origem_tipo", raizTipo)
      .eq("entidade_origem_id", raizId),
    supabase
      .from("vinculos")
      .select("*")
      .eq("entidade_destino_tipo", raizTipo)
      .eq("entidade_destino_id", raizId),
  ]);
  if (asOrigem.error) throw new Error(asOrigem.error.message);
  if (asDestino.error) throw new Error(asDestino.error.message);
  const map = new Map<string, VinculoRow>();
  for (const row of [...(asOrigem.data ?? []), ...(asDestino.data ?? [])]) {
    map.set(row.id, row as VinculoRow);
  }
  return [...map.values()];
}

/** Vínculos em lote: entidade do `tipo` com id em `ids` (origem ou destino). */
async function fetchVinculosPorTipoIds(
  supabase: SupabaseClient,
  tipo: EntidadeTipo,
  ids: string[],
): Promise<VinculoRow[]> {
  if (ids.length === 0) return [];
  const map = new Map<string, VinculoRow>();

  for (let i = 0; i < ids.length; i += PAGE) {
    const chunk = ids.slice(i, i + PAGE);
    const [asOrigem, asDestino] = await Promise.all([
      supabase
        .from("vinculos")
        .select("*")
        .eq("entidade_origem_tipo", tipo)
        .in("entidade_origem_id", chunk),
      supabase
        .from("vinculos")
        .select("*")
        .eq("entidade_destino_tipo", tipo)
        .in("entidade_destino_id", chunk),
    ]);
    if (asOrigem.error) throw new Error(asOrigem.error.message);
    if (asDestino.error) throw new Error(asDestino.error.message);
    for (const row of [...(asOrigem.data ?? []), ...(asDestino.data ?? [])]) {
      map.set(row.id, row as VinculoRow);
    }
  }
  return [...map.values()];
}

/**
 * Intersecta ids de documento com SELECT em `documentos` (RLS por unidade).
 * Documentos inacessíveis somem silenciosamente — sem contagem nem marcador.
 */
async function filtrarDocumentosAcessiveis(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Set<string>> {
  const acessiveis = new Set<string>();
  if (ids.length === 0) return acessiveis;
  for (let i = 0; i < ids.length; i += PAGE) {
    const chunk = ids.slice(i, i + PAGE);
    const { data, error } = await supabase
      .from("documentos")
      .select("id")
      .in("id", chunk);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) acessiveis.add(row.id as string);
  }
  return acessiveis;
}

type EnderecoRow = {
  id: string;
  tipo: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  latitude: number | null;
  longitude: number | null;
};

async function fetchEnderecosBatch(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, EnderecoRow>> {
  const result = new Map<string, EnderecoRow>();
  if (ids.length === 0) return result;
  for (let i = 0; i < ids.length; i += PAGE) {
    const chunk = ids.slice(i, i + PAGE);
    const { data, error } = await supabase
      .from("enderecos")
      .select(
        "id, tipo, logradouro, numero, bairro, cidade, estado, latitude, longitude",
      )
      .in("id", chunk);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      result.set(row.id, row as EnderecoRow);
    }
  }
  return result;
}

function caminhoKey(c: EnderecoMapaCaminho): string {
  if (c.modo === "direto") {
    return `direto:${c.tipoVinculoRaiz ?? ""}`;
  }
  const doc = c.viaDocumento
    ? `${c.viaDocumento.id}:${c.viaDocumento.tipoVinculoDocEntidade ?? ""}`
    : "";
  const inter = c.intermediario
    ? `${c.intermediario.tipo}:${c.intermediario.id}:${c.intermediario.tipoParaEndereco ?? ""}:${c.intermediario.tipoDoEndereco ?? ""}`
    : "";
  return `via:${c.tipoVinculoRaiz ?? ""}:${doc}:${inter}`;
}

function caminhoTexto(
  item: EnderecoMapaItem,
  caminho: EnderecoMapaCaminho,
  raizLabel: string,
): string {
  const enderecoPart =
    item.resumo !== "—" ? item.resumo : item.titulo;

  if (caminho.modo === "direto") {
    const tipo = formatTipoVinculoLabel(caminho.tipoVinculoRaiz);
    return `${enderecoPart} — vinculado diretamente a este ${raizLabel.toLowerCase()} como “${tipo}”`;
  }

  const inter = caminho.intermediario!;
  const papel =
    formatTipoVinculoLabel(
      inter.tipoDoEndereco || inter.tipoParaEndereco,
    ) || ENTIDADE_LABELS[inter.tipo];
  const ligacaoRaiz = formatTipoVinculoLabel(caminho.tipoVinculoRaiz);

  if (caminho.viaDocumento) {
    const doc = caminho.viaDocumento;
    const ligacaoDoc = formatTipoVinculoLabel(doc.tipoVinculoDocEntidade);
    return `${enderecoPart} — ${papel} ${inter.titulo}, via documento “${doc.titulo}” como “${ligacaoDoc}”, vinculado(a) a este ${raizLabel.toLowerCase()} como “${ligacaoRaiz}”`;
  }

  return `${enderecoPart} — ${papel} ${inter.titulo}, vinculado(a) a este ${raizLabel.toLowerCase()} como “${ligacaoRaiz}”`;
}

export function descreverCaminhos(
  item: EnderecoMapaItem,
  raizLabel: string,
): string[] {
  return item.caminhos.map((c) => caminhoTexto(item, c, raizLabel));
}

/** Links únicos do popup (intermediários + documentos do caminho). */
export function linksDoCaminho(item: EnderecoMapaItem): Array<{
  href: string;
  label: string;
  key: string;
}> {
  const seen = new Set<string>();
  const out: Array<{ href: string; label: string; key: string }> = [];
  for (const c of item.caminhos) {
    if (c.viaDocumento) {
      const key = `documento:${c.viaDocumento.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({
          key,
          href: c.viaDocumento.href,
          label: c.viaDocumento.titulo,
        });
      }
    }
    if (c.intermediario) {
      const key = `${c.intermediario.tipo}:${c.intermediario.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({
          key,
          href: c.intermediario.href,
          label: c.intermediario.titulo,
        });
      }
    }
  }
  return out;
}

/**
 * Critério visual dos marcadores: tipo da entidade intermediária
 * (mais legível e estável que o texto livre do tipo de vínculo).
 * Direto ao caso/documento usa chave "direto".
 */
export type MarcadorCategoria =
  | "direto"
  | "pessoa"
  | "empresa"
  | "veiculo"
  | "comunicacao"
  | "orcrim"
  | "outro";

export function categoriaMarcador(item: EnderecoMapaItem): MarcadorCategoria {
  if (item.caminhos.some((c) => c.modo === "direto")) return "direto";
  const tipos = new Set(
    item.caminhos
      .map((c) => c.intermediario?.tipo)
      .filter((t): t is EntidadeTipo => Boolean(t)),
  );
  if (tipos.has("pessoa")) return "pessoa";
  if (tipos.has("empresa")) return "empresa";
  if (tipos.has("veiculo")) return "veiculo";
  if (tipos.has("orcrim")) return "orcrim";
  if (tipos.has("comunicacao")) return "comunicacao";
  return "outro";
}

/** Cores dos marcadores (critério = entidade intermediária / direto). */
export const MARCADOR_CORES: Record<MarcadorCategoria, string> = {
  direto: "#c9a227",
  pessoa: "#3b82f6",
  empresa: "#8b5cf6",
  veiculo: "#f97316",
  comunicacao: "#64748b",
  orcrim: "#dc2626",
  outro: "#0d9488",
};

export const MARCADOR_LEGENDA: Record<MarcadorCategoria, string> = {
  direto: "Vinculado diretamente",
  pessoa: "Via pessoa",
  empresa: "Via empresa",
  veiculo: "Via veículo",
  comunicacao: "Via comunicação",
  orcrim: "Via orcrim",
  outro: "Via outra entidade",
};

type PendDireto = {
  enderecoId: string;
  tipoVinculoRaiz: string | null;
};

type PendVia = {
  enderecoId: string;
  tipoVinculoRaiz: string | null;
  intermediarioTipo: EntidadeTipo;
  intermediarioId: string;
  tipoParaEndereco: string | null;
  tipoDoEndereco: string | null;
  viaDocumentoId?: string;
  tipoVinculoDocEntidade?: string | null;
};

export async function coletarEnderecosRelacionados(
  raizTipo: "caso" | "documento",
  raizId: string,
  client?: SupabaseClient,
): Promise<{ data: ColetarEnderecosResult | null; error: string | null }> {
  const raizLabel = ENTIDADE_LABELS[raizTipo];
  const supabase = client ?? createClient();

  try {
    const nivel1 = await fetchVinculosDaRaiz(supabase, raizTipo, raizId);

    const diretos: PendDireto[] = [];
    const intermediariosByTipo = new Map<
      EntidadeTipo,
      Map<string, string | null>
    >();

    for (const row of nivel1) {
      const p = perspectivaDe(row, raizTipo, raizId);
      if (p.paraTipo === "endereco") {
        diretos.push({ enderecoId: p.paraId, tipoVinculoRaiz: p.tipo });
        continue;
      }
      if (!INTERMEDIARIOS.includes(p.paraTipo)) continue;
      let map = intermediariosByTipo.get(p.paraTipo);
      if (!map) {
        map = new Map();
        intermediariosByTipo.set(p.paraTipo, map);
      }
      // guarda tipo do vínculo raiz→intermediário
      if (!map.has(p.paraId)) map.set(p.paraId, p.tipo);
    }

    // Salvaguarda: só expande documentos que passam na RLS de `documentos`.
    const docsCandidatos = intermediariosByTipo.get("documento");
    if (docsCandidatos && docsCandidatos.size > 0) {
      const acessiveis = await filtrarDocumentosAcessiveis(supabase, [
        ...docsCandidatos.keys(),
      ]);
      const filtrado = new Map<string, string | null>();
      for (const [id, tipoRaiz] of docsCandidatos) {
        if (acessiveis.has(id)) filtrado.set(id, tipoRaiz);
      }
      if (filtrado.size === 0) intermediariosByTipo.delete("documento");
      else intermediariosByTipo.set("documento", filtrado);
    }

    const vias: PendVia[] = [];

    await Promise.all(
      [...intermediariosByTipo.entries()].map(async ([tipo, idToTipoRaiz]) => {
        const ids = [...idToTipoRaiz.keys()];
        const rows = await fetchVinculosPorTipoIds(supabase, tipo, ids);
        for (const row of rows) {
          let interId: string | null = null;
          if (
            row.entidade_origem_tipo === tipo &&
            idToTipoRaiz.has(row.entidade_origem_id)
          ) {
            interId = row.entidade_origem_id;
          } else if (
            row.entidade_destino_tipo === tipo &&
            idToTipoRaiz.has(row.entidade_destino_id)
          ) {
            interId = row.entidade_destino_id;
          }
          if (!interId) continue;

          const p = perspectivaDe(row, tipo, interId);
          if (p.paraTipo !== "endereco") continue;

          vias.push({
            enderecoId: p.paraId,
            tipoVinculoRaiz: idToTipoRaiz.get(interId) ?? null,
            intermediarioTipo: tipo,
            intermediarioId: interId,
            tipoParaEndereco: p.tipo,
            tipoDoEndereco: p.inverso,
          });
        }
      }),
    );

    // Caso: órbita das entidades dos documentos acessíveis (3º salto, em lote).
    if (raizTipo === "caso") {
      const docsAcessiveis = intermediariosByTipo.get("documento");
      if (docsAcessiveis && docsAcessiveis.size > 0) {
        const docIds = [...docsAcessiveis.keys()];
        const docRows = await fetchVinculosPorTipoIds(
          supabase,
          "documento",
          docIds,
        );

        /** entidadeTipo → id → lista de (doc, tipos de vínculo) */
        const entidadesByTipo = new Map<
          EntidadeTipo,
          Map<
            string,
            Array<{
              documentoId: string;
              tipoVinculoRaiz: string | null;
              tipoVinculoDocEntidade: string | null;
            }>
          >
        >();

        for (const row of docRows) {
          let docId: string | null = null;
          if (
            row.entidade_origem_tipo === "documento" &&
            docsAcessiveis.has(row.entidade_origem_id)
          ) {
            docId = row.entidade_origem_id;
          } else if (
            row.entidade_destino_tipo === "documento" &&
            docsAcessiveis.has(row.entidade_destino_id)
          ) {
            docId = row.entidade_destino_id;
          }
          if (!docId) continue;

          const p = perspectivaDe(row, "documento", docId);
          if (!ENTIDADES_ORBITA_DOC.includes(p.paraTipo)) continue;

          let byId = entidadesByTipo.get(p.paraTipo);
          if (!byId) {
            byId = new Map();
            entidadesByTipo.set(p.paraTipo, byId);
          }
          let refs = byId.get(p.paraId);
          if (!refs) {
            refs = [];
            byId.set(p.paraId, refs);
          }
          refs.push({
            documentoId: docId,
            tipoVinculoRaiz: docsAcessiveis.get(docId) ?? null,
            tipoVinculoDocEntidade: p.tipo,
          });
        }

        await Promise.all(
          [...entidadesByTipo.entries()].map(async ([tipo, idToDocs]) => {
            const ids = [...idToDocs.keys()];
            const rows = await fetchVinculosPorTipoIds(supabase, tipo, ids);
            for (const row of rows) {
              let entId: string | null = null;
              if (
                row.entidade_origem_tipo === tipo &&
                idToDocs.has(row.entidade_origem_id)
              ) {
                entId = row.entidade_origem_id;
              } else if (
                row.entidade_destino_tipo === tipo &&
                idToDocs.has(row.entidade_destino_id)
              ) {
                entId = row.entidade_destino_id;
              }
              if (!entId) continue;

              const p = perspectivaDe(row, tipo, entId);
              if (p.paraTipo !== "endereco") continue;

              const docsRefs = idToDocs.get(entId) ?? [];
              for (const ref of docsRefs) {
                vias.push({
                  enderecoId: p.paraId,
                  tipoVinculoRaiz: ref.tipoVinculoRaiz,
                  intermediarioTipo: tipo,
                  intermediarioId: entId,
                  tipoParaEndereco: p.tipo,
                  tipoDoEndereco: p.inverso,
                  viaDocumentoId: ref.documentoId,
                  tipoVinculoDocEntidade: ref.tipoVinculoDocEntidade,
                });
              }
            }
          }),
        );
      }
    }

    const allEnderecoIds = [
      ...new Set([
        ...diretos.map((d) => d.enderecoId),
        ...vias.map((v) => v.enderecoId),
      ]),
    ];

    const interRefs = [
      ...new Set([
        ...vias.map((v) => `${v.intermediarioTipo}:${v.intermediarioId}`),
        ...vias
          .filter((v) => v.viaDocumentoId)
          .map((v) => `documento:${v.viaDocumentoId}`),
      ]),
    ].map((key) => {
      const [tipo, id] = key.split(":") as [EntidadeTipo, string];
      return { tipo, id };
    });

    const [enderecosMap, resumosInter] = await Promise.all([
      fetchEnderecosBatch(supabase, allEnderecoIds),
      getEntidadesResumoBatch(interRefs, supabase),
    ]);

    const byId = new Map<string, EnderecoMapaItem>();

    function ensureItem(enderecoId: string): EnderecoMapaItem | null {
      const existing = byId.get(enderecoId);
      if (existing) return existing;
      const row = enderecosMap.get(enderecoId);
      if (!row) return null;
      const resumo = formatEnderecoResumo(row);
      const titulo = formatEnderecoTitulo(row);
      const item: EnderecoMapaItem = {
        enderecoId,
        titulo,
        resumo,
        tipo: row.tipo?.trim() || null,
        href: `${ENTIDADE_HREFS.endereco}/${enderecoId}`,
        latitude:
          row.latitude != null && Number.isFinite(Number(row.latitude))
            ? Number(row.latitude)
            : null,
        longitude:
          row.longitude != null && Number.isFinite(Number(row.longitude))
            ? Number(row.longitude)
            : null,
        caminhos: [],
      };
      byId.set(enderecoId, item);
      return item;
    }

    function pushCaminho(item: EnderecoMapaItem, caminho: EnderecoMapaCaminho) {
      const key = caminhoKey(caminho);
      if (item.caminhos.some((c) => caminhoKey(c) === key)) return;
      item.caminhos.push(caminho);
    }

    for (const d of diretos) {
      const item = ensureItem(d.enderecoId);
      if (!item) continue;
      pushCaminho(item, {
        modo: "direto",
        tipoVinculoRaiz: d.tipoVinculoRaiz,
      });
    }

    for (const v of vias) {
      const item = ensureItem(v.enderecoId);
      if (!item) continue;
      const resumo = resumosInter.get(
        `${v.intermediarioTipo}:${v.intermediarioId}`,
      );
      const caminho: EnderecoMapaCaminho = {
        modo: "via",
        tipoVinculoRaiz: v.tipoVinculoRaiz,
        intermediario: {
          tipo: v.intermediarioTipo,
          id: v.intermediarioId,
          titulo: resumo?.titulo ?? ENTIDADE_LABELS[v.intermediarioTipo],
          href: `${ENTIDADE_HREFS[v.intermediarioTipo]}/${v.intermediarioId}`,
          tipoParaEndereco: v.tipoParaEndereco,
          tipoDoEndereco: v.tipoDoEndereco,
        },
      };
      if (v.viaDocumentoId) {
        const docResumo = resumosInter.get(`documento:${v.viaDocumentoId}`);
        caminho.viaDocumento = {
          id: v.viaDocumentoId,
          titulo: docResumo?.titulo ?? ENTIDADE_LABELS.documento,
          href: `${ENTIDADE_HREFS.documento}/${v.viaDocumentoId}`,
          tipoVinculoDocEntidade: v.tipoVinculoDocEntidade ?? null,
        };
      }
      pushCaminho(item, caminho);
    }

    const all = [...byId.values()];
    const comCoords = all.filter(
      (e) => e.latitude != null && e.longitude != null,
    );
    const semCoords = all.filter(
      (e) => e.latitude == null || e.longitude == null,
    );

    return {
      data: { comCoords, semCoords, raizLabel },
      error: null,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao coletar endereços.";
    return {
      data: null,
      error: friendlyError(message, "Erro ao coletar endereços relacionados."),
    };
  }
}
