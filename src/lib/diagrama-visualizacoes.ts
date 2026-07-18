import type { EntidadeTipo } from "@/lib/types";

export const DIAGRAMA_ESTADO_VERSION = 1 as const;

export type DiagramaEstadoSalvoNode = {
  id: string;
  type: "entidade";
  position: { x: number; y: number };
  data: {
    entidadeTipo: EntidadeTipo;
    entidadeId: string;
    titulo: string;
    subtitulo?: string | null;
    foto_perfil_path?: string | null;
    foto_url?: string | null;
    restrito?: boolean;
    expanded?: boolean;
    isRoot?: boolean;
    refSources: string[];
  };
};

export type DiagramaEstadoSalvoEdge = {
  id: string;
  source: string;
  target: string;
  type?: "straight";
  label?: string | null;
  data: {
    refSources: string[];
  };
};

/** Conteúdo de `estado_json`. */
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
  estado_json: DiagramaEstadoSalvo;
  usuario_cadastro: string | null;
  data_cadastro: string;
  /** Preenchido na listagem via get_user_display_names. */
  usuario_nome?: string | null;
};

export function isDiagramaEstadoSalvo(
  value: unknown,
): value is DiagramaEstadoSalvo {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === 1 &&
    Array.isArray(v.nodes) &&
    Array.isArray(v.edges) &&
    Array.isArray(v.pinnedNodeIds) &&
    typeof v.root === "object" &&
    v.root != null
  );
}
