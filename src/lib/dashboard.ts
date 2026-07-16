export const DASHBOARD_ENTITIES = [
  {
    key: "pessoas",
    table: "pessoas",
    label: "Pessoas",
    href: "/pessoas",
    color: "#d4af37",
  },
  {
    key: "enderecos",
    table: "enderecos",
    label: "Endereços",
    href: "/enderecos",
    color: "#b8a86e",
  },
  {
    key: "comunicacoes",
    table: "comunicacoes",
    label: "Comunicações",
    href: "/comunicacoes",
    color: "#a8915f",
  },
  {
    key: "veiculos",
    table: "veiculos",
    label: "Veículos",
    href: "/veiculos",
    color: "#8f9a5c",
  },
  {
    key: "empresas",
    table: "empresas",
    label: "Empresas",
    href: "/empresas",
    color: "#c9a227",
  },
  {
    key: "procedimentos",
    table: "procedimentos",
    label: "Procedimentos",
    href: "/procedimentos",
    color: "#6b7c4a",
  },
  {
    key: "casos",
    table: "casos",
    label: "Casos",
    href: "/casos",
    color: "#e8d5a3",
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
