import {
  DASHBOARD_ENTITIES,
  DOCUMENTO_TIPO_CHART_KEYS,
  previousTimeFilter,
  timeFilterToRange,
  type DashboardCasoStatusPoint,
  type DashboardCounts,
  type DashboardEntityKey,
  type DashboardEntityTotalPoint,
  type DashboardDocTipoUnidadePoint,
  type DashboardTimeFilter,
  type DashboardUnidadePoint,
  type DocumentoTipoChartKey,
  type PainelOperacionalData,
} from "@/lib/dashboard";
import { UNIDADES } from "@/lib/perfis";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/supabase/errors";

type RpcCountsRow = {
  pessoas: number | string;
  empresas: number | string;
  enderecos: number | string;
  veiculos: number | string;
  documentos: number | string;
  casos: number | string;
  comunicacoes: number | string;
  orcrims?: number | string;
  vinculos: number | string;
  pessoas_presas: number | string;
  comunicacoes_ativas: number | string;
};

type RpcTotaisRow = {
  pessoas: number | string;
  empresas: number | string;
  enderecos: number | string;
  veiculos: number | string;
  documentos: number | string;
  casos: number | string;
  comunicacoes: number | string;
  orcrims?: number | string;
};

type RpcUnidadeRow = {
  unidade: string;
  documentos: number | string;
  casos: number | string;
};

type RpcTipoUnidadeRow = {
  unidade: string;
  rci: number | string;
  info: number | string;
  rdci: number | string;
  outros: number | string;
};

type RpcCasoStatusRow = {
  unidade: string;
  em_andamento: number | string;
  encerrado: number | string;
};

function toNum(value: number | string | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value) || 0;
}

function pct(part: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((part / total) * 1000) / 10;
}

function isMissingRpc(message: string): boolean {
  return /function|does not exist|schema cache|PGRST202/i.test(message);
}

function filterToRpcArgs(filter: DashboardTimeFilter): {
  p_ano: number | null;
  p_mes: number | null;
} {
  if (filter.scope === "tudo") return { p_ano: null, p_mes: null };
  if (filter.scope === "ano") return { p_ano: filter.year, p_mes: null };
  return { p_ano: filter.year, p_mes: filter.month };
}

function applyDateRange<
  T extends {
    gte: (column: string, value: string) => T;
    lt: (column: string, value: string) => T;
  },
>(query: T, from: string | null, to: string | null): T {
  let q = query;
  if (from) q = q.gte("data_cadastro", from);
  if (to) q = q.lt("data_cadastro", to);
  return q;
}

async function countExact(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  filters?: { column: string; value: string },
  range?: { from: string | null; to: string | null },
): Promise<{ count: number; error: string | null }> {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  if (filters) query = query.eq(filters.column, filters.value);
  if (range) query = applyDateRange(query, range.from, range.to);
  const { count, error } = await query;
  if (error) {
    return {
      count: 0,
      error: friendlyError(error.message, `Erro ao contar ${table}.`),
    };
  }
  return { count: count ?? 0, error: null };
}

function emptyUnidadeSeries(): DashboardUnidadePoint[] {
  return UNIDADES.map((unidade) => ({
    unidade,
    documentos: 0,
    casos: 0,
  }));
}

function emptyTipoUnidadeSeries(): DashboardDocTipoUnidadePoint[] {
  return UNIDADES.map((unidade) => ({
    unidade,
    RCI: 0,
    INFO: 0,
    RDCI: 0,
    OUTROS: 0,
  }));
}

function emptyCasoStatusSeries(): DashboardCasoStatusPoint[] {
  return UNIDADES.map((unidade) => ({
    unidade,
    em_andamento: 0,
    encerrado: 0,
  }));
}

