import type { Edge, Node } from "@xyflow/react";
import type { CarregarMaisNodeData } from "@/components/vinculos-diagram/CarregarMaisNode";
import type { EntidadeNodeData } from "@/components/vinculos-diagram/EntidadeVinculoNode";
import { formatTipoVinculoEdgeLabel } from "@/lib/vinculos-format";
import { entidadeNodeId } from "@/lib/entidade-visual";
import type { VinculoDiagramItem } from "@/lib/vinculos-types";

export type DiagramNode = Node<EntidadeNodeData | CarregarMaisNodeData>;

export type EdgeData = {
  /** Expansões ativas que mantêm esta aresta. */
  refSources: string[];
  removing?: boolean;
  /** Rótulo na direção source → target. */
  tipoDirecao?: string | null;
  /** Rótulo na direção inversa (para tooltip/contexto). */
  tipoInverso?: string | null;
};

export type DiagramEdge = Edge<EdgeData>;

export function carregarMaisId(parentId: string): string {
  return `carregar-mais__${parentId}`;
}

export function isEntidadeNode(
  node: DiagramNode,
): node is Node<EntidadeNodeData, "entidade"> {
  return node.type === "entidade";
}

function addRef(sources: string[], expansionId: string): string[] {
  return sources.includes(expansionId)
    ? sources
    : [...sources, expansionId];
}

function removeRef(sources: string[], expansionId: string): string[] {
  return sources.filter((id) => id !== expansionId);
}

function buildEdge(
  vinculoId: string,
  sourceId: string,
  targetId: string,
  tipoPerspectiva: string | null,
  tipoInverso: string | null,
  expansionId: string,
): DiagramEdge {
  const label = formatTipoVinculoEdgeLabel(tipoPerspectiva, tipoInverso);
  return {
    id: `vinculo__${vinculoId}`,
    source: sourceId,
    target: targetId,
    type: "straight",
    label,
    data: {
      refSources: [expansionId],
      tipoDirecao: tipoPerspectiva,
      tipoInverso,
    },
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
  };
}

function buildCarregarMaisEdge(parentId: string): DiagramEdge {
  const moreId = carregarMaisId(parentId);
  return {
    id: `edge-more__${parentId}`,
    source: parentId,
    target: moreId,
    type: "straight",
    data: { refSources: [parentId] },
    style: {
      stroke: "var(--cor-diagrama-edge-more)",
      strokeWidth: 1.25,
      strokeDasharray: "4 4",
    },
  };
}

function cloneNodes(nodes: DiagramNode[]): DiagramNode[] {
  return nodes.map((n) => ({
    ...n,
    data: { ...n.data },
  }));
}

function cloneEdges(edges: DiagramEdge[]): DiagramEdge[] {
  return edges.map((e) => ({
    ...e,
    data: e.data
      ? { ...e.data, refSources: [...e.data.refSources] }
      : { refSources: [] },
  }));
}

/** Aplica um lote de vínculos incrementando a contagem de referências. */
export function applyVinculosBatch(
  parentId: string,
  items: VinculoDiagramItem[],
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  remaining: number,
): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  const nextNodes = cloneNodes(nodes);
  const nextEdges = cloneEdges(edges);
  const byId = new Map(nextNodes.map((n) => [n.id, n]));
  const edgeById = new Map(nextEdges.map((e) => [e.id, e]));

  for (const v of items) {
    const childId = entidadeNodeId(v.outroTipo, v.outroId);
    const existing = byId.get(childId);

    if (!existing) {
      const node: Node<EntidadeNodeData, "entidade"> = {
        id: childId,
        type: "entidade",
        position: { x: 0, y: 0 },
        selectable: !v.restrito,
        data: {
          entidadeTipo: v.outroTipo,
          entidadeId: v.outroId,
          titulo: v.titulo,
          subtitulo: v.subtitulo,
          foto_perfil_path: v.foto_perfil_path,
          foto_url: v.foto_url,
          restrito: v.restrito,
          loading: false,
          expanded: false,
          isRoot: false,
          refSources: [parentId],
        },
      };
      nextNodes.push(node);
      byId.set(childId, node);
    } else if (isEntidadeNode(existing)) {
      existing.data = {
        ...existing.data,
        refSources: addRef(existing.data.refSources, parentId),
        removing: false,
      };
    }

    const edgeId = `vinculo__${v.vinculoId}`;
    const existingEdge = edgeById.get(edgeId);
    if (!existingEdge) {
      const edge = buildEdge(
        v.vinculoId,
        parentId,
        childId,
        v.tipo_perspectiva,
        v.tipo_inverso,
        parentId,
      );
      nextEdges.push(edge);
      edgeById.set(edgeId, edge);
    } else {
      existingEdge.data = {
        ...existingEdge.data,
        refSources: addRef(existingEdge.data?.refSources ?? [], parentId),
        removing: false,
      };
    }
  }

  const moreId = carregarMaisId(parentId);
  const withoutMore = nextNodes.filter((n) => n.id !== moreId);
  const edgesWithoutMore = nextEdges.filter(
    (e) => e.id !== `edge-more__${parentId}`,
  );

  if (remaining > 0) {
    withoutMore.push({
      id: moreId,
      type: "carregarMais",
      position: { x: 0, y: 0 },
      data: {
        parentNodeId: parentId,
        remaining,
        loading: false,
        refSources: [parentId],
      },
    });
    edgesWithoutMore.push(buildCarregarMaisEdge(parentId));
  }

  return { nodes: withoutMore, edges: edgesWithoutMore };
}

