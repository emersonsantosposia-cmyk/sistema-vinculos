import type { Edge, Node } from "@xyflow/react";

const NODE_WIDTH = 196;
const NODE_HEIGHT = 78;
const MORE_WIDTH = 188;
const MORE_HEIGHT = 52;

/** Distância mínima hub → 1º anel. */
const BASE_RING = 260;
/** Folga mínima entre pai e filho no raio. */
const PARENT_GAP = 240;
/** Margem entre caixas (anti-sobreposição). */
const BOX_GAP = 36;
/** Incremento de raio ao buscar posição livre. */
const RADIUS_STEP = 28;
/** Passes de empurrão entre caixas sobrepostas. */
const SPREAD_ITERS = 48;
/** Espaço extra do botão "carregar mais". */
const MORE_OUTSET = 150;

type Box = { id: string; x: number; y: number; w: number; h: number };

function nodeSize(node: Node): { w: number; h: number } {
  const isMore = node.type === "carregarMais";
  return {
    w: isMore ? MORE_WIDTH : NODE_WIDTH,
    h: isMore ? MORE_HEIGHT : NODE_HEIGHT,
  };
}

function isCarregarMais(node: Node): boolean {
  return node.type === "carregarMais";
}

/** Jitter determinístico em [-1, 1] a partir do id (quebra uniformidade). */
function idJitter(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 2000) / 1000 - 1;
}

function boxesOverlap(a: Box, b: Box, gap = BOX_GAP): boolean {
  return !(
    a.x + a.w + gap <= b.x ||
    b.x + b.w + gap <= a.x ||
    a.y + a.h + gap <= b.y ||
    b.y + b.h + gap <= a.y
  );
}

function pickHubId(
  nodes: Node[],
  edges: Edge[],
  preferredHubId?: string,
): string | null {
  const entidadeIds = new Set(
    nodes.filter((n) => n.type === "entidade").map((n) => n.id),
  );
  if (entidadeIds.size === 0) return null;

  const degree = new Map<string, number>();
  for (const id of entidadeIds) degree.set(id, 0);

  for (const edge of edges) {
    if (entidadeIds.has(edge.source)) {
      degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    }
    if (entidadeIds.has(edge.target)) {
      degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
    }
  }

  let bestId: string | null = null;
  let bestDegree = -1;

  for (const id of entidadeIds) {
    const d = degree.get(id) ?? 0;
    if (d > bestDegree) {
      bestDegree = d;
      bestId = id;
    } else if (d === bestDegree && preferredHubId && id === preferredHubId) {
      bestId = id;
    }
  }

  return bestId ?? preferredHubId ?? [...entidadeIds][0] ?? null;
}

function buildAdjacency(
  nodeIds: Set<string>,
  edges: Edge[],
): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const id of nodeIds) adj.set(id, []);

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    adj.get(edge.source)!.push(edge.target);
    adj.get(edge.target)!.push(edge.source);
  }
  return adj;
}

function spanningTree(
  hubId: string,
  nodeIds: Set<string>,
  adj: Map<string, string[]>,
): { parent: Map<string, string | null>; level: Map<string, number> } {
  const parent = new Map<string, string | null>();
  const level = new Map<string, number>();
  const queue: string[] = [hubId];
  parent.set(hubId, null);
  level.set(hubId, 0);

  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const next of adj.get(cur) ?? []) {
      if (parent.has(next)) continue;
      parent.set(next, cur);
      level.set(next, (level.get(cur) ?? 0) + 1);
      queue.push(next);
    }
  }

  for (const id of nodeIds) {
    if (!parent.has(id)) {
      parent.set(id, hubId);
      level.set(id, 1);
    }
  }

  return { parent, level };
}

function childrenOf(
  id: string,
  parent: Map<string, string | null>,
): string[] {
  const kids: string[] = [];
  for (const [child, p] of parent) {
    if (p === id) kids.push(child);
  }
  kids.sort();
  return kids;
}

/**
 * Setores por filhos, com jitter no ângulo (não uniforme).
 * Filhos com muitos netos ganham fatia um pouco maior.
 */
