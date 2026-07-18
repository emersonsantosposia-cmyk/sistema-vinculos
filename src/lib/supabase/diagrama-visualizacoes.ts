"use client";

import {
  DIAGRAMA_ESTADO_VERSION,
  isDiagramaEstadoSalvo,
  type DiagramaEstadoSalvo,
  type DiagramaEstadoSalvoEdge,
  type DiagramaEstadoSalvoNode,
  type DiagramaVisualizacaoSalva,
} from "@/lib/diagrama-visualizacoes";
import { requireAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/supabase/errors";
import {
  buscarVinculosDaEntidade,
  getEntidadeResumo,
} from "@/lib/supabase/vinculos";
import type { EntidadeTipo } from "@/lib/types";
import type { VinculoDiagramItem } from "@/lib/vinculos-types";
import type { DiagramEdge, DiagramNode } from "@/components/vinculos-diagram/graph-refs";
import {
  carregarMaisId,
  isEntidadeNode,
} from "@/components/vinculos-diagram/graph-refs";
import type { EntidadeNodeData } from "@/components/vinculos-diagram/EntidadeVinculoNode";
import type { CarregarMaisNodeData } from "@/components/vinculos-diagram/CarregarMaisNode";
import type { Node } from "@xyflow/react";
import { formatTipoVinculoLabel } from "@/lib/vinculos-format";

function emptyToNull(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseVinculoIdFromEdge(edgeId: string): string | null {
  if (!edgeId.startsWith("vinculo__")) return null;
  return edgeId.slice("vinculo__".length) || null;
}

/** Monta o snapshot a partir do estado atual do canvas. */
export function serializeDiagramaEstado(input: {
  entidadeTipo: EntidadeTipo;
  entidadeId: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  pinnedNodeIds: string[];
}): DiagramaEstadoSalvo {
  const nodes: DiagramaEstadoSalvoNode[] = input.nodes
    .filter(isEntidadeNode)
    .map((node) => ({
      id: node.id,
      type: "entidade" as const,
      position: { x: node.position.x, y: node.position.y },
      data: {
        entidadeTipo: node.data.entidadeTipo,
        entidadeId: node.data.entidadeId,
        titulo: node.data.titulo,
        subtitulo: node.data.subtitulo ?? null,
        foto_perfil_path: node.data.foto_perfil_path ?? null,
        foto_url: node.data.foto_url ?? null,
        restrito: Boolean(node.data.restrito),
        expanded: Boolean(node.data.expanded),
        isRoot: Boolean(node.data.isRoot),
        refSources: [...(node.data.refSources ?? [])],
      },
    }));

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: DiagramaEstadoSalvoEdge[] = input.edges
    .filter(
      (e) =>
        e.id.startsWith("vinculo__") &&
        nodeIds.has(e.source) &&
        nodeIds.has(e.target),
    )
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: "straight" as const,
      label: typeof e.label === "string" ? e.label : null,
      data: {
        refSources: [...(e.data?.refSources ?? [])],
      },
    }));

  return {
    version: DIAGRAMA_ESTADO_VERSION,
    root: {
      entidadeTipo: input.entidadeTipo,
      entidadeId: input.entidadeId,
    },
    pinnedNodeIds: input.pinnedNodeIds.filter((id) => nodeIds.has(id)),
    nodes,
    edges,
  };
}

export async function saveDiagramaVisualizacao(input: {
  nome: string;
  entidadeTipo: EntidadeTipo;
  entidadeId: string;
  estado: DiagramaEstadoSalvo;
}): Promise<{ data: DiagramaVisualizacaoSalva | null; error: string | null }> {
  const auth = await requireAuthUser();
  if (!auth.user) return { data: null, error: auth.error };

  const nome = emptyToNull(input.nome);
  if (!nome) {
    return { data: null, error: "Informe um nome para a visualização." };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("diagrama_visualizacoes_salvas")
    .insert({
      nome,
      entidade_inicial_tipo: input.entidadeTipo,
      entidade_inicial_id: input.entidadeId,
      estado_json: input.estado,
      usuario_cadastro: auth.user.id,
    })
    .select("*")
    .single();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao salvar visualização."),
    };
  }

  return {
    data: {
      ...(data as DiagramaVisualizacaoSalva),
      estado_json: input.estado,
    },
    error: null,
  };
}

