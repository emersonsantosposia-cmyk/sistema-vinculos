"use server";

import type { DashboardPeriodMode } from "@/lib/dashboard";
import { getInsercoesPorPeriodo } from "@/lib/supabase/dashboard-server";

export async function fetchInsercoesPorPeriodoAction(
  agrupamento: DashboardPeriodMode,
) {
  return getInsercoesPorPeriodo(agrupamento);
}
