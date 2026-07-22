import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import type { Edge, Node } from "@xyflow/react";

/** Dimensões base / fallback dos nós de entidade (layout / colisão). */
export const DIAGRAMA_NODE_WIDTH = 200;
export const DIAGRAMA_NODE_HEIGHT = 48;
export const DIAGRAMA_NODE_MIN_WIDTH = 160;
export const DIAGRAMA_NODE_MAX_WIDTH = 260;
const MORE_WIDTH = 168;
const MORE_HEIGHT = 44;

/** Distância alvo entre nós ligados. */
const LINK_DISTANCE = 210;
/** Repulsão entre nós. */
const CHARGE_STRENGTH = -380;
/** Folga no raio de colisão. */
const COLLIDE_PAD = 14;

/**
 * Estima tamanho para o force-layout (o card visual usa fit-content).
 * Largura 160–260px; altura só o necessário para avatar + textos.
 */
export function estimateDiagramaNodeSize(
  titulo: string,
  subtitulo?: string | null,
): { w: number; h: number } {
  const title = titulo.trim();
  const sub = (subtitulo ?? "").trim();
  const chrome = 28 + 10 + 20; // avatar + gap + padding horizontal
  const charPx = 6.0;

  const contentW = chrome + title.length * charPx;
  const w = Math.round(
    Math.min(
      DIAGRAMA_NODE_MAX_WIDTH,
      Math.max(DIAGRAMA_NODE_MIN_WIDTH, contentW),
    ),
  );

  // padding 10+10 + max(avatar 28, rótulo+título[+sub])
  const textBlock = 9 + 13 + (sub ? 11 : 0);
  const h = 20 + Math.max(28, textBlock);

  return { w, h };
}

type SimNode = SimulationNodeDatum & {
  id: string;
  w: number;
  h: number;
};

type SimLink = SimulationLinkDatum<SimNode> & {
  source: string | SimNode;
  target: string | SimNode;
};

function nodeSize(node: Node): { w: number; h: number } {
  if (node.type === "carregarMais") {
    return { w: MORE_WIDTH, h: MORE_HEIGHT };
  }
  const data = node.data as {
    titulo?: string;
    subtitulo?: string | null;
  } | null;
  if (data && typeof data.titulo === "string") {
    return estimateDiagramaNodeSize(data.titulo, data.subtitulo);
  }
  return { w: DIAGRAMA_NODE_WIDTH, h: DIAGRAMA_NODE_HEIGHT };
}

function idJitter(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 2000) / 1000 - 1;
}

function toCenter(
  pos: { x: number; y: number },
  w: number,
  h: number,
): { x: number; y: number } {
  return { x: pos.x + w / 2, y: pos.y + h / 2 };
}

function fromCenter(
  cx: number,
  cy: number,
  w: number,
  h: number,
): { x: number; y: number } {
  return { x: cx - w / 2, y: cy - h / 2 };
}

/** Centro aproximado de um nó novo, perto de vizinhos já fixos. */
function seedCenter(
  nodeId: string,
  edges: Edge[],
  lockedCenters: Map<string, { x: number; y: number }>,
  preferredHubId?: string,
): { x: number; y: number } {
  const neighborCenters: { x: number; y: number }[] = [];
  for (const edge of edges) {
    if (edge.source === nodeId && lockedCenters.has(edge.target)) {
      neighborCenters.push(lockedCenters.get(edge.target)!);
    } else if (edge.target === nodeId && lockedCenters.has(edge.source)) {
      neighborCenters.push(lockedCenters.get(edge.source)!);
    }
  }

  const jitter = idJitter(nodeId);
  const angle = jitter * Math.PI;
  const radius = 140 + Math.abs(jitter) * 80;

  if (neighborCenters.length > 0) {
    const ax =
      neighborCenters.reduce((s, p) => s + p.x, 0) / neighborCenters.length;
    const ay =
      neighborCenters.reduce((s, p) => s + p.y, 0) / neighborCenters.length;
    return {
      x: ax + Math.cos(angle) * radius,
      y: ay + Math.sin(angle) * radius,
    };
  }

  if (preferredHubId && lockedCenters.has(preferredHubId)) {
    const hub = lockedCenters.get(preferredHubId)!;
    return {
      x: hub.x + Math.cos(angle) * (BASE_SEED_RADIUS + radius * 0.3),
      y: hub.y + Math.sin(angle) * (BASE_SEED_RADIUS + radius * 0.3),
    };
  }

  return {
    x: Math.cos(angle) * BASE_SEED_RADIUS,
    y: Math.sin(angle) * BASE_SEED_RADIUS,
  };
}

const BASE_SEED_RADIUS = 200;

export type LayoutDiagramaOptions = {
  preferredHubId?: string;
  /**
   * Posições a preservar (já na tela / pinadas pelo usuário).
   * A simulação trava estes nós (fx/fy) e só acomoda os novos.
   */
  lockedPositions?: Map<string, { x: number; y: number }>;
  /**
   * Quando true, todos os nós participam da simulação (reorganizar).
   * Ignora lockedPositions.
   */
  reorganizeAll?: boolean;
  /**
   * Âncoras por nó (ex.: centro da comunidade). Ativa forceX/forceY
   * direcionados para separar grupos visualmente.
   */
  nodeAnchors?: Map<string, { x: number; y: number }>;
};

/**
 * Layout por força (d3-force): nós se repelem e arestas atraem.
 * Com `lockedPositions`, só os nós novos se movem (memória espacial).
 */