export async function listDiagramaVisualizacoes(filter?: {
  entidadeTipo?: EntidadeTipo;
  entidadeId?: string;
}): Promise<{
  data: DiagramaVisualizacaoSalva[];
  error: string | null;
}> {
  const supabase = createClient();
  let query = supabase
    .from("diagrama_visualizacoes_salvas")
    .select(
      "id, nome, entidade_inicial_tipo, entidade_inicial_id, estado_json, usuario_cadastro, data_cadastro",
    )
    .order("data_cadastro", { ascending: false });

  if (filter?.entidadeTipo) {
    query = query.eq("entidade_inicial_tipo", filter.entidadeTipo);
  }
  if (filter?.entidadeId) {
    query = query.eq("entidade_inicial_id", filter.entidadeId);
  }

  const { data, error } = await query;

  if (error) {
    return {
      data: [],
      error: friendlyError(error.message, "Erro ao listar visualizações."),
    };
  }

  const rows = (data ?? []) as DiagramaVisualizacaoSalva[];
  const userIds = rows
    .map((r) => r.usuario_cadastro)
    .filter((id): id is string => Boolean(id));

  const names: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: nameRows } = await supabase.rpc("get_user_display_names", {
      ids: [...new Set(userIds)],
    });
    if (Array.isArray(nameRows)) {
      for (const row of nameRows as { id: string; display_name: string }[]) {
        names[row.id] = row.display_name;
      }
    }
  }

  return {
    data: rows.map((r) => ({
      ...r,
      estado_json: isDiagramaEstadoSalvo(r.estado_json)
        ? r.estado_json
        : (r.estado_json as DiagramaEstadoSalvo),
      usuario_nome: r.usuario_cadastro
        ? (names[r.usuario_cadastro] ?? null)
        : null,
    })),
    error: null,
  };
}

export async function deleteDiagramaVisualizacao(
  id: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("diagrama_visualizacoes_salvas")
    .delete()
    .eq("id", id);

  if (error) {
    return {
      error: friendlyError(error.message, "Erro ao excluir visualização."),
    };
  }
  return { error: null };
}

export type DiagramaRestoreResult = {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  pinnedNodeIds: string[];
  rootTipo: EntidadeTipo;
  rootId: string;
  /** Preenche cache de vínculos por nó expandido. */
  vinculosCache: Map<string, VinculoDiagramItem[]>;
  loadedCounts: Map<string, number>;
};

/**
 * Reconstrói o diagrama a partir do snapshot, descartando nós/arestas
 * que não existem mais nos dados reais.
 */
