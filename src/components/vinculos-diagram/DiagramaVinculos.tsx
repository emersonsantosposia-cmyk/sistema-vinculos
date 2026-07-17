"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type Node,
  type NodeChange,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./diagrama-vinculos.css";
import {
  CarregarMaisNode,
  type CarregarMaisNodeData,
} from "@/components/vinculos-diagram/CarregarMaisNode";
import {
  EntidadeResumoPanel,
  type EntidadeResumoSelecionada,
} from "@/components/vinculos-diagram/EntidadeResumoPanel";
import {
  EntidadeVinculoNode,
  type EntidadeNodeData,
} from "@/components/vinculos-diagram/EntidadeVinculoNode";
import {
  applyVinculosBatch,
  carregarMaisId,
  collapseExpansion,
  isEntidadeNode,
  markRemoving,
  removeNodeExplicitly,
  type DiagramEdge,
  type DiagramNode,
} from "@/components/vinculos-diagram/graph-refs";
import {
  DIAGRAMA_PAGE_SIZE,
  layoutDiagramaNodes,
} from "@/components/vinculos-diagram/layout";
import { entidadeNodeId } from "@/lib/entidade-visual";
import {
  buscarVinculosDaEntidade,
  getEntidadeResumo,
} from "@/lib/supabase/vinculos";
import type { EntidadeTipo } from "@/lib/types";
import type { VinculoDiagramItem } from "@/lib/vinculos-types";

type Props = {
  entidadeTipo: EntidadeTipo;
  entidadeId: string;
  autoExpandRoot?: boolean;
  fullScreen?: boolean;
  resetToken?: number;
};

const COLLAPSE_FADE_MS = 280;
/** Distingue clique simples de duplo clique. */
const CLICK_DEBOUNCE_MS = 280;

const nodeTypes: NodeTypes = {
  entidade: EntidadeVinculoNode,
  carregarMais: CarregarMaisNode,
};

function FitViewOnChange({ version }: { version: number }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (version === 0) return;
    const id = window.setTimeout(() => {
      void fitView({ padding: 0.28, duration: 380, maxZoom: 1.1 });
    }, 40);
    return () => window.clearTimeout(id);
  }, [version, fitView]);

  return null;
}

