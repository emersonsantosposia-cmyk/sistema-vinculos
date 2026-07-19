"use client";

import type { ReactNode } from "react";
import { ENTIDADE_COLORS } from "@/lib/entidade-visual";
import { ENTIDADE_LABELS } from "@/lib/vinculos-types";
import type { EntidadeTipo } from "@/lib/types";

const LEGEND_TIPOS: EntidadeTipo[] = [
  "pessoa",
  "endereco",
  "comunicacao",
  "veiculo",
  "empresa",
  "orcrim",
  "documento",
  "caso",
];

const toolBtnClass =
  "rounded border border-[var(--cor-borda)] bg-[var(--cor-card-fundo)] px-2.5 py-2 text-left text-[11px] font-medium tracking-wide text-muted-strong uppercase shadow-sm transition-colors hover:border-[var(--cor-borda-destaque)] hover:text-[var(--cor-destaque-dourado)] disabled:opacity-50 sm:py-1.5";

const toolBtnActiveClass =
  "rounded border border-[var(--cor-destaque-dourado)] bg-[color:var(--cor-alerta-fundo)] px-2.5 py-2 text-left text-[11px] font-medium tracking-wide text-[var(--cor-destaque-dourado)] uppercase shadow-sm transition-colors disabled:opacity-50 sm:py-1.5";

export type DiagramToolbarProps = {
  narrow: boolean;
  toolsOpen: boolean;
  onToolsOpenChange: (open: boolean) => void;
  pathSelectMode: boolean;
  onPathSelectModeChange: (active: boolean) => void;
  showMinimap: boolean;
  onShowMinimapChange: (show: boolean) => void;
  showLegend: boolean;
  onShowLegendChange: (show: boolean) => void;
  ioPending: boolean;
  nodesEmpty: boolean;
  expandingCascade: boolean;
  nodesCount: number;
  focusNodeId: string | null;
  pathEndpointA: string | null;
  pathEndpointB: string | null;
  hasPathState: boolean;
  onSave: () => void;
  onOpenList: () => void;
  onReorganize: () => void;
  onClearFocus: () => void;
  onHighlightPath: () => void;
  onClearPath: () => void;
};