export type CollapseResult = {
  /** Estado final após o recolhimento. */
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  /** IDs removidos (para animação de fade-out). */
  removedNodeIds: string[];
  removedEdgeIds: string[];
};

/**
 * Recolhe a expansão de `expansionId` com contagem de referências.
 * Nó raiz (`rootId`) nunca é removido.
 */
export function collapseExpansion(
  expansionId: string,
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  rootId: string,
): CollapseResult {
  let nextNodes = cloneNodes(nodes);
  let nextEdges = cloneEdges(edges);
  const removedNodeIds = new Set<string>();
  const removedEdgeIds = new Set<string>();
  const released = new Set<string>();

  const getNode = (id: string) => nextNodes.find((n) => n.id === id);

  const willReachZero = (node: DiagramNode, expId: string): boolean => {
    if (!isEntidadeNode(node)) {
      return (node.data as CarregarMaisNodeData).refSources.includes(expId)
        && (node.data as CarregarMaisNodeData).refSources.length <= 1;
    }
    if (node.data.isRoot || node.id === rootId) return false;
    return (
      node.data.refSources.includes(expId) &&
      node.data.refSources.length <= 1
    );
  };

  const releaseExpansion = (expId: string) => {
    if (released.has(expId)) return;
    released.add(expId);

    // Cascata: nós que cairão a zero e estão expandidos liberam a própria expansão antes.
    const doomedExpanded = nextNodes.filter(
      (n) =>
        isEntidadeNode(n) &&
        n.data.expanded &&
        n.id !== expId &&
        willReachZero(n, expId),
    );
    for (const child of doomedExpanded) {
      releaseExpansion(child.id);
    }

    // Também libera o "carregar mais" deste pai (sempre ref exclusiva).
    const moreId = carregarMaisId(expId);
    if (getNode(moreId)) {
      removedNodeIds.add(moreId);
    }

    // Decrementa referências das arestas desta expansão.
    nextEdges = nextEdges.map((edge) => {
      const sources = edge.data?.refSources ?? [];
      if (!sources.includes(expId)) return edge;
      const nextSources = removeRef(sources, expId);
      if (nextSources.length === 0) {
        removedEdgeIds.add(edge.id);
      }
      return {
        ...edge,
        data: { ...edge.data, refSources: nextSources },
      };
    });

    // Decrementa referências dos nós desta expansão.
    nextNodes = nextNodes.map((node) => {
      if (node.id === moreId) return node;

      if (isEntidadeNode(node)) {
        if (!node.data.refSources.includes(expId)) {
          if (node.id === expId) {
            return {
              ...node,
              data: {
                ...node.data,
                expanded: false,
                loading: false,
              },
            };
          }
          return node;
        }
        const nextSources = removeRef(node.data.refSources, expId);
        const isFixedRoot = Boolean(node.data.isRoot) || node.id === rootId;
        if (nextSources.length === 0 && !isFixedRoot) {
          removedNodeIds.add(node.id);
        }
        return {
          ...node,
          data: {
            ...node.data,
            refSources: nextSources,
            expanded: node.id === expId ? false : node.data.expanded,
            loading: node.id === expId ? false : node.data.loading,
          },
        };
      }

      const data = node.data as CarregarMaisNodeData;
      if (!data.refSources.includes(expId)) return node;
      const nextSources = removeRef(data.refSources, expId);
      if (nextSources.length === 0) {
        removedNodeIds.add(node.id);
      }
      return {
        ...node,
        data: { ...data, refSources: nextSources },
      };
    });

    // Garante que o nó clicado volte a "não expandido".
    nextNodes = nextNodes.map((node) => {
      if (node.id !== expId || !isEntidadeNode(node)) return node;
      return {
        ...node,
        data: {
          ...node.data,
          expanded: false,
          loading: false,
        },
      };
    });
  };

  releaseExpansion(expansionId);

  // Remove arestas órfãs ligadas a nós que sairão.
  for (const edge of nextEdges) {
    if (
      removedNodeIds.has(edge.source) ||
      removedNodeIds.has(edge.target)
    ) {
      removedEdgeIds.add(edge.id);
    }
  }

  const finalNodes = nextNodes.filter((n) => !removedNodeIds.has(n.id));
  const finalNodeIds = new Set(finalNodes.map((n) => n.id));
  const finalEdges = nextEdges.filter(
    (e) =>
      !removedEdgeIds.has(e.id) &&
      finalNodeIds.has(e.source) &&
      finalNodeIds.has(e.target),
  );

  return {
    nodes: finalNodes,
    edges: finalEdges,
    removedNodeIds: [...removedNodeIds],
    removedEdgeIds: [...removedEdgeIds],
  };
}

