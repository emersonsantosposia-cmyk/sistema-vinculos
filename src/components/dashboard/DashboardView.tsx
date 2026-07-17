import { Suspense } from "react";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { DashboardGauges } from "@/components/dashboard/DashboardGauges";
import {
  EntityKpiCards,
  EntityKpiCardsSkeleton,
} from "@/components/dashboard/EntityKpiCards";
import type {
  DashboardCounts,
  DashboardSeriesPoint,
  DashboardUnidadePoint,
} from "@/lib/dashboard";
import {
  getDashboardCounts,
  getInsercoesPorPeriodo,
  getProcCasosPorUnidade,
} from "@/lib/supabase/dashboard-server";

export function DashboardView({
  counts,
  initialSeries,
  initialPorUnidade,
}: {
  counts: DashboardCounts;
  initialSeries: DashboardSeriesPoint[];
  initialPorUnidade: DashboardUnidadePoint[];
}) {
  return (
    <div className="dashboard-tactical relative min-h-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 dash-bg-layer" aria-hidden />
      <div className="pointer-events-none absolute inset-0 dash-grid-layer opacity-[0.07]" aria-hidden />

      <div className="relative space-y-6 p-5 sm:p-6">
        <header className="overflow-hidden rounded-md border border-[color:var(--dash-border)] bg-[color:var(--cor-fundo-primaria)] shadow-[var(--cor-sombra-modal)]">
          {/* Altura ~60% da original (582 → 349), largura integral */}
          <div className="relative aspect-[1024/349] w-full overflow-hidden bg-[color:var(--cor-fundo-secundaria)]">
            <img
              src="/rede-lince-institucional.png"
              alt="Rede Lince — Sistema de Contrainteligência da Polícia Penal Federal (PPF)"
              width={1024}
              height={582}
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[color:var(--cor-fundo-overlay)] to-transparent"
              aria-hidden
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--dash-border)] bg-[color:var(--dash-header)] px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
            <p className="self-center text-[9px] font-medium tracking-[0.18em] text-[color:var(--dash-muted)] uppercase sm:text-[10px] sm:tracking-[0.2em]">
              Painel operacional · Rede Lince / PPF
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-2.5">
              <SummaryChip label="Registros" value={counts.totalRegistros} />
              <SummaryChip label="Vínculos" value={counts.totalVinculos} />
            </div>
          </div>
        </header>

        <EntityKpiCards entities={counts.entities} />

        <DashboardCharts
          initialSeries={initialSeries}
          initialPorUnidade={initialPorUnidade}
          initialMode="mes"
        />

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
  const [countsResult, seriesResult, porUnidadeResult] = await Promise.all([
    getDashboardCounts(),
    getInsercoesPorPeriodo("mes"),
    getProcCasosPorUnidade("mes"),
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
      initialPorUnidade={porUnidadeResult.data}
    />
  );
}

export function DashboardFallback() {
  return (
    <div className="dashboard-tactical relative min-h-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 dash-bg-layer" aria-hidden />
      <div className="relative space-y-6 p-5 sm:p-6">
        <div className="overflow-hidden rounded-md border border-[color:var(--dash-border)] bg-[color:var(--cor-fundo-primaria)]">
          <div className="aspect-[1024/349] w-full animate-pulse bg-[color:var(--cor-fundo-secundaria)]" />
          <div className="flex justify-end gap-2 border-t border-[color:var(--dash-border)] px-3 py-2">
            <div className="h-10 w-24 animate-pulse rounded bg-[color:var(--dash-panel)]" />
            <div className="h-10 w-24 animate-pulse rounded bg-[color:var(--dash-panel)]" />
          </div>
        </div>
        <EntityKpiCardsSkeleton />
        <div className="space-y-3">
          <div className="h-4 w-56 animate-pulse rounded bg-[color:var(--dash-border)]" />
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className="h-80 animate-pulse rounded-md border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)]" />
            <div className="h-80 animate-pulse rounded-md border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)]" />
          </div>
          <div className="h-4 w-72 animate-pulse rounded bg-[color:var(--dash-border)]" />
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
    <div className="min-w-[6.25rem] rounded border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] px-2.5 py-1.5 sm:min-w-[7rem] sm:px-3 sm:py-2">
      <p className="font-bold text-base tracking-tight text-[color:var(--dash-gold)] tabular-nums sm:text-lg">
        {value.toLocaleString("pt-BR")}
      </p>
      <p className="mt-0.5 text-[9px] tracking-[0.16em] text-[color:var(--dash-muted)] uppercase sm:text-[10px]">
        {label}
      </p>
    </div>
  );
}
