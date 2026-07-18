import type { Edge, Node } from "@xyflow/react";

const SCALE_MIN = 0.92;
const SCALE_MAX = 1.35;

/** Grau de conexão só entre nós `entidade` (ignora "carregar mais"). */
export function computeEntidadeDegrees(
  nodes: Node[],
  edges: Edge[],
): Map<string, number> {
  const entidadeIds = new Set(
    nodes.filter((n) => n.type === "entidade").map((n) => n.id),
  );
  const degree = new Map<string, number>();
  for (const id of entidadeIds) degree.set(id, 0);

  for (const edge of edges) {
    if (!entidadeIds.has(edge.source) || !entidadeIds.has(edge.target)) continue;
    if (edge.source === edge.target) continue;
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  return degree;
}

export function degreeToScale(degree: number, maxDegree: number): number {
  if (maxDegree <= 0) return 1;
  const t = Math.min(1, Math.max(0, degree / maxDegree));
  return SCALE_MIN + (SCALE_MAX - SCALE_MIN) * t;
}

/** Vizinhos diretos (1 hop) via arestas visíveis. */
export function getDirectNeighbors(
  nodeId: string,
  edges: Edge[],
): Set<string> {
  const neighbors = new Set<string>();
  for (const edge of edges) {
    if (edge.source === nodeId) neighbors.add(edge.target);
    else if (edge.target === nodeId) neighbors.add(edge.source);
  }
  return neighbors;
}

export type ShortestPathResult = {
  nodeIds: string[];
  edgeIds: string[];
};

/**
 * BFS no grafo já carregado no canvas (não consulta o banco).
 * Considera apenas nós do tipo entidade.
 */
export function findShortestPath(
  fromId: string,
  toId: string,
  nodes: Node[],
  edges: Edge[],
): ShortestPathResult | null {
  if (fromId === toId) {
    return { nodeIds: [fromId], edgeIds: [] };
  }

  const entidadeIds = new Set(
    nodes.filter((n) => n.type === "entidade").map((n) => n.id),
  );
  if (!entidadeIds.has(fromId) || !entidadeIds.has(toId)) return null;

  const adj = new Map<string, { other: string; edgeId: string }[]>();
  for (const id of entidadeIds) adj.set(id, []);

  for (const edge of edges) {
    if (!entidadeIds.has(edge.source) || !entidadeIds.has(edge.target)) continue;
    adj.get(edge.source)!.push({ other: edge.target, edgeId: edge.id });
    adj.get(edge.target)!.push({ other: edge.source, edgeId: edge.id });
  }

  const parent = new Map<string, { prev: string; edgeId: string } | null>();
  const queue: string[] = [fromId];
  parent.set(fromId, null);

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur === toId) break;
    for (const { other, edgeId } of adj.get(cur) ?? []) {
      if (parent.has(other)) continue;
      parent.set(other, { prev: cur, edgeId });
      queue.push(other);
    }
  }

  if (!parent.has(toId)) return null;

  const nodeIds: string[] = [];
  const edgeIds: string[] = [];
  let walk: string | undefined = toId;
  while (walk) {
    nodeIds.push(walk);
    const step = parent.get(walk);
    if (!step) break;
    edgeIds.push(step.edgeId);
    walk = step.prev;
  }
  nodeIds.reverse();
  edgeIds.reverse();
  return { nodeIds, edgeIds };
}
