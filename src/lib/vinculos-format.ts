/** Primeira letra maiúscula; restante em minúsculas. */
export function formatTipoVinculoLabel(
  tipo: string | null | undefined,
): string {
  const raw = tipo?.trim();
  if (!raw) return "Sem tipo";
  const lower = raw.toLocaleLowerCase("pt-BR");
  return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
}
