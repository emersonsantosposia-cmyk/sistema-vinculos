export const DASHBOARD_ENTITIES = [
  {
    key: "pessoas",
    table: "pessoas",
    label: "Pessoas",
    href: "/pessoas",
    color: "var(--cor-entidade-pessoas)",
  },
  {
    key: "enderecos",
    table: "enderecos",
    label: "Endereços",
    href: "/enderecos",
    color: "var(--cor-entidade-enderecos)",
  },
  {
    key: "comunicacoes",
    table: "comunicacoes",
    label: "Comunicações",
    href: "/comunicacoes",
    color: "var(--cor-entidade-comunicacoes)",
  },
  {
    key: "veiculos",
    table: "veiculos",
    label: "Veículos",
    href: "/veiculos",
    color: "var(--cor-entidade-veiculos)",
  },
  {
    key: "empresas",
    table: "empresas",
    label: "Empresas",
    href: "/empresas",
    color: "var(--cor-entidade-empresas)",
  },
  {
    key: "orcrims",
    table: "orcrims",
    label: "Orcrims",
    href: "/orcrims",
    color: "var(--cor-entidade-orcrims)",
  },
  {
    key: "documentos",
    table: "documentos",
    label: "Documentos",
    href: "/documentos",
    color: "var(--cor-entidade-documentos)",
  },
  {
    key: "casos",
    table: "casos",
    label: "Casos",
    href: "/casos",
    color: "var(--cor-entidade-casos)",
  },
] as const;

export type DashboardEntityKey = (typeof DASHBOARD_ENTITIES)[number]["key"];

export type DashboardEntityCount = {
  key: DashboardEntityKey;
  label: string;
  href: string;
  color: string;
  total: number;
};

/** Filtro de tempo dos gráficos: histórico completo, ano ou mês (vinculado ao ano). */
export type DashboardTimeFilter = {
  scope: "tudo" | "ano" | "mes";
  year: number | null;
  month: number | null;
};

export const DASHBOARD_TIME_TUDO: DashboardTimeFilter = {
  scope: "tudo",
  year: null,
  month: null,
};

export const DASHBOARD_MONTH_OPTIONS = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
] as const;

export function normalizeTimeFilter(
  partial: Partial<DashboardTimeFilter> & { scope?: DashboardTimeFilter["scope"] },
): DashboardTimeFilter {
  if (partial.scope === "tudo" || (!partial.year && !partial.month)) {
    return DASHBOARD_TIME_TUDO;
  }
  if (partial.year && partial.month) {
    return { scope: "mes", year: partial.year, month: partial.month };
  }
  if (partial.year) {
    return { scope: "ano", year: partial.year, month: null };
  }
  return DASHBOARD_TIME_TUDO;
}

/** Intervalo [from, to) em ISO; null = sem limite (histórico completo). */
export function timeFilterToRange(filter: DashboardTimeFilter): {
  from: string | null;
  to: string | null;
} {
  if (filter.scope === "tudo" || filter.year == null) {
    return { from: null, to: null };
  }
  if (filter.scope === "mes" && filter.month != null) {
    const from = new Date(Date.UTC(filter.year, filter.month - 1, 1));
    const to = new Date(Date.UTC(filter.year, filter.month, 1));
    return { from: from.toISOString(), to: to.toISOString() };
  }
  const from = new Date(Date.UTC(filter.year, 0, 1));
  const to = new Date(Date.UTC(filter.year + 1, 0, 1));
  return { from: from.toISOString(), to: to.toISOString() };
}

export function listDashboardYears(fromYear = 2020): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current; y >= fromYear; y -= 1) years.push(y);
  return years;
}

/** @deprecated Prefer DashboardTimeFilter — mantido só se houver referências residuais. */
export type DashboardPeriodMode = "mes" | "ano";

/** Shape legado (RPC contagem_por_periodo). */
export type DashboardSeriesPoint = {
  periodo: string;
  label: string;
  pessoas?: number;
  empresas?: number;
  enderecos?: number;
  veiculos?: number;
  documentos?: number;
  casos?: number;
  comunicacoes?: number;
  orcrims?: number;
};

/** Totais por entidade no filtro de tempo (gráfico 1). */
export type DashboardEntityTotalPoint = {
  key: DashboardEntityKey;
  name: string;
  total: number;
  fill: string;
};

/** Totais de documentos/casos por unidade (gráficos 2 e 4). */
export type DashboardUnidadePoint = {
  unidade: string;
  documentos: number;
  casos: number;
};

export const DOCUMENTO_TIPO_CHART_KEYS = [
  "RCI",
  "INFO",
  "RDCI",
  "OUTROS",
] as const;

export type DocumentoTipoChartKey =
  (typeof DOCUMENTO_TIPO_CHART_KEYS)[number];

export const DOCUMENTO_TIPO_CHART_COLORS: Record<
  DocumentoTipoChartKey,
  string
> = {
  RCI: "var(--cor-entidade-documentos)",
  INFO: "var(--cor-entidade-pessoas)",
  RDCI: "var(--cor-entidade-veiculos)",
  OUTROS: "var(--cor-entidade-orcrims)",
};

/** Documentos por tipo × unidade (gráfico 3). */
export type DashboardDocTipoUnidadePoint = {
  unidade: string;
  RCI: number;
  INFO: number;
  RDCI: number;
  OUTROS: number;
};

export const CASO_STATUS_CHART_KEYS = [
  "em_andamento",
  "encerrado",
] as const;

export type CasoStatusChartKey = (typeof CASO_STATUS_CHART_KEYS)[number];

export const CASO_STATUS_CHART_LABELS: Record<CasoStatusChartKey, string> = {
  em_andamento: "Em andamento",
  encerrado: "Encerrado",
};

export const CASO_STATUS_CHART_COLORS: Record<CasoStatusChartKey, string> = {
  em_andamento: "var(--cor-entidade-casos)",
  encerrado: "var(--cor-entidade-orcrims)",
};

/** Casos por status × unidade (substitui proporções). */
export type DashboardCasoStatusPoint = {
  unidade: string;
  em_andamento: number;
  encerrado: number;
};

export type DashboardCounts = {
  entities: DashboardEntityCount[];
  totalRegistros: number;
  totalVinculos: number;
  gauges: {
    pessoasPresasPct: number | null;
    comunicacoesAtivasPct: number | null;
  };
};

export type DashboardMetrics = DashboardCounts & {
  series: DashboardSeriesPoint[];
  periodMode: DashboardPeriodMode;
};