function mergeUnidadeRows(rows: RpcUnidadeRow[]): DashboardUnidadePoint[] {
  const byUnidade = new Map(
    rows.map((row) => [
      row.unidade,
      {
        unidade: row.unidade,
        documentos: toNum(row.documentos),
        casos: toNum(row.casos),
      } satisfies DashboardUnidadePoint,
    ]),
  );

  return UNIDADES.map((unidade) => {
    const hit = byUnidade.get(unidade);
    return (
      hit ?? {
        unidade,
        documentos: 0,
        casos: 0,
      }
    );
  });
}

function mergeTipoUnidadeRows(
  rows: RpcTipoUnidadeRow[],
): DashboardDocTipoUnidadePoint[] {
  const byUnidade = new Map(
    rows.map((row) => [
      row.unidade,
      {
        unidade: row.unidade,
        RCI: toNum(row.rci),
        INFO: toNum(row.info),
        RDCI: toNum(row.rdci),
        OUTROS: toNum(row.outros),
      } satisfies DashboardDocTipoUnidadePoint,
    ]),
  );

  return UNIDADES.map(
    (unidade) =>
      byUnidade.get(unidade) ?? {
        unidade,
        RCI: 0,
        INFO: 0,
        RDCI: 0,
        OUTROS: 0,
      },
  );
}

function mergeCasoStatusRows(
  rows: RpcCasoStatusRow[],
): DashboardCasoStatusPoint[] {
  const byUnidade = new Map(
    rows.map((row) => [
      row.unidade,
      {
        unidade: row.unidade,
        em_andamento: toNum(row.em_andamento),
        encerrado: toNum(row.encerrado),
      } satisfies DashboardCasoStatusPoint,
    ]),
  );

  return UNIDADES.map(
    (unidade) =>
      byUnidade.get(unidade) ?? {
        unidade,
        em_andamento: 0,
        encerrado: 0,
      },
  );
}

function normalizeDocTipo(raw: string | null | undefined): DocumentoTipoChartKey {
  const value = (raw ?? "OUTROS").toUpperCase();
  if (value === "RELINT") return "INFO";
  if (value === "DADOS") return "RDCI";
  if ((DOCUMENTO_TIPO_CHART_KEYS as readonly string[]).includes(value)) {
    return value as DocumentoTipoChartKey;
  }
  return "OUTROS";
}

function mapTotaisRow(row: RpcTotaisRow): DashboardEntityTotalPoint[] {
  const totals: Record<DashboardEntityKey, number> = {
    pessoas: toNum(row.pessoas),
    empresas: toNum(row.empresas),
    enderecos: toNum(row.enderecos),
    veiculos: toNum(row.veiculos),
    documentos: toNum(row.documentos),
    casos: toNum(row.casos),
    comunicacoes: toNum(row.comunicacoes),
    orcrims: toNum(row.orcrims),
  };

  return DASHBOARD_ENTITIES.map((entity) => ({
    key: entity.key,
    name: entity.label,
    total: totals[entity.key],
    fill: entity.color,
  }));
}

type PainelSlice = {
  registros: number;
  vinculos: number;
  documentos: number;
  casosAtivos: number;
};

async function fetchPainelSlice(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filter: DashboardTimeFilter,
): Promise<{ data: PainelSlice | null; error: string | null }> {
  const range = timeFilterToRange(filter);
  const [totaisResult, vinculosResult, casosAtivosResult] = await Promise.all([
    getTotaisEntidades(filter),
    countExact(supabase, "vinculos", undefined, range),
    countExact(
      supabase,
      "casos",
      { column: "status", value: "em_andamento" },
      range,
    ),
  ]);

  const firstError =
    totaisResult.error ||
    vinculosResult.error ||
    casosAtivosResult.error ||
    null;
  if (firstError) {
    return { data: null, error: firstError };
  }

  const registros = totaisResult.data.reduce((sum, point) => sum + point.total, 0);
  const documentos =
    totaisResult.data.find((point) => point.key === "documentos")?.total ?? 0;

  return {
    data: {
      registros,
      vinculos: vinculosResult.count,
      documentos,
      casosAtivos: casosAtivosResult.count,
    },
    error: null,
  };
}