export async function restoreDiagramaEstado(
  estado: DiagramaEstadoSalvo,
): Promise<{ data: DiagramaRestoreResult | null; error: string | null }> {
  if (!isDiagramaEstadoSalvo(estado)) {
    return { data: null, error: "Formato de visualização inválido." };
  }

  const supabase = createClient();

  // 1) Validar entidades (resumo ao vivo).
  const keptNodes: DiagramNode[] = [];
  for (const saved of estado.nodes) {
    if (saved.type !== "entidade") continue;
    const resumo = await getEntidadeResumo(
      saved.data.entidadeTipo,
      saved.data.entidadeId,
    );
    if (!resumo) continue;

    const node: Node<EntidadeNodeData, "entidade"> = {
      id: saved.id,
      type: "entidade",
      position: { x: saved.position.x, y: saved.position.y },
      data: {
        entidadeTipo: saved.data.entidadeTipo,
        entidadeId: saved.data.entidadeId,
        titulo: resumo.titulo,
        subtitulo: resumo.subtitulo ?? null,
        foto_perfil_path: resumo.foto_perfil_path ?? null,
        foto_url: resumo.foto_url ?? null,
        restrito: false,
        loading: false,
        expanded: Boolean(saved.data.expanded),
        isRoot: Boolean(saved.data.isRoot),
        refSources: [...(saved.data.refSources ?? [])],
      },
    };
    keptNodes.push(node);
  }

  const keptNodeIds = new Set(keptNodes.map((n) => n.id));

  // 2) Validar vínculos ainda existentes.
  const candidateEdgeIds = estado.edges
    .map((e) => parseVinculoIdFromEdge(e.id))
    .filter((id): id is string => Boolean(id));

  const existingVinculoIds = new Set<string>();
  if (candidateEdgeIds.length > 0) {
    const { data: vinculos, error } = await supabase
      .from("vinculos")
      .select("id")
      .in("id", candidateEdgeIds);

    if (error) {
      return {
        data: null,
        error: friendlyError(error.message, "Erro ao validar vínculos salvos."),
      };
    }
    for (const row of vinculos ?? []) {
      existingVinculoIds.add(row.id as string);
    }
  }

  const keptEdges: DiagramEdge[] = [];
  for (const saved of estado.edges) {
    const vinculoId = parseVinculoIdFromEdge(saved.id);
    if (!vinculoId || !existingVinculoIds.has(vinculoId)) continue;
    if (!keptNodeIds.has(saved.source) || !keptNodeIds.has(saved.target)) {
      continue;
    }

    const refSources = (saved.data.refSources ?? []).filter((id) =>
      keptNodeIds.has(id),
    );

    keptEdges.push({
      id: saved.id,
      source: saved.source,
      target: saved.target,
      type: "straight",
      label: saved.label ?? formatTipoVinculoLabel(null),
      data: { refSources },
      labelStyle: {
        fill: "var(--cor-texto-secundario)",
        fontSize: 10,
        fontWeight: 500,
      },
      labelBgStyle: {
        fill: "var(--cor-card-fundo)",
        fillOpacity: 0.92,
      },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 4,
      style: {
        stroke: "var(--cor-diagrama-edge)",
        strokeWidth: 1.5,
      },
    });
  }

  // Limpa refSources órfãos nos nós.
  for (const node of keptNodes) {
    if (!isEntidadeNode(node)) continue;
    node.data.refSources = node.data.refSources.filter((id) =>
      keptNodeIds.has(id),
    );
  }

  // 3) Cache + "carregar mais" para nós que estavam expandidos.
  const vinculosCache = new Map<string, VinculoDiagramItem[]>();
  const loadedCounts = new Map<string, number>();
  const moreNodes: DiagramNode[] = [];
  const moreEdges: DiagramEdge[] = [];

  for (const node of keptNodes) {
    if (!isEntidadeNode(node) || !node.data.expanded || node.data.restrito) {
      if (isEntidadeNode(node)) node.data.expanded = false;
      continue;
    }

    const { data: all, error } = await buscarVinculosDaEntidade(
      node.data.entidadeTipo,
      node.data.entidadeId,
    );
    if (error || !all) {
      node.data.expanded = false;
      continue;
    }

    vinculosCache.set(node.id, all);

    const connectedChildIds = new Set<string>();
    for (const edge of keptEdges) {
      if (edge.source === node.id) connectedChildIds.add(edge.target);
      if (edge.target === node.id) connectedChildIds.add(edge.source);
    }
    connectedChildIds.delete(node.id);

    const shownCount = connectedChildIds.size;
    loadedCounts.set(node.id, shownCount);
    const remaining = Math.max(0, all.length - shownCount);

    if (remaining > 0) {
      const moreId = carregarMaisId(node.id);
      const moreNode: Node<CarregarMaisNodeData, "carregarMais"> = {
        id: moreId,
        type: "carregarMais",
        position: {
          x: node.position.x + 40,
          y: node.position.y + 120,
        },
        data: {
          parentNodeId: node.id,
          remaining,
          loading: false,
          refSources: [node.id],
        },
      };
      moreNodes.push(moreNode);
      moreEdges.push({
        id: `edge-more__${node.id}`,
        source: node.id,
        target: moreId,
        type: "straight",
        data: { refSources: [node.id] },
        style: {
          stroke: "var(--cor-diagrama-edge-more)",
          strokeWidth: 1.25,
          strokeDasharray: "4 4",
        },
      });
    }
  }

  const rootNode = keptNodes.find(
    (n) =>
      isEntidadeNode(n) &&
      n.data.entidadeTipo === estado.root.entidadeTipo &&
      n.data.entidadeId === estado.root.entidadeId,
  );

  if (!rootNode || !isEntidadeNode(rootNode)) {
    return {
      data: null,
      error:
        "A entidade inicial desta visualização não está mais disponível ou acessível.",
    };
  }

  rootNode.data.isRoot = true;

  return {
    data: {
      nodes: [...keptNodes, ...moreNodes],
      edges: [...keptEdges, ...moreEdges],
      pinnedNodeIds: estado.pinnedNodeIds.filter((id) => keptNodeIds.has(id)),
      rootTipo: estado.root.entidadeTipo,
      rootId: estado.root.entidadeId,
      vinculosCache,
      loadedCounts,
    },
    error: null,
  };
}
