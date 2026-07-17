"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type CarregarMaisNodeData = {
  parentNodeId: string;
  remaining: number;
  loading?: boolean;
  /** Expansões que mantêm este nó (sempre o pai). */
  refSources: string[];
  removing?: boolean;
};

export type CarregarMaisFlowNode = Node<CarregarMaisNodeData, "carregarMais">;

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

function CarregarMaisNodeComponent({ data }: NodeProps<CarregarMaisFlowNode>) {
  const { remaining, loading, removing } = data;

  return (
    <div
      className={`relative w-[188px] cursor-pointer rounded-lg border border-dashed border-[var(--cor-borda-destaque)] bg-[color:var(--cor-diagrama-legenda-bg)] px-3 py-2.5 text-center transition-colors hover:border-[var(--cor-destaque-dourado)] hover:bg-[var(--cor-card-fundo-hover)] ${removing ? "diagrama-node-removing" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border !border-[var(--cor-borda)] !bg-[var(--cor-fundo-secundaria)]"
      />
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-1">
          <Spinner className="h-4 w-4 text-[var(--cor-destaque-dourado)]" />
          <span className="text-xs text-muted">Carregando…</span>
        </div>
      ) : (
        <>
          <p className="text-sm font-medium text-[var(--cor-destaque-dourado)]">
            + {remaining} vínculo{remaining === 1 ? "" : "s"}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            Clique para carregar mais
          </p>
        </>
      )}
    </div>
  );
}

export const CarregarMaisNode = memo(CarregarMaisNodeComponent);
