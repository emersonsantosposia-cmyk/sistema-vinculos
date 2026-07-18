"use client";

import { useEffect, useState } from "react";

function PorQueLinceModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[color:var(--cor-fundo-overlay)] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="por-que-lince-titulo"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(90vh,40rem)] w-full max-w-2xl flex-col overflow-hidden rounded-md border border-border bg-panel shadow-[var(--cor-sombra-modal)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <h2
            id="por-que-lince-titulo"
            className="pr-2 text-base font-bold tracking-[0.06em] text-gold sm:text-lg"
          >
            Por que o Lince? A história por trás do nosso nome
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border text-lg leading-none text-muted-strong transition-colors hover:border-gold hover:text-gold"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <div className="space-y-4 text-sm leading-relaxed text-foreground sm:text-[15px] sm:leading-7">
            <p>
              Você já se perguntou por que escolhemos o lince como o símbolo do
              nosso sistema? A resposta está na união perfeita entre a precisão
              da natureza e o poder da tecnologia.
            </p>
            <p>
              Na vida selvagem, o lince é o mestre da percepção. Ele possui uma
              das visões mais aguçadas do reino animal, capaz de detectar o
              menor movimento de uma presa camuflada a mais de 75 metros de
              distância, mesmo na escuridão profunda. O lince não apenas olha;
              ele observa, processa o ambiente e age com precisão cirúrgica, sem
              desperdiçar energia.
            </p>
            <p>
              Historicamente, essa habilidade inspirou a expressão &quot;olhos
              de lince&quot; e batizou a Accademia dei Lincei em 1603 — a
              primeira academia científica do mundo, da qual Galileu Galilei fez
              parte —, cujo objetivo era enxergar além da ignorância para
              revelar as verdades do universo.
            </p>

            <h3 className="pt-1 text-sm font-semibold tracking-[0.08em] text-gold sm:text-[15px]">
              O que isso tem a ver com o nosso sistema?
            </h3>

            <p>
              Assim como o felino e os cientistas do passado, a Rede Lince
              foi desenhada para enxergar o que está oculto. Em meio
              a milhões de dados, ruídos e complexidades, o sistema filtra o que
              importa, identifica padrões invisíveis ao olho humano e entrega
              respostas exatas em tempo recorde.
            </p>
            <p>
              O lince representa o nosso compromisso: transformar dados brutos
              em visão clara, foco e inteligência estratégica.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Botão discreto + modal institucional no cabeçalho do Dashboard. */
export function PorQueLinceButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded border border-transparent px-2 py-1 text-[10px] tracking-[0.14em] text-[color:var(--dash-muted)] uppercase transition-colors hover:border-[color:var(--dash-border)] hover:text-[color:var(--dash-gold)] sm:text-[11px]"
        aria-haspopup="dialog"
      >
        <span
          aria-hidden
          className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-current text-[9px] font-semibold leading-none"
        >
          i
        </span>
        Por que Lince?
      </button>
      {open ? <PorQueLinceModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}
