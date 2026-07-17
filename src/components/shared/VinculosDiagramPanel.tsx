"use client";

import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { DiagramaVinculos } from "@/components/vinculos-diagram/DiagramaVinculos";
import type { EntidadeTipo } from "@/lib/types";

type Props = {
  entidadeTipo: EntidadeTipo;
  entidadeId: string;
};

export function VinculosDiagramPanel({ entidadeTipo, entidadeId }: Props) {
  const [open, setOpen] = useState(false);
  const [resetToken, setResetToken] = useState(0);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
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
          setOpen(true);
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
          className="fixed inset-0 z-50 flex flex-col bg-[var(--cor-fundo-primaria)]"
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
                Exploração da rede da entidade
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle compact />
              <button
                type="button"
                onClick={() => setResetToken((value) => value + 1)}
                className="btn-acao-secundario"
              >
                Recolher tudo
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded border border-[var(--cor-borda)] bg-panel text-lg leading-none text-muted transition-colors hover:border-[var(--cor-borda-destaque)] hover:text-foreground"
                aria-label="Fechar diagrama"
              >
                X
              </button>
            </div>
          </header>

          <main className="min-h-0 flex-1 p-3 sm:p-4">
            <DiagramaVinculos
              entidadeTipo={entidadeTipo}
              entidadeId={entidadeId}
              autoExpandRoot
              fullScreen
              resetToken={resetToken}
            />
          </main>
        </div>
      ) : null}
    </>
  );
}
