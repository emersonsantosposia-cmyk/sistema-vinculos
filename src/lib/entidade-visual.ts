import type { DashboardEntityKey } from "@/lib/dashboard";
import type { EntidadeTipo } from "@/lib/types";

/** Cores via CSS vars — acompanham data-theme automaticamente. */
export const ENTIDADE_COLORS: Record<EntidadeTipo, string> = {
  pessoa: "var(--cor-entidade-pessoas)",
  endereco: "var(--cor-entidade-enderecos)",
  comunicacao: "var(--cor-entidade-comunicacoes)",
  veiculo: "var(--cor-entidade-veiculos)",
  empresa: "var(--cor-entidade-empresas)",
  orcrim: "var(--cor-entidade-orcrims)",
  procedimento: "var(--cor-entidade-procedimentos)",
  caso: "var(--cor-entidade-casos)",
};

export const ENTIDADE_TO_DASHBOARD_KEY: Record<
  EntidadeTipo,
  DashboardEntityKey
> = {
  pessoa: "pessoas",
  endereco: "enderecos",
  comunicacao: "comunicacoes",
  veiculo: "veiculos",
  empresa: "empresas",
  orcrim: "orcrims",
  procedimento: "procedimentos",
  caso: "casos",
};

export function entidadeNodeId(tipo: EntidadeTipo, id: string): string {
  return `${tipo}__${id}`;
}

export function parseEntidadeNodeId(
  nodeId: string,
): { tipo: EntidadeTipo; id: string } | null {
  const sep = nodeId.indexOf("__");
  if (sep <= 0) return null;
  const tipo = nodeId.slice(0, sep) as EntidadeTipo;
  const id = nodeId.slice(sep + 2);
  if (!id) return null;
  return { tipo, id };
}

/** Resolve var(--...) para hex/rgb (útil no MiniMap do React Flow). */
export function resolveCssColor(
  value: string,
  fallback = "#d4af37",
): string {
  if (typeof window === "undefined") return fallback;
  if (!value.startsWith("var(")) return value;
  const name = value.slice(4, -1).trim();
  const resolved = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return resolved || fallback;
}
