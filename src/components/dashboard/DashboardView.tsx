import { Suspense } from "react";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { PorQueLinceButton } from "@/components/dashboard/PorQueLinceButton";
import { InstitutionalBanner } from "@/components/layout/InstitutionalBanner";
import {
  DASHBOARD_TIME_TUDO,
  type DashboardCasoStatusPoint,
  type DashboardCounts,
  type DashboardEntityTotalPoint,
  type DashboardDocTipoUnidadePoint,
  type DashboardUnidadePoint,
} from "@/lib/dashboard";
import {
  getCasosPorStatus,
  getDashboardCounts,
  getDocCasosPorUnidade,
  getDocPorTipoUnidade,
  getTotaisEntidades,
} from "@/lib/supabase/dashboard-server";

export function DashboardView({
  counts,
  initialTotais,
  initialPorUnidade,
  initialPorTipo,
  initialCasosStatus,
}: {
  counts: DashboardCounts;
  initialTotais: DashboardEntityTotalPoint[];
  initialPorUnidade: DashboardUnidadePoint[];
  initialPorTipo: DashboardDocTipoUnidadePoint[];
  initialCasosStatus: DashboardCasoStatusPoint[];
}) {
  return (
    <div className="dashboard-tactical relative min-h-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 dash-bg-layer" aria-hidden />
      <div className="pointer-events-none absolute inset-0 dash-grid-layer opacity-[0.07]" aria-hidden />

      <div className="relative space-y-6 p-5 sm:p-6">
        <header className="overflow-hidden rounded-md border border-[color:var(--dash-border)] bg-[color:var(--cor-fundo-primaria)] shadow-[var(--cor-sombra-modal)]">
          <InstitutionalBanner />

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--dash-border)] bg-[color:var(--dash-header)] px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <p className="self-center text-[9px] font-medium tracking-[0.18em] text-[color:var(--dash-muted)] uppercase sm:text-[10px] sm:tracking-[0.2em]">
                Painel operacional · Rede Lince / PPF
              </p>
              <PorQueLinceButton />
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-2.5">
              <SummaryChip label="Registros" value={counts.totalRegistros} />
              <SummaryChip label="Vínculos" value={counts.totalVinculos} />
            </div>
          </div>
        </header>

        <DashboardCharts
          initialTotais={initialTotais}
          initialPorUnidade={initialPorUnidade}
          initialPorTipo={initialPorTipo}
          initialCasosStatus={initialCasosStatus}
        />
      </div>
    </div>
  );
}

/** Carrega contagens e série inicial no servidor (Suspense-friendly). */
export async function DashboardData() {
  const [
    countsResult,
    totaisResult,
    porUnidadeResult,
    porTipoResult,
    casosStatusResult,
  ] = await Promise.all([
    getDashboardCounts(),
    getTotaisEntidades(DASHBOARD_TIME_TUDO),
    getDocCasosPorUnidade(DASHBOARD_TIME_TUDO),
    getDocPorTipoUnidade(DASHBOARD_TIME_TUDO),
    getCasosPorStatus(DASHBOARD_TIME_TUDO),
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
      initialTotais={totaisResult.data}
      initialPorUnidade={porUnidadeResult.data}
      initialPorTipo={porTipoResult.data}
      initialCasosStatus={casosStatusResult.data}
    />
  );
}

export function DashboardFallback() {
  return (
    <div className="dashboard-tactical relative min-h-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 dash-bg-layer" aria-hidden />
      <div className="relative space-y-6 p-5 sm:p-6">
        <div className="overflow-hidden rounded-md border border-[color:var(--dash-border)] bg-[color:var(--cor-fundo-primaria)]">
          <div className="aspect-[2048/460] w-full animate-pulse bg-[color:var(--cor-fundo-secundaria)]" />
          <div className="flex justify-end gap-2 border-t border-[color:var(--dash-border)] px-3 py-2">
            <div className="h-10 w-24 animate-pulse rounded bg-[color:var(--dash-panel)]" />
            <div className="h-10 w-24 animate-pulse rounded bg-[color:var(--dash-panel)]" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-4 w-56 animate-pulse rounded bg-[color:var(--dash-border)]" />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-md border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)]" />
            <div className="h-64 animate-pulse rounded-md border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)]" />
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-md border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)]" />
            <div className="h-64 animate-pulse rounded-md border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)]" />
          </div>
          <div className="h-64 animate-pulse rounded-md border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)]" />
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
