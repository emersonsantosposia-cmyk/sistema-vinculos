import { Suspense } from "react";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { DashboardGauges } from "@/components/dashboard/DashboardGauges";
import {
  EntityKpiCards,
  EntityKpiCardsSkeleton,
} from "@/components/dashboard/EntityKpiCards";
import type { DashboardCounts, DashboardSeriesPoint } from "@/lib/dashboard";
import {
  getDashboardCounts,
  getInsercoesPorPeriodo,
} from "@/lib/supabase/dashboard-server";

export function DashboardView({
  counts,
  initialSeries,
}: {
  counts: DashboardCounts;
  initialSeries: DashboardSeriesPoint[];
}) {
  return (
    <div className="dashboard-tactical relative min-h-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 dash-bg-layer" aria-hidden />
      <div className="pointer-events-none absolute inset-0 dash-grid-layer opacity-[0.07]" aria-hidden />

      <div className="relative space-y-6 p-5 sm:p-6">
        <header className="overflow-hidden rounded-md border border-[color:var(--dash-border)] bg-black shadow-[0_0_40px_rgba(0,0,0,0.45)]">
          <div className="relative">
            <img
              src="/rede-lince-institucional.png"
              alt="Rede Lince — Sistema de Contrainteligência da Polícia Penal Federal (PPF)"
              width={1024}
              height={582}
              className="block h-auto w-full object-cover object-center"
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent"
              aria-hidden
            />
          </div>

          <div className="flex flex-wrap items-stretch justify-between gap-3 border-t border-[color:var(--dash-border)] bg-[color:var(--dash-header)] px-4 py-3 sm:px-5">
            <p className="self-center text-[10px] font-medium tracking-[0.22em] text-[color:var(--dash-muted)] uppercase sm:text-[11px]">
              Painel operacional · Rede Lince / PPF
            </p>
            <div className="flex flex-wrap gap-3">
              <SummaryChip label="Registros" value={counts.totalRegistros} />
              <SummaryChip label="Vínculos" value={counts.totalVinculos} />
            </div>
          </div>
        </header>

        <EntityKpiCards entities={counts.entities} />

        <DashboardCharts initialSeries={initialSeries} initialMode="mes" />

        <DashboardGauges
          pessoasPresasPct={counts.gauges.pessoasPresasPct}
          comunicacoesAtivasPct={counts.gauges.comunicacoesAtivasPct}
        />
      </div>
    </div>
  );
}

/** Carrega contagens e série inicial no servidor (Suspense-friendly). */
export async function DashboardData() {
  const [countsResult, seriesResult] = await Promise.all([
    getDashboardCounts(),
    getInsercoesPorPeriodo("mes"),
  ]);

  if (countsResult.error || !countsResult.data) {
    return (
      <div className="dashboard-tactical p-6">
        <div className="rounded-md border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] px-4 py-6 text-sm text-[color:var(--dash-muted-strong)]">
          {countsResult.error ?? "Não foi possível carregar o dashboard."}
        </div>
      </div>
    );
  }

  return (
    <DashboardView
      counts={countsResult.data}
      initialSeries={seriesResult.data}
    />
  );
}

export function DashboardFallback() {
  return (
    <div className="dashboard-tactical relative min-h-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 dash-bg-layer" aria-hidden />
      <div className="relative space-y-6 p-5 sm:p-6">
        <div className="overflow-hidden rounded-md border border-[color:var(--dash-border)] bg-black">
          <div className="aspect-[1024/320] w-full animate-pulse bg-[#121812] sm:aspect-[1024/280]" />
          <div className="flex justify-end gap-3 border-t border-[color:var(--dash-border)] px-4 py-3">
            <div className="h-14 w-28 animate-pulse rounded bg-[color:var(--dash-panel)]" />
            <div className="h-14 w-28 animate-pulse rounded bg-[color:var(--dash-panel)]" />
          </div>
        </div>
        <EntityKpiCardsSkeleton />
        <div className="space-y-3">
          <div className="h-4 w-56 animate-pulse rounded bg-[color:var(--dash-border)]" />
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className="h-80 animate-pulse rounded-md border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)]" />
            <div className="h-80 animate-pulse rounded-md border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardWithSuspense() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardData />
    </Suspense>
  );
}

function SummaryChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[7.5rem] rounded border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] px-3 py-2 sm:min-w-[8.5rem] sm:px-4 sm:py-2.5">
      <p className="font-bold text-xl tracking-tight text-[color:var(--dash-gold)] tabular-nums sm:text-2xl">
        {value.toLocaleString("pt-BR")}
      </p>
      <p className="mt-0.5 text-[10px] tracking-[0.2em] text-[color:var(--dash-muted)] uppercase">
        {label}
      </p>
    </div>
  );
}