/**
 * Métricas do painel operacional (registros, vínculos, documentos, casos ativos)
 * com delta vs. período anterior quando o filtro é ano ou mês.
 */
export async function getPainelOperacionalMetrics(
  filter: DashboardTimeFilter,
): Promise<{ data: PainelOperacionalData | null; error: string | null }> {
  const supabase = await createClient();
  const prev = previousTimeFilter(filter);

  const [currentResult, previousResult] = await Promise.all([
    fetchPainelSlice(supabase, filter),
    prev
      ? fetchPainelSlice(supabase, prev)
      : Promise.resolve({ data: null as PainelSlice | null, error: null }),
  ]);

  if (currentResult.error || !currentResult.data) {
    return {
      data: null,
      error: currentResult.error ?? "Não foi possível carregar o painel.",
    };
  }

  if (previousResult.error) {
    return { data: null, error: previousResult.error };
  }

  const current = currentResult.data;
  const previous = previousResult.data;
  const withDelta = (value: number, prevValue: number | undefined): number | null => {
    if (!previous) return null;
    return value - (prevValue ?? 0);
  };

  return {
    data: {
      metrics: [
        {
          key: "registros",
          label: "Registros",
          href: null,
          value: current.registros,
          delta: withDelta(current.registros, previous?.registros),
        },
        {
          key: "vinculos",
          label: "Vínculos",
          href: null,
          value: current.vinculos,
          delta: withDelta(current.vinculos, previous?.vinculos),
        },
        {
          key: "documentos",
          label: "Documentos",
          href: "/documentos",
          value: current.documentos,
          delta: withDelta(current.documentos, previous?.documentos),
        },
        {
          key: "casosAtivos",
          label: "Casos ativos",
          href: "/casos",
          value: current.casosAtivos,
          delta: withDelta(current.casosAtivos, previous?.casosAtivos),
        },
      ],
    },
    error: null,
  };
}

/**
 * Contagens totais das entidades (+ vínculos e gauges), em paralelo.
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
        documentos: toNum(row.documentos),
        casos: toNum(row.casos),
        comunicacoes: toNum(row.comunicacoes),
        orcrims: toNum(row.orcrims),
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

async function fetchTotaisEntidadesFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filter: DashboardTimeFilter,
): Promise<{ data: DashboardEntityTotalPoint[]; error: string | null }> {
  const range = timeFilterToRange(filter);
  const results = await Promise.all(
    DASHBOARD_ENTITIES.map(async (entity) => {
      const result = await countExact(supabase, entity.table, undefined, range);
      return { entity, ...result };
    }),
  );

  const firstError = results.find((r) => r.error)?.error ?? null;
  if (firstError) return { data: [], error: firstError };

  return {
    data: results.map(({ entity, count }) => ({
      key: entity.key,
      name: entity.label,
      total: count,
      fill: entity.color,
    })),
    error: null,
  };
}

/** Totais acumulados por entidade no filtro de tempo (gráfico 1). */
export async function getTotaisEntidades(
  filter: DashboardTimeFilter,
): Promise<{ data: DashboardEntityTotalPoint[]; error: string | null }> {
  const supabase = await createClient();
  const args = filterToRpcArgs(filter);

  const { data, error } = await supabase.rpc("dashboard_totais_entidades", args);

  if (!error && data) {
    const row = (
      Array.isArray(data) ? data[0] : data
    ) as RpcTotaisRow | null;
    if (row) return { data: mapTotaisRow(row), error: null };
  }

  if (error && isMissingRpc(error.message)) {
    return fetchTotaisEntidadesFallback(supabase, filter);
  }

  if (error) {
    return {
      data: [],
      error: friendlyError(
        error.message,
        "Erro ao carregar totais por entidade.",
      ),
    };
  }

  return { data: [], error: null };
}

