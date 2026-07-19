"use client";

import { useState } from "react";
import { ModalShell } from "@/components/ui/ModalShell";

function PorQueLinceModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell
      title="Por que o Lince? A história por trás do nosso nome"
      onClose={onClose}
      size="xl"
      labelledBy="por-que-lince-titulo"
    >
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
    </ModalShell>
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
        className="inline-flex h-11 min-h-[44px] items-center gap-1.5 rounded border border-transparent px-2.5 text-xs tracking-[0.14em] text-[color:var(--dash-muted)] uppercase transition-colors hover:border-[color:var(--dash-border)] hover:text-[color:var(--dash-gold)] sm:h-auto sm:min-h-0 sm:px-2 sm:py-1 sm:text-[11px]"
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
