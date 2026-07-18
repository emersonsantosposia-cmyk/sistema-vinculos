"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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

function formatBarLabel(value: unknown): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n.toLocaleString("pt-BR");
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
  return (
    <div className="rounded border border-[color:var(--dash-border-strong)] bg-[color:var(--cor-chart-tooltip-bg)] px-3 py-2 shadow-[var(--cor-sombra-dropdown)]">
      <p className="mb-1.5 text-[11px] tracking-[0.14em] text-[color:var(--dash-gold)] uppercase">
        {label}
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(DASHBOARD_TIME_TUDO)}
        className={`rounded border px-3 py-1.5 text-[11px] tracking-[0.14em] uppercase transition-colors disabled:opacity-60 ${
          tudoActive
            ? "border-[color:var(--dash-gold)] bg-[color:var(--dash-gold)] font-semibold text-gold-ink"
            : "border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] text-[color:var(--dash-muted-strong)] hover:border-[color:var(--dash-gold)] hover:text-[color:var(--dash-gold)]"
        }`}
      >
        Tudo
      </button>

      <label className="flex items-center gap-2 text-[11px] tracking-[0.12em] text-[color:var(--dash-muted)] uppercase">
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
          className="min-w-[5.5rem] rounded border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] px-2 py-1.5 text-xs tracking-normal text-[color:var(--dash-gold)] normal-case outline-none focus:border-[color:var(--dash-gold)] disabled:opacity-60"
        >
          <option value="">—</option>
          {YEARS.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-[11px] tracking-[0.12em] text-[color:var(--dash-muted)] uppercase">
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
          className="min-w-[7.5rem] rounded border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] px-2 py-1.5 text-xs tracking-normal text-[color:var(--dash-gold)] normal-case outline-none focus:border-[color:var(--dash-gold)] disabled:opacity-60"
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
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value === opt;
        const label = opt === "todas" ? "Todas" : opt;
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt)}
            className={`rounded border px-2.5 py-1 text-[10px] tracking-[0.12em] uppercase transition-colors disabled:opacity-60 ${
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
}: {
  title: string;
  subtitle: string;
  filters: React.ReactNode;
  extraFilters?: React.ReactNode;
  pending: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="rounded-md border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-4"
    >
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-[11px] font-medium tracking-[0.2em] text-[color:var(--dash-muted-strong)] uppercase">
            {title}
          </h3>
          <p className="mt-1 text-xs text-[color:var(--dash-muted)]">
            {subtitle}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 lg:items-end">
          {filters}
          {extraFilters}
        </div>
      </div>

      {error ? (
        <div className="mb-3 rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-fg">
          {error}
        </div>
      ) : null}

      <div className="relative h-72 w-full min-w-0">
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
      filters={
        <TimeFilters value={filter} onChange={changeFilter} disabled={pending} />
      }
      pending={pending}
      error={error}
    >
      {empty ? (
        <EmptyChart />
      ) : (
        <ResponsiveContainer width="100%" height="100%" key={resolvedTheme}>
          <BarChart
            data={data}
            margin={{ top: CHART_TOP_MARGIN, right: 8, left: 0, bottom: 8 }}
          >
            <CartesianGrid
              stroke={CHART_GRID}
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fill: CHART_AXIS, fontSize: 11 }}
              axisLine={{ stroke: CHART_AXIS_LINE }}
              tickLine={false}
              interval={0}
              angle={-18}
              textAnchor="end"
              height={54}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: CHART_AXIS, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={36}
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
                fontSize={11}
                formatter={formatBarLabel}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
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
        <ResponsiveContainer width="100%" height="100%" key={resolvedTheme}>
          <BarChart
            data={data}
            margin={{ top: CHART_TOP_MARGIN, right: 8, left: 0, bottom: 8 }}
          >
            <CartesianGrid
              stroke={CHART_GRID}
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="unidade"
              tick={{ fill: CHART_AXIS, fontSize: 11 }}
              axisLine={{ stroke: CHART_AXIS_LINE }}
              tickLine={false}
              interval={0}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: CHART_AXIS, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={36}
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
                fontSize={11}
                formatter={formatBarLabel}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
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
        <ResponsiveContainer width="100%" height="100%" key={resolvedTheme}>
          <BarChart
            data={chartData}
            margin={{ top: CHART_TOP_MARGIN, right: 8, left: 0, bottom: 8 }}
          >
            <CartesianGrid
              stroke={CHART_GRID}
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="unidade"
              tick={{ fill: CHART_AXIS, fontSize: 11 }}
              axisLine={{ stroke: CHART_AXIS_LINE }}
              tickLine={false}
              interval={0}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: CHART_AXIS, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              content={
                <ChartTooltip seriesOrder={DOCUMENTO_TIPO_CHART_KEYS} />
              }
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: CHART_LEGEND }}
              iconType="circle"
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
                  fontSize={10}
                  formatter={formatBarLabel}
                />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height="100%" key={resolvedTheme}>
          <BarChart
            data={singleUnitBars ?? []}
            margin={{ top: CHART_TOP_MARGIN, right: 8, left: 0, bottom: 8 }}
          >
            <CartesianGrid
              stroke={CHART_GRID}
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fill: CHART_AXIS, fontSize: 11 }}
              axisLine={{ stroke: CHART_AXIS_LINE }}
              tickLine={false}
              interval={0}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: CHART_AXIS, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={36}
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
                fontSize={11}
                formatter={formatBarLabel}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
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
    return CASO_STATUS_CHART_KEYS.map((status) => ({
      name: CASO_STATUS_CHART_LABELS[status],
      total: row[status],
      fill: CASO_STATUS_CHART_COLORS[status],
    }));
  }, [chartData, unidadeFilter]);

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
        <ResponsiveContainer width="100%" height="100%" key={resolvedTheme}>
          <BarChart
            data={chartData}
            margin={{ top: CHART_TOP_MARGIN, right: 8, left: 0, bottom: 8 }}
          >
            <CartesianGrid
              stroke={CHART_GRID}
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="unidade"
              tick={{ fill: CHART_AXIS, fontSize: 11 }}
              axisLine={{ stroke: CHART_AXIS_LINE }}
              tickLine={false}
              interval={0}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: CHART_AXIS, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, color: CHART_LEGEND }}
              iconType="circle"
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
                  fontSize={10}
                  formatter={formatBarLabel}
                />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height="100%" key={resolvedTheme}>
          <BarChart
            data={singleUnitBars ?? []}
            margin={{ top: CHART_TOP_MARGIN, right: 8, left: 0, bottom: 8 }}
          >
            <CartesianGrid
              stroke={CHART_GRID}
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fill: CHART_AXIS, fontSize: 11 }}
              axisLine={{ stroke: CHART_AXIS_LINE }}
              tickLine={false}
              interval={0}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: CHART_AXIS, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={36}
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
                fontSize={11}
                formatter={formatBarLabel}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
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

      <div className="grid grid-cols-1 gap-3">
        <TotaisEntidadesChart initialData={initialTotais} />
        <UnidadeMetricChart
          title="Documentos por unidade"
          subtitle="Totais de documentos no período selecionado"
          dataKey="documentos"
          fill={DOC_COLOR}
          initialData={initialPorUnidade}
        />
        <DocTipoUnidadeChart initialData={initialPorTipo} />
        <UnidadeMetricChart
          title="Casos por unidade"
          subtitle="Totais de casos no período selecionado"
          dataKey="casos"
          fill={CASOS_COLOR}
          initialData={initialPorUnidade}
        />
        <CasosStatusChart initialData={initialCasosStatus} />
      </div>
    </div>
  );
}
