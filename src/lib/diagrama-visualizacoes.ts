import type { EntidadeTipo } from "@/lib/types";

/** Versão atual do snapshot — sem títulos/nomes/fotos cacheados. */
export const DIAGRAMA_ESTADO_VERSION = 2 as const;

/** Campos de conteúdo de entidade que nunca devem ir para estado_json. */
const FORBIDDEN_NODE_DATA_KEYS = [
  "titulo",
  "subtitulo",
  "foto_perfil_path",
  "foto_url",
  "restrito",
  "nome",
  "label",
] as const;

export type DiagramaEstadoSalvoNode = {
  id: string;
  type: "entidade";
  position: { x: number; y: number };
  data: {
    entidadeTipo: EntidadeTipo;
    entidadeId: string;
    /** Estrutural: nó estava expandido ao salvar. */
    expanded?: boolean;
    /** Estrutural: nó raiz da exploração. */
    isRoot?: boolean;
    /** Estrutural: origens de expansão no grafo. */
    refSources: string[];
  };
};

export type DiagramaEstadoSalvoEdge = {
  id: string;
  source: string;
  target: string;
  type?: "straight";
  data: {
    refSources: string[];
  };
};

/** Conteúdo de `estado_json` — só estrutura, sem rótulos de entidade. */
export type DiagramaEstadoSalvo = {
  version: typeof DIAGRAMA_ESTADO_VERSION;
  root: {
    entidadeTipo: EntidadeTipo;
    entidadeId: string;
  };
  pinnedNodeIds: string[];
  nodes: DiagramaEstadoSalvoNode[];
  edges: DiagramaEstadoSalvoEdge[];
};

export type DiagramaVisualizacaoSalva = {
  id: string;
  nome: string;
  entidade_inicial_tipo: EntidadeTipo;
  entidade_inicial_id: string;
  /** Presente só ao carregar uma visualização específica (não na listagem). */
  estado_json?: DiagramaEstadoSalvo;
  usuario_cadastro: string | null;
  data_cadastro: string;
  /** Preenchido na listagem via get_user_display_names. */
  usuario_nome?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asEntidadeTipo(value: unknown): EntidadeTipo | null {
  if (typeof value !== "string") return null;
  const allowed: EntidadeTipo[] = [
    "pessoa",
    "empresa",
    "endereco",
    "veiculo",
    "documento",
    "caso",
    "comunicacao",
    "orcrim",
  ];
  return (allowed as string[]).includes(value)
    ? (value as EntidadeTipo)
    : null;
}

/** Aceita v1 (legado) e v2. */
export function isDiagramaEstadoSalvo(
  value: unknown,
): value is DiagramaEstadoSalvo {
  if (!isRecord(value)) return false;
  const version = value.version;
  if (version !== 1 && version !== 2) return false;
  if (!Array.isArray(value.nodes) || !Array.isArray(value.edges)) return false;
  if (!Array.isArray(value.pinnedNodeIds)) return false;
  if (!isRecord(value.root)) return false;
  return (
    asEntidadeTipo(value.root.entidadeTipo) != null &&
    typeof value.root.entidadeId === "string"
  );
}

/**
 * Remove títulos/nomes/fotos/rótulos e normaliza para a versão atual.
 * Usado ao salvar, ao ler da API e na migration de limpeza (espelho TS).
 */
export function sanitizeDiagramaEstado(
  value: unknown,
): DiagramaEstadoSalvo | null {
  if (!isDiagramaEstadoSalvo(value)) return null;

  const rootTipo = asEntidadeTipo(value.root.entidadeTipo);
  const rootId = value.root.entidadeId;
  if (!rootTipo || typeof rootId !== "string") return null;

  const nodes: DiagramaEstadoSalvoNode[] = [];
  for (const raw of value.nodes) {
    if (!isRecord(raw) || raw.type !== "entidade") continue;
    if (!isRecord(raw.position) || !isRecord(raw.data)) continue;
    const tipo = asEntidadeTipo(raw.data.entidadeTipo);
    const id = raw.data.entidadeId;
    if (!tipo || typeof id !== "string") continue;
    const x = Number(raw.position.x);
    const y = Number(raw.position.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    const refSources = Array.isArray(raw.data.refSources)
      ? raw.data.refSources.filter((r): r is string => typeof r === "string")
      : [];

    nodes.push({
      id: typeof raw.id === "string" ? raw.id : `entidade__${tipo}__${id}`,
      type: "entidade",
      position: { x, y },
      data: {
        entidadeTipo: tipo,
        entidadeId: id,
        expanded: Boolean(raw.data.expanded),
        isRoot: Boolean(raw.data.isRoot),
        refSources,
      },
    });
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: DiagramaEstadoSalvoEdge[] = [];
  for (const raw of value.edges) {
    if (!isRecord(raw)) continue;
    if (typeof raw.id !== "string") continue;
    if (typeof raw.source !== "string" || typeof raw.target !== "string") {
      continue;
    }
    if (!nodeIds.has(raw.source) || !nodeIds.has(raw.target)) continue;
    const edgeData: Record<string, unknown> = isRecord(raw.data)
      ? raw.data
      : {};
    const refSources = Array.isArray(edgeData.refSources)
      ? edgeData.refSources.filter((r): r is string => typeof r === "string")
      : [];
    edges.push({
      id: raw.id,
      source: raw.source,
      target: raw.target,
      type: "straight",
      data: { refSources },
    });
  }

  const pinnedNodeIds = value.pinnedNodeIds.filter(
    (id): id is string => typeof id === "string" && nodeIds.has(id),
  );

  return {
    version: DIAGRAMA_ESTADO_VERSION,
    root: { entidadeTipo: rootTipo, entidadeId: rootId },
    pinnedNodeIds,
    nodes,
    edges,
  };
}

/** True se o JSON ainda contém campos de conteúdo de entidade (legado). */
export function estadoJsonTemRotulosCacheados(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.nodes)) return false;
  for (const raw of value.nodes) {
    if (!isRecord(raw) || !isRecord(raw.data)) continue;
    for (const key of FORBIDDEN_NODE_DATA_KEYS) {
      if (key in raw.data && raw.data[key] != null && raw.data[key] !== "") {
        return true;
      }
    }
  }
  if (Array.isArray(value.edges)) {
    for (const raw of value.edges) {
      if (isRecord(raw) && typeof raw.label === "string" && raw.label) {
        return true;
      }
    }
  }
  return false;
}
