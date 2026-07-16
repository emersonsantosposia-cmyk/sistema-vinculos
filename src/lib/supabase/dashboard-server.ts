import {
  DASHBOARD_ENTITIES,
  type DashboardCounts,
  type DashboardEntityKey,
  type DashboardPeriodMode,
  type DashboardSeriesPoint,
} from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/supabase/errors";

const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

type RpcPeriodRow = {
  periodo: string;
  pessoas: number | string;
  empresas: number | string;
  enderecos: number | string;
  veiculos: number | string;
  procedimentos: number | string;
  casos: number | string;
  comunicacoes: number | string;
};

type RpcCountsRow = {
  pessoas: number | string;
  empresas: number | string;
  enderecos: number | string;
  veiculos: number | string;
  procedimentos: number | string;
  casos: number | string;
  comunicacoes: number | string;
  vinculos: number | string;
  pessoas_presas: number | string;
  comunicacoes_ativas: number | string;
};

function toNum(value: number | string | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value) || 0;
}

function formatPeriodLabel(periodo: string, mode: DashboardPeriodMode): string {
  if (mode === "ano") return periodo;
  const [y, m] = periodo.split("-");
  const idx = Number(m) - 1;
  return `${MONTH_LABELS[idx] ?? m}/${(y ?? "").slice(2)}`;
}

function pct(part: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((part / total) * 1000) / 10;
}

function mapRpcSeries(
  rows: RpcPeriodRow[],
  mode: DashboardPeriodMode,
): DashboardSeriesPoint[] {
  return rows.map((row) => ({
    periodo: row.periodo,
    label: formatPeriodLabel(row.periodo, mode),
    pessoas: toNum(row.pessoas),
    empresas: toNum(row.empresas),
    enderecos: toNum(row.enderecos),
    veiculos: toNum(row.veiculos),
    procedimentos: toNum(row.procedimentos),
    casos: toNum(row.casos),
    comunicacoes: toNum(row.comunicacoes),
  }));
}

async function countExact(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  filters?: { column: string; value: string },
): Promise<{ count: number; error: string | null }> {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  if (filters) query = query.eq(filters.column, filters.value);
  const { count, error } = await query;
  if (error) {
    return {
      count: 0,
      error: friendlyError(error.message, `Erro ao contar ${table}.`),
    };
  }
  return { count: count ?? 0, error: null };
}

