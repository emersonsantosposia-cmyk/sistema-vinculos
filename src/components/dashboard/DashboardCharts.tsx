"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "next-themes";
import {
  fetchCasosPorStatusAction,
  fetchDocCasosPorUnidadeAction,
  fetchDocPorTipoUnidadeAction,
  fetchTotaisEntidadesAction,
} from "@/app/actions/dashboard";
import {
  CASO_STATUS_CHART_COLORS,
  CASO_STATUS_CHART_KEYS,
  CASO_STATUS_CHART_LABELS,
  DASHBOARD_MONTH_OPTIONS,
  DASHBOARD_TIME_TUDO,
  DOCUMENTO_TIPO_CHART_COLORS,
  DOCUMENTO_TIPO_CHART_KEYS,
  listDashboardYears,
  normalizeTimeFilter,
  type DashboardCasoStatusPoint,
  type DashboardEntityTotalPoint,
  type DashboardDocTipoUnidadePoint,
  type DashboardTimeFilter,
  type DashboardUnidadePoint,
} from "@/lib/dashboard";
import { UNIDADES, type Unidade } from "@/lib/perfis";

const DOC_COLOR = "var(--cor-entidade-documentos)";
const CASOS_COLOR = "var(--cor-entidade-casos)";
const CHART_AXIS = "var(--cor-chart-axis)";
const CHART_GRID = "var(--cor-chart-grid)";
const CHART_AXIS_LINE = "var(--cor-chart-axis-line)";
const CHART_LEGEND = "var(--cor-chart-legend)";
const CHART_TOP_MARGIN = 28;

const YEARS = listDashboardYears(2020);

/** Rótulos curtos para o eixo X em telas estreitas. */
const ENTITY_AXIS_SHORT: Record<string, string> = {
  Pessoas: "Pes.",
  Endereços: "End.",
  Comunicações: "Com.",
  Veículos: "Vei.",
  Empresas: "Emp.",
  Orcrims: "Orc.",
  Documentos: "Doc.",
  Casos: "Cas.",
};

const CASO_STATUS_SHORT: Record<string, string> = {
  "Em andamento": "Andam.",
  Encerrado: "Encerr.",
};

function formatBarLabel(value: unknown): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n.toLocaleString("pt-BR");
}

function useIsNarrow(query = "(max-width: 639px)") {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const sync = () => setNarrow(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [query]);

  return narrow;
}

/**
 * Em telas estreitas, permite rolagem horizontal suave quando o gráfico
 * precisa de largura mínima para não cortar rótulos.
 */
function ChartFrame({
  children,
  minWidth = 480,
}: {
  children: ReactNode;
  minWidth?: number;
}) {
  const narrow = useIsNarrow();

  if (!narrow) {
    return <div className="h-full w-full min-w-0">{children}</div>;
  }

  return (
    <div className="h-full w-full overflow-x-auto scroll-smooth [-webkit-overflow-scrolling:touch]">
      <div className="h-full" style={{ minWidth }}>
        {children}
      </div>
    </div>
  );
}

type UnidadeFilter = "todas" | Unidade;

type Props = {
  initialTotais: DashboardEntityTotalPoint[];
  initialPorUnidade: DashboardUnidadePoint[];
  initialPorTipo: DashboardDocTipoUnidadePoint[];
  initialCasosStatus: DashboardCasoStatusPoint[];
};

function sortTooltipPayload<
  T extends { name: string; value: number; color: string },
>(payload: T[], seriesOrder?: readonly string[]): T[] {
  if (!seriesOrder?.length) return payload;
  return [...payload].sort((a, b) => {
    const ai = seriesOrder.indexOf(a.name);
    const bi = seriesOrder.indexOf(b.name);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });
}

