"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
} from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
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
import { useRouter } from "next/navigation";
import {
  CarregarMaisNode,
  type CarregarMaisNodeData,
} from "@/components/vinculos-diagram/CarregarMaisNode";
import { DiagramaNodeActionsProvider } from "@/components/vinculos-diagram/DiagramaNodeActions";
import {
  DiagramLegend,
  DiagramPathModeBanner,
  DiagramToolbar,
} from "@/components/vinculos-diagram/DiagramToolbar";
import {
  EntidadeVinculoNode,
  type EntidadeNodeData,
} from "@/components/vinculos-diagram/EntidadeVinculoNode";
import { ENTIDADE_COLORS, entidadeNodeId, resolveCssColor } from "@/lib/entidade-visual";
import {
  computeEntidadeDegrees,
  degreeToScale,
  findShortestPath,
  getDirectNeighbors,
  type ShortestPathResult,
} from "@/components/vinculos-diagram/graph-analytics";
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
import { formatDateTime } from "@/lib/format";
import {
  deleteDiagramaVisualizacao,
  listDiagramaVisualizacoes,
  restoreDiagramaEstado,
  getDiagramaVisualizacao,
  saveDiagramaVisualizacao,
  serializeDiagramaEstado,
  type DiagramaRestoreResult,
} from "@/lib/supabase/diagrama-visualizacoes";
import type { DiagramaVisualizacaoSalva } from "@/lib/diagrama-visualizacoes";
import {
  buscarVinculosDaEntidade,
  getEntidadeResumo,
} from "@/lib/supabase/vinculos";
import { allEntidadeTipos, type EntidadeTipo } from "@/lib/types";
import {
  ENTIDADE_HREFS,
  ENTIDADE_VINCULOS_TITULOS,
  filterVinculosByTipos,
  isFiltroTiposCompleto,
  type VinculoDiagramItem,
} from "@/lib/vinculos-types";
import { Button, Input, Label } from "@/components/ui/Form";
import { ModalShell } from "@/components/ui/ModalShell";

export type ExpandDepth = 1 | 2 | 3;

type Props = {
  entidadeTipo: EntidadeTipo;
  entidadeId: string;
  /** Expande a raiz automaticamente até este nível (1–3). */
  initialExpandDepth?: ExpandDepth;
  /**
   * Tipos de entidade permitidos na expansão (manual e em cascata).
   * O nó raiz sempre permanece visível. Padrão: todos (sem filtro).
   */
  tiposFiltro?: EntidadeTipo[];
  /** Abre a tela de configuração (níveis + tipos) em sobreposição. */
  onReconfigureFiltro?: () => void;
  fullScreen?: boolean;
  resetToken?: number;
};

const COLLAPSE_FADE_MS = 280;
/**
 * Atraso do clique simples: deve ser ≥ intervalo típico de duplo clique do SO
 * (~400–500 ms). Se for menor, o expand dispara entre o 1º e o 2º clique e
 * o layout/re-render engole o dismiss.
 */
const SINGLE_CLICK_DELAY_MS = 420;

const PATH_EDGE_STYLE = {
  stroke: "var(--cor-destaque-dourado)",
  strokeWidth: 3,
};

const DIM_EDGE_STYLE = {
  stroke: "var(--cor-diagrama-edge)",
  strokeWidth: 1.5,
  opacity: 0.25,
};

const nodeTypes: NodeTypes = {
  entidade: EntidadeVinculoNode,
  carregarMais: CarregarMaisNode,
};

function useIsNarrow(query = "(max-width: 639px)") {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const sync = () => setNarrow(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [query]);
  return narrow;
}

type ContextMenuState = {
  x: number;
  y: number;
  nodeId: string;
};

type LinkSubmenuState = {
  x: number;
  y: number;
  href: string;
};

