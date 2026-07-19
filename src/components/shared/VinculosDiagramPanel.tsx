"use client";

import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  DiagramaVinculos,
  type ExpandDepth,
} from "@/components/vinculos-diagram/DiagramaVinculos";
import type { EntidadeTipo } from "@/lib/types";

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

export function VinculosDiagramPanel({ entidadeTipo, entidadeId }: Props) {
  const [phase, setPhase] = useState<OverlayPhase>("closed");
  const [resetToken, setResetToken] = useState(0);
  const [expandDepth, setExpandDepth] = useState<ExpandDepth>(1);
  const [pendingDepth, setPendingDepth] = useState<ExpandDepth>(1);

  const open = phase !== "closed";

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPhase("closed");
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setResetToken(0);
          setPendingDepth(1);
          setPhase("setup");
        }}
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
                onClick={() => setPhase("closed")}
                className="flex h-9 w-9 items-center justify-center rounded border border-[var(--cor-borda)] bg-panel text-lg leading-none text-muted transition-colors hover:border-[var(--cor-borda-destaque)] hover:text-foreground"
                aria-label="Fechar diagrama"
              >
                X
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
                    onClick={() => setPhase("closed")}
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
