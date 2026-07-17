"use server";

import type { DashboardPeriodMode } from "@/lib/dashboard";
import {
  getInsercoesPorPeriodo,
  getProcCasosPorUnidade,
} from "@/lib/supabase/dashboard-server";

export async function fetchInsercoesPorPeriodoAction(
  agrupamento: DashboardPeriodMode,
) {
  return getInsercoesPorPeriodo(agrupamento);
}

export async function fetchProcCasosPorUnidadeAction(
  agrupamento: DashboardPeriodMode,
) {
  return getProcCasosPorUnidade(agrupamento);
}

/** Recarrega série de inserções e totais por unidade no mesmo período. */
export async function fetchDashboardPeriodAction(
  agrupamento: DashboardPeriodMode,
) {
  const [series, porUnidade] = await Promise.all([
    getInsercoesPorPeriodo(agrupamento),
    getProcCasosPorUnidade(agrupamento),
  ]);

  return {
    series: series.data,
    seriesError: series.error,
    porUnidade: porUnidade.data,
    porUnidadeError: porUnidade.error,
  };
}
