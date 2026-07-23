"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  DiagramaVinculos,
  type ExpandDepth,
} from "@/components/vinculos-diagram/DiagramaVinculos";
import { clampFixedMenuPosition } from "@/lib/clamp-fixed-menu";
import { allEntidadeTipos, ENTIDADE_TIPOS, type EntidadeTipo } from "@/lib/types";
import {
  ENTIDADE_HREFS,
  ENTIDADE_VINCULOS_TITULOS,
  isFiltroTiposCompleto,
} from "@/lib/vinculos-types";

type Props = {
  entidadeTipo: EntidadeTipo;
  entidadeId: string;
};

type OverlayPhase = "closed" | "setup" | "diagram";

const DEPTH_OPTIONS: { value: ExpandDepth; label: string; hint: string }[] = [
  {
    value: 1,
    label: "1 nível",
    hint: "Somente vínculos diretos da entidade",
  },
  {
    value: 2,
    label: "2 níveis",
    hint: "Diretos + vínculos dos vínculos",
  },
  {
    value: 3,
    label: "3 níveis",
    hint: "Três camadas de expansão em cascata",
  },
];

function diagramaPath(entidadeTipo: EntidadeTipo, entidadeId: string): string {
  return `${ENTIDADE_HREFS[entidadeTipo]}/${entidadeId}?diagrama=1`;
}

function syncDiagramaQuery(open: boolean) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (open) url.searchParams.set("diagrama", "1");
  else url.searchParams.delete("diagrama");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(null, "", next);
}

function sortedTiposKey(tipos: EntidadeTipo[]): string {
  return [...tipos].sort().join(",");
}

