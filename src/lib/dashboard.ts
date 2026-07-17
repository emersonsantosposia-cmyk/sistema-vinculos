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
    key: "procedimentos",
    table: "procedimentos",
    label: "Procedimentos",
    href: "/procedimentos",
    color: "var(--cor-entidade-procedimentos)",
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

export type DashboardPeriodMode = "mes" | "ano";

/** Shape esperado pelo Recharts (e pela RPC contagem_por_periodo). */
export type DashboardSeriesPoint = {
  periodo: string;
  label: string;
  pessoas?: number;
  empresas?: number;
  enderecos?: number;
  veiculos?: number;
  procedimentos?: number;
  casos?: number;
  comunicacoes?: number;
  orcrims?: number;
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

/** Totais de procedimentos/casos por unidade no período (mês ou ano corrente). */
export type DashboardUnidadePoint = {
  unidade: string;
  procedimentos: number;
  casos: number;
};
