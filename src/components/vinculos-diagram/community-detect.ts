import Graph from "graphology";
import louvain from "graphology-communities-louvain";

/** Mínimo de nós de entidade para tentar agrupamento. */
export const COMMUNITY_MIN_ENTIDADE_NODES = 6;

/**
 * Paleta de comunidades — cores sólidas distintas das CSS vars de tipo
 * de entidade (usadas no avatar). Servem só para o anel externo do card.
 */
export const COMMUNITY_COLOR_PALETTE = [
  "#2563eb", // blue
  "#dc2626", // red
  "#16a34a", // green
  "#9333ea", // purple
  "#ea580c", // orange
  "#0d9488", // teal
  "#db2777", // pink
  "#65a30d", // lime
  "#0891b2", // cyan
  "#b45309", // amber
] as const;

export type CommunityDetectFailure = {
  ok: false;
  reason: "too_few" | "single";
};

export type CommunityDetectSuccess = {
  ok: true;
  /** id do nó → índice de comunidade (0..n-1, densidades maiores primeiro). */
  communityByNodeId: Map<string, number>;
  communityCount: number;
};

export type CommunityDetectResult =
  | CommunityDetectFailure
  | CommunityDetectSuccess;

/**
 * Louvain sobre o grafo visível (nós + arestas já na tela).
 * Isolados recebem comunidade própria; se no fim houver só 1 comunidade
 * efetiva com ≥2 nós e o resto isolados, ainda contamos como múltiplas
 * se houver mais de um grupo com tamanho ≥1... Na prática Louvain dá
 * uma comunidade por componente / cluster.
 */
export function detectCommunitiesLouvain(
  nodeIds: string[],
  edges: Array<{ source: string; target: string }>,
): CommunityDetectResult {
  if (nodeIds.length < COMMUNITY_MIN_ENTIDADE_NODES) {
    return { ok: false, reason: "too_few" };
  }

  const graph = new Graph({ type: "undirected", multi: false });
  for (const id of nodeIds) {
    if (!graph.hasNode(id)) graph.addNode(id);
  }

  const idSet = new Set(nodeIds);
  for (const e of edges) {
    if (!idSet.has(e.source) || !idSet.has(e.target)) continue;
    if (e.source === e.target) continue;
    if (graph.hasEdge(e.source, e.target)) continue;
    graph.addEdge(e.source, e.target);
  }

  // Sem arestas: cada nó seria uma "comunidade" — sem agrupamento útil.
  if (graph.size === 0) {
    return { ok: false, reason: "single" };
  }

  const raw = louvain(graph, {
    getEdgeWeight: null,
    randomWalk: false,
  }) as Record<string, number>;

  // Renumerar por tamanho (maiores primeiro) para âncoras estáveis.
  const sizes = new Map<number, number>();
  for (const id of nodeIds) {
    const c = raw[id] ?? 0;
    sizes.set(c, (sizes.get(c) ?? 0) + 1);
  }

  const ordered = [...sizes.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([old]) => old);

  if (ordered.length < 2) {
    return { ok: false, reason: "single" };
  }

  const remap = new Map(ordered.map((old, i) => [old, i]));
  const communityByNodeId = new Map<string, number>();
  for (const id of nodeIds) {
    const old = raw[id] ?? ordered[0]!;
    communityByNodeId.set(id, remap.get(old) ?? 0);
  }

  return {
    ok: true,
    communityByNodeId,
    communityCount: ordered.length,
  };
}

export function communityColorForIndex(index: number): string {
  return COMMUNITY_COLOR_PALETTE[index % COMMUNITY_COLOR_PALETTE.length]!;
}

/**
 * Âncoras em círculo: cada comunidade puxada para um ponto distinto.
 * Raio cresce com o número de grupos para manter separação visual.
 */
export function communityAnchorPositions(
  communityCount: number,
): Map<number, { x: number; y: number }> {
  const anchors = new Map<number, { x: number; y: number }>();
  if (communityCount <= 0) return anchors;
  if (communityCount === 1) {
    anchors.set(0, { x: 0, y: 0 });
    return anchors;
  }

  const radius = 320 + Math.max(0, communityCount - 2) * 70;
  for (let i = 0; i < communityCount; i++) {
    const angle = (2 * Math.PI * i) / communityCount - Math.PI / 2;
    anchors.set(i, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  }
  return anchors;
}

export function nodeAnchorsFromCommunities(
  communityByNodeId: Map<string, number>,
  communityCount: number,
): Map<string, { x: number; y: number }> {
  const communityAnchors = communityAnchorPositions(communityCount);
  const nodeAnchors = new Map<string, { x: number; y: number }>();
  for (const [nodeId, c] of communityByNodeId) {
    const a = communityAnchors.get(c) ?? { x: 0, y: 0 };
    nodeAnchors.set(nodeId, a);
  }
  return nodeAnchors;
}
