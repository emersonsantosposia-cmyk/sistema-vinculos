import { Suspense } from "react";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { PainelOperacional } from "@/components/dashboard/PainelOperacional";
import {
  DASHBOARD_TIME_TUDO,
  type DashboardCasoStatusPoint,
  type DashboardEntityTotalPoint,
  type DashboardDocTipoUnidadePoint,
  type DashboardUnidadePoint,
  type PainelOperacionalData,
} from "@/lib/dashboard";
import {
  getCasosPorStatus,
  getDocCasosPorUnidade,
  getDocPorTipoUnidade,
  getPainelOperacionalMetrics,
  getTotaisEntidades,
} from "@/lib/supabase/dashboard-server";

export function DashboardView({
  painel,
  initialTotais,
  initialPorUnidade,
  initialPorTipo,
  initialCasosStatus,
}: {
  painel: PainelOperacionalData;
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
        <PainelOperacional initialData={painel} />

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
    painelResult,
    totaisResult,
    porUnidadeResult,
    porTipoResult,
    casosStatusResult,
  ] = await Promise.all([
    getPainelOperacionalMetrics(DASHBOARD_TIME_TUDO),
    getTotaisEntidades(DASHBOARD_TIME_TUDO),
    getDocCasosPorUnidade(DASHBOARD_TIME_TUDO),
    getDocPorTipoUnidade(DASHBOARD_TIME_TUDO),
    getCasosPorStatus(DASHBOARD_TIME_TUDO),
  ]);

  if (painelResult.error || !painelResult.data) {
    return (
      <div className="dashboard-tactical p-6">
        <div className="rounded-md border border-[color:var(--dash-border)] bg-[color:var(--dash-panel)] px-4 py-6 text-sm text-[color:var(--dash-muted-strong)]">
          {painelResult.error ?? "Não foi possível carregar o dashboard."}
        </div>
      </div>
    );
  }

  return (
    <DashboardView
      painel={painelResult.data}
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
        <div className="overflow-hidden rounded-md border border-[color:var(--dash-border)] bg-[color:var(--dash-header)]">
          <div className="space-y-3 px-3 py-3 sm:px-4 sm:py-3.5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="h-3 w-40 animate-pulse rounded bg-[color:var(--dash-border)]" />
              <div className="h-9 w-full max-w-xs animate-pulse rounded-md bg-[color:var(--dash-panel)] sm:w-56" />
              <div className="h-8 w-48 animate-pulse rounded bg-[color:var(--dash-panel)]" />
            </div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <div className="h-[7.25rem] animate-pulse rounded-md bg-[color:var(--dash-panel)]" />
              <div className="h-[7.25rem] animate-pulse rounded-md bg-[color:var(--dash-panel)]" />
              <div className="h-[7.25rem] animate-pulse rounded-md bg-[color:var(--dash-panel)]" />
              <div className="h-[7.25rem] animate-pulse rounded-md bg-[color:var(--dash-panel)]" />
            </div>
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