function DiagramaVinculosInner({
  entidadeTipo,
  entidadeId,
  autoExpandRoot = false,
  fullScreen = false,
  resetToken = 0,
}: Props) {
  const rootId = entidadeNodeId(entidadeTipo, entidadeId);
  const [nodes, setNodes] = useState<DiagramNode[]>([]);
  const [edges, setEdges] = useState<DiagramEdge[]>([]);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const vinculosCacheRef = useRef(new Map<string, VinculoDiagramItem[]>());
  const loadedCountRef = useRef(new Map<string, number>());
  const collapsingRef = useRef(false);
  const clickTimerRef = useRef<number | null>(null);
  const clickCountRef = useRef(0);

  const [initError, setInitError] = useState<string | null>(null);
  const [loadingRoot, setLoadingRoot] = useState(true);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [selecionada, setSelecionada] =
    useState<EntidadeResumoSelecionada | null>(null);
  const autoExpandedRootRef = useRef<string | null>(null);

  const applyLayout = useCallback(
    (nextNodes: DiagramNode[], nextEdges: DiagramEdge[]) => {
      const edgesStraight = nextEdges.map((edge) =>
        edge.type === "straight" ? edge : { ...edge, type: "straight" as const },
      );
      const laidOut = layoutDiagramaNodes(nextNodes, edgesStraight, {
        preferredHubId: rootId,
      });
      setAnimating(true);
      setNodes(laidOut);
      setEdges(edgesStraight);
      setLayoutVersion((v) => v + 1);
      window.setTimeout(() => setAnimating(false), 400);
    },
    [rootId],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadRoot() {
      setLoadingRoot(true);
      setInitError(null);
      setSelecionada(null);
      vinculosCacheRef.current.clear();
      loadedCountRef.current.clear();
      collapsingRef.current = false;
      autoExpandedRootRef.current = null;

      const resumo = await getEntidadeResumo(entidadeTipo, entidadeId);
      if (cancelled) return;

      if (!resumo) {
        setInitError("Não foi possível carregar os dados desta entidade.");
        setNodes([]);
        setEdges([]);
        setLoadingRoot(false);
        return;
      }

      const rootNode: Node<EntidadeNodeData, "entidade"> = {
        id: rootId,
        type: "entidade",
        position: { x: 0, y: 0 },
        data: {
          entidadeTipo,
          entidadeId,
          titulo: resumo.titulo,
          subtitulo: resumo.subtitulo,
          foto_perfil_path: resumo.foto_perfil_path,
          foto_url: resumo.foto_url,
          restrito: false,
          loading: false,
          expanded: false,
          isRoot: true,
          refSources: [],
        },
      };

      setNodes([rootNode]);
      setEdges([]);
      setLayoutVersion((v) => v + 1);
      setLoadingRoot(false);
      setSelecionada({
        entidadeTipo,
        entidadeId,
        titulo: resumo.titulo,
        subtitulo: resumo.subtitulo,
        foto_perfil_path: resumo.foto_perfil_path,
        foto_url: resumo.foto_url,
        restrito: false,
        expanded: false,
      });
    }

    void loadRoot();
    return () => {
      cancelled = true;
    };
  }, [entidadeTipo, entidadeId, rootId]);

  const syncSelecionadaFromNode = useCallback((node: DiagramNode) => {
    if (!isEntidadeNode(node)) return;
    setSelecionada({
      entidadeTipo: node.data.entidadeTipo,
      entidadeId: node.data.entidadeId,
      titulo: node.data.titulo,
      subtitulo: node.data.subtitulo,
      foto_perfil_path: node.data.foto_perfil_path,
      foto_url: node.data.foto_url,
      restrito: node.data.restrito,
      expanded: node.data.expanded,
    });
  }, []);

  const resetToRoot = useCallback(() => {
    const root = nodesRef.current.find((n) => n.id === rootId);
    if (!root || !isEntidadeNode(root)) return;

    loadedCountRef.current.clear();
    collapsingRef.current = false;
    autoExpandedRootRef.current = rootId;
    const resetRoot: Node<EntidadeNodeData, "entidade"> = {
      ...root,
      position: { x: 0, y: 0 },
      data: {
        ...root.data,
        loading: false,
        expanded: false,
        refSources: [],
        removing: false,
      },
    };

    setNodes([resetRoot]);
    setEdges([]);
    setLayoutVersion((v) => v + 1);
    syncSelecionadaFromNode(resetRoot);
  }, [rootId, syncSelecionadaFromNode]);

  const expandWithItems = useCallback(
    (
      parentId: string,
      allItems: VinculoDiagramItem[],
      fromOffset: number,
    ) => {
      const slice = allItems.slice(
        fromOffset,
        fromOffset + DIAGRAMA_PAGE_SIZE,
      );
      const nextOffset = fromOffset + slice.length;
      loadedCountRef.current.set(parentId, nextOffset);
      const remaining = Math.max(0, allItems.length - nextOffset);

      const currentNodes = nodesRef.current.map((n) =>
        n.id === parentId && isEntidadeNode(n)
          ? {
              ...n,
              data: {
                ...n.data,
                loading: false,
                expanded: true,
              },
            }
          : n,
      );

      const { nodes: nextNodes, edges: nextEdges } = applyVinculosBatch(
        parentId,
        slice,
        currentNodes,
        edgesRef.current,
        remaining,
      );
      applyLayout(nextNodes, nextEdges);

      const parent = nextNodes.find((n) => n.id === parentId);
      if (parent) syncSelecionadaFromNode(parent);
    },
    [applyLayout, syncSelecionadaFromNode],
  );

  const collapseNode = useCallback(
    async (nodeId: string) => {
      if (collapsingRef.current) return;
      collapsingRef.current = true;

      const result = collapseExpansion(
        nodeId,
        nodesRef.current,
        edgesRef.current,
        rootId,
      );

      // Limpa contadores de paginação dos ramos liberados.
      for (const id of result.removedNodeIds) {
        loadedCountRef.current.delete(id);
      }
      loadedCountRef.current.delete(nodeId);

      if (
        result.removedNodeIds.length > 0 ||
        result.removedEdgeIds.length > 0
      ) {
        const fading = markRemoving(
          nodesRef.current,
          edgesRef.current,
          result.removedNodeIds,
          result.removedEdgeIds,
        );
        // Marca o nó clicado como não expandido já durante o fade.
        const fadingNodes = fading.nodes.map((n) =>
          n.id === nodeId && isEntidadeNode(n)
            ? {
                ...n,
                data: { ...n.data, expanded: false, loading: false },
              }
            : n,
        );
        setNodes(fadingNodes);
        setEdges(fading.edges);
        await new Promise((resolve) =>
          window.setTimeout(resolve, COLLAPSE_FADE_MS),
        );
      }

      applyLayout(result.nodes, result.edges);
      const updated = result.nodes.find((n) => n.id === nodeId);
      if (updated) syncSelecionadaFromNode(updated);
      collapsingRef.current = false;
    },
    [applyLayout, rootId, syncSelecionadaFromNode],
  );

  const shakeRootNode = useCallback(() => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === rootId && isEntidadeNode(n)
          ? { ...n, data: { ...n.data, shaking: true } }
          : n,
      ),
    );
    window.setTimeout(() => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === rootId && isEntidadeNode(n)
            ? { ...n, data: { ...n.data, shaking: false } }
            : n,
        ),
      );
    }, 420);
  }, [rootId]);

  /** Duplo clique: colapsa ramo (se houver) e remove o nó da tela. */
  const dismissNode = useCallback(
    async (nodeId: string) => {
      if (collapsingRef.current) return;

      if (nodeId === rootId) {
        shakeRootNode();
        return;
      }

      collapsingRef.current = true;

      const result = removeNodeExplicitly(
        nodeId,
        nodesRef.current,
        edgesRef.current,
        rootId,
      );

      if (!result) {
        collapsingRef.current = false;
        return;
      }

      for (const id of result.removedNodeIds) {
        loadedCountRef.current.delete(id);
      }
      loadedCountRef.current.delete(nodeId);
      // Não apaga o cache do pai: reexpandir pode trazer o nó de volta.

      if (
        result.removedNodeIds.length > 0 ||
        result.removedEdgeIds.length > 0
      ) {
        const fading = markRemoving(
          nodesRef.current,
          edgesRef.current,
          result.removedNodeIds,
          result.removedEdgeIds,
        );
        setNodes(fading.nodes);
        setEdges(fading.edges);
        await new Promise((resolve) =>
          window.setTimeout(resolve, COLLAPSE_FADE_MS),
        );
      }

      applyLayout(result.nodes, result.edges);

      const root = result.nodes.find((n) => n.id === rootId);
      if (root) syncSelecionadaFromNode(root);
      else setSelecionada(null);

      collapsingRef.current = false;
    },
    [applyLayout, rootId, shakeRootNode, syncSelecionadaFromNode],
  );

  const expandNode = useCallback(
    async (nodeId: string) => {
      const current = nodesRef.current.find((n) => n.id === nodeId);
      if (!current || !isEntidadeNode(current)) return;

      const { entidadeTipo: tipo, entidadeId: id, restrito, loading } =
        current.data;
      if (restrito || loading || collapsingRef.current) return;

      if (current.data.expanded) {
        await collapseNode(nodeId);
        return;
      }

      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId && isEntidadeNode(n)
            ? { ...n, data: { ...n.data, loading: true } }
            : n,
        ),
      );

      let all = vinculosCacheRef.current.get(nodeId);
      if (!all) {
        const { data, error } = await buscarVinculosDaEntidade(tipo, id);
        if (error) {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === nodeId && isEntidadeNode(n)
                ? { ...n, data: { ...n.data, loading: false } }
                : n,
            ),
          );
          return;
        }
        all = data;
        vinculosCacheRef.current.set(nodeId, all);
      }

      expandWithItems(nodeId, all, 0);
    },
    [collapseNode, expandWithItems],
  );

  useEffect(() => {
    if (!autoExpandRoot || loadingRoot) return;
    if (autoExpandedRootRef.current === rootId) return;

    const root = nodesRef.current.find((n) => n.id === rootId);
    if (!root || !isEntidadeNode(root) || root.data.expanded) return;

    autoExpandedRootRef.current = rootId;
    void expandNode(rootId);
  }, [autoExpandRoot, expandNode, loadingRoot, rootId]);

  useEffect(() => {
    if (resetToken === 0) return;
    resetToRoot();
  }, [resetToken, resetToRoot]);

  const loadMore = useCallback(
    async (parentId: string) => {
      const moreId = carregarMaisId(parentId);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === moreId
            ? {
                ...n,
                data: {
                  ...(n.data as CarregarMaisNodeData),
                  loading: true,
                },
              }
            : n,
        ),
      );

      const all = vinculosCacheRef.current.get(parentId);
      if (!all) {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === moreId
              ? {
                  ...n,
                  data: {
                    ...(n.data as CarregarMaisNodeData),
                    loading: false,
                  },
                }
              : n,
          ),
        );
        return;
      }

      const fromOffset = loadedCountRef.current.get(parentId) ?? 0;
      expandWithItems(parentId, all, fromOffset);
    },
    [expandWithItems],
  );

  const clearPendingClick = useCallback(() => {
    if (clickTimerRef.current != null) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    clickCountRef.current = 0;
  }, []);

  useEffect(() => {
    return () => clearPendingClick();
  }, [clearPendingClick]);

  const onNodeClick = useCallback(
    (_event: MouseEvent, node: DiagramNode) => {
      if (node.type === "carregarMais") {
        clearPendingClick();
        const data = node.data as CarregarMaisNodeData;
        if (data.loading || data.removing) return;
        void loadMore(data.parentNodeId);
        return;
      }

      if (!isEntidadeNode(node)) return;
      if (node.data.removing) return;

      // Resumo imediato; expansão/recolhimento aguarda o debounce.
      syncSelecionadaFromNode(node);
      if (node.data.restrito) {
        clearPendingClick();
        return;
      }

      clickCountRef.current += 1;
      if (clickTimerRef.current != null) {
        window.clearTimeout(clickTimerRef.current);
      }

      const nodeId = node.id;
      clickTimerRef.current = window.setTimeout(() => {
        const clicks = clickCountRef.current;
        clickTimerRef.current = null;
        clickCountRef.current = 0;
        if (clicks === 1) {
          void expandNode(nodeId);
        }
      }, CLICK_DEBOUNCE_MS);
    },
    [clearPendingClick, expandNode, loadMore, syncSelecionadaFromNode],
  );

  const onNodeDoubleClick = useCallback(
    (_event: MouseEvent, node: DiagramNode) => {
      clearPendingClick();

      if (node.type === "carregarMais") return;
      if (!isEntidadeNode(node)) return;
      if (node.data.removing || node.data.restrito) return;

      syncSelecionadaFromNode(node);
      void dismissNode(node.id);
    },
    [clearPendingClick, dismissNode, syncSelecionadaFromNode],
  );

  const onNodesChange = useCallback((changes: NodeChange<DiagramNode>[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  if (loadingRoot) {
    return (
      <div className="diagrama-vinculos-shell flex h-[min(52vh,480px)] min-h-[320px] items-center justify-center rounded-lg border border-[var(--cor-borda)] bg-[var(--cor-fundo-secundaria)]">
        <p className="text-sm text-muted">Carregando diagrama…</p>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="rounded border border-danger-border bg-danger-bg px-3 py-2 text-xs text-danger-fg">
        {initError}
      </div>
    );
  }

  return (
    <div className={fullScreen ? "flex h-full flex-col gap-2" : "space-y-2"}>
      <p className="text-xs text-muted">
        Clique para expandir/recolher. Duplo clique remove o nó da tela (exceto
        a origem). Nós compartilhados entre ramos abertos permanecem visíveis.
      </p>
      <div
        className={`diagrama-vinculos-shell flex ${fullScreen ? "h-full min-h-0" : "h-[min(56vh,520px)] min-h-[340px]"} flex-col overflow-hidden rounded-lg border border-[var(--cor-borda)] sm:flex-row ${animating ? "layout-animating" : ""}`}
      >
        <div className="relative min-h-[280px] min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodesChange={onNodesChange}
            fitView
            fitViewOptions={{ padding: 0.4, maxZoom: 1.05 }}
            minZoom={0.2}
            maxZoom={1.6}
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable
            proOptions={{ hideAttribution: true }}
          >
            <FitViewOnChange version={layoutVersion} />
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="var(--cor-chart-grid)"
            />
            <Controls
              showInteractive={false}
              className="diagrama-vinculos-controls"
            />
          </ReactFlow>
        </div>
        <EntidadeResumoPanel
          entidade={selecionada}
          onClose={() => setSelecionada(null)}
        />
      </div>
    </div>
  );
}

export function DiagramaVinculos(props: Props) {
  return (
    <ReactFlowProvider>
      <DiagramaVinculosInner {...props} />
    </ReactFlowProvider>
  );
}
