/**
 * Metadados de versão injetados no build via next.config.ts
 * (fonte da verdade: package.json → NEXT_PUBLIC_APP_VERSION).
 */

export function getAppVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION?.trim() || "0.0.0";
}

export function getAppGitSha(): string | null {
  const sha = process.env.NEXT_PUBLIC_APP_GIT_SHA?.trim();
  return sha || null;
}

export function getAppBuildTime(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_BUILD_TIME?.trim();
  return raw || null;
}

export function getChangelogUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_CHANGELOG_URL?.trim() ||
    "https://github.com/emersonsantosposia-cmyk/sistema-vinculos/blob/master/CHANGELOG.md"
  );
}

/** Ex.: "Rede Lince v1.0.0" */
export function formatAppVersionLabel(prefix = "Rede Lince"): string {
  return `${prefix} v${getAppVersion()}`;
}

/** Data/hora do build/deploy formatada para exibição (pt-BR). */
export function formatBuildTimeLabel(
  iso: string | null = getAppBuildTime(),
): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export function shortGitSha(sha: string | null = getAppGitSha()): string | null {
  if (!sha) return null;
  return sha.slice(0, 7);
}