/** Mantém um menu `position: fixed` dentro da viewport (evita corte no rodapé/laterais). */
function clampFixedMenuPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  margin = 8,
): { x: number; y: number } {
  const maxX = Math.max(margin, window.innerWidth - width - margin);
  const maxY = Math.max(margin, window.innerHeight - height - margin);
  return {
    x: Math.min(Math.max(x, margin), maxX),
    y: Math.min(Math.max(y, margin), maxY),
  };
}

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
  initialExpandDepth = 1,
  tiposFiltro = allEntidadeTipos(),
  onReconfigureFiltro,
  fullScreen = false,
  resetToken = 0,
}: Props) {
  const rootId = entidadeNodeId(entidadeTipo, entidadeId);
  const filtroAtivo = !isFiltroTiposCompleto(tiposFiltro);
  const filtroLabel = useMemo(() => {
    if (!filtroAtivo) return null;
    return tiposFiltro.map((t) => ENTIDADE_VINCULOS_TITULOS[t]).join(", ");
  }, [filtroAtivo, tiposFiltro]);
  const tiposFiltroRef = useRef(tiposFiltro);
  tiposFiltroRef.current = tiposFiltro;
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
  /** Nós pinados pelo usuário (arraste) — fx/fy permanentes até reorganizar. */
  const pinnedRef = useRef(new Set<string>());
  const depthBootstrappedRef = useRef<string | null>(null);

  const [initError, setInitError] = useState<string | null>(null);
  const [loadingRoot, setLoadingRoot] = useState(true);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [linkSubmenu, setLinkSubmenu] = useState<LinkSubmenuState | null>(null);
  const contextMenusRef = useRef<HTMLDivElement | null>(null);
  const contextMenuElRef = useRef<HTMLDivElement | null>(null);
  const linkSubmenuElRef = useRef<HTMLDivElement | null>(null);
  const [expandingCascade, setExpandingCascade] = useState(false);
  const expandingCascadeRef = useRef(false);

  /** Modo foco (spotlight). */
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  /** Seleção para caminho: Ctrl/Cmd+clique (máx. 2). */
  const [pathEndpointA, setPathEndpointA] = useState<string | null>(null);
  const [pathEndpointB, setPathEndpointB] = useState<string | null>(null);
  const pathEndpointsRef = useRef<{ a: string | null; b: string | null }>({
    a: null,
    b: null,
  });
  pathEndpointsRef.current = { a: pathEndpointA, b: pathEndpointB };
  /** Evita toggle duplo quando Ctrl+clique dispara contextmenu + click. */
  const pathContextSelectRef = useRef<{ id: string; at: number } | null>(
    null,
  );
  const [highlightedPath, setHighlightedPath] =
    useState<ShortestPathResult | null>(null);
  const [pathMessage, setPathMessage] = useState<string | null>(null);
  /** Modo toque: toques nos nós selecionam caminho em vez de expandir. */
  const [pathSelectMode, setPathSelectMode] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const isNarrow = useIsNarrow();
  const router = useRouter();

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveNome, setSaveNome] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [openListOpen, setOpenListOpen] = useState(false);
  const [savedList, setSavedList] = useState<DiagramaVisualizacaoSalva[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [ioPending, startIoTransition] = useTransition();
  const [ioStatus, setIoStatus] = useState<string | null>(null);

  const applyLayout = useCallback(
    (
      nextNodes: DiagramNode[],
      nextEdges: DiagramEdge[],
      options?: {
        preserveExisting?: boolean;
        reorganizeAll?: boolean;
        fitView?: boolean;
      },
    ) => {
      const reorganizeAll = options?.reorganizeAll === true;
      const preserveExisting =
        options?.preserveExisting ?? (!reorganizeAll && true);
      const shouldFitView =
        options?.fitView ?? (reorganizeAll || !preserveExisting);

      const previousIds = new Set(nodesRef.current.map((n) => n.id));
      const lockedPositions = new Map<string, { x: number; y: number }>();

      if (!reorganizeAll && preserveExisting) {
        for (const node of nextNodes) {
          if (previousIds.has(node.id) || pinnedRef.current.has(node.id)) {
            lockedPositions.set(node.id, {
              x: node.position.x,
              y: node.position.y,
            });
          }
        }
        // Pins explícitos (mesmo se recriados com posição zerada).
        for (const id of pinnedRef.current) {
          const node = nextNodes.find((n) => n.id === id);
          if (node && !lockedPositions.has(id)) {
            lockedPositions.set(id, {
              x: node.position.x,
              y: node.position.y,
            });
          }
        }
      }

      if (reorganizeAll) {
        pinnedRef.current.clear();
      }

      const edgesStraight = nextEdges.map((edge) =>
        edge.type === "straight" ? edge : { ...edge, type: "straight" as const },
      );
      const laidOut = layoutDiagramaNodes(nextNodes, edgesStraight, {
        preferredHubId: rootId,
        lockedPositions:
          !reorganizeAll && preserveExisting ? lockedPositions : undefined,
        reorganizeAll,
      });
      // Atualiza refs na hora — a expansão em cascata lê nodesRef/edgesRef
      // no mesmo tick, antes do re-render do React.
      nodesRef.current = laidOut;
      edgesRef.current = edgesStraight;
      setAnimating(true);
      setNodes(laidOut);
      setEdges(edgesStraight);
      if (shouldFitView) {
        setLayoutVersion((v) => v + 1);
      }
      window.setTimeout(() => setAnimating(false), 360);
    },
    [rootId],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadRoot() {
      setLoadingRoot(true);
      setBootstrapping(false);
      setInitError(null);
      setContextMenu(null);
      vinculosCacheRef.current.clear();
      loadedCountRef.current.clear();
      collapsingRef.current = false;
      pinnedRef.current.clear();
      depthBootstrappedRef.current = null;
      setFocusNodeId(null);
      pathEndpointsRef.current = { a: null, b: null };
      setPathEndpointA(null);
      setPathEndpointB(null);
      setHighlightedPath(null);
      setPathMessage(null);

      const resumo = await getEntidadeResumo(entidadeTipo, entidadeId);
      if (cancelled) return;

      if (!resumo) {
        setInitError("Não foi possível carregar os dados desta entidade.");
        nodesRef.current = [];
        edgesRef.current = [];
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

      nodesRef.current = [rootNode];
      edgesRef.current = [];
      setNodes([rootNode]);
      setEdges([]);
      setLayoutVersion((v) => v + 1);
      setLoadingRoot(false);
    }

    void loadRoot();
    return () => {
      cancelled = true;
    };
  }, [entidadeTipo, entidadeId, rootId]);

  const resetToRoot = useCallback(() => {
    const root = nodesRef.current.find((n) => n.id === rootId);
    if (!root || !isEntidadeNode(root)) return;

    loadedCountRef.current.clear();
    collapsingRef.current = false;
    pinnedRef.current.clear();
    depthBootstrappedRef.current = null;
    setFocusNodeId(null);
    pathEndpointsRef.current = { a: null, b: null };
    setPathEndpointA(null);
    setPathEndpointB(null);
    setHighlightedPath(null);
    setPathMessage(null);
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
  }, [rootId]);

  const expandWithItems = useCallback(
    (
      parentId: string,
      allItems: VinculoDiagramItem[],
      fromOffset: number,
      layoutOpts?: { fitView?: boolean },
    ): string[] => {
      const slice = allItems.slice(
        fromOffset,
        fromOffset + DIAGRAMA_PAGE_SIZE,
      );
      const nextOffset = fromOffset + slice.length;
      loadedCountRef.current.set(parentId, nextOffset);
      const remaining = Math.max(0, allItems.length - nextOffset);

      const previousIds = new Set(nodesRef.current.map((n) => n.id));

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
      applyLayout(nextNodes, nextEdges, {
        preserveExisting: true,
        fitView: layoutOpts?.fitView,
      });

      // Filhos descobertos neste passo (para a fronteira do próximo nível).
      // Usa o grafo já sincronizado em nodesRef após applyLayout.
      return nodesRef.current
        .filter(
          (n) =>
            isEntidadeNode(n) &&
            n.id !== parentId &&
            !previousIds.has(n.id),
        )
        .map((n) => n.id);
    },
    [applyLayout],
  );

  const fetchVinculos = useCallback(
    async (nodeId: string, forceRefresh = false) => {
      const current = nodesRef.current.find((n) => n.id === nodeId);
      if (!current || !isEntidadeNode(current)) return null;
      const { entidadeTipo: tipo, entidadeId: id, restrito } = current.data;
      if (restrito) return null;

      if (!forceRefresh) {
        const cached = vinculosCacheRef.current.get(nodeId);
        if (cached) return cached;
      }

      const { data, error } = await buscarVinculosDaEntidade(tipo, id);
      if (error) return null;
      const filtered = filterVinculosByTipos(data, tiposFiltroRef.current);
      vinculosCacheRef.current.set(nodeId, filtered);
      return filtered;
    },
    [],
  );

  /**
   * Garante que todos os vínculos diretos do nó estejam na tela.
   * Usado quando o nó já está "expanded" (ex.: cascata) mas algum filho
   * foi removido manualmente — a lista real vem do banco, não do grafo.
   */
  const reconcileExpandedVinculos = useCallback(
    async (
      nodeId: string,
      layoutOpts?: { fitView?: boolean },
    ): Promise<string[]> => {
      const all = await fetchVinculos(nodeId, true);
      if (!all) {
        return nodesRef.current
          .filter(
            (n) =>
              isEntidadeNode(n) &&
              n.id !== nodeId &&
              edgesRef.current.some(
                (e) =>
                  (e.source === nodeId || e.target === nodeId) &&
                  (e.source === n.id || e.target === n.id),
              ),
          )
          .map((n) => n.id);
      }

      const missing = all.filter((v) => {
        const childId = entidadeNodeId(v.outroTipo, v.outroId);
        const edgeId = `vinculo__${v.vinculoId}`;
        const hasNode = nodesRef.current.some((n) => n.id === childId);
        const hasEdge = edgesRef.current.some((e) => e.id === edgeId);
        return !hasNode || !hasEdge;
      });

      if (missing.length > 0) {
        const connectedBefore = new Set(
          edgesRef.current
            .filter(
              (e) =>
                e.id.startsWith("vinculo__") &&
                (e.source === nodeId || e.target === nodeId),
            )
            .map((e) => (e.source === nodeId ? e.target : e.source)),
        );
        const afterCount = connectedBefore.size + missing.length;
        const remaining = Math.max(0, all.length - afterCount);

        const currentNodes = nodesRef.current.map((n) =>
          n.id === nodeId && isEntidadeNode(n)
            ? {
                ...n,
                data: { ...n.data, loading: false, expanded: true },
              }
            : n,
        );
        const { nodes: nextNodes, edges: nextEdges } = applyVinculosBatch(
          nodeId,
          missing,
          currentNodes,
          edgesRef.current,
          remaining,
        );
        loadedCountRef.current.set(nodeId, afterCount);
        applyLayout(nextNodes, nextEdges, {
          preserveExisting: true,
          fitView: layoutOpts?.fitView,
        });
      }

      return nodesRef.current
        .filter(
          (n) =>
            isEntidadeNode(n) &&
            n.id !== nodeId &&
            edgesRef.current.some(
              (e) =>
                (e.source === nodeId || e.target === nodeId) &&
                (e.source === n.id || e.target === n.id),
            ),
        )
        .map((n) => n.id);
    },
    [applyLayout, fetchVinculos],
  );

  /** Expande sem toggle (não recolhe se já expandido). */
  const expandNodeOnly = useCallback(
    async (
      nodeId: string,
      layoutOpts?: { fitView?: boolean },
    ): Promise<string[]> => {
      const current = nodesRef.current.find((n) => n.id === nodeId);
      if (!current || !isEntidadeNode(current)) return [];
      if (current.data.restrito || collapsingRef.current) return [];

      // Já expandido: reconcilia filhos faltantes a partir do banco.
      if (current.data.expanded) {
        return reconcileExpandedVinculos(nodeId, layoutOpts);
      }

      const loadingNodes = nodesRef.current.map((n) =>
        n.id === nodeId && isEntidadeNode(n)
          ? { ...n, data: { ...n.data, loading: true } }
          : n,
      );
      nodesRef.current = loadingNodes;
      setNodes(loadingNodes);

      // Sempre re-busca a lista completa no banco (não reutiliza cache
      // eventualmente desalinhado com remoções manuais da tela).
      const all = await fetchVinculos(nodeId, true);
      if (!all) {
        const cleared = nodesRef.current.map((n) =>
          n.id === nodeId && isEntidadeNode(n)
            ? { ...n, data: { ...n.data, loading: false } }
            : n,
        );
        nodesRef.current = cleared;
        setNodes(cleared);
        return [];
      }

      return expandWithItems(nodeId, all, 0, layoutOpts);
    },
    [expandWithItems, fetchVinculos, reconcileExpandedVinculos],
  );

  /**
   * Expande em cascata: nível 1 = diretos, 2 = vínculos dos vínculos, etc.
   * Acumula a fronteira em variável local (não depende do state React entre níveis).
   */
  const expandCascade = useCallback(
    async (startNodeId: string, depth: ExpandDepth, fitAtEnd = true) => {
      if (collapsingRef.current || expandingCascadeRef.current) return;
      expandingCascadeRef.current = true;
      setExpandingCascade(true);
      setContextMenu(null);
      setLinkSubmenu(null);

      try {
        let frontier = [startNodeId];
        for (let level = 0; level < depth; level++) {
          const nextFrontier: string[] = [];
          const isLast = level === depth - 1;
          for (let i = 0; i < frontier.length; i++) {
            const nodeId = frontier[i]!;
            const children = await expandNodeOnly(nodeId, {
              fitView: fitAtEnd && isLast && i === frontier.length - 1,
            });
            // Só tipos do filtro avançam como ponto de partida do próximo nível.
            const allowed = new Set(tiposFiltroRef.current);
            for (const childId of children) {
              const child = nodesRef.current.find((n) => n.id === childId);
              if (
                child &&
                isEntidadeNode(child) &&
                allowed.has(child.data.entidadeTipo)
              ) {
                nextFrontier.push(childId);
              }
            }
          }
          frontier = [...new Set(nextFrontier)];
          if (frontier.length === 0) break;
        }

        if (fitAtEnd) {
          setLayoutVersion((v) => v + 1);
        }
      } finally {
        expandingCascadeRef.current = false;
        setExpandingCascade(false);
      }
    },
    [expandNodeOnly],
  );

  const collapseNode = useCallback(
    async (nodeId: string) => {
      if (collapsingRef.current) return;
      collapsingRef.current = true;

      // Invalida o cache deste nó: a próxima expansão reconsulta o banco.
      vinculosCacheRef.current.delete(nodeId);

      const result = collapseExpansion(
        nodeId,
        nodesRef.current,
        edgesRef.current,
        rootId,
      );

      for (const id of result.removedNodeIds) {
        loadedCountRef.current.delete(id);
        pinnedRef.current.delete(id);
        vinculosCacheRef.current.delete(id);
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
      collapsingRef.current = false;
    },
    [applyLayout, rootId],
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

  const dismissNode = useCallback(
    async (nodeId: string) => {
      if (collapsingRef.current) return;

      if (nodeId === rootId) {
        shakeRootNode();
        return;
      }

      collapsingRef.current = true;

      // Pais que perdem esta aresta — o cache deles permanece (fonte completa);
      // só a tela perde o filho. Próxima expansão do pai reconsulta o banco.
      const parentIds = new Set<string>();
      for (const edge of edgesRef.current) {
        if (edge.id.startsWith("vinculo__") && edge.source === nodeId) {
          parentIds.add(edge.target);
        }
        if (edge.id.startsWith("vinculo__") && edge.target === nodeId) {
          parentIds.add(edge.source);
        }
      }

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
        pinnedRef.current.delete(id);
        vinculosCacheRef.current.delete(id);
      }
      loadedCountRef.current.delete(nodeId);
      vinculosCacheRef.current.delete(nodeId);

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

      // Se um pai ficou sem filhos de vínculo na tela, marca como recolhido
      // para o próximo clique expandir (e trazer a lista completa de volta).
      let nextNodes = result.nodes;
      for (const parentId of parentIds) {
        if (parentId === nodeId) continue;
        const stillHasChild = result.edges.some(
          (e) =>
            e.id.startsWith("vinculo__") &&
            (e.source === parentId || e.target === parentId) &&
            (e.data?.refSources?.includes(parentId) ?? true),
        );
        if (!stillHasChild) {
          loadedCountRef.current.delete(parentId);
          nextNodes = nextNodes.map((n) =>
            n.id === parentId && isEntidadeNode(n)
              ? {
                  ...n,
                  data: { ...n.data, expanded: false, loading: false },
                }
              : n,
          );
        }
      }

      applyLayout(nextNodes, result.edges);

      collapsingRef.current = false;
    },
    [applyLayout, rootId, shakeRootNode],
  );

  const expandNode = useCallback(
    async (nodeId: string) => {
      const current = nodesRef.current.find((n) => n.id === nodeId);
      if (!current || !isEntidadeNode(current)) return;
      if (current.data.restrito || current.data.loading || collapsingRef.current)
        return;

      if (current.data.expanded) {
        await collapseNode(nodeId);
        return;
      }

      await expandNodeOnly(nodeId);
    },
    [collapseNode, expandNodeOnly],
  );

  // Abertura por níveis (bootstrap único).
  useEffect(() => {
    if (loadingRoot) return;
    const key = `${rootId}:${initialExpandDepth}:${resetToken}`;
    if (depthBootstrappedRef.current === key) return;

    const root = nodesRef.current.find((n) => n.id === rootId);
    if (!root || !isEntidadeNode(root)) return;

    depthBootstrappedRef.current = key;
    setBootstrapping(true);
    void (async () => {
      await expandCascade(rootId, initialExpandDepth, true);
      setBootstrapping(false);
    })();
  }, [
    expandCascade,
    initialExpandDepth,
    loadingRoot,
    resetToken,
    rootId,
  ]);

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

  const reorganize = useCallback(() => {
    setContextMenu(null);
    applyLayout(nodesRef.current, edgesRef.current, {
      reorganizeAll: true,
      fitView: true,
    });
  }, [applyLayout]);

  const clearPendingClick = useCallback(() => {
    if (clickTimerRef.current != null) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearPendingClick();
  }, [clearPendingClick]);

  const clearFocus = useCallback(() => {
    setFocusNodeId(null);
  }, []);

  const clearPathSelection = useCallback(() => {
    pathEndpointsRef.current = { a: null, b: null };
    setPathEndpointA(null);
    setPathEndpointB(null);
    setHighlightedPath(null);
    setPathMessage(null);
  }, []);

  const applyFocus = useCallback((nodeId: string) => {
    setFocusNodeId(nodeId);
    setContextMenu(null);
    setLinkSubmenu(null);
  }, []);

  /**
   * Alterna seleção para caminho (máx. 2). Terceiro nó substitui o mais antigo.
   * Não expande/recolhe.
   */
  const togglePathEndpoint = useCallback(
    (nodeId: string) => {
      clearPendingClick();
      setHighlightedPath(null);
      setPathMessage(null);

      const { a, b } = pathEndpointsRef.current;

      if (a === nodeId) {
        pathEndpointsRef.current = { a: b, b: null };
        setPathEndpointA(b);
        setPathEndpointB(null);
        return;
      }
      if (b === nodeId) {
        pathEndpointsRef.current = { a, b: null };
        setPathEndpointB(null);
        return;
      }
      if (!a) {
        pathEndpointsRef.current = { a: nodeId, b: null };
        setPathEndpointA(nodeId);
        return;
      }
      if (!b) {
        pathEndpointsRef.current = { a, b: nodeId };
        setPathEndpointB(nodeId);
        return;
      }
      // Já há 2: descarta o mais antigo (A), B vira A, novo vira B.
      pathEndpointsRef.current = { a: b, b: nodeId };
      setPathEndpointA(b);
      setPathEndpointB(nodeId);
    },
    [clearPendingClick],
  );

  const isPathModifier = useCallback((event: {
    ctrlKey: boolean;
    metaKey: boolean;
    nativeEvent?: { ctrlKey: boolean; metaKey: boolean };
  }) => {
    const native = event.nativeEvent;
    return Boolean(
      event.ctrlKey ||
        event.metaKey ||
        native?.ctrlKey ||
        native?.metaKey,
    );
  }, []);

  const highlightPathBetweenSelected = useCallback(() => {
    if (!pathEndpointA || !pathEndpointB) {
      setPathMessage(
        "Selecione exatamente dois nós (Ctrl+clique no desktop, ou ative “Selecionar nós para caminho” no celular) para destacar o caminho.",
      );
      setHighlightedPath(null);
      return;
    }
    const result = findShortestPath(
      pathEndpointA,
      pathEndpointB,
      nodesRef.current,
      edgesRef.current,
    );
    if (!result) {
      setHighlightedPath(null);
      setPathMessage(
        "Nenhum caminho encontrado entre os nós selecionados com os dados atualmente exibidos — tente expandir mais nós.",
      );
      return;
    }
    setHighlightedPath(result);
    setPathMessage(
      result.edgeIds.length === 0
        ? "Os dois pontos são o mesmo nó."
        : `Caminho com ${result.nodeIds.length} nós e ${result.edgeIds.length} vínculo(s).`,
    );
  }, [pathEndpointA, pathEndpointB]);

  const { displayNodes, displayEdges } = useMemo(() => {
    const degrees = computeEntidadeDegrees(nodes, edges);
    let maxDegree = 0;
    for (const d of degrees.values()) {
      if (d > maxDegree) maxDegree = d;
    }

    /**
     * Foco em extremo de caminho destacado → spotlight = nós do caminho
     * (não só vizinhos diretos). Caso contrário, foco padrão (nó + 1 hop).
     */
    const focusOnPathEndpoint =
      focusNodeId != null &&
      highlightedPath != null &&
      (focusNodeId === pathEndpointA || focusNodeId === pathEndpointB);

    const focusSpotlightNodes: Set<string> | null = (() => {
      if (!focusNodeId) return null;
      if (focusOnPathEndpoint && highlightedPath) {
        return new Set(highlightedPath.nodeIds);
      }
      const neighbors = getDirectNeighbors(focusNodeId, edges);
      neighbors.add(focusNodeId);
      return neighbors;
    })();

    const pathNodeSet = highlightedPath
      ? new Set(highlightedPath.nodeIds)
      : null;
    const pathEdgeSet = highlightedPath
      ? new Set(highlightedPath.edgeIds)
      : null;

    const nextNodes: DiagramNode[] = nodes.map((node) => {
      if (!isEntidadeNode(node)) {
        const dimmed =
          focusSpotlightNodes != null && !focusSpotlightNodes.has(node.id);
        return {
          ...node,
          style: {
            ...node.style,
            opacity: dimmed ? 0.25 : 1,
          },
        };
      }

      const degree = degrees.get(node.id) ?? 0;
      const scale = degreeToScale(degree, maxDegree);
      const inFocusSpotlight =
        focusSpotlightNodes == null || focusSpotlightNodes.has(node.id);
      const onPath = pathNodeSet?.has(node.id) ?? false;
      const endpoint: "a" | "b" | null =
        node.id === pathEndpointA
          ? "a"
          : node.id === pathEndpointB
            ? "b"
            : null;

      return {
        ...node,
        style: {
          ...node.style,
          width: "fit-content",
          height: "fit-content",
          opacity: focusSpotlightNodes != null && !inFocusSpotlight ? 0.25 : 1,
          zIndex: onPath || endpoint || node.id === focusNodeId ? 12 : 1,
        },
        data: {
          ...node.data,
          degreeScale: scale,
          dimmed: false,
          pathHighlight: onPath,
          pathEndpoint: endpoint,
        },
      };
    });

    const nextEdges: DiagramEdge[] = edges.map((edge) => {
      const onPath = pathEdgeSet?.has(edge.id) ?? false;
      // Foco padrão: aresta toca o nó focado; caminho destacado permanece visível.
      // Foco em extremo de caminho: só arestas do caminho.
      const dimmedByFocus =
        focusSpotlightNodes != null &&
        (focusOnPathEndpoint
          ? !onPath
          : !(
              edge.source === focusNodeId ||
              edge.target === focusNodeId ||
              onPath
            ));

      if (onPath) {
        return {
          ...edge,
          animated: true,
          style: {
            ...edge.style,
            ...PATH_EDGE_STYLE,
            opacity: 1,
          },
          labelStyle: {
            ...edge.labelStyle,
            fill: "var(--cor-destaque-dourado)",
            fontWeight: 700,
          },
        };
      }

      if (dimmedByFocus) {
        return {
          ...edge,
          animated: false,
          style: {
            ...edge.style,
            ...DIM_EDGE_STYLE,
          },
        };
      }

      return {
        ...edge,
        animated: false,
        style: {
          ...edge.style,
          stroke: "var(--cor-diagrama-edge)",
          strokeWidth: 1.5,
          opacity: 1,
        },
      };
    });

    return { displayNodes: nextNodes, displayEdges: nextEdges };
  }, [
    nodes,
    edges,
    focusNodeId,
    highlightedPath,
    pathEndpointA,
    pathEndpointB,
  ]);

  const applyRestoredEstado = useCallback(
    (result: DiagramaRestoreResult) => {
      pinnedRef.current = new Set(result.pinnedNodeIds);
      vinculosCacheRef.current = result.vinculosCache;
      loadedCountRef.current = result.loadedCounts;
      collapsingRef.current = false;
      depthBootstrappedRef.current = `${rootId}:${initialExpandDepth}:${resetToken}`;
      setFocusNodeId(null);
      pathEndpointsRef.current = { a: null, b: null };
      setPathEndpointA(null);
      setPathEndpointB(null);
      setHighlightedPath(null);
      setPathMessage(null);
      setContextMenu(null);
      setNodes(result.nodes);
      setEdges(result.edges);
      setLayoutVersion((v) => v + 1);

    },
    [initialExpandDepth, resetToken, rootId],
  );

  const handleSaveVisualizacao = useCallback(() => {
    const nome = saveNome.trim();
    if (!nome) {
      setSaveError("Informe um nome para a visualização.");
      return;
    }
    startIoTransition(async () => {
      setSaveError(null);
      setIoStatus("Salvando…");
      const estado = serializeDiagramaEstado({
        entidadeTipo,
        entidadeId,
        nodes: nodesRef.current,
        edges: edgesRef.current,
        pinnedNodeIds: [...pinnedRef.current],
      });
      const { error } = await saveDiagramaVisualizacao({
        nome,
        entidadeTipo,
        entidadeId,
        estado,
      });
      setIoStatus(null);
      if (error) {
        setSaveError(error);
        return;
      }
      setSaveOpen(false);
      setSaveNome("");
      setIoStatus("Visualização salva.");
      window.setTimeout(() => setIoStatus(null), 2500);
    });
  }, [entidadeId, entidadeTipo, saveNome]);

  const handleOpenList = useCallback(() => {
    setOpenListOpen(true);
    setListError(null);
    setListLoading(true);
    startIoTransition(async () => {
      const { data, error } = await listDiagramaVisualizacoes({
        entidadeTipo,
        entidadeId,
      });
      setListLoading(false);
      if (error) {
        setListError(error);
        setSavedList([]);
        return;
      }
      setSavedList(data);
    });
  }, [entidadeId, entidadeTipo]);

  const handleLoadVisualizacao = useCallback(
    (row: DiagramaVisualizacaoSalva) => {
      startIoTransition(async () => {
        setListError(null);
        setIoStatus("Carregando visualização…");
        const { data: loaded, error: loadError } =
          await getDiagramaVisualizacao(row.id);
        if (loadError || !loaded?.estado_json) {
          setIoStatus(null);
          setListError(loadError ?? "Não foi possível carregar a visualização.");
          return;
        }
        const { data, error } = await restoreDiagramaEstado(loaded.estado_json);
        setIoStatus(null);
        if (error || !data) {
          setListError(error ?? "Não foi possível carregar a visualização.");
          return;
        }
        applyRestoredEstado(data);
        setOpenListOpen(false);
        setIoStatus("Visualização carregada.");
        window.setTimeout(() => setIoStatus(null), 2500);
      });
    },
    [applyRestoredEstado],
  );

  const handleDeleteVisualizacao = useCallback((id: string) => {
    startIoTransition(async () => {
      const { error } = await deleteDiagramaVisualizacao(id);
      if (error) {
        setListError(error);
        return;
      }
      setSavedList((prev) => prev.filter((r) => r.id !== id));
    });
  }, []);

  const onNodeClick = useCallback(
    (event: MouseEvent, node: DiagramNode) => {
      setContextMenu(null);
      setLinkSubmenu(null);

      const target = event.target as HTMLElement | null;
      // Ícone × — remoção explícita, sem debounce.
      if (target?.closest("[data-dismiss-node]")) {
        clearPendingClick();
        if (!isEntidadeNode(node)) return;
        if (node.data.removing || node.data.restrito || node.data.isRoot) return;
        void dismissNode(node.id);
        return;
      }

      if (node.type === "carregarMais") {
        clearPendingClick();
        const data = node.data as CarregarMaisNodeData;
        if (data.loading || data.removing) return;
        void loadMore(data.parentNodeId);
        return;
      }

      if (!isEntidadeNode(node)) return;
      if (node.data.removing) return;

      // Ctrl/Cmd+clique ou modo caminho (toque): só seleção — nunca expandir.
      if (isPathModifier(event) || pathSelectMode) {
        event.preventDefault();
        event.stopPropagation();
        clearPendingClick();
        if (!node.data.restrito) {
          const now = Date.now();
          const last = pathContextSelectRef.current;
          if (!last || last.id !== node.id || now - last.at > 400) {
            pathContextSelectRef.current = { id: node.id, at: now };
            togglePathEndpoint(node.id);
          }
        }
        return;
      }

      // Mobile: toque no corpo só expande/recolhe — não abre o Resumo.
      if (node.data.restrito) {
        clearPendingClick();
        return;
      }

      // Alt+clique → modo foco (não expande).
      if (event.altKey) {
        clearPendingClick();
        applyFocus(node.id);
        return;
      }

      // Ignora o 2º click do gesto de duplo clique (detail >= 2).
      if (event.detail !== 1) {
        return;
      }

      clearPendingClick();
      const nodeId = node.id;
      clickTimerRef.current = window.setTimeout(() => {
        clickTimerRef.current = null;
        void expandNode(nodeId);
      }, SINGLE_CLICK_DELAY_MS);
    },
    [
      applyFocus,
      clearPendingClick,
      dismissNode,
      expandNode,
      isNarrow,
      isPathModifier,
      loadMore,
      pathSelectMode,
      togglePathEndpoint,
    ],
  );

  const onNodeDoubleClick = useCallback(
    (event: MouseEvent, node: DiagramNode) => {
      event.preventDefault();
      clearPendingClick();
      setContextMenu(null);

      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-dismiss-node]")) return;

      if (node.type === "carregarMais") return;
      if (!isEntidadeNode(node)) return;
      if (node.data.removing || node.data.restrito) return;
      if (isPathModifier(event)) return;

      void dismissNode(node.id);
    },
    [
      clearPendingClick,
      dismissNode,
      isPathModifier,
    ],
  );

  const onNodeContextMenu = useCallback(
    (event: MouseEvent, node: DiagramNode) => {
      // Ctrl+clique no Mac dispara contextmenu; trata como seleção de caminho.
      if (isPathModifier(event)) {
        event.preventDefault();
        clearPendingClick();
        setContextMenu(null);
        if (
          isEntidadeNode(node) &&
          !node.data.restrito &&
          !node.data.removing
        ) {
          // Evita toggle duplo se o click também disparar em seguida.
          const now = Date.now();
          const last = pathContextSelectRef.current;
          if (!last || last.id !== node.id || now - last.at > 400) {
            pathContextSelectRef.current = { id: node.id, at: now };
            togglePathEndpoint(node.id);
          }
        }
        return;
      }

      event.preventDefault();
      clearPendingClick();
      if (!isEntidadeNode(node) || node.data.restrito || node.data.removing) {
        setContextMenu(null);
        return;
      }
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
      });
      setLinkSubmenu(null);
    },
    [
      clearPendingClick,
      isPathModifier,
      togglePathEndpoint,
    ],
  );

  const requestDismiss = useCallback(
    (nodeId: string) => {
      clearPendingClick();
      setContextMenu(null);
      void dismissNode(nodeId);
    },
    [clearPendingClick, dismissNode],
  );

  const entityHrefFromNodeId = useCallback((nodeId: string): string | null => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (!node || !isEntidadeNode(node)) return null;
    const { entidadeTipo, entidadeId } = node.data;
    return `${ENTIDADE_HREFS[entidadeTipo]}/${entidadeId}`;
  }, []);

  const openEntityPageFromContext = useCallback(
    (nodeId: string) => {
      clearPendingClick();
      setContextMenu(null);
      setLinkSubmenu(null);

      const href = entityHrefFromNodeId(nodeId);
      if (!href) return;
      void router.push(href);
    },
    [clearPendingClick, entityHrefFromNodeId, router],
  );

  const openLinkSubmenuFromAbrirPagina = useCallback(
    (event: MouseEvent, nodeId: string) => {
      event.preventDefault();
      event.stopPropagation();
      const href = entityHrefFromNodeId(nodeId);
      if (!href) return;
      setLinkSubmenu({
        x: event.clientX,
        y: event.clientY,
        href,
      });
    },
    [entityHrefFromNodeId],
  );

  const closeLinkMenus = useCallback(() => {
    setContextMenu(null);
    setLinkSubmenu(null);
  }, []);

  useEffect(() => {
    if (!contextMenu && !linkSubmenu) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeLinkMenus();
    }

    function onPointerDown(e: globalThis.MouseEvent) {
      if (contextMenusRef.current?.contains(e.target as globalThis.Node)) {
        return;
      }
      closeLinkMenus();
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [contextMenu, linkSubmenu, closeLinkMenus]);

  // Reposiciona o menu se o clique estiver perto da borda (piso/direita).
  useLayoutEffect(() => {
    if (!contextMenu) return;
    const el = contextMenuElRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const next = clampFixedMenuPosition(
      contextMenu.x,
      contextMenu.y,
      width,
      height,
    );
    if (next.x !== contextMenu.x || next.y !== contextMenu.y) {
      setContextMenu((prev) =>
        prev && prev.nodeId === contextMenu.nodeId
          ? { ...prev, x: next.x, y: next.y }
          : prev,
      );
    }
  }, [contextMenu]);

  useLayoutEffect(() => {
    if (!linkSubmenu) return;
    const el = linkSubmenuElRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const next = clampFixedMenuPosition(
      linkSubmenu.x,
      linkSubmenu.y,
      width,
      height,
    );
    if (next.x !== linkSubmenu.x || next.y !== linkSubmenu.y) {
      setLinkSubmenu((prev) =>
        prev && prev.href === linkSubmenu.href
          ? { ...prev, x: next.x, y: next.y }
          : prev,
      );
    }
  }, [linkSubmenu]);

  const onNodeDragStop = useCallback(
    (_event: globalThis.MouseEvent | globalThis.TouchEvent, node: DiagramNode) => {
      pinnedRef.current.add(node.id);
    },
    [],
  );

  const onNodesChange = useCallback((changes: NodeChange<DiagramNode>[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onPaneClick = useCallback(() => {
    setContextMenu(null);
    setLinkSubmenu(null);
    clearFocus();
  }, [clearFocus]);

  if (loadingRoot || bootstrapping) {
    return (
      <div className="diagrama-vinculos-shell flex h-[min(52vh,480px)] min-h-[320px] items-center justify-center rounded-lg border border-[var(--cor-borda)] bg-[var(--cor-fundo-secundaria)]">
        <p className="text-sm text-muted">
          {bootstrapping
            ? `Expandindo até ${initialExpandDepth} nível${initialExpandDepth > 1 ? "is" : ""}…`
            : "Carregando diagrama…"}
        </p>
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
    <DiagramaNodeActionsProvider
      dismissNode={requestDismiss}
    >
      <div className={fullScreen ? "flex h-full flex-col gap-2" : "space-y-2"}>
      <p className="hidden text-xs text-muted sm:block">
        Clique: expandir/recolher. Alt+clique: foco. Ctrl+clique (Cmd no Mac):
        marcar até 2 nós para o caminho. Duplo clique ou ×: remover. Botão
        direito: mais ações.
      </p>
      <p className="text-xs text-muted sm:hidden">
        Toque no nó: expandir/recolher. Use Ferramentas “Selecionar nós para
        caminho” para marcar A/B. Pinça para zoom; um dedo
        arrasta o canvas. × remove o nó.
      </p>
      <DiagramPathModeBanner active={pathSelectMode} />
      {pathMessage ? (
        <p
          className={`rounded border px-3 py-2 text-xs ${
            highlightedPath
              ? "border-[var(--cor-borda-destaque)] bg-[color:var(--cor-alerta-fundo)] text-muted-strong"
              : "border-danger-border bg-danger-bg text-danger-fg"
          }`}
          role="status"
        >
          {pathMessage}
        </p>
      ) : null}
      {ioStatus ? (
        <p className="text-xs text-muted" role="status">
          {ioStatus}
        </p>
      ) : null}
      <div
        className={`diagrama-vinculos-shell flex ${fullScreen ? "h-full min-h-0" : "h-[min(56vh,520px)] min-h-[340px]"} flex-col overflow-hidden rounded-lg border border-[var(--cor-borda)] sm:flex-row ${animating ? "layout-animating" : ""}`}
      >
        <div className="relative min-h-[280px] min-w-0 flex-1">
          <ReactFlow
            nodes={displayNodes}
            edges={displayEdges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeContextMenu={onNodeContextMenu}
            onNodeDragStop={onNodeDragStop}
            onNodesChange={onNodesChange}
            onPaneClick={onPaneClick}
            fitView
            fitViewOptions={{ padding: 0.4, maxZoom: 1.05 }}
            minZoom={0.2}
            maxZoom={1.6}
            nodesDraggable
            nodeDragThreshold={8}
            nodesConnectable={false}
            elementsSelectable
            panOnDrag
            zoomOnPinch
            zoomOnScroll
            zoomOnDoubleClick={false}
            selectionOnDrag={false}
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
            {showMinimap ? (
              <MiniMap
                pannable
                zoomable
                position={isNarrow ? "top-left" : "bottom-right"}
                nodeStrokeWidth={2}
                maskColor={resolveCssColor(
                  "var(--cor-diagrama-minimap-mask)",
                  "rgba(0,0,0,0.45)",
                )}
                nodeColor={(node) => {
                  if (node.type !== "entidade") {
                    return resolveCssColor("var(--cor-texto-muted)", "#888");
                  }
                  const tipo = (node.data as EntidadeNodeData | undefined)
                    ?.entidadeTipo;
                  if (!tipo) {
                    return resolveCssColor("var(--cor-destaque-dourado)");
                  }
                  return resolveCssColor(ENTIDADE_COLORS[tipo]);
                }}
              />
            ) : null}
            {showLegend ? (
              <Panel position="bottom-left">
                <DiagramLegend />
              </Panel>
            ) : null}
            {filtroLabel ? (
              <Panel
                position={isNarrow ? "top-right" : "top-left"}
                className="!m-2"
              >
                <button
                  type="button"
                  onClick={onReconfigureFiltro}
                  disabled={!onReconfigureFiltro}
                  title="Alterar filtro de tipos"
                  className="max-w-[min(72vw,16rem)] rounded border border-[var(--cor-borda-destaque)] bg-[color:var(--cor-fundo-secundaria)]/95 px-2 py-1 text-left text-[10px] leading-snug text-muted shadow-sm backdrop-blur-sm transition-colors hover:border-[var(--cor-borda-destaque)] hover:text-foreground disabled:cursor-default sm:text-[11px]"
                >
                  <span className="font-semibold text-muted-strong">
                    Filtro:{" "}
                  </span>
                  <span className="break-words">{filtroLabel}</span>
                </button>
              </Panel>
            ) : null}
            <Panel position={isNarrow ? "bottom-right" : "top-right"}>
              <DiagramToolbar
                narrow={isNarrow}
                toolsOpen={toolsOpen}
                onToolsOpenChange={setToolsOpen}
                pathSelectMode={pathSelectMode}
                onPathSelectModeChange={setPathSelectMode}
                showMinimap={showMinimap}
                onShowMinimapChange={setShowMinimap}
                showLegend={showLegend}
                onShowLegendChange={setShowLegend}
                ioPending={ioPending}
                nodesEmpty={nodes.length === 0}
                expandingCascade={expandingCascade}
                nodesCount={nodes.length}
                focusNodeId={focusNodeId}
                pathEndpointA={pathEndpointA}
                pathEndpointB={pathEndpointB}
                hasPathState={Boolean(
                  pathEndpointA || pathEndpointB || highlightedPath,
                )}
                onSave={() => {
                  setSaveError(null);
                  setSaveNome("");
                  setSaveOpen(true);
                }}
                onOpenList={handleOpenList}
                onReorganize={reorganize}
                onClearFocus={clearFocus}
                onHighlightPath={highlightPathBetweenSelected}
                onClearPath={clearPathSelection}
              />
            </Panel>
          </ReactFlow>

          {contextMenu || linkSubmenu ? (
            <div ref={contextMenusRef}>
              {contextMenu ? (
                <div
                  ref={contextMenuElRef}
                  className="fixed z-[60] min-w-[14rem] rounded-md border border-border bg-panel py-1 shadow-lg"
                  style={{ left: contextMenu.x, top: contextMenu.y }}
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-[color:var(--cor-card-fundo-hover)]"
                    onClick={() => openEntityPageFromContext(contextMenu.nodeId)}
                    onContextMenu={(e) =>
                      openLinkSubmenuFromAbrirPagina(e, contextMenu.nodeId)
                    }
                  >
                    ABRIR PÁGINA
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-[color:var(--cor-card-fundo-hover)]"
                    onClick={() => applyFocus(contextMenu.nodeId)}
                  >
                    Focar neste nó
                  </button>
                  <p className="px-3 py-1.5 text-[10px] font-medium tracking-wide text-muted uppercase">
                    Expandir a partir daqui
                  </p>
                  {([1, 2, 3] as const).map((depth) => (
                    <button
                      key={depth}
                      type="button"
                      role="menuitem"
                      disabled={expandingCascade}
                      className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-[color:var(--cor-card-fundo-hover)] disabled:opacity-50"
                      onClick={() => {
                        void expandCascade(contextMenu.nodeId, depth, true);
                      }}
                    >
                      Expandir {depth} nível{depth > 1 ? "is" : ""}
                    </button>
                  ))}
                </div>
              ) : null}

              {linkSubmenu ? (
                <div
                  ref={linkSubmenuElRef}
                  className="fixed z-[61] min-w-[14rem] rounded-md border border-border bg-panel py-1 shadow-lg"
                  style={{ left: linkSubmenu.x, top: linkSubmenu.y }}
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-[color:var(--cor-card-fundo-hover)]"
                    onClick={() => {
                      closeLinkMenus();
                      window.open(
                        linkSubmenu.href,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}
                  >
                    Abrir em nova guia
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-[color:var(--cor-card-fundo-hover)]"
                    onClick={() => {
                      closeLinkMenus();
                      window.open(
                        linkSubmenu.href,
                        "_blank",
                        "noopener,noreferrer,width=1200,height=860",
                      );
                    }}
                  >
                    Abrir em nova janela
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-[color:var(--cor-card-fundo-hover)]"
                    onClick={() => {
                      const href = new URL(
                        linkSubmenu.href,
                        window.location.origin,
                      ).href;
                      closeLinkMenus();
                      void navigator.clipboard.writeText(href).catch(() => {});
                    }}
                  >
                    Copiar endereço do link
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {saveOpen ? (
        <ModalShell
          title="Salvar visualização"
          description="Guarde o estado atual do diagrama (nós, posições e pins) para retomar depois ou compartilhar com outro analista."
          onClose={() => {
            if (!ioPending) setSaveOpen(false);
          }}
          closeOnBackdrop={!ioPending}
          zClass="z-[70]"
          labelledBy="salvar-viz-titulo"
          footer={
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={ioPending}
                onClick={() => setSaveOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={ioPending}
                onClick={handleSaveVisualizacao}
              >
                {ioPending ? "Salvando…" : "Salvar"}
              </Button>
            </>
          }
        >
          <div>
            <Label htmlFor="salvar-viz-nome">Nome</Label>
            <Input
              id="salvar-viz-nome"
              type="text"
              value={saveNome}
              onChange={(e) => setSaveNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveVisualizacao();
              }}
              placeholder="Ex.: Rede em torno do Caso Operação Lança"
              autoFocus
              disabled={ioPending}
            />
          </div>
          {saveError ? (
            <p className="mt-3 text-xs text-danger-fg">{saveError}</p>
          ) : null}
        </ModalShell>
      ) : null}

      {openListOpen ? (
        <ModalShell
          title="Visualizações salvas"
          description="Desta entidade. Qualquer analista pode abrir; só o autor ou um administrador pode excluir."
          onClose={() => {
            if (!ioPending) setOpenListOpen(false);
          }}
          closeOnBackdrop={!ioPending}
          zClass="z-[70]"
          size="lg"
          labelledBy="abrir-viz-titulo"
          footer={
            <Button
              type="button"
              variant="secondary"
              disabled={ioPending}
              onClick={() => setOpenListOpen(false)}
            >
              Fechar
            </Button>
          }
        >
          {listLoading ? (
            <p className="py-6 text-center text-sm text-muted">Carregando…</p>
          ) : listError ? (
            <p className="py-4 text-center text-sm text-danger-fg">{listError}</p>
          ) : savedList.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Nenhuma visualização salva para esta entidade.
            </p>
          ) : (
            <ul className="space-y-1">
              {savedList.map((row) => (
                <li
                  key={row.id}
                  className="flex items-start gap-2 rounded px-1 py-1 hover:bg-[color:var(--cor-card-fundo-hover)]"
                >
                  <button
                    type="button"
                    disabled={ioPending}
                    onClick={() => handleLoadVisualizacao(row)}
                    className="min-h-[44px] min-w-0 flex-1 py-2 text-left sm:min-h-0 sm:py-1"
                  >
                    <span className="block truncate text-sm font-medium text-foreground">
                      {row.nome}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted">
                      {row.usuario_nome ?? "Usuário"}
                      {" · "}
                      {formatDateTime(row.data_cadastro)}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={ioPending}
                    title="Excluir (autor ou administrador)"
                    className="shrink-0 text-[11px] text-muted hover:text-danger-fg"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Excluir a visualização “${row.nome}”?`,
                        )
                      ) {
                        handleDeleteVisualizacao(row.id);
                      }
                    }}
                  >
                    Excluir
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </ModalShell>
      ) : null}
    </div>
    </DiagramaNodeActionsProvider>
  );
}

export function DiagramaVinculos(props: Props) {
  return (
    <ReactFlowProvider>
      <DiagramaVinculosInner {...props} />
    </ReactFlowProvider>
  );
}