export function layoutDiagramaNodes<T extends Record<string, unknown>>(
  nodes: Node<T>[],
  edges: Edge[],
  options?: LayoutDiagramaOptions,
): Node<T>[] {
  if (nodes.length === 0) return nodes;

  const reorganizeAll = options?.reorganizeAll === true;
  const lockedPositions = reorganizeAll
    ? new Map<string, { x: number; y: number }>()
    : (options?.lockedPositions ?? new Map());

  const sizeById = new Map(nodes.map((n) => [n.id, nodeSize(n)] as const));
  const lockedCenters = new Map<string, { x: number; y: number }>();

  for (const [id, pos] of lockedPositions) {
    const size = sizeById.get(id) ?? { w: DIAGRAMA_NODE_WIDTH, h: DIAGRAMA_NODE_HEIGHT };
    lockedCenters.set(id, toCenter(pos, size.w, size.h));
  }

  const simNodes: SimNode[] = nodes.map((node) => {
    const { w, h } = sizeById.get(node.id) ?? { w: DIAGRAMA_NODE_WIDTH, h: DIAGRAMA_NODE_HEIGHT };
    const locked = lockedPositions.get(node.id);

    if (locked) {
      const c = toCenter(locked, w, h);
      return {
        id: node.id,
        w,
        h,
        x: c.x,
        y: c.y,
        fx: c.x,
        fy: c.y,
      };
    }

    const seed = seedCenter(
      node.id,
      edges,
      lockedCenters,
      options?.preferredHubId,
    );
    const anchor = options?.nodeAnchors?.get(node.id);
    // Com âncora de comunidade: começa perto do centro do grupo.
    if (anchor) {
      const j = idJitter(node.id);
      return {
        id: node.id,
        w,
        h,
        x: anchor.x + j * 60,
        y: anchor.y + idJitter(`${node.id}:y`) * 60,
      };
    }
    // Se já tem posição útil (ex. reorganizar), usa como seed.
    if (reorganizeAll && (node.position.x !== 0 || node.position.y !== 0)) {
      const c = toCenter(node.position, w, h);
      return { id: node.id, w, h, x: c.x, y: c.y };
    }

    return { id: node.id, w, h, x: seed.x, y: seed.y };
  });

  const nodeIdSet = new Set(simNodes.map((n) => n.id));
  const simLinks: SimLink[] = edges
    .filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target))
    .map((e) => ({
      source: e.source,
      target: e.target,
    }));

  const hasLocked = lockedCenters.size > 0;
  const nodeAnchors = options?.nodeAnchors;
  const hasCommunityAnchors = Boolean(nodeAnchors && nodeAnchors.size > 0);
  const ticks = hasCommunityAnchors
    ? 380
    : reorganizeAll
      ? 320
      : hasLocked
        ? 90
        : 260;

  const simulation = forceSimulation<SimNode>(simNodes)
    .force(
      "link",
      forceLink<SimNode, SimLink>(simLinks)
        .id((d) => d.id)
        .distance(hasCommunityAnchors ? LINK_DISTANCE * 0.85 : LINK_DISTANCE)
        .strength(
          hasCommunityAnchors
            ? 0.28
            : hasLocked && !reorganizeAll
              ? 0.55
              : 0.35,
        ),
    )
    .force(
      "charge",
      forceManyBody<SimNode>().strength(
        hasCommunityAnchors
          ? CHARGE_STRENGTH * 1.15
          : hasLocked && !reorganizeAll
            ? CHARGE_STRENGTH * 0.85
            : CHARGE_STRENGTH,
      ),
    )
    .force(
      "collide",
      forceCollide<SimNode>()
        .radius((d) => Math.hypot(d.w, d.h) / 2 + COLLIDE_PAD)
        .strength(0.95)
        .iterations(2),
    )
    .force(
      "center",
      forceCenter(0, 0).strength(
        hasCommunityAnchors
          ? 0.02
          : reorganizeAll
            ? 0.06
            : hasLocked
              ? 0.015
              : 0.05,
      ),
    );

  if (hasCommunityAnchors && nodeAnchors) {
    simulation
      .force(
        "x",
        forceX<SimNode>((d) => nodeAnchors.get(d.id)?.x ?? 0).strength(0.18),
      )
      .force(
        "y",
        forceY<SimNode>((d) => nodeAnchors.get(d.id)?.y ?? 0).strength(0.18),
      );
  } else {
    simulation
      .force("x", forceX(0).strength(reorganizeAll ? 0.02 : 0.008))
      .force("y", forceY(0).strength(reorganizeAll ? 0.02 : 0.008));
  }

  simulation.stop();

  for (let i = 0; i < ticks; i++) {
    simulation.tick();
  }

  const byId = new Map(simNodes.map((n) => [n.id, n]));

  return nodes.map((node) => {
    const locked = lockedPositions.get(node.id);
    if (locked) {
      return { ...node, position: { x: locked.x, y: locked.y } };
    }
    const sim = byId.get(node.id);
    if (!sim || sim.x == null || sim.y == null) return node;
    const { w, h } = sizeById.get(node.id) ?? { w: DIAGRAMA_NODE_WIDTH, h: DIAGRAMA_NODE_HEIGHT };
    return {
      ...node,
      position: fromCenter(sim.x, sim.y, w, h),
    };
  });
}

export const DIAGRAMA_PAGE_SIZE = 25;