async function fetchUnidadeFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filter: DashboardTimeFilter,
): Promise<{ data: DashboardUnidadePoint[]; error: string | null }> {
  const range = timeFilterToRange(filter);
  const pageSize = 1000;

  async function loadTable(
    table: "documentos" | "casos",
  ): Promise<{ counts: Map<string, number>; error: string | null }> {
    const counts = new Map<string, number>();
    let from = 0;
    for (;;) {
      let query = supabase
        .from(table)
        .select("unidade, data_cadastro")
        .order("data_cadastro", { ascending: true })
        .range(from, from + pageSize - 1);
      query = applyDateRange(query, range.from, range.to);

      const { data, error } = await query;
      if (error) {
        return {
          counts,
          error: friendlyError(
            error.message,
            `Erro ao ler ${table} por unidade.`,
          ),
        };
      }
      if (!data?.length) break;
      for (const row of data) {
        const unidade = (row.unidade as string) ?? "";
        if (!unidade) continue;
        counts.set(unidade, (counts.get(unidade) ?? 0) + 1);
      }
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return { counts, error: null };
  }

  const [docs, cas] = await Promise.all([
    loadTable("documentos"),
    loadTable("casos"),
  ]);

  const firstError = docs.error ?? cas.error;
  if (firstError) return { data: [], error: firstError };

  return {
    data: UNIDADES.map((unidade) => ({
      unidade,
      documentos: docs.counts.get(unidade) ?? 0,
      casos: cas.counts.get(unidade) ?? 0,
    })),
    error: null,
  };
}

/** Documentos e casos por unidade no filtro de tempo (gráficos 2 e 4). */
export async function getDocCasosPorUnidade(
  filter: DashboardTimeFilter,
): Promise<{ data: DashboardUnidadePoint[]; error: string | null }> {
  const supabase = await createClient();
  const args = filterToRpcArgs(filter);

  const { data, error } = await supabase.rpc(
    "dashboard_proc_casos_por_unidade",
    args,
  );

  if (!error && data) {
    return {
      data: mergeUnidadeRows((data as RpcUnidadeRow[]) ?? []),
      error: null,
    };
  }

  if (error && isMissingRpc(error.message)) {
    return fetchUnidadeFallback(supabase, filter);
  }

  if (error) {
    return {
      data: emptyUnidadeSeries(),
      error: friendlyError(
        error.message,
        "Erro ao carregar documentos e casos por unidade.",
      ),
    };
  }

  return { data: emptyUnidadeSeries(), error: null };
}

async function fetchDocTipoUnidadeFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filter: DashboardTimeFilter,
): Promise<{ data: DashboardDocTipoUnidadePoint[]; error: string | null }> {
  const range = timeFilterToRange(filter);
  const pageSize = 1000;
  const counts = new Map<string, DashboardDocTipoUnidadePoint>();
  for (const unidade of UNIDADES) {
    counts.set(unidade, {
      unidade,
      RCI: 0,
      INFO: 0,
      RDCI: 0,
      OUTROS: 0,
    });
  }

  let from = 0;
  for (;;) {
    let query = supabase
      .from("documentos")
      .select("unidade, tipo, data_cadastro")
      .order("data_cadastro", { ascending: true })
      .range(from, from + pageSize - 1);
    query = applyDateRange(query, range.from, range.to);

    const { data, error } = await query;
    if (error) {
      return {
        data: [],
        error: friendlyError(
          error.message,
          "Erro ao ler documentos por tipo e unidade.",
        ),
      };
    }
    if (!data?.length) break;

    for (const row of data) {
      const unidade = (row.unidade as string) ?? "";
      if (!unidade) continue;
      let point = counts.get(unidade);
      if (!point) {
        point = {
          unidade,
          RCI: 0,
          INFO: 0,
          RDCI: 0,
          OUTROS: 0,
        };
        counts.set(unidade, point);
      }
      const tipo = normalizeDocTipo(row.tipo as string | null);
      point[tipo] += 1;
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return {
    data: UNIDADES.map(
      (unidade) =>
        counts.get(unidade) ?? {
          unidade,
          RCI: 0,
          INFO: 0,
          RDCI: 0,
          OUTROS: 0,
        },
    ),
    error: null,
  };
}

/** Documentos por tipo e unidade no filtro de tempo (gráfico 3). */
export async function getDocPorTipoUnidade(
  filter: DashboardTimeFilter,
): Promise<{ data: DashboardDocTipoUnidadePoint[]; error: string | null }> {
  const supabase = await createClient();
  const args = filterToRpcArgs(filter);

  const { data, error } = await supabase.rpc(
    "dashboard_proc_por_tipo_unidade",
    args,
  );

  if (!error && data) {
    return {
      data: mergeTipoUnidadeRows((data as RpcTipoUnidadeRow[]) ?? []),
      error: null,
    };
  }

  if (error && isMissingRpc(error.message)) {
    return fetchDocTipoUnidadeFallback(supabase, filter);
  }

  if (error) {
    return {
      data: emptyTipoUnidadeSeries(),
      error: friendlyError(
        error.message,
        "Erro ao carregar documentos por tipo e unidade.",
      ),
    };
  }

  return { data: emptyTipoUnidadeSeries(), error: null };
}

async function fetchCasoStatusFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filter: DashboardTimeFilter,
): Promise<{ data: DashboardCasoStatusPoint[]; error: string | null }> {
  const range = timeFilterToRange(filter);
  const pageSize = 1000;
  const counts = new Map<string, DashboardCasoStatusPoint>();
  for (const unidade of UNIDADES) {
    counts.set(unidade, {
      unidade,
      em_andamento: 0,
      encerrado: 0,
    });
  }

  let from = 0;
  for (;;) {
    let query = supabase
      .from("casos")
      .select("unidade, status, data_cadastro")
      .order("data_cadastro", { ascending: true })
      .range(from, from + pageSize - 1);
    query = applyDateRange(query, range.from, range.to);

    const { data, error } = await query;
    if (error) {
      return {
        data: [],
        error: friendlyError(
          error.message,
          "Erro ao ler casos por status e unidade.",
        ),
      };
    }
    if (!data?.length) break;

    for (const row of data) {
      const unidade = (row.unidade as string) ?? "";
      if (!unidade) continue;
      let point = counts.get(unidade);
      if (!point) {
        point = {
          unidade,
          em_andamento: 0,
          encerrado: 0,
        };
        counts.set(unidade, point);
      }
      const status = (row.status as string) ?? "em_andamento";
      if (status === "encerrado") point.encerrado += 1;
      else point.em_andamento += 1;
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return {
    data: UNIDADES.map(
      (unidade) =>
        counts.get(unidade) ?? {
          unidade,
          em_andamento: 0,
          encerrado: 0,
        },
    ),
    error: null,
  };
}

/** Casos por status e unidade no filtro de tempo. */
export async function getCasosPorStatus(
  filter: DashboardTimeFilter,
): Promise<{ data: DashboardCasoStatusPoint[]; error: string | null }> {
  const supabase = await createClient();
  const args = filterToRpcArgs(filter);

  const { data, error } = await supabase.rpc(
    "dashboard_casos_por_status",
    args,
  );

  if (!error && data) {
    return {
      data: mergeCasoStatusRows((data as RpcCasoStatusRow[]) ?? []),
      error: null,
    };
  }

  if (error && isMissingRpc(error.message)) {
    return fetchCasoStatusFallback(supabase, filter);
  }

  if (error) {
    return {
      data: emptyCasoStatusSeries(),
      error: friendlyError(
        error.message,
        "Erro ao carregar casos por status.",
      ),
    };
  }

  return { data: emptyCasoStatusSeries(), error: null };
}