/**
 * Duplo clique: colapsa o ramo (se expandido) e remove o próprio nó com
 * todas as arestas conectadas, independentemente da contagem de referências.
 * A raiz não pode ser removida (retorna null).
 */
export function removeNodeExplicitly(
  nodeId: string,
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  rootId: string,
): CollapseResult | null {
  if (nodeId === rootId) return null;

  const target = nodes.find((n) => n.id === nodeId);
  if (!target) return null;

  let workingNodes = nodes;
  let workingEdges = edges;
  const removedNodeIds = new Set<string>();
  const removedEdgeIds = new Set<string>();

  if (isEntidadeNode(target) && target.data.expanded) {
    const collapsed = collapseExpansion(nodeId, nodes, edges, rootId);
    workingNodes = collapsed.nodes;
    workingEdges = collapsed.edges;
    for (const id of collapsed.removedNodeIds) removedNodeIds.add(id);
    for (const id of collapsed.removedEdgeIds) removedEdgeIds.add(id);
  }

  // Remoção definitiva do nó (e do "carregar mais" associado, se restar).
  removedNodeIds.add(nodeId);
  removedNodeIds.add(carregarMaisId(nodeId));

  for (const edge of workingEdges) {
    if (edge.source === nodeId || edge.target === nodeId) {
      removedEdgeIds.add(edge.id);
    }
  }

  // Também remove arestas ligadas a nós já marcados na cascata do collapse.
  for (const edge of workingEdges) {
    if (
      removedNodeIds.has(edge.source) ||
      removedNodeIds.has(edge.target)
    ) {
      removedEdgeIds.add(edge.id);
    }
  }

  const finalNodes = workingNodes.filter((n) => !removedNodeIds.has(n.id));
  const finalNodeIds = new Set(finalNodes.map((n) => n.id));
  const finalEdges = workingEdges.filter(
    (e) =>
      !removedEdgeIds.has(e.id) &&
      finalNodeIds.has(e.source) &&
      finalNodeIds.has(e.target),
  );

  return {
    nodes: finalNodes,
    edges: finalEdges,
    removedNodeIds: [...removedNodeIds],
    removedEdgeIds: [...removedEdgeIds],
  };
}

/** Marca elementos que serão removidos para animação de fade-out. */
export function markRemoving(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  removedNodeIds: string[],
  removedEdgeIds: string[],
): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  const nodeSet = new Set(removedNodeIds);
  const edgeSet = new Set(removedEdgeIds);

  return {
    nodes: nodes.map((n) =>
      nodeSet.has(n.id)
        ? {
            ...n,
            className: "diagrama-node-removing",
            data: { ...n.data, removing: true },
          }
        : n,
    ),
    edges: edges.map((e) =>
      edgeSet.has(e.id)
        ? {
            ...e,
            className: "diagrama-edge-removing",
            data: {
              refSources: e.data?.refSources ?? [],
              removing: true,
            },
            style: {
              ...e.style,
              opacity: 0,
              transition: "opacity 0.28s ease",
            },
          }
        : e,
    ),
  };
}
