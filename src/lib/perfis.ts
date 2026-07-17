export const UNIDADES = [
  "CGIN",
  "PFCAT",
  "PFCG",
  "PFMOS",
  "PFPV",
  "PFBRA",
] as const;

export type Unidade = (typeof UNIDADES)[number];

export const PERFIL_ROLES = [
  { value: "administrador", label: "Administrador" },
  { value: "analista", label: "Analista" },
] as const;

export type PerfilRole = (typeof PERFIL_ROLES)[number]["value"];

export type PerfilUsuario = {
  id: string;
  nome: string;
  matricula: string;
  cpf: string;
  email: string;
  role: PerfilRole;
  unidade: Unidade | null;
  ativo: boolean;
  usuario_cadastro: string | null;
  data_cadastro: string;
};

export function isUnidade(value: string): value is Unidade {
  return (UNIDADES as readonly string[]).includes(value);
}

export function isPerfilRole(value: string): value is PerfilRole {
  return PERFIL_ROLES.some((r) => r.value === value);
}

export function labelPerfilRole(role: string | null | undefined): string {
  if (!role) return "—";
  return PERFIL_ROLES.find((r) => r.value === role)?.label ?? role;
}

export function labelUnidade(unidade: string | null | undefined): string {
  return unidade?.trim() || "—";
}

/** Ex.: "Administrador" ou "Analista — PFCAT" */
export function formatPerfilAcesso(
  perfil: Pick<PerfilUsuario, "role" | "unidade"> | null | undefined,
): string {
  if (!perfil) return "—";
  if (perfil.role === "administrador") return "Administrador";
  if (perfil.unidade) return `Analista — ${perfil.unidade}`;
  return "Analista";
}

/**
 * Analista fora da CGIN: unidade travada na própria.
 * Admin e Analista CGIN: podem escolher qualquer unidade.
 */
export function canChooseUnidade(
  perfil: Pick<PerfilUsuario, "role" | "unidade"> | null | undefined,
): boolean {
  if (!perfil) return false;
  if (perfil.role === "administrador") return true;
  return perfil.unidade === "CGIN";
}

export function defaultUnidadeForPerfil(
  perfil: Pick<PerfilUsuario, "role" | "unidade"> | null | undefined,
  initial?: string | null,
): Unidade | "" {
  if (initial && isUnidade(initial)) return initial;
  if (!perfil) return "";
  if (!canChooseUnidade(perfil) && perfil.unidade) return perfil.unidade;
  if (perfil.unidade && isUnidade(perfil.unidade)) return perfil.unidade;
  return "";
}
