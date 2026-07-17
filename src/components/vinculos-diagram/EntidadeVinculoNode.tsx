"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { EntidadeTipoIcon } from "@/components/dashboard/EntityIcons";
import { PessoaAvatar } from "@/components/pessoas/PessoaAvatar";
import { VeiculoAvatar } from "@/components/veiculos/VeiculoAvatar";
import { ENTIDADE_COLORS } from "@/lib/entidade-visual";
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

function EntidadeVinculoNodeComponent({
  data,
  selected,
}: NodeProps<EntidadeFlowNode>) {
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
  } = data;

  const accent = restrito
    ? "var(--cor-restrito)"
    : ENTIDADE_COLORS[entidadeTipo];
  const showPhoto =
    !restrito &&
    (entidadeTipo === "pessoa" || entidadeTipo === "veiculo");

  const borderClass = restrito
    ? "border-[color:var(--cor-restrito-borda)] bg-[color:var(--cor-card-fundo-suave)] cursor-default"
    : expanded
      ? "border-[var(--cor-borda-destaque)] shadow-[0_0_0_1px_var(--cor-borda-destaque)] cursor-pointer"
      : isRoot
        ? "border-[var(--cor-borda-destaque)] shadow-[0_0_12px_var(--cor-borda-destaque)] cursor-pointer"
        : "border-[var(--cor-borda)] hover:border-[var(--cor-borda-destaque)] cursor-pointer";

  return (
    <div
      className={`relative w-[196px] rounded-lg border bg-[var(--cor-card-fundo)] px-3 py-2.5 transition-colors ${borderClass} ${selected && !restrito ? "ring-1 ring-[var(--cor-destaque-dourado)]/40" : ""} ${removing ? "diagrama-node-removing" : ""} ${shaking ? "diagrama-node-shake" : ""}`}
      title={
        restrito
          ? titulo
          : isRoot
            ? "Nó inicial — não pode ser removido"
            : undefined
      }
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border !border-[var(--cor-borda)] !bg-[var(--cor-fundo-secundaria)]"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border !border-[var(--cor-borda)] !bg-[var(--cor-fundo-secundaria)]"
      />

      {loading ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[color:var(--cor-diagrama-node-overlay)]"
          aria-live="polite"
          aria-label="Carregando vínculos"
        >
          <Spinner className="h-6 w-6 text-[var(--cor-destaque-dourado)]" />
        </div>
      ) : null}

      <div className="flex items-start gap-2.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor: restrito
              ? "var(--cor-restrito-fundo)"
              : `color-mix(in srgb, ${accent} 18%, transparent)`,
            color: restrito ? "var(--cor-restrito-texto)" : accent,
          }}
        >
          {restrito ? (
            <LockIcon className="h-4 w-4" />
          ) : (
            <EntidadeTipoIcon tipo={entidadeTipo} className="h-4 w-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium tracking-wide text-muted uppercase">
            {ENTIDADE_LABELS[entidadeTipo]}
          </p>
          <p
            className={`mt-0.5 line-clamp-2 text-sm leading-snug font-medium ${restrito ? "text-muted" : "text-foreground"}`}
          >
            {titulo}
          </p>
          {!restrito && subtitulo ? (
            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted">
              {subtitulo}
            </p>
          ) : null}
        </div>

        {showPhoto ? (
          <div className="shrink-0">
            {entidadeTipo === "pessoa" ? (
              <PessoaAvatar
                path={foto_perfil_path}
                nome={titulo}
                size="sm"
              />
            ) : (
              <VeiculoAvatar path={foto_url} alt={titulo} size="sm" />
            )}
          </div>
        ) : null}
      </div>

      {!restrito && expanded ? (
        <div
          className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border border-[var(--cor-card-fundo)]"
          style={{ backgroundColor: accent }}
          title="Vínculos já expandidos — clique para recolher"
          aria-hidden
        />
      ) : null}
    </div>
  );
}

export const EntidadeVinculoNode = memo(EntidadeVinculoNodeComponent);
