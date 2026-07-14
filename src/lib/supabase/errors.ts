export function friendlyError(message: string, fallback: string): string {
  if (message.includes("row-level security") || message.includes("JWT")) {
    return "Sem permissão. Faça login com um usuário autenticado.";
  }
  return message || fallback;
}

export function emptyToNull(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function normalizeUrl(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
