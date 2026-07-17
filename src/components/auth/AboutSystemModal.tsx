"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Form";
import {
  formatAppVersionLabel,
  formatBuildTimeLabel,
  getAppGitSha,
  getAppVersion,
  getChangelogUrl,
  shortGitSha,
} from "@/lib/app-version";

type Props = {
  onClose: () => void;
};

export function AboutSystemModal({ onClose }: Props) {
  const version = getAppVersion();
  const buildLabel = formatBuildTimeLabel();
  const sha = shortGitSha();
  const fullSha = getAppGitSha();
  const changelogUrl = getChangelogUrl();

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
      aria-labelledby="sobre-sistema-titulo"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm space-y-3 rounded-md border border-border bg-panel p-4 shadow-[var(--cor-sombra-modal)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2
              id="sobre-sistema-titulo"
              className="text-sm font-bold tracking-[0.14em] text-gold uppercase"
            >
              Sobre o sistema
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Informações para suporte e diagnóstico.
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <dl className="space-y-2.5 text-sm">
          <div>
            <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">
              Versão
            </dt>
            <dd className="mt-0.5 text-foreground">
              {formatAppVersionLabel()}
              <span className="ml-1 text-muted">({version})</span>
            </dd>
          </div>

          <div>
            <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">
              Último deploy / build
            </dt>
            <dd className="mt-0.5 text-foreground">
              {buildLabel ?? "Indisponível neste ambiente"}
            </dd>
          </div>

          {sha ? (
            <div>
              <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">
                Commit
              </dt>
              <dd className="mt-0.5 font-mono text-xs text-muted-strong">
                <span title={fullSha ?? undefined}>{sha}</span>
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="border-t border-border pt-3">
          <a
            href={changelogUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gold underline-offset-2 hover:underline"
          >
            Ver CHANGELOG.md no GitHub
          </a>
          <p className="mt-1 text-[11px] text-muted">
            Histórico de versões e mudanças do projeto.
          </p>
        </div>
      </div>
    </div>
  );
}
