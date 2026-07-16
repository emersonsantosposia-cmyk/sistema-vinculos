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
import { fetchInsercoesPorPeriodoAction } from "@/app/actions/dashboard";
import {
  DASHBOARD_ENTITIES,
  type DashboardEntityKey,
  type DashboardPeriodMode,
  type DashboardSeriesPoint,
} from "@/lib/dashboard";

type Props = {
  initialSeries: DashboardSeriesPoint[];
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
    <div className="rounded border border-[color:var(--dash-border-strong)] bg-[#0f1410] px-3 py-2 shadow-xl">
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

function ChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2" aria-busy="true">
      {[0, 1].map((i) => (
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

export function DashboardCharts({
  initialSeries,
  initialMode = "mes",
}: Props) {
  const [mode, setMode] = useState<DashboardPeriodMode>(initialMode);
  const [series, setSeries] = useState<DashboardSeriesPoint[]>(initialSeries);
  const [error, setError] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState<"todas" | DashboardEntityKey>(
    "todas",
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSeries(initialSeries);
  }, [initialSeries]);

  function changeMode(next: DashboardPeriodMode) {
    if (next === mode && !error) return;
    setMode(next);
    startTransition(async () => {
      setError(null);
      const result = await fetchInsercoesPorPeriodoAction(next);
      if (result.error) {
        setError(result.error);
        setSeries([]);
        return;
      }
      setSeries(result.data);
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

  return (
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
                    ? "bg-[color:var(--dash-gold)] font-semibold text-[#121510]"
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
                setEntityFilter(e.target.value as "todas" | DashboardEntityKey)
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
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
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
                    stroke="rgba(184,168,110,0.12)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#a9a18a", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(184,168,110,0.25)" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "#a9a18a", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: "#c9bfa3" }}
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
                    stroke="rgba(184,168,110,0.12)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#a9a18a", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(184,168,110,0.25)" }}
                    tickLine={false}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={54}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "#a9a18a", fontSize: 11 }}
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
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-[color:var(--dash-muted)]">
      Sem cadastros no período para exibir.
    </div>
  );
}
