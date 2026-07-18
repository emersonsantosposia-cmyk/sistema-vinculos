"use server";

import type { DashboardTimeFilter } from "@/lib/dashboard";
import {
  getCasosPorStatus,
  getDocCasosPorUnidade,
  getDocPorTipoUnidade,
  getTotaisEntidades,
} from "@/lib/supabase/dashboard-server";

export async function fetchTotaisEntidadesAction(filter: DashboardTimeFilter) {
  return getTotaisEntidades(filter);
}

export async function fetchDocCasosPorUnidadeAction(
  filter: DashboardTimeFilter,
) {
  return getDocCasosPorUnidade(filter);
}

export async function fetchDocPorTipoUnidadeAction(
  filter: DashboardTimeFilter,
) {
  return getDocPorTipoUnidade(filter);
}

export async function fetchCasosPorStatusAction(filter: DashboardTimeFilter) {
  return getCasosPorStatus(filter);
}
