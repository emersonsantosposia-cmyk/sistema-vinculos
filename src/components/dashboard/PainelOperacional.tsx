"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { fetchPainelOperacionalMetricsAction } from "@/app/actions/dashboard";
import { DashboardTimeFilters } from "@/components/dashboard/DashboardTimeFilters";
import { PorQueLinceButton } from "@/components/dashboard/PorQueLinceButton";
import {
  DASHBOARD_TIME_TUDO,
  type DashboardTimeFilter,
  type PainelMetric,
  type PainelOperacionalData,
} from "@/lib/dashboard";

type ScopeButton = "tudo" | "ano" | "mes";

function deltaSuffix(scope: Exclude<ScopeButton, "tudo">): string {
  return scope === "ano" ? "no ano" : "no mês";
}

function MetricCard({
  metric,
  scope,
  maxValue,
  pending,
}: {
  metric: PainelMetric;
  scope: ScopeButton;
  maxValue: number;
  pending: boolean;
}) {
  const fill =
    maxValue > 0 ? Math.max(6, Math.round((metric.value / maxValue) * 100)) : 0;
  const showDelta = scope !== "tudo" && metric.delta != null;
  const delta = metric.delta ?? 0;
  const trend =
    delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const periodLabel = scope === "tudo" ? "" : deltaSuffix(scope);

  const body = (
    <>
      <p className="text-[9px] tracking-[0.16em] text-[color:var(--dash-muted)] uppercase sm:text-[10px]">
        {metric.label}
      </p>
      <p
        className={`mt-1 font-bold text-xl tracking-tight text-[color:var(--dash-gold)] tabular-nums sm:text-2xl ${
          pending ? "opacity-60" : ""
        }`}
      >
        {metric.value.toLocaleString("pt-BR")}
      </p>
      {showDelta ? (
        <p
          className={`mt-1 flex items-center gap-1 text-[10px] font-medium tracking-wide sm:text-[11px] ${
            trend === "up"
              ? "text-[color:var(--cor-entidade-documentos)]"
              : trend === "down"
                ? "text-[color:var(--cor-perigo)]"
                : "text-[color:var(--dash-muted)]"
          }`}
          aria-label={
            trend === "flat"
              ? `Sem variação ${periodLabel}`
              : `${trend === "up" ? "Aumento" : "Redução"} de ${Math.abs(delta)} ${periodLabel}`
          }
        >
          {trend !== "flat" ? (
            <span aria-hidden className="text-[9px] leading-none">
              {trend === "up" ? "▲" : "▼"}
            </span>
          ) : null}
          <span>
            {Math.abs(delta).toLocaleString("pt-BR")} {periodLabel}
          </span>
        </p>
      ) : (
        <p className="mt-1 h-[1.125rem]" aria-hidden />
      )}
      <div
        className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[color:var(--cor-chart-gauge-track)]"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-[color:var(--cor-entidade-documentos)] transition-[width] duration-300"
          style={{ width: `${fill}%` }}
        />
      </div>
    </>
  );

  const className =
    "flex min-h-[7.25rem] flex-col rounded-md border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] px-3 py-3 text-left shadow-[var(--cor-sombra-dropdown)] transition-colors sm:min-h-[7.75rem] sm:px-3.5 sm:py-3.5";

  if (metric.href) {
    return (
      <Link
        href={metric.href}
        className={`${className} hover:border-[color:var(--dash-gold)] hover:bg-[color:var(--dash-panel-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--dash-gold)]`}
      >
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}

export function PainelOperacional({
  initialData,
}: {
  initialData: PainelOperacionalData;
}) {
  const [filter, setFilter] = useState<DashboardTimeFilter>(DASHBOARD_TIME_TUDO);
  const [data, setData] = useState(initialData);
  const [pending, startTransition] = useTransition();

  function changeFilter(next: DashboardTimeFilter) {
    if (
      next.scope === filter.scope &&
      next.year === filter.year &&
      next.month === filter.month
    ) {
      return;
    }
    setFilter(next);
    startTransition(async () => {
      const result = await fetchPainelOperacionalMetricsAction(next);
      if (result.data) setData(result.data);
    });
  }

  const maxValue = Math.max(...data.metrics.map((m) => m.value), 1);

  return (
    <header className="overflow-hidden rounded-md border border-[color:var(--dash-border)] bg-[color:var(--dash-header)] shadow-[var(--cor-sombra-modal)]">
      <div className="flex flex-col gap-3 px-3 py-3 sm:gap-3.5 sm:px-4 sm:py-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-[10px] font-medium tracking-[0.2em] text-[color:var(--dash-muted-strong)] uppercase sm:text-[11px]">
            Painel operacional
          </h1>

          <DashboardTimeFilters
            value={filter}
            onChange={changeFilter}
            disabled={pending}
          />

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 lg:justify-end">
            <p className="text-[9px] font-medium tracking-[0.16em] text-[color:var(--dash-muted)] uppercase sm:text-[10px]">
              Rede Lince / PPF
            </p>
            <PorQueLinceButton />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-4">
          {data.metrics.map((metric) => (
            <MetricCard
              key={metric.key}
              metric={metric}
              scope={filter.scope}
              maxValue={maxValue}
              pending={pending}
            />
          ))}
        </div>
      </div>
    </header>
  );
}
