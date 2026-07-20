"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  DiagramaVinculos,
  type ExpandDepth,
} from "@/components/vinculos-diagram/DiagramaVinculos";
import type { EntidadeTipo } from "@/lib/types";
import { ENTIDADE_HREFS } from "@/lib/vinculos-types";

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

export function VinculosDiagramPanel({ entidadeTipo, entidadeId }: Props) {
  const [phase, setPhase] = useState<OverlayPhase>("closed");
  const [resetToken, setResetToken] = useState(0);
  const [expandDepth, setExpandDepth] = useState<ExpandDepth>(1);
  const [pendingDepth, setPendingDepth] = useState<ExpandDepth>(1);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const open = phase !== "closed";
  const pathComDiagrama = diagramaPath(entidadeTipo, entidadeId);

  const openSetup = useCallback(() => {
    setResetToken(0);
    setPendingDepth(1);
    setPhase("setup");
    syncDiagramaQuery(true);
  }, []);

  const closeOverlay = useCallback(() => {
    setPhase("closed");
    syncDiagramaQuery(false);
  }, []);

  // Abre o diagrama se a URL já trouxer ?diagrama=1 (ex.: nova aba).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("diagrama") === "1") {
      setResetToken(0);
      setPendingDepth(1);
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

  function openContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  }

  function linkAbsoluto(): string {
    return new URL(pathComDiagrama, window.location.origin).href;
  }

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
                  ? "Abrir automaticamente até"
                  : "Exploração da rede da entidade"}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle compact />
              {phase === "diagram" ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingDepth(expandDepth);
                      setPhase("setup");
                    }}
                    className="btn-acao-secundario"
                  >
                    Níveis iniciais
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

          <main className="min-h-0 flex-1 p-3 sm:p-4">
            {phase === "setup" ? (
              <div className="mx-auto flex h-full max-w-lg flex-col justify-center gap-6">
                <div>
                  <p className="text-sm text-muted">
                    Escolha até quantos níveis a rede deve ser expandida antes
                    de você continuar explorando manualmente. O padrão é{" "}
                    <strong className="font-medium text-foreground">
                      1 nível
                    </strong>{" "}
                    (vínculos diretos).
                  </p>
                </div>

                <fieldset className="space-y-2">
                  <legend className="sr-only">
                    Abrir automaticamente até
                  </legend>
                  {DEPTH_OPTIONS.map((opt) => {
                    const active = pendingDepth === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 transition-colors ${
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
                          className="mt-1"
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

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-acao"
                    onClick={() => {
                      setExpandDepth(pendingDepth);
                      setResetToken((t) => t + 1);
                      setPhase("diagram");
                    }}
                  >
                    Abrir diagrama
                  </button>
                  <button
                    type="button"
                    className="btn-acao-secundario"
                    onClick={closeOverlay}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <DiagramaVinculos
                key={`${entidadeTipo}-${entidadeId}-${resetToken}-${expandDepth}`}
                entidadeTipo={entidadeTipo}
                entidadeId={entidadeId}
                initialExpandDepth={expandDepth}
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
