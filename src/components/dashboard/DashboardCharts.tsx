"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "next-themes";
import { fetchDashboardPeriodAction } from "@/app/actions/dashboard";
import {
  DASHBOARD_ENTITIES,
  type DashboardEntityKey,
  type DashboardPeriodMode,
  type DashboardSeriesPoint,
  type DashboardUnidadePoint,
} from "@/lib/dashboard";

const PROC_COLOR =
  DASHBOARD_ENTITIES.find((e) => e.key === "procedimentos")?.color ??
  "var(--cor-entidade-procedimentos)";
const CASOS_COLOR =
  DASHBOARD_ENTITIES.find((e) => e.key === "casos")?.color ??
  "var(--cor-entidade-casos)";

const CHART_AXIS = "var(--cor-chart-axis)";
const CHART_GRID = "var(--cor-chart-grid)";
const CHART_AXIS_LINE = "var(--cor-chart-axis-line)";
const CHART_LEGEND = "var(--cor-chart-legend)";

type Props = {
  initialSeries: DashboardSeriesPoint[];
  initialPorUnidade: DashboardUnidadePoint[];
  initialMode?: DashboardPeriodMode;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-[color:var(--dash-border-strong)] bg-[color:var(--cor-chart-tooltip-bg)] px-3 py-2 shadow-[var(--cor-sombra-dropdown)]">
      <p className="mb-1.5 text-[11px] tracking-[0.14em] text-[color:var(--dash-gold)] uppercase">
        {label}
      </p>
      <ul className="space-y-1">
        {payload.map((entry) => (
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

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-4">
      <h3 className="mb-4 text-[11px] font-medium tracking-[0.2em] text-[color:var(--dash-muted-strong)] uppercase">
        {title}
      </h3>
      <div className="h-72 w-full min-w-0">{children}</div>
    </div>
  );
}

function ChartsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-md border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-4"
        >
          <div className="mb-4 h-3 w-40 animate-pulse rounded bg-[color:var(--dash-border)]" />
          <div className="flex h-72 items-end gap-2 px-2 pb-2">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="flex-1 animate-pulse rounded-t bg-[color:var(--dash-border)]"
                style={{ height: `${30 + ((idx * 17) % 55)}%` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function UnidadeBarChart({
  title,
  dataKey,
  data,
  fill,
}: {
  title: string;
  dataKey: "procedimentos" | "casos";
  data: DashboardUnidadePoint[];
  fill: string;
}) {
  const empty = data.every((d) => d[dataKey] === 0);

  return (
    <Panel title={title}>
      {empty ? (
        <EmptyChart message="Sem registros no período para exibir." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
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
            <Bar
              dataKey={dataKey}
              name={title}
              fill={fill}
              radius={[3, 3, 0, 0]}
            >
              {data.map((entry) => (
                <Cell key={entry.unidade} fill={fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}

export function DashboardCharts({
  initialSeries,
  initialPorUnidade,
  initialMode = "mes",
}: Props) {
  const { resolvedTheme } = useTheme();
  const [mode, setMode] = useState<DashboardPeriodMode>(initialMode);
  const [series, setSeries] = useState<DashboardSeriesPoint[]>(initialSeries);
  const [porUnidade, setPorUnidade] =
    useState<DashboardUnidadePoint[]>(initialPorUnidade);
  const [error, setError] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState<"todas" | DashboardEntityKey>(
    "todas",
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSeries(initialSeries);
  }, [initialSeries]);

  useEffect(() => {
    setPorUnidade(initialPorUnidade);
  }, [initialPorUnidade]);

  function changeMode(next: DashboardPeriodMode) {
    if (next === mode && !error) return;
    setMode(next);
    startTransition(async () => {
      setError(null);
      const result = await fetchDashboardPeriodAction(next);
      if (result.seriesError || result.porUnidadeError) {
        setError(result.seriesError ?? result.porUnidadeError);
        if (!result.seriesError) setSeries(result.series);
        else setSeries([]);
        if (!result.porUnidadeError) setPorUnidade(result.porUnidade);
        else setPorUnidade([]);
        return;
      }
      setSeries(result.series);
      setPorUnidade(result.porUnidade);
    });
  }

  const visibleEntities = useMemo(
    () =>
      entityFilter === "todas"
        ? DASHBOARD_ENTITIES
        : DASHBOARD_ENTITIES.filter((e) => e.key === entityFilter),
    [entityFilter],
  );

  const barData = useMemo(() => {
    return visibleEntities.map((entity) => {
      const total = series.reduce(
        (sum, point) => sum + (point[entity.key] ?? 0),
        0,
      );
      return {
        name: entity.label,
        total,
        fill: entity.color,
      };
    });
  }, [series, visibleEntities]);

  const periodHint =
    mode === "ano" ? "ano civil corrente" : "mês civil corrente";

  return (
    <div className="space-y-8">
      <section aria-label="Gráficos quantitativos" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-[0.18em] text-[color:var(--dash-gold)] uppercase">
              Inserções por entidade
            </h2>
            <p className="mt-1 text-xs text-[color:var(--dash-muted)]">
              Baseado em data de cadastro — compare o ritmo entre entidades
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] p-0.5">
              {(
                [
                  ["mes", "Por mês"],
                  ["ano", "Por ano"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  disabled={pending}
                  onClick={() => changeMode(value)}
                  className={`rounded px-3 py-1.5 text-[11px] tracking-[0.14em] uppercase transition-colors disabled:opacity-60 ${
                    mode === value
                      ? "bg-[color:var(--dash-gold)] font-semibold text-gold-ink"
                      : "text-[color:var(--dash-muted-strong)] hover:text-[color:var(--dash-gold)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-[11px] tracking-[0.12em] text-[color:var(--dash-muted)] uppercase">
              Entidade
              <select
                value={entityFilter}
                onChange={(e) =>
                  setEntityFilter(
                    e.target.value as "todas" | DashboardEntityKey,
                  )
                }
                className="rounded border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] px-2 py-1.5 text-xs tracking-normal text-[color:var(--dash-gold)] normal-case outline-none focus:border-[color:var(--dash-gold)]"
              >
                <option value="todas">Todas</option>
                {DASHBOARD_ENTITIES.map((entity) => (
                  <option key={entity.key} value={entity.key}>
                    {entity.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error ? (
          <div className="rounded-md border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-fg">
            {error}
          </div>
        ) : null}

        {pending ? (
          <ChartsSkeleton />
        ) : (
          <div
            className="grid grid-cols-1 gap-3 xl:grid-cols-2"
            key={resolvedTheme ?? "dark"}
          >
            <Panel title="Evolução de cadastros">
              {series.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={series}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      {visibleEntities.map((entity) => (
                        <linearGradient
                          key={entity.key}
                          id={`grad-${entity.key}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={entity.color}
                            stopOpacity={0.45}
                          />
                          <stop
                            offset="100%"
                            stopColor={entity.color}
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid
                      stroke={CHART_GRID}
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: CHART_AXIS, fontSize: 11 }}
                      axisLine={{ stroke: CHART_AXIS_LINE }}
                      tickLine={false}
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
                    {visibleEntities.map((entity) => (
                      <Area
                        key={entity.key}
                        type="monotone"
                        dataKey={entity.key}
                        name={entity.label}
                        stroke={entity.color}
                        fill={`url(#grad-${entity.key})`}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Panel>

            <Panel title="Total no período">
              {barData.every((d) => d.total === 0) ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
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
                    <Bar dataKey="total" name="Registros" radius={[3, 3, 0, 0]}>
                      {barData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>
          </div>
        )}
      </section>

      <section aria-label="Procedimentos e casos por unidade" className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold tracking-[0.18em] text-[color:var(--dash-gold)] uppercase">
            Procedimentos e casos por unidade
          </h2>
          <p className="mt-1 text-xs text-[color:var(--dash-muted)]">
            Totais no {periodHint}, conforme o seletor Por mês / Por ano
          </p>
        </div>

        {pending ? (
          <ChartsSkeleton />
        ) : (
          <div
            className="grid grid-cols-1 gap-3 xl:grid-cols-2"
            key={`unidade-${resolvedTheme ?? "dark"}`}
          >
            <UnidadeBarChart
              title="Procedimentos por unidade"
              dataKey="procedimentos"
              data={porUnidade}
              fill={PROC_COLOR}
            />
            <UnidadeBarChart
              title="Casos por unidade"
              dataKey="casos"
              data={porUnidade}
              fill={CASOS_COLOR}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyChart({
  message = "Sem cadastros no período para exibir.",
}: {
  message?: string;
}) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-[color:var(--dash-muted)]">
      {message}
    </div>
  );
}
