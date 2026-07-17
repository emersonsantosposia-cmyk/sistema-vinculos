import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";

const NODE_WIDTH = 196;
const NODE_HEIGHT = 78;
const MORE_WIDTH = 188;
const MORE_HEIGHT = 52;

/** Reposiciona nós com dagre (TB) para evitar sobreposição. */
export function layoutDiagramaNodes<T extends Record<string, unknown>>(
  nodes: Node<T>[],
  edges: Edge[],
): Node<T>[] {
  if (nodes.length === 0) return nodes;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "TB",
    nodesep: 56,
    ranksep: 100,
    marginx: 32,
    marginy: 32,
  });

  for (const node of nodes) {
    const isMore = node.type === "carregarMais";
    g.setNode(node.id, {
      width: isMore ? MORE_WIDTH : NODE_WIDTH,
      height: isMore ? MORE_HEIGHT : NODE_HEIGHT,
    });
  }

  for (const edge of edges) {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    if (!pos) return node;
    const w = pos.width ?? NODE_WIDTH;
    const h = pos.height ?? NODE_HEIGHT;
    return {
      ...node,
      position: {
        x: pos.x - w / 2,
        y: pos.y - h / 2,
      },
    };
  });
}

export const DIAGRAMA_PAGE_SIZE = 25;
