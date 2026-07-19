"use client";

import { ModalShell } from "@/components/ui/ModalShell";
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

  return (
    <ModalShell
      title="Sobre o sistema"
      description="Informações para suporte e diagnóstico."
      onClose={onClose}
      size="sm"
      labelledBy="sobre-sistema-titulo"
    >
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

      <div className="mt-3 border-t border-border pt-3">
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
    </ModalShell>
  );
}
