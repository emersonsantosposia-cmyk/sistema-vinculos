/**
 * Domínio institucional para login abreviado (só a parte antes do @).
 * O Supabase Auth continua usando o e-mail completo.
 */
export function getEmailDomain(): string {
  return (
    process.env.NEXT_PUBLIC_EMAIL_DOMAIN?.trim().replace(/^@+/, "") ?? ""
  );
}

/**
 * Monta o e-mail para autenticação:
 * - se o valor já contém "@", usa como está;
 * - senão, concatena "@" + domínio da env.
 */
export function resolveLoginEmail(
  input: string,
  domain: string = getEmailDomain(),
): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes("@")) return trimmed;
  if (!domain) return trimmed;
  return `${trimmed}@${domain}`;
}