function ToolButtons({
  pathSelectMode,
  onPathSelectModeChange,
  showMinimap,
  onShowMinimapChange,
  showLegend,
  onShowLegendChange,
  ioPending,
  nodesEmpty,
  expandingCascade,
  nodesCount,
  focusNodeId,
  pathEndpointA,
  pathEndpointB,
  hasPathState,
  onSave,
  onOpenList,
  onReorganize,
  onClearFocus,
  onHighlightPath,
  onClearPath,
  onAfterAction,
}: Omit<DiagramToolbarProps, "narrow" | "toolsOpen" | "onToolsOpenChange"> & {
  onAfterAction?: () => void;
}) {
  function wrap(fn: () => void) {
    return () => {
      fn();
      onAfterAction?.();
    };
  }

  return (
    <>
      <button
        type="button"
        onClick={wrap(onSave)}
        disabled={ioPending || nodesEmpty}
        className={toolBtnClass}
      >
        Salvar visualização
      </button>
      <button
        type="button"
        onClick={wrap(onOpenList)}
        disabled={ioPending}
        className={toolBtnClass}
      >
        Abrir visualização salva
      </button>
      <button
        type="button"
        onClick={wrap(onReorganize)}
        disabled={expandingCascade || nodesCount < 2}
        className={toolBtnClass}
      >
        Reorganizar automaticamente
      </button>
      {focusNodeId ? (
        <button type="button" onClick={wrap(onClearFocus)} className={toolBtnClass}>
          Remover foco
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => {
          const next = !pathSelectMode;
          onPathSelectModeChange(next);
          if (next) onAfterAction?.();
        }}
        className={pathSelectMode ? toolBtnActiveClass : toolBtnClass}
        aria-pressed={pathSelectMode}
      >
        {pathSelectMode
          ? "Modo caminho ativo — toque nos nós"
          : "Selecionar nós para caminho"}
      </button>
      <button
        type="button"
        onClick={wrap(onHighlightPath)}
        disabled={!pathEndpointA || !pathEndpointB}
        className={toolBtnClass}
      >
        Destacar caminho entre selecionados
      </button>
      {hasPathState ? (
        <button type="button" onClick={wrap(onClearPath)} className={toolBtnClass}>
          Limpar caminho
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => onShowMinimapChange(!showMinimap)}
        className={showMinimap ? toolBtnActiveClass : toolBtnClass}
        aria-pressed={showMinimap}
      >
        {showMinimap ? "Ocultar minimapa" : "Mostrar minimapa"}
      </button>
      <button
        type="button"
        onClick={() => onShowLegendChange(!showLegend)}
        className={showLegend ? toolBtnActiveClass : toolBtnClass}
        aria-pressed={showLegend}
      >
        {showLegend ? "Ocultar legenda" : "Mostrar legenda"}
      </button>
      {(pathEndpointA || pathEndpointB) && (
        <p className="px-0.5 text-[10px] leading-snug text-muted">
          {pathEndpointA && pathEndpointB
            ? "2 nós selecionados — caminho pronto"
            : pathEndpointA
              ? "1 nó selecionado — toque/Ctrl+clique em outro"
              : "Selecione 2 nós"}
        </p>
      )}
    </>
  );
}

export function DiagramToolbar(props: DiagramToolbarProps) {
  const { narrow, toolsOpen, onToolsOpenChange, ...rest } = props;

  if (!narrow) {
    return (
      <div className="!m-2 flex max-w-[16rem] flex-col gap-1.5">
        <ToolButtons {...rest} />
      </div>
    );
  }

  return (
    <div className="!m-2 flex max-w-[min(18rem,calc(100vw-5rem))] flex-col items-end gap-2">
      {toolsOpen ? (
        <div className="flex w-[min(16rem,calc(100vw-5.5rem))] flex-col gap-1.5 rounded-md border border-[var(--cor-borda)] bg-[var(--cor-card-fundo)]/95 p-2 shadow-[var(--cor-sombra-dropdown)] backdrop-blur-sm">
          <ToolButtons
            {...rest}
            onAfterAction={() => onToolsOpenChange(false)}
          />
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => onToolsOpenChange(!toolsOpen)}
        className={`inline-flex h-12 min-w-12 items-center justify-center gap-2 rounded-full border px-4 text-xs font-semibold tracking-wide uppercase shadow-[var(--cor-sombra-modal)] ${
          toolsOpen || rest.pathSelectMode
            ? "border-[var(--cor-destaque-dourado)] bg-[var(--cor-destaque-dourado)] text-gold-ink"
            : "border-[var(--cor-borda)] bg-[var(--cor-card-fundo)] text-muted-strong"
        }`}
        aria-expanded={toolsOpen}
        aria-label={toolsOpen ? "Fechar ferramentas" : "Abrir ferramentas"}
      >
        {toolsOpen ? "Fechar" : "Ferramentas"}
      </button>
    </div>
  );
}

export function DiagramLegend() {
  return (
    <div className="!m-2 max-w-[11rem] rounded-md border border-[var(--cor-borda)] bg-[var(--cor-card-fundo)]/95 px-2.5 py-2 shadow-sm backdrop-blur-sm">
      <p className="mb-1.5 text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">
        Legenda
      </p>
      <ul className="space-y-1">
        {LEGEND_TIPOS.map((tipo) => (
          <li
            key={tipo}
            className="flex items-center gap-2 text-[10px] text-muted-strong"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: ENTIDADE_COLORS[tipo] }}
              aria-hidden
            />
            {ENTIDADE_LABELS[tipo]}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DiagramPathModeBanner({
  active,
  children,
}: {
  active: boolean;
  children?: ReactNode;
}) {
  if (!active) return null;
  return (
    <p
      className="rounded border border-[var(--cor-borda-destaque)] bg-[color:var(--cor-alerta-fundo)] px-3 py-2 text-xs text-muted-strong"
      role="status"
    >
      {children ??
        "Modo caminho ativo: toque em até 2 nós para selecionar. Depois use “Destacar caminho”."}
    </p>
  );
}
