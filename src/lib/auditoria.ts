export const AUDITORIA_ACOES = [
  { value: "insert", label: "Criação" },
  { value: "update", label: "Edição" },
  { value: "delete", label: "Exclusão" },
] as const;

export type AuditoriaAcao = (typeof AUDITORIA_ACOES)[number]["value"];

export const AUDITORIA_TABELAS = [
  { value: "pessoas", label: "Pessoas" },
  { value: "pessoas_redes_sociais", label: "Redes sociais (pessoas)" },
  { value: "pessoas_fotos", label: "Fotos (pessoas)" },
  { value: "empresas", label: "Empresas" },
  { value: "enderecos", label: "Endereços" },
  { value: "veiculos", label: "Veículos" },
  { value: "comunicacoes", label: "Comunicações" },
  { value: "orcrims", label: "Orcrims" },
  { value: "procedimentos", label: "Procedimentos" },
  { value: "casos", label: "Casos" },
  { value: "observacoes", label: "Observações" },
  { value: "vinculos", label: "Vínculos" },
  { value: "perfis_usuario", label: "Usuários (perfis)" },
] as const;

export type AuditoriaTabela = (typeof AUDITORIA_TABELAS)[number]["value"];

export type AuditoriaRow = {
  id: string;
  tabela_afetada: string;
  registro_id: string;
  acao: AuditoriaAcao;
  usuario_id: string | null;
  dados_antigos: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  data_hora: string;
  usuario_nome: string | null;
};

export type AuditoriaDiffItem = {
  campo: string;
  antigo: string;
  novo: string;
};

export const AUDITORIA_PAGE_SIZE = 25;

export function labelAuditoriaAcao(acao: string | null | undefined): string {
  if (!acao) return "—";
  return AUDITORIA_ACOES.find((a) => a.value === acao)?.label ?? acao;
}

export function labelAuditoriaTabela(tabela: string | null | undefined): string {
  if (!tabela) return "—";
  return (
    AUDITORIA_TABELAS.find((t) => t.value === tabela)?.label ?? tabela
  );
}

export function formatAuditoriaValor(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || "—";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function diffAuditoria(
  antigos: Record<string, unknown> | null | undefined,
  novos: Record<string, unknown> | null | undefined,
): AuditoriaDiffItem[] {
  const oldObj = antigos ?? {};
  const newObj = novos ?? {};
  const keys = Array.from(
    new Set([...Object.keys(oldObj), ...Object.keys(newObj)]),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const items: AuditoriaDiffItem[] = [];
  for (const key of keys) {
    const antigo = oldObj[key];
    const novo = newObj[key];
    if (JSON.stringify(antigo) === JSON.stringify(novo)) continue;
    items.push({
      campo: key,
      antigo: formatAuditoriaValor(antigo),
      novo: formatAuditoriaValor(novo),
    });
  }
  return items;
}

export function resumoAuditoria(row: {
  acao: string;
  dados_antigos: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
}): string {
  if (row.acao === "insert") return "Registro criado";
  if (row.acao === "delete") return "Registro excluído";
  if (row.acao === "update") {
    const diffs = diffAuditoria(row.dados_antigos, row.dados_novos);
    if (diffs.length === 0) return "Sem alterações detectadas";
    if (diffs.length <= 3) {
      return diffs.map((d) => d.campo).join(", ");
    }
    return `${diffs.length} campos alterados (${diffs
      .slice(0, 3)
      .map((d) => d.campo)
      .join(", ")}…)`;
  }
  return "—";
}

export function isAuditoriaAcao(value: string): value is AuditoriaAcao {
  return AUDITORIA_ACOES.some((a) => a.value === value);
}