function assignAngles(
  hubId: string,
  parent: Map<string, string | null>,
): Map<string, number> {
  const angles = new Map<string, number>();
  angles.set(hubId, -Math.PI / 2);

  function subtreeWeight(id: string): number {
    const kids = childrenOf(id, parent);
    if (kids.length === 0) return 1;
    return kids.reduce((sum, k) => sum + subtreeWeight(k), 0);
  }

  function walk(id: string, start: number, end: number) {
    const kids = childrenOf(id, parent);
    if (kids.length === 0) return;

    const weights = kids.map((k) => subtreeWeight(k));
    const total = weights.reduce((a, b) => a + b, 0);
    let cursor = start;

    kids.forEach((child, i) => {
      const span = ((end - start) * weights[i]!) / total;
      const a0 = cursor;
      const a1 = cursor + span;
      const mid = (a0 + a1) / 2;
      // Desloca dentro do setor (±35% da fatia) — evita “relógio” uniforme.
      const jitter = idJitter(child) * span * 0.35;
      angles.set(child, mid + jitter);
      walk(child, a0, a1);
      cursor = a1;
    });
  }

  walk(hubId, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2);
  return angles;
}

/** Empurra caixas sobrepostas para longe (hub fixo). */
function resolveOverlaps(boxes: Box[], hubId: string): void {
  const byId = new Map(boxes.map((b) => [b.id, b]));

  for (let iter = 0; iter < SPREAD_ITERS; iter++) {
    let moved = false;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        if (!boxesOverlap(a, b)) continue;

        const acx = a.x + a.w / 2;
        const acy = a.y + a.h / 2;
        const bcx = b.x + b.w / 2;
        const bcy = b.y + b.h / 2;
        let dx = bcx - acx;
        let dy = bcy - acy;
        let dist = Math.hypot(dx, dy);
        if (dist < 1e-3) {
          const jitter = idJitter(a.id + b.id);
          dx = Math.cos(jitter * Math.PI);
          dy = Math.sin(jitter * Math.PI);
          dist = 1;
        }

        const overlapX = a.w / 2 + b.w / 2 + BOX_GAP - Math.abs(dx);
        const overlapY = a.h / 2 + b.h / 2 + BOX_GAP - Math.abs(dy);
        const push = Math.max(overlapX, overlapY, 12) * 0.55;
        const ux = dx / dist;
        const uy = dy / dist;

        const aIsHub = a.id === hubId;
        const bIsHub = b.id === hubId;

        if (!aIsHub && !bIsHub) {
          a.x -= ux * push;
          a.y -= uy * push;
          b.x += ux * push;
          b.y += uy * push;
        } else if (aIsHub) {
          b.x += ux * push * 2;
          b.y += uy * push * 2;
        } else {
          a.x -= ux * push * 2;
          a.y -= uy * push * 2;
        }
        moved = true;
      }
    }
    if (!moved) break;
  }

  // Recentra o hub em (0,0) após empurrões.
  const hub = byId.get(hubId);
  if (hub) {
    const { w, h } = hub;
    const dx = -w / 2 - hub.x;
    const dy = -h / 2 - hub.y;
    if (dx !== 0 || dy !== 0) {
      for (const box of boxes) {
        box.x += dx;
        box.y += dy;
      }
    }
  }
}

/**
 * Coloca o nó no ângulo dado, empurrando o raio até não colidir
 * com os já posicionados (espalhamento irregular natural).
 */
function placeClearOf(
  id: string,
  angle: number,
  minRadius: number,
  w: number,
  h: number,
  placed: Box[],
): { x: number; y: number; radius: number; angle: number } {
  // Varia o raio inicial por id (±18%) — anéis “quebrados”.
  let radius = minRadius * (1 + idJitter(id) * 0.18);
  let bestAngle = angle;

  for (let attempt = 0; attempt < 100; attempt++) {
    const tryAngle = bestAngle + (attempt > 0 ? idJitter(id + String(attempt)) * 0.12 : 0);
    const cx = Math.cos(tryAngle) * radius;
    const cy = Math.sin(tryAngle) * radius;
    const box: Box = { id, x: cx - w / 2, y: cy - h / 2, w, h };
    if (!placed.some((p) => boxesOverlap(box, p))) {
      return { x: box.x, y: box.y, radius, angle: tryAngle };
    }
    radius += RADIUS_STEP;
    // A cada poucos passos, tenta um desvio angular um pouco maior.
    if (attempt > 0 && attempt % 4 === 0) {
      bestAngle += idJitter(id + "a" + attempt) * 0.2;
    }
  }

  const cx = Math.cos(bestAngle) * radius;
  const cy = Math.sin(bestAngle) * radius;
  return { x: cx - w / 2, y: cy - h / 2, radius, angle: bestAngle };
}

