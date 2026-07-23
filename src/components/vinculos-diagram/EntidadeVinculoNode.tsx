"use client";

import { memo } from "react";
import {
  Handle,
  Position,
  useNodeId,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { EntidadeTipoIcon } from "@/components/dashboard/EntityIcons";
import { useDiagramaNodeActions } from "@/components/vinculos-diagram/DiagramaNodeActions";
import { PessoaAvatar } from "@/components/pessoas/PessoaAvatar";
import { EntidadeStorageAvatar } from "@/components/shared/EntidadeStorageAvatar";
import { VeiculoAvatar } from "@/components/veiculos/VeiculoAvatar";
import { ENTIDADE_COLORS } from "@/lib/entidade-visual";
import { fotoBucketForEntidade } from "@/lib/entity-fotos";
import { ENTIDADE_LABELS } from "@/lib/vinculos-types";
import type { EntidadeTipo } from "@/lib/types";

export type EntidadeNodeData = {
  entidadeTipo: EntidadeTipo;
  entidadeId: string;
  titulo: string;
  subtitulo?: string | null;
  foto_perfil_path?: string | null;
  foto_url?: string | null;
  restrito?: boolean;
  loading?: boolean;
  expanded?: boolean;
  isRoot?: boolean;
  /**
   * Expansões ativas que mantêm este nó na tela.
   * O tamanho do array é o contador de referências.
   */
  refSources: string[];
  /** Fade-out antes da remoção. */
  removing?: boolean;
  /** Feedback visual quando a remoção da raiz é bloqueada. */
  shaking?: boolean;
  /** Escala visual pelo grau de conexão (~0.92–1.35). */
  degreeScale?: number;
  /** Modo foco: nó fora do spotlight. */
  dimmed?: boolean;
  /** Nó no caminho destacado. */
  pathHighlight?: boolean;
  /** Extremidade A/B da seleção de caminho. */
  pathEndpoint?: "a" | "b" | null;
  /**
   * Cor da comunidade (anel externo). Independente da cor do tipo
   * (avatar). Null/undefined = sem agrupamento ativo.
   */
  communityColor?: string | null;
};

export type EntidadeFlowNode = Node<EntidadeNodeData, "entidade">;

function LockIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 118 0v3" />
    </svg>
  );
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"
      />
    </svg>
  );
}

/** Avatar único: foto no círculo (com anel colorido) ou ícone do tipo. */
function NodeAvatar({
  entidadeTipo,
  titulo,
  foto_perfil_path,
  foto_url,
  restrito,
  accent,
}: {
  entidadeTipo: EntidadeTipo;
  titulo: string;
  foto_perfil_path?: string | null;
  foto_url?: string | null;
  restrito?: boolean;
  accent: string;
}) {
  const pessoaFoto =
    !restrito && entidadeTipo === "pessoa" && foto_perfil_path
      ? foto_perfil_path
      : null;
  const veiculoFoto =
    !restrito && entidadeTipo === "veiculo" && foto_url ? foto_url : null;
  const storageBucket =
    !restrito && !pessoaFoto && !veiculoFoto && foto_url
      ? fotoBucketForEntidade(entidadeTipo)
      : null;
  const storageFoto = storageBucket && foto_url ? foto_url : null;
  const hasPhoto = Boolean(pessoaFoto || veiculoFoto || storageFoto);

  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border-2"
      style={{
        borderColor: accent,
        backgroundColor: restrito
          ? "var(--cor-restrito-fundo)"
          : hasPhoto
            ? "var(--cor-card-fundo)"
            : `color-mix(in srgb, ${accent} 18%, transparent)`,
        color: restrito ? "var(--cor-restrito-texto)" : accent,
      }}
    >
      {restrito ? (
        <LockIcon className="h-3.5 w-3.5" />
      ) : pessoaFoto ? (
        <PessoaAvatar
          path={pessoaFoto}
          nome={titulo}
          size="sm"
          className="!h-full !w-full !rounded-none !border-0"
        />
      ) : veiculoFoto ? (
        <VeiculoAvatar
          path={veiculoFoto}
          alt={titulo}
          size="sm"
          className="!h-full !w-full !rounded-none !border-0"
        />
      ) : storageFoto && storageBucket ? (
        <EntidadeStorageAvatar
          bucket={storageBucket}
          path={storageFoto}
          alt={titulo}
          size="sm"
          className="!h-full !w-full !rounded-none !border-0"
        />
      ) : (
        <EntidadeTipoIcon tipo={entidadeTipo} className="h-3.5 w-3.5" />
      )}
    </div>
  );
}