/** Fallback quando a RPC ainda não foi aplicada no projeto Supabase. */
async function fetchSeriesFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mode: DashboardPeriodMode,
): Promise<{ data: DashboardSeriesPoint[]; error: string | null }> {
  const pageSize = 1000;
  const dateResults = await Promise.all(
    DASHBOARD_ENTITIES.map(async (entity) => {
      const dates: string[] = [];
      let from = 0;
      for (;;) {
        const { data, error } = await supabase
          .from(entity.table)
          .select("data_cadastro")
          .order("data_cadastro", { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) {
          return {
            key: entity.key,
            dates: [] as string[],
            error: friendlyError(
              error.message,
              `Erro ao ler datas de ${entity.table}.`,
            ),
          };
        }
        if (!data?.length) break;
        for (const row of data) dates.push(row.data_cadastro as string);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return { key: entity.key, dates, error: null as string | null };
    }),
  );

  const firstError = dateResults.find((r) => r.error)?.error ?? null;
  if (firstError) {
    return { data: [], error: firstError };
  }

  const byTable = Object.fromEntries(
    dateResults.map((r) => [r.key, r.dates]),
  ) as Record<DashboardEntityKey, string[]>;

  const bucket = new Map<string, DashboardSeriesPoint>();

  for (const entity of DASHBOARD_ENTITIES) {
    for (const iso of byTable[entity.key] ?? []) {
      const d = new Date(iso);
      const periodo =
        mode === "ano"
          ? String(d.getFullYear())
          : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

      let point = bucket.get(periodo);
      if (!point) {
        point = {
          periodo,
          label: formatPeriodLabel(periodo, mode),
        };
        bucket.set(periodo, point);
      }
      point[entity.key] = (point[entity.key] ?? 0) + 1;
    }
  }

  return {
    data: Array.from(bucket.values()).sort((a, b) =>
      a.periodo.localeCompare(b.periodo),
    ),
    error: null,
  };
}

/**
 * Contagens totais das 7 entidades (+ vínculos e gauges), em paralelo.
 * Prefere a RPC `contagem_entidades_dashboard`; faz fallback com head count.
 */
export async function getDashboardCounts(): Promise<{
  data: DashboardCounts | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "contagem_entidades_dashboard",
  );

  if (!rpcError && rpcData) {
    const row = (
      Array.isArray(rpcData) ? rpcData[0] : rpcData
    ) as RpcCountsRow | null;

    if (row) {
      const totals: Record<DashboardEntityKey, number> = {
        pessoas: toNum(row.pessoas),
        empresas: toNum(row.empresas),
        enderecos: toNum(row.enderecos),
        veiculos: toNum(row.veiculos),
        procedimentos: toNum(row.procedimentos),
        casos: toNum(row.casos),
        comunicacoes: toNum(row.comunicacoes),
      };

      const entities = DASHBOARD_ENTITIES.map((entity) => ({
        key: entity.key,
        label: entity.label,
        href: entity.href,
        color: entity.color,
        total: totals[entity.key],
      }));

      const totalRegistros = entities.reduce((sum, e) => sum + e.total, 0);

      return {
        data: {
          entities,
          totalRegistros,
          totalVinculos: toNum(row.vinculos),
          gauges: {
            pessoasPresasPct: pct(toNum(row.pessoas_presas), totals.pessoas),
            comunicacoesAtivasPct: pct(
              toNum(row.comunicacoes_ativas),
              totals.comunicacoes,
            ),
          },
        },
        error: null,
      };
    }
  }

  const countResults = await Promise.all(
    DASHBOARD_ENTITIES.map(async (entity) => {
      const result = await countExact(supabase, entity.table);
      return { entity, ...result };
    }),
  );

  const [vinculosResult, presosResult, comunicacoesAtivasResult] =
    await Promise.all([
      countExact(supabase, "vinculos"),
      countExact(supabase, "pessoas", { column: "tipo", value: "preso" }),
      countExact(supabase, "comunicacoes", {
        column: "status",
        value: "ativo",
      }),
    ]);

  const firstError =
    countResults.find((r) => r.error)?.error ??
    vinculosResult.error ??
    presosResult.error ??
    comunicacoesAtivasResult.error ??
    null;

  if (firstError) {
    return { data: null, error: firstError };
  }

  const entities = countResults.map(({ entity, count }) => ({
    key: entity.key,
    label: entity.label,
    href: entity.href,
    color: entity.color,
    total: count,
  }));

  const totalRegistros = entities.reduce((sum, e) => sum + e.total, 0);
  const pessoasTotal =
    entities.find((e) => e.key === "pessoas")?.total ?? 0;
  const comunicacoesTotal =
    entities.find((e) => e.key === "comunicacoes")?.total ?? 0;

  return {
    data: {
      entities,
      totalRegistros,
      totalVinculos: vinculosResult.count,
      gauges: {
        pessoasPresasPct: pct(presosResult.count, pessoasTotal),
        comunicacoesAtivasPct: pct(
          comunicacoesAtivasResult.count,
          comunicacoesTotal,
        ),
      },
    },
    error: null,
  };
}

/**
 * Inserções agrupadas por mês ou ano (shape Recharts).
 * Prefere a RPC `contagem_por_periodo(p_agrupamento)`.
 */
export async function getInsercoesPorPeriodo(
  agrupamento: DashboardPeriodMode,
): Promise<{ data: DashboardSeriesPoint[]; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("contagem_por_periodo", {
    p_agrupamento: agrupamento,
  });

  if (!error && data) {
    return {
      data: mapRpcSeries((data as RpcPeriodRow[]) ?? [], agrupamento),
      error: null,
    };
  }

  // Função ainda não migrada / indisponível → agregação no app
  if (
    error &&
    /function|does not exist|schema cache|PGRST202/i.test(error.message)
  ) {
    return fetchSeriesFallback(supabase, agrupamento);
  }

  if (error) {
    return {
      data: [],
      error: friendlyError(
        error.message,
        "Erro ao carregar inserções por período.",
      ),
    };
  }

  return { data: [], error: null };
}