export function VinculosDiagramPanel({ entidadeTipo, entidadeId }: Props) {
  const [phase, setPhase] = useState<OverlayPhase>("closed");
  const [resetToken, setResetToken] = useState(0);
  const [expandDepth, setExpandDepth] = useState<ExpandDepth>(1);
  const [pendingDepth, setPendingDepth] = useState<ExpandDepth>(1);
  const [expandTipos, setExpandTipos] = useState<EntidadeTipo[]>([]);
  const [pendingTipos, setPendingTipos] = useState<EntidadeTipo[]>([]);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [setupFromDiagram, setSetupFromDiagram] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const open = phase !== "closed";
  const pathComDiagrama = diagramaPath(entidadeTipo, entidadeId);
  const pendingAllSelected = isFiltroTiposCompleto(pendingTipos);
  const canOpen = pendingTipos.length > 0;

  const openSetup = useCallback(() => {
    setResetToken(0);
    setPendingDepth(1);
    setPendingTipos([]);
    setSetupFromDiagram(false);
    setPhase("setup");
    syncDiagramaQuery(true);
  }, []);

  const reopenSetupFromDiagram = useCallback(() => {
    setPendingDepth(expandDepth);
    setPendingTipos([...expandTipos]);
    setSetupFromDiagram(true);
    setPhase("setup");
  }, [expandDepth, expandTipos]);

  const closeOverlay = useCallback(() => {
    setPhase("closed");
    syncDiagramaQuery(false);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("diagrama") === "1") {
      setResetToken(0);
      setPendingDepth(1);
      setPendingTipos([]);
      setPhase("setup");
    }
  }, [entidadeTipo, entidadeId]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeOverlay();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closeOverlay]);

  useEffect(() => {
    if (!menu) return;

    function close() {
      setMenu(null);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    function onPointerDown(e: MouseEvent) {
      if (menuRef.current?.contains(e.target as Node)) return;
      close();
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("scroll", close, true);
    };
  }, [menu]);

  useLayoutEffect(() => {
    if (!menu) return;
    const el = menuRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const next = clampFixedMenuPosition(menu.x, menu.y, width, height);
    if (next.x !== menu.x || next.y !== menu.y) {
      setMenu(next);
    }
  }, [menu]);

  function openContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  }

  function linkAbsoluto(): string {
    return new URL(pathComDiagrama, window.location.origin).href;
  }

  function togglePendingTipo(tipo: EntidadeTipo) {
    setPendingTipos((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo],
    );
  }

  const diagramKey = useMemo(
    () =>
      `${entidadeTipo}-${entidadeId}-${resetToken}-${expandDepth}-${sortedTiposKey(expandTipos)}`,
    [entidadeTipo, entidadeId, resetToken, expandDepth, expandTipos],
  );

  return (
    <>
      <button
        type="button"
        onClick={openSetup}
        onContextMenu={openContextMenu}
        className="group flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--cor-borda-destaque)] bg-[color:var(--cor-alerta-fundo)] px-4 py-3 text-left transition-colors hover:bg-[color:var(--cor-card-fundo-hover)]"
      >
        <span>
          <span className="block text-sm font-semibold text-[var(--cor-destaque-dourado-claro)]">
            Ver diagrama de vínculos
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            Explore a rede em tela cheia com expansão interativa.
          </span>
        </span>
        <span
          className="rounded-full border border-[var(--cor-borda-destaque)] px-2 py-1 text-xs text-[var(--cor-destaque-dourado)] transition-colors group-hover:bg-[color:var(--cor-alerta-fundo)]"
          aria-hidden
        >
          Abrir
        </span>
      </button>

      {menu ? (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[11rem] rounded border border-border bg-panel py-1 shadow-[var(--cor-sombra-dropdown)]"
          style={{ left: menu.x, top: menu.y }}
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-panel-hover"
            onClick={() => {
              setMenu(null);
              openSetup();
            }}
          >
            Abrir
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-panel-hover"
            onClick={() => {
              setMenu(null);
              window.open(pathComDiagrama, "_blank", "noopener,noreferrer");
            }}
          >
            Abrir em nova aba
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-panel-hover"
            onClick={() => {
              setMenu(null);
              window.open(
                pathComDiagrama,
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
            className="block w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-panel-hover"
            onClick={() => {
              setMenu(null);
              void navigator.clipboard.writeText(linkAbsoluto()).catch(() => {});
            }}
          >
            Copiar endereço do link
          </button>
        </div>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-[1100] flex flex-col bg-[var(--cor-fundo-primaria)]"
          role="dialog"
          aria-modal="true"
          aria-label="Diagrama de vínculos em tela cheia"
        >
          <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-[color:var(--cor-fundo-secundaria)] px-4 py-3 shadow-lg">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted uppercase">
                Diagrama de vínculos
              </p>
              <h2 className="text-base font-semibold text-foreground">
                {phase === "setup"
                  ? "Configurar abertura"
                  : "Exploração da rede da entidade"}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle compact />
              {phase === "diagram" ? (
                <>
                  <button
                    type="button"
                    onClick={reopenSetupFromDiagram}
                    className="btn-acao-secundario"
                    title="Alterar níveis e tipos de entidade"
                  >
                    Configurar
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetToken((value) => value + 1)}
                    className="btn-acao-secundario"
                  >
                    Recolher tudo
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={closeOverlay}
                className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded border border-[var(--cor-borda)] bg-panel text-lg leading-none text-muted transition-colors hover:border-[var(--cor-borda-destaque)] hover:text-foreground sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0"
                aria-label="Fechar diagrama"
              >
                ×
              </button>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
            {phase === "setup" ? (
              <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center gap-6 py-2">
                <div>
                  <p className="text-sm text-muted">
                    Escolha até quantos níveis expandir e quais tipos de
                    entidade incluir. O nó de origem sempre aparece. Por
                    padrão, todos os tipos estão selecionados (sem filtro).
                  </p>
                </div>

                <fieldset className="space-y-2">
                  <legend className="mb-1 text-xs font-semibold tracking-wide text-muted-strong uppercase">
                    Níveis iniciais
                  </legend>
                  {DEPTH_OPTIONS.map((opt) => {
                    const active = pendingDepth === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-md border px-3 py-3 transition-colors ${
                          active
                            ? "border-[var(--cor-borda-destaque)] bg-[color:var(--cor-alerta-fundo)]"
                            : "border-border bg-panel hover:border-[var(--cor-borda-destaque)]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="expand-depth"
                          value={opt.value}
                          checked={active}
                          onChange={() => setPendingDepth(opt.value)}
                          className="mt-1 h-4 w-4"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-foreground">
                            {opt.label}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted">
                            {opt.hint}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </fieldset>

                <fieldset>
                  <legend className="mb-2 w-full text-xs font-semibold tracking-wide text-muted-strong uppercase">
                    Tipos de entidade
                  </legend>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      className="btn-acao-secundario text-xs"
                      onClick={() => setPendingTipos(allEntidadeTipos())}
                      disabled={pendingAllSelected}
                    >
                      Selecionar todos
                    </button>
                    <button
                      type="button"
                      className="btn-acao-secundario text-xs"
                      onClick={() => setPendingTipos([])}
                      disabled={pendingTipos.length === 0}
                    >
                      Limpar seleção
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {ENTIDADE_TIPOS.map((tipo) => {
                      const checked = pendingTipos.includes(tipo);
                      return (
                        <label
                          key={tipo}
                          className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 transition-colors ${
                            checked
                              ? "border-[var(--cor-borda-destaque)] bg-[color:var(--cor-alerta-fundo)]"
                              : "border-border bg-panel hover:border-[var(--cor-borda-destaque)]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePendingTipo(tipo)}
                            className="h-4 w-4 shrink-0"
                          />
                          <span className="text-sm font-medium text-foreground">
                            {ENTIDADE_VINCULOS_TITULOS[tipo]}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {!canOpen ? (
                    <p className="mt-2 text-xs text-danger-fg">
                      Selecione ao menos um tipo de entidade.
                    </p>
                  ) : null}
                </fieldset>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-acao"
                    disabled={!canOpen}
                    onClick={() => {
                      setExpandDepth(pendingDepth);
                      setExpandTipos([...pendingTipos]);
                      setResetToken((t) => t + 1);
                      setSetupFromDiagram(false);
                      setPhase("diagram");
                    }}
                  >
                    {setupFromDiagram ? "Aplicar e reabrir" : "Abrir diagrama"}
                  </button>
                  <button
                    type="button"
                    className="btn-acao-secundario"
                    onClick={() => {
                      if (setupFromDiagram) {
                        setSetupFromDiagram(false);
                        setPhase("diagram");
                        return;
                      }
                      closeOverlay();
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <DiagramaVinculos
                key={diagramKey}
                entidadeTipo={entidadeTipo}
                entidadeId={entidadeId}
                initialExpandDepth={expandDepth}
                tiposFiltro={expandTipos}
                onReconfigureFiltro={reopenSetupFromDiagram}
                fullScreen
                resetToken={0}
              />
            )}
          </main>
        </div>
      ) : null}
    </>
  );
}