function EntidadeVinculoNodeComponent({
  data,
  selected,
}: NodeProps<EntidadeFlowNode>) {
  const nodeId = useNodeId();
  const actions = useDiagramaNodeActions();
  const {
    entidadeTipo,
    titulo,
    subtitulo,
    foto_perfil_path,
    foto_url,
    restrito,
    loading,
    expanded,
    isRoot,
    removing,
    shaking,
    degreeScale = 1,
    pathHighlight,
    pathEndpoint,
    communityColor,
  } = data;

  const accent = restrito
    ? "var(--cor-restrito)"
    : ENTIDADE_COLORS[entidadeTipo];

  const borderClass = restrito
    ? "border-[color:var(--cor-restrito-borda)] bg-[color:var(--cor-card-fundo-suave)] cursor-default"
    : pathHighlight
      ? "border-[var(--cor-destaque-dourado)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--cor-destaque-dourado)_45%,transparent)] cursor-pointer"
      : pathEndpoint
        ? "diagrama-path-endpoint border-[var(--cor-destaque-dourado)] cursor-pointer"
        : expanded
          ? "border-[var(--cor-borda-destaque)] shadow-[0_0_0_1px_var(--cor-borda-destaque)] cursor-pointer"
          : isRoot
            ? "border-2 border-[var(--cor-destaque-dourado)] shadow-[0_0_18px_color-mix(in_srgb,var(--cor-destaque-dourado)_55%,transparent)] cursor-pointer"
            : "border-[var(--cor-borda)] hover:border-[var(--cor-borda-destaque)] cursor-pointer";

  const communityRingStyle = communityColor
    ? {
        boxShadow: `0 0 0 2px ${communityColor}, 0 0 0 5px color-mix(in srgb, ${communityColor} 28%, transparent)`,
      }
    : undefined;

  const tooltip = [
    ENTIDADE_LABELS[entidadeTipo],
    titulo,
    !restrito && subtitulo ? subtitulo : null,
    restrito
      ? null
      : isRoot
        ? "Nó inicial — não pode ser removido"
        : pathEndpoint === "a"
          ? "Selecionado para caminho (A) — toque/Ctrl+clique para desmarcar"
          : pathEndpoint === "b"
            ? "Selecionado para caminho (B) — toque/Ctrl+clique para desmarcar"
            : null,
  ]
    .filter(Boolean)
    .join(" — ");

  return (
    <div
      className="diagrama-entidade-node"
      style={{
        transform: degreeScale !== 1 ? `scale(${degreeScale})` : undefined,
        transformOrigin: "center center",
      }}
    >
      <div
        className={`group relative box-border inline-flex max-w-[280px] min-h-[44px] min-w-[168px] items-center gap-2.5 rounded-md border bg-[var(--cor-card-fundo)] p-3 transition-[box-shadow,border-color] sm:max-w-[260px] sm:min-w-[160px] sm:p-2.5 ${borderClass} ${selected && !restrito ? "ring-1 ring-[var(--cor-destaque-dourado)]/40" : ""} ${removing ? "diagrama-node-removing" : ""} ${shaking ? "diagrama-node-shake" : ""}`}
        style={communityRingStyle}
        title={tooltip}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="!pointer-events-none !h-2 !w-2 !border-0 !bg-transparent !opacity-0"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="!pointer-events-none !h-2 !w-2 !border-0 !bg-transparent !opacity-0"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {!restrito && !isRoot ? (
          <button
            type="button"
            data-dismiss-node
            className="diagrama-dismiss-btn nodrag nopan absolute -top-3 -right-3 z-20 flex h-11 w-11 items-center justify-center rounded-full text-muted transition-opacity sm:-top-2 sm:-right-2 sm:h-5 sm:w-5 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            aria-label="Remover nó do diagrama"
            title="Remover do diagrama"
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (nodeId) actions?.dismissNode(nodeId);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--cor-borda)] bg-[var(--cor-card-fundo)] text-base leading-none shadow-sm sm:h-5 sm:w-5 sm:text-sm hover:border-danger-border hover:bg-danger-bg hover:text-danger-fg">
              ×
            </span>
          </button>
        ) : null}

        {loading ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-[color:var(--cor-diagrama-node-overlay)]"
            aria-live="polite"
            aria-label="Carregando vínculos"
          >
            <Spinner className="h-5 w-5 text-[var(--cor-destaque-dourado)]" />
          </div>
        ) : null}

        <NodeAvatar
          entidadeTipo={entidadeTipo}
          titulo={titulo}
          foto_perfil_path={foto_perfil_path}
          foto_url={foto_url}
          restrito={restrito}
          accent={accent}
        />

        <div className="min-w-0 overflow-hidden">
          <p className="truncate text-[8px] leading-none font-medium tracking-wide text-muted uppercase">
            {ENTIDADE_LABELS[entidadeTipo]}
          </p>
          <p
            className={`mt-0.5 truncate text-[11px] leading-tight font-medium ${restrito ? "text-muted" : "text-foreground"}`}
            title={titulo}
          >
            {titulo}
          </p>
          {!restrito && subtitulo ? (
            <p
              className="mt-0.5 truncate text-[9px] leading-tight text-muted"
              title={subtitulo}
            >
              {subtitulo}
            </p>
          ) : null}
        </div>

        {!restrito && expanded ? (
          <div
            className="absolute top-1 left-1 h-1.5 w-1.5 rounded-full border border-[var(--cor-card-fundo)] sm:left-1"
            style={{ backgroundColor: accent }}
            title="Vínculos já expandidos — clique para recolher"
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  );
}

export const EntidadeVinculoNode = memo(EntidadeVinculoNodeComponent);
