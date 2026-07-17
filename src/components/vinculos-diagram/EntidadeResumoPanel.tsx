"use client";

import Link from "next/link";
import { EntidadeTipoIcon } from "@/components/dashboard/EntityIcons";
import { PessoaAvatar } from "@/components/pessoas/PessoaAvatar";
import { VeiculoAvatar } from "@/components/veiculos/VeiculoAvatar";
import { ENTIDADE_COLORS } from "@/lib/entidade-visual";
import { ENTIDADE_HREFS, ENTIDADE_LABELS } from "@/lib/vinculos-types";
import type { EntidadeTipo } from "@/lib/types";

export type EntidadeResumoSelecionada = {
  entidadeTipo: EntidadeTipo;
  entidadeId: string;
  titulo: string;
  subtitulo?: string | null;
  foto_perfil_path?: string | null;
  foto_url?: string | null;
  restrito?: boolean;
  expanded?: boolean;
};

type Props = {
  entidade: EntidadeResumoSelecionada | null;
  onClose: () => void;
};

export function EntidadeResumoPanel({ entidade, onClose }: Props) {
  if (!entidade) return null;

  const accent = entidade.restrito
    ? "var(--cor-restrito)"
    : ENTIDADE_COLORS[entidade.entidadeTipo];
  const href = `${ENTIDADE_HREFS[entidade.entidadeTipo]}/${entidade.entidadeId}`;
  const showPhoto =
    !entidade.restrito &&
    (entidade.entidadeTipo === "pessoa" || entidade.entidadeTipo === "veiculo");

  return (
    <aside className="flex w-full shrink-0 flex-col border-t border-[var(--cor-borda)] bg-[var(--cor-card-fundo)] sm:w-[240px] sm:border-t-0 sm:border-l">
      <div className="flex items-center justify-between border-b border-[var(--cor-borda)] px-3 py-2">
        <p className="text-[11px] font-medium tracking-wide text-muted uppercase">
          Resumo
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-panel-hover hover:text-foreground"
          aria-label="Fechar painel"
        >
          X
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="flex items-start gap-2.5">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: entidade.restrito
                ? "var(--cor-restrito-fundo)"
                : `color-mix(in srgb, ${accent} 18%, transparent)`,
              color: entidade.restrito
                ? "var(--cor-restrito-texto)"
                : accent,
            }}
          >
            <EntidadeTipoIcon
              tipo={entidade.entidadeTipo}
              className="h-5 w-5"
            />
          </div>
          {showPhoto ? (
            entidade.entidadeTipo === "pessoa" ? (
              <PessoaAvatar
                path={entidade.foto_perfil_path}
                nome={entidade.titulo}
                size="md"
              />
            ) : (
              <VeiculoAvatar
                path={entidade.foto_url}
                alt={entidade.titulo}
                size="md"
              />
            )
          ) : null}
        </div>

        <div>
          <p className="text-[10px] font-medium tracking-wide text-muted uppercase">
            {ENTIDADE_LABELS[entidade.entidadeTipo]}
          </p>
          <p className="mt-0.5 text-sm leading-snug font-medium text-foreground">
            {entidade.titulo}
          </p>
          {entidade.subtitulo && !entidade.restrito ? (
            <p className="mt-1 text-xs text-muted">{entidade.subtitulo}</p>
          ) : null}
        </div>

        {entidade.restrito ? (
          <p className="rounded border border-[color:var(--cor-restrito-borda)] bg-[color:var(--cor-restrito-fundo)] px-2 py-1.5 text-[11px] text-muted">
            Acesso restrito — sem permissão para visualizar esta entidade.
          </p>
        ) : (
          <Link
            href={href}
            className="btn-acao-secundario mt-auto w-full justify-center text-center text-xs"
          >
            Abrir página completa
          </Link>
        )}

        {!entidade.restrito ? (
          <p className="text-[10px] text-muted">
            {entidade.expanded
              ? "Clique no nó novamente para recolher os vínculos."
              : "Clique no nó para revelar os vínculos."}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