function ChartTooltip({
  active,
  payload,
  label,
  seriesOrder,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  seriesOrder?: readonly string[];
}) {
  if (!active || !payload?.length) return null;
  const entries = sortTooltipPayload(payload, seriesOrder);
  const fullLabel =
    (typeof label === "string" &&
      Object.entries(ENTITY_AXIS_SHORT).find(([, short]) => short === label)?.[0]) ||
    (typeof label === "string" &&
      Object.entries(CASO_STATUS_SHORT).find(([, short]) => short === label)?.[0]) ||
    label;

  return (
    <div className="rounded border border-[color:var(--dash-border-strong)] bg-[color:var(--cor-chart-tooltip-bg)] px-3 py-2 shadow-[var(--cor-sombra-dropdown)]">
      <p className="mb-1.5 text-[11px] tracking-[0.14em] text-[color:var(--dash-gold)] uppercase">
        {fullLabel}
      </p>
      <ul className="space-y-1">
        {entries.map((entry) => (
          <li
            key={entry.name}
            className="flex items-center justify-between gap-6 text-xs text-[color:var(--dash-muted-strong)]"
          >
            <span className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-semibold text-[color:var(--dash-gold-bright)] tabular-nums">
              {Number(entry.value).toLocaleString("pt-BR")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyChart({
  message = "Sem registros no período para exibir.",
}: {
  message?: string;
}) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-[color:var(--dash-muted)]">
      {message}
    </div>
  );
}

function TimeFilters({
  value,
  onChange,
  disabled,
}: {
  value: DashboardTimeFilter;
  onChange: (next: DashboardTimeFilter) => void;
  disabled?: boolean;
}) {
  const tudoActive = value.scope === "tudo";
  const selectClass =
    "h-11 min-h-[44px] w-full min-w-0 rounded border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] px-2 text-xs tracking-normal text-[color:var(--dash-gold)] normal-case outline-none focus:border-[color:var(--dash-gold)] disabled:opacity-60 sm:h-auto sm:min-h-0 sm:min-w-[5.5rem] sm:w-auto sm:py-1.5";

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(DASHBOARD_TIME_TUDO)}
        className={`inline-flex h-11 min-h-[44px] w-full items-center justify-center rounded border px-3 text-[11px] tracking-[0.14em] uppercase transition-colors disabled:opacity-60 sm:h-auto sm:min-h-0 sm:w-auto sm:py-1.5 ${
          tudoActive
            ? "border-[color:var(--dash-gold)] bg-[color:var(--dash-gold)] font-semibold text-gold-ink"
            : "border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] text-[color:var(--dash-muted-strong)] hover:border-[color:var(--dash-gold)] hover:text-[color:var(--dash-gold)]"
        }`}
      >
        Tudo
      </button>

      <div className="grid grid-cols-2 gap-2 sm:contents">
        <label className="flex min-w-0 flex-col gap-1 text-[11px] tracking-[0.12em] text-[color:var(--dash-muted)] uppercase sm:flex-row sm:items-center sm:gap-2">
          Ano
          <select
            disabled={disabled}
            value={value.year ?? ""}
            onChange={(e) => {
              const year = e.target.value ? Number(e.target.value) : null;
              if (!year) {
                onChange(DASHBOARD_TIME_TUDO);
                return;
              }
              onChange(
                normalizeTimeFilter({
                  year,
                  month: value.month,
                }),
              );
            }}
            className={selectClass}
          >
            <option value="">—</option>
            {YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1 text-[11px] tracking-[0.12em] text-[color:var(--dash-muted)] uppercase sm:flex-row sm:items-center sm:gap-2">
          Mês
          <select
            disabled={disabled || value.year == null}
            value={value.month ?? ""}
            onChange={(e) => {
              const month = e.target.value ? Number(e.target.value) : null;
              if (!value.year) return;
              onChange(
                normalizeTimeFilter({
                  year: value.year,
                  month,
                }),
              );
            }}
            className={`${selectClass} sm:min-w-[7.5rem]`}
          >
            <option value="">—</option>
            {DASHBOARD_MONTH_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function UnidadeFilters({
  value,
  onChange,
  disabled,
}: {
  value: UnidadeFilter;
  onChange: (next: UnidadeFilter) => void;
  disabled?: boolean;
}) {
  const options: UnidadeFilter[] = ["todas", ...UNIDADES];

  return (
    <div className="flex w-full flex-wrap gap-1.5 sm:w-auto sm:justify-end">
      {options.map((opt) => {
        const active = value === opt;
        const label = opt === "todas" ? "Todas" : opt;
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt)}
            className={`inline-flex h-11 min-h-[44px] items-center rounded border px-2.5 text-xs tracking-[0.12em] uppercase transition-colors disabled:opacity-60 sm:h-auto sm:min-h-0 sm:py-1 sm:text-[10px] ${
              active
                ? "border-[color:var(--dash-gold)] bg-[color:var(--dash-gold)] font-semibold text-gold-ink"
                : "border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] text-[color:var(--dash-muted-strong)] hover:border-[color:var(--dash-gold)] hover:text-[color:var(--dash-gold)]"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ChartPanel({
  title,
  subtitle,
  filters,
  extraFilters,
  pending,
  error,
  children,
  size = "compact",
}: {
  title: string;
  subtitle: string;
  filters: React.ReactNode;
  extraFilters?: React.ReactNode;
  pending: boolean;
  error: string | null;
  children: React.ReactNode;
  /** compact = grid 2 colunas; wide = largura total */
  size?: "compact" | "wide";
}) {
  const chartHeight =
    size === "wide"
      ? "h-56 w-full min-w-0 sm:h-52"
      : "h-52 w-full min-w-0 sm:h-48";

  return (
    <section
      aria-label={title}
      className="rounded-md border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-3 sm:p-3.5"
    >
      <div className="mb-2.5 flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h3 className="text-[11px] font-medium tracking-[0.2em] text-[color:var(--dash-muted-strong)] uppercase">
            {title}
          </h3>
          <p className="mt-0.5 text-xs text-[color:var(--dash-muted)]">
            {subtitle}
          </p>
        </div>
        <div className="flex w-full min-w-0 flex-col items-stretch gap-2 lg:w-auto lg:items-end">
          {filters}
          {extraFilters}
        </div>
      </div>

      {error ? (
        <div className="mb-2.5 rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-fg">
          {error}
        </div>
      ) : null}

      <div className={`relative ${chartHeight}`}>
        {pending ? (
          <div className="flex h-full items-end gap-2 px-2 pb-2" aria-busy="true">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="flex-1 animate-pulse rounded-t bg-[color:var(--dash-border)]"
                style={{ height: `${30 + ((idx * 17) % 55)}%` }}
              />
            ))}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function TotaisEntidadesChart({
  initialData,
}: {
  initialData: DashboardEntityTotalPoint[];
}) {
  const { resolvedTheme } = useTheme();
  const narrow = useIsNarrow();
  const [filter, setFilter] = useState<DashboardTimeFilter>(DASHBOARD_TIME_TUDO);
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  function changeFilter(next: DashboardTimeFilter) {
    setFilter(next);
    startTransition(async () => {
      setError(null);
      const result = await fetchTotaisEntidadesAction(next);
      if (result.error) {
        setError(result.error);
        setData([]);
        return;
      }
      setData(result.data);
    });
  }

  const empty = data.every((d) => d.total === 0);

  return (
    <ChartPanel
      title="Total acumulado por entidade"
      subtitle="Cadastros no período selecionado (Tudo, ano ou mês)"
      size="wide"
      filters={
        <TimeFilters value={filter} onChange={changeFilter} disabled={pending} />
      }
      pending={pending}
      error={error}
    >
      {empty ? (
        <EmptyChart />
      ) : (
        <ChartFrame minWidth={520}>
          <ResponsiveContainer width="100%" height="100%" key={resolvedTheme}>
            <BarChart
              data={data}
              margin={{
                top: CHART_TOP_MARGIN,
                right: narrow ? 4 : 8,
                left: 0,
                bottom: narrow ? 4 : 8,
              }}
            >
              <CartesianGrid
                stroke={CHART_GRID}
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: CHART_AXIS, fontSize: narrow ? 10 : 11 }}
                axisLine={{ stroke: CHART_AXIS_LINE }}
                tickLine={false}
                interval={0}
                angle={narrow ? -40 : -18}
                textAnchor="end"
                height={narrow ? 68 : 54}
                tickFormatter={(value: string) =>
                  narrow ? (ENTITY_AXIS_SHORT[value] ?? value) : value
                }
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: CHART_AXIS, fontSize: narrow ? 10 : 11 }}
                axisLine={false}
                tickLine={false}
                width={narrow ? 28 : 36}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="total" name="Total" radius={[3, 3, 0, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.key} fill={entry.fill} />
                ))}
                <LabelList
                  dataKey="total"
                  position="top"
                  fill={CHART_AXIS}
                  fontSize={narrow ? 10 : 11}
                  formatter={formatBarLabel}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      )}
    </ChartPanel>
  );
}

function UnidadeMetricChart({
  title,
  subtitle,
  dataKey,
  fill,
  initialData,
}: {
  title: string;
  subtitle: string;
  dataKey: "documentos" | "casos";
  fill: string;
  initialData: DashboardUnidadePoint[];
}) {
  const { resolvedTheme } = useTheme();
  const narrow = useIsNarrow();
  const [filter, setFilter] = useState<DashboardTimeFilter>(DASHBOARD_TIME_TUDO);
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  function changeFilter(next: DashboardTimeFilter) {
    setFilter(next);
    startTransition(async () => {
      setError(null);
      const result = await fetchDocCasosPorUnidadeAction(next);
      if (result.error) {
        setError(result.error);
        setData([]);
        return;
      }
      setData(result.data);
    });
  }

  const empty = data.every((d) => d[dataKey] === 0);

  return (
    <ChartPanel
      title={title}
      subtitle={subtitle}
      filters={
        <TimeFilters value={filter} onChange={changeFilter} disabled={pending} />
      }
      pending={pending}
      error={error}
    >
      {empty ? (
        <EmptyChart />
      ) : (
        <ChartFrame minWidth={420}>
          <ResponsiveContainer width="100%" height="100%" key={resolvedTheme}>
            <BarChart
              data={data}
              margin={{
                top: CHART_TOP_MARGIN,
                right: narrow ? 4 : 8,
                left: 0,
                bottom: 8,
              }}
            >
              <CartesianGrid
                stroke={CHART_GRID}
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="unidade"
                tick={{ fill: CHART_AXIS, fontSize: narrow ? 10 : 11 }}
                axisLine={{ stroke: CHART_AXIS_LINE }}
                tickLine={false}
                interval={0}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: CHART_AXIS, fontSize: narrow ? 10 : 11 }}
                axisLine={false}
                tickLine={false}
                width={narrow ? 28 : 36}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey={dataKey} name={title} fill={fill} radius={[3, 3, 0, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.unidade} fill={fill} />
                ))}
                <LabelList
                  dataKey={dataKey}
                  position="top"
                  fill={CHART_AXIS}
                  fontSize={narrow ? 10 : 11}
                  formatter={formatBarLabel}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      )}
    </ChartPanel>
  );
}

function DocTipoUnidadeChart({
  initialData,
}: {
  initialData: DashboardDocTipoUnidadePoint[];
}) {
  const { resolvedTheme } = useTheme();
  const narrow = useIsNarrow();
  const [filter, setFilter] = useState<DashboardTimeFilter>(DASHBOARD_TIME_TUDO);
  const [unidadeFilter, setUnidadeFilter] = useState<UnidadeFilter>("todas");
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  function changeFilter(next: DashboardTimeFilter) {
    setFilter(next);
    startTransition(async () => {
      setError(null);
      const result = await fetchDocPorTipoUnidadeAction(next);
      if (result.error) {
        setError(result.error);
        setData([]);
        return;
      }
      setData(result.data);
    });
  }

  const chartData = useMemo(() => {
    if (unidadeFilter === "todas") return data;
    const hit = data.find((d) => d.unidade === unidadeFilter);
    if (!hit) {
      return [
        {
          unidade: unidadeFilter,
          RCI: 0,
          INFO: 0,
          RDCI: 0,
          OUTROS: 0,
        },
      ];
    }
    return [hit];
  }, [data, unidadeFilter]);

  const singleUnitBars = useMemo(() => {
    if (unidadeFilter === "todas") return null;
    const row = chartData[0];
    if (!row) return [];
    return DOCUMENTO_TIPO_CHART_KEYS.map((tipo) => ({
      name: tipo,
      total: row[tipo],
      fill: DOCUMENTO_TIPO_CHART_COLORS[tipo],
    }));
  }, [chartData, unidadeFilter]);

  const empty =
    unidadeFilter === "todas"
      ? data.every((d) =>
          DOCUMENTO_TIPO_CHART_KEYS.every((k) => d[k] === 0),
        )
      : (singleUnitBars?.every((d) => d.total === 0) ?? true);

  return (
    <ChartPanel
      title="Documentos por tipo e unidade"
      subtitle="RCI, INFO, RDCI e OUTROS — filtre por tempo e por unidade"
      filters={
        <TimeFilters value={filter} onChange={changeFilter} disabled={pending} />
      }
      extraFilters={
        <UnidadeFilters
          value={unidadeFilter}
          onChange={setUnidadeFilter}
          disabled={pending}
        />
      }
      pending={pending}
      error={error}
    >
      {empty ? (
        <EmptyChart />
      ) : unidadeFilter === "todas" ? (
        <ChartFrame minWidth={480}>
          <ResponsiveContainer width="100%" height="100%" key={resolvedTheme}>
            <BarChart
              data={chartData}
              margin={{
                top: CHART_TOP_MARGIN,
                right: narrow ? 4 : 8,
                left: 0,
                bottom: narrow ? 28 : 8,
              }}
            >
              <CartesianGrid
                stroke={CHART_GRID}
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="unidade"
                tick={{ fill: CHART_AXIS, fontSize: narrow ? 10 : 11 }}
                axisLine={{ stroke: CHART_AXIS_LINE }}
                tickLine={false}
                interval={0}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: CHART_AXIS, fontSize: narrow ? 10 : 11 }}
                axisLine={false}
                tickLine={false}
                width={narrow ? 28 : 36}
              />
              <Tooltip
                content={
                  <ChartTooltip seriesOrder={DOCUMENTO_TIPO_CHART_KEYS} />
                }
              />
              <Legend
                wrapperStyle={{
                  fontSize: narrow ? 10 : 11,
                  color: CHART_LEGEND,
                  paddingTop: narrow ? 4 : 0,
                }}
                iconType="circle"
                iconSize={narrow ? 8 : 10}
                itemSorter={(item) => {
                  const key = String(item.dataKey ?? item.value ?? "");
                  const idx = (
                    DOCUMENTO_TIPO_CHART_KEYS as readonly string[]
                  ).indexOf(key);
                  return idx < 0 ? 999 : idx;
                }}
              />
              {DOCUMENTO_TIPO_CHART_KEYS.map((tipo) => (
                <Bar
                  key={tipo}
                  dataKey={tipo}
                  name={tipo}
                  fill={DOCUMENTO_TIPO_CHART_COLORS[tipo]}
                  radius={[3, 3, 0, 0]}
                >
                  <LabelList
                    dataKey={tipo}
                    position="top"
                    fill={CHART_AXIS}
                    fontSize={narrow ? 9 : 10}
                    formatter={formatBarLabel}
                  />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      ) : (
        <ChartFrame minWidth={360}>
          <ResponsiveContainer width="100%" height="100%" key={resolvedTheme}>
            <BarChart
              data={singleUnitBars ?? []}
              margin={{
                top: CHART_TOP_MARGIN,
                right: narrow ? 4 : 8,
                left: 0,
                bottom: 8,
              }}
            >
              <CartesianGrid
                stroke={CHART_GRID}
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: CHART_AXIS, fontSize: narrow ? 10 : 11 }}
                axisLine={{ stroke: CHART_AXIS_LINE }}
                tickLine={false}
                interval={0}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: CHART_AXIS, fontSize: narrow ? 10 : 11 }}
                axisLine={false}
                tickLine={false}
                width={narrow ? 28 : 36}
              />
              <Tooltip
                content={
                  <ChartTooltip seriesOrder={DOCUMENTO_TIPO_CHART_KEYS} />
                }
              />
              <Bar dataKey="total" name="Documentos" radius={[3, 3, 0, 0]}>
                {(singleUnitBars ?? []).map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
                <LabelList
                  dataKey="total"
                  position="top"
                  fill={CHART_AXIS}
                  fontSize={narrow ? 10 : 11}
                  formatter={formatBarLabel}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      )}
    </ChartPanel>
  );
}

function CasosStatusChart({
  initialData,
}: {
  initialData: DashboardCasoStatusPoint[];
}) {
  const { resolvedTheme } = useTheme();
  const narrow = useIsNarrow();
  const [filter, setFilter] = useState<DashboardTimeFilter>(DASHBOARD_TIME_TUDO);
  const [unidadeFilter, setUnidadeFilter] = useState<UnidadeFilter>("todas");
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  function changeFilter(next: DashboardTimeFilter) {
    setFilter(next);
    startTransition(async () => {
      setError(null);
      const result = await fetchCasosPorStatusAction(next);
      if (result.error) {
        setError(result.error);
        setData([]);
        return;
      }
      setData(result.data);
    });
  }

  const chartData = useMemo(() => {
    if (unidadeFilter === "todas") return data;
    const hit = data.find((d) => d.unidade === unidadeFilter);
    if (!hit) {
      return [
        {
          unidade: unidadeFilter,
          em_andamento: 0,
          encerrado: 0,
        },
      ];
    }
    return [hit];
  }, [data, unidadeFilter]);

  const singleUnitBars = useMemo(() => {
    if (unidadeFilter === "todas") return null;
    const row = chartData[0];
    if (!row) return [];
    return CASO_STATUS_CHART_KEYS.map((status) => {
      const full = CASO_STATUS_CHART_LABELS[status];
      return {
        name: narrow ? (CASO_STATUS_SHORT[full] ?? full) : full,
        total: row[status],
        fill: CASO_STATUS_CHART_COLORS[status],
      };
    });
  }, [chartData, unidadeFilter, narrow]);

  const empty =
    unidadeFilter === "todas"
      ? data.every((d) =>
          CASO_STATUS_CHART_KEYS.every((k) => d[k] === 0),
        )
      : (singleUnitBars?.every((d) => d.total === 0) ?? true);

  return (
    <ChartPanel
      title="Casos por status"
      subtitle="Em andamento e encerrados — filtre por tempo e por unidade"
      filters={
        <TimeFilters value={filter} onChange={changeFilter} disabled={pending} />
      }
      extraFilters={
        <UnidadeFilters
          value={unidadeFilter}
          onChange={setUnidadeFilter}
          disabled={pending}
        />
      }
      pending={pending}
      error={error}
    >
      {empty ? (
        <EmptyChart />
      ) : unidadeFilter === "todas" ? (
        <ChartFrame minWidth={440}>
          <ResponsiveContainer width="100%" height="100%" key={resolvedTheme}>
            <BarChart
              data={chartData}
              margin={{
                top: CHART_TOP_MARGIN,
                right: narrow ? 4 : 8,
                left: 0,
                bottom: narrow ? 28 : 8,
              }}
            >
              <CartesianGrid
                stroke={CHART_GRID}
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="unidade"
                tick={{ fill: CHART_AXIS, fontSize: narrow ? 10 : 11 }}
                axisLine={{ stroke: CHART_AXIS_LINE }}
                tickLine={false}
                interval={0}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: CHART_AXIS, fontSize: narrow ? 10 : 11 }}
                axisLine={false}
                tickLine={false}
                width={narrow ? 28 : 36}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{
                  fontSize: narrow ? 10 : 11,
                  color: CHART_LEGEND,
                  paddingTop: narrow ? 4 : 0,
                }}
                iconType="circle"
                iconSize={narrow ? 8 : 10}
                formatter={(value) =>
                  narrow
                    ? (CASO_STATUS_SHORT[String(value)] ?? value)
                    : value
                }
              />
              {CASO_STATUS_CHART_KEYS.map((status) => (
                <Bar
                  key={status}
                  dataKey={status}
                  name={CASO_STATUS_CHART_LABELS[status]}
                  fill={CASO_STATUS_CHART_COLORS[status]}
                  radius={[3, 3, 0, 0]}
                >
                  <LabelList
                    dataKey={status}
                    position="top"
                    fill={CHART_AXIS}
                    fontSize={narrow ? 9 : 10}
                    formatter={formatBarLabel}
                  />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      ) : (
        <ChartFrame minWidth={320}>
          <ResponsiveContainer width="100%" height="100%" key={resolvedTheme}>
            <BarChart
              data={singleUnitBars ?? []}
              margin={{
                top: CHART_TOP_MARGIN,
                right: narrow ? 4 : 8,
                left: 0,
                bottom: 8,
              }}
            >
              <CartesianGrid
                stroke={CHART_GRID}
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: CHART_AXIS, fontSize: narrow ? 10 : 11 }}
                axisLine={{ stroke: CHART_AXIS_LINE }}
                tickLine={false}
                interval={0}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: CHART_AXIS, fontSize: narrow ? 10 : 11 }}
                axisLine={false}
                tickLine={false}
                width={narrow ? 28 : 36}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="total" name="Casos" radius={[3, 3, 0, 0]}>
                {(singleUnitBars ?? []).map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
                <LabelList
                  dataKey="total"
                  position="top"
                  fill={CHART_AXIS}
                  fontSize={narrow ? 10 : 11}
                  formatter={formatBarLabel}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      )}
    </ChartPanel>
  );
}

export function DashboardCharts({
  initialTotais,
  initialPorUnidade,
  initialPorTipo,
  initialCasosStatus,
}: Props) {
  return (
    <div className="space-y-4" aria-label="Gráficos quantitativos">
      <div>
        <h2 className="text-sm font-semibold tracking-[0.18em] text-[color:var(--dash-gold)] uppercase">
          Indicadores gráficos
        </h2>
        <p className="mt-1 text-xs text-[color:var(--dash-muted)]">
          Colunas interativas com filtros de tempo e unidade
        </p>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <UnidadeMetricChart
            title="Documentos por unidade"
            subtitle="Totais de documentos no período selecionado"
            dataKey="documentos"
            fill={DOC_COLOR}
            initialData={initialPorUnidade}
          />
          <DocTipoUnidadeChart initialData={initialPorTipo} />
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <UnidadeMetricChart
            title="Casos por unidade"
            subtitle="Totais de casos no período selecionado"
            dataKey="casos"
            fill={CASOS_COLOR}
            initialData={initialPorUnidade}
          />
          <CasosStatusChart initialData={initialCasosStatus} />
        </div>

        <TotaisEntidadesChart initialData={initialTotais} />
      </div>
    </div>
  );
}
