/**
 * Coleta endereços relacionados a um caso ou documento (até 2 níveis),
 * com consultas em lote por tipo (padrão C3 — `.in()`, nunca 1 query/vínculo).
 */

"use client";

import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/supabase/errors";
import { formatEnderecoResumo } from "@/lib/format";
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

export type EnderecoMapaCaminho = {
  modo: "direto" | "via";
  /** Rótulo do vínculo raiz → endereço (direto) ou raiz → intermediário. */
  tipoVinculoRaiz: string | null;
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
): { paraTipo: EntidadeTipo; paraId: string; tipo: string | null; inverso: string | null } {
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
  raizTipo: EntidadeTipo,
  raizId: string,
): Promise<VinculoRow[]> {
  const supabase = createClient();
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
  tipo: EntidadeTipo,
  ids: string[],
): Promise<VinculoRow[]> {
  if (ids.length === 0) return [];
  const supabase = createClient();
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

type EnderecoRow = {
  id: string;
  nome: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  latitude: number | null;
  longitude: number | null;
};

async function fetchEnderecosBatch(
  ids: string[],
): Promise<Map<string, EnderecoRow>> {
  const result = new Map<string, EnderecoRow>();
  if (ids.length === 0) return result;
  const supabase = createClient();
  for (let i = 0; i < ids.length; i += PAGE) {
    const chunk = ids.slice(i, i + PAGE);
    const { data, error } = await supabase
      .from("enderecos")
      .select(
        "id, nome, logradouro, numero, bairro, cidade, estado, latitude, longitude",
      )
      .in("id", chunk);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      result.set(row.id, row as EnderecoRow);
    }
  }
  return result;
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
  return `${enderecoPart} — ${papel} ${inter.titulo}, vinculado(a) a este ${raizLabel.toLowerCase()} como “${ligacaoRaiz}”`;
}

export function descreverCaminhos(
  item: EnderecoMapaItem,
  raizLabel: string,
): string[] {
  return item.caminhos.map((c) => caminhoTexto(item, c, raizLabel));
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

export async function coletarEnderecosRelacionados(
  raizTipo: "caso" | "documento",
  raizId: string,
): Promise<{ data: ColetarEnderecosResult | null; error: string | null }> {
  const raizLabel = ENTIDADE_LABELS[raizTipo];

  try {
    const nivel1 = await fetchVinculosDaRaiz(raizTipo, raizId);

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
    };

    const diretos: PendDireto[] = [];
    const intermediariosByTipo = new Map<EntidadeTipo, Map<string, string | null>>();

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

    const vias: PendVia[] = [];

    await Promise.all(
      [...intermediariosByTipo.entries()].map(async ([tipo, idToTipoRaiz]) => {
        const ids = [...idToTipoRaiz.keys()];
        const rows = await fetchVinculosPorTipoIds(tipo, ids);
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

    const allEnderecoIds = [
      ...new Set([
        ...diretos.map((d) => d.enderecoId),
        ...vias.map((v) => v.enderecoId),
      ]),
    ];

    const interRefs = [
      ...new Set(vias.map((v) => `${v.intermediarioTipo}:${v.intermediarioId}`)),
    ].map((key) => {
      const [tipo, id] = key.split(":") as [EntidadeTipo, string];
      return { tipo, id };
    });

    const [enderecosMap, resumosInter] = await Promise.all([
      fetchEnderecosBatch(allEnderecoIds),
      getEntidadesResumoBatch(interRefs),
    ]);

    const byId = new Map<string, EnderecoMapaItem>();

    function ensureItem(enderecoId: string): EnderecoMapaItem | null {
      const existing = byId.get(enderecoId);
      if (existing) return existing;
      const row = enderecosMap.get(enderecoId);
      if (!row) return null;
      const resumo = formatEnderecoResumo(row);
      const titulo =
        row.nome?.trim() ||
        resumo.split(" — ")[0] ||
        "Endereço sem identificação";
      const item: EnderecoMapaItem = {
        enderecoId,
        titulo,
        resumo,
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

    for (const d of diretos) {
      const item = ensureItem(d.enderecoId);
      if (!item) continue;
      item.caminhos.push({
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
      item.caminhos.push({
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
      });
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
    const message = err instanceof Error ? err.message : "Erro ao coletar endereços.";
    return {
      data: null,
      error: friendlyError(message, "Erro ao coletar endereços relacionados."),
    };
  }
}