export type LayoutDiagramaOptions = {
  preferredHubId?: string;
};

/**
 * Layout radial / estrela: hub no centro, órbita espalhada sem sobreposição.
 * Posições não são uniformes — raio e ângulo variam para respirar o grafo.
 */
export function layoutDiagramaNodes<T extends Record<string, unknown>>(
  nodes: Node<T>[],
  edges: Edge[],
  options?: LayoutDiagramaOptions,
): Node<T>[] {
  if (nodes.length === 0) return nodes;

  const entidadeNodes = nodes.filter((n) => n.type === "entidade");
  const moreNodes = nodes.filter((n) => isCarregarMais(n));

  const hubId = pickHubId(nodes, edges, options?.preferredHubId);

  if (!hubId || entidadeNodes.length === 0) {
    return nodes.map((node, i) => ({
      ...node,
      position: { x: i * (NODE_WIDTH + 40), y: 0 },
    }));
  }

  const entidadeIds = new Set(entidadeNodes.map((n) => n.id));
  const adj = buildAdjacency(entidadeIds, edges);
  const { parent, level } = spanningTree(hubId, entidadeIds, adj);
  const angles = assignAngles(hubId, parent);

  const sizeById = new Map(
    nodes.map((n) => [n.id, nodeSize(n)] as const),
  );

  const ordered = [...entidadeNodes].sort((a, b) => {
    const la = level.get(a.id) ?? 99;
    const lb = level.get(b.id) ?? 99;
    if (la !== lb) return la - lb;
    return a.id.localeCompare(b.id);
  });

  const placed: Box[] = [];
  const meta = new Map<
    string,
    { x: number; y: number; angle: number; radius: number }
  >();

  for (const node of ordered) {
    const { w, h } = sizeById.get(node.id) ?? { w: NODE_WIDTH, h: NODE_HEIGHT };

    if (node.id === hubId) {
      const box: Box = { id: hubId, x: -w / 2, y: -h / 2, w, h };
      placed.push(box);
      meta.set(hubId, { x: box.x, y: box.y, angle: -Math.PI / 2, radius: 0 });
      continue;
    }

    const parentId = parent.get(node.id);
    const parentMeta = parentId ? meta.get(parentId) : undefined;
    const siblingCount = parentId ? childrenOf(parentId, parent).length : 1;
    // Mais irmãos → empurra o anel para fora.
    const densityBoost = Math.max(0, siblingCount - 4) * 18;
    const minRadius = parentMeta
      ? parentMeta.radius + PARENT_GAP + densityBoost
      : BASE_RING + densityBoost;

    const angle = angles.get(node.id) ?? 0;
    const spot = placeClearOf(node.id, angle, minRadius, w, h, placed);
    placed.push({ id: node.id, x: spot.x, y: spot.y, w, h });
    meta.set(node.id, {
      x: spot.x,
      y: spot.y,
      angle: spot.angle,
      radius: spot.radius,
    });
  }

  for (const node of moreNodes) {
    const data = node.data as Record<string, unknown> | undefined;
    const parentId =
      data && typeof data.parentNodeId === "string"
        ? data.parentNodeId
        : null;
    const { w, h } = sizeById.get(node.id) ?? { w: MORE_WIDTH, h: MORE_HEIGHT };
    const parentMeta = parentId ? meta.get(parentId) : undefined;
    const angle =
      (parentMeta?.angle ?? 0) + idJitter(node.id) * 0.25;
    const minRadius = (parentMeta?.radius ?? BASE_RING) + MORE_OUTSET;
    const spot = placeClearOf(node.id, angle, minRadius, w, h, placed);
    placed.push({ id: node.id, x: spot.x, y: spot.y, w, h });
    meta.set(node.id, {
      x: spot.x,
      y: spot.y,
      angle: spot.angle,
      radius: spot.radius,
    });
  }

  resolveOverlaps(placed, hubId);

  const finalPos = new Map(placed.map((b) => [b.id, { x: b.x, y: b.y }]));

  return nodes.map((node) => {
    const pos = finalPos.get(node.id);
    if (!pos) return node;
    return {
      ...node,
      position: { x: pos.x, y: pos.y },
    };
  });
}

export const DIAGRAMA_PAGE_SIZE = 25;
