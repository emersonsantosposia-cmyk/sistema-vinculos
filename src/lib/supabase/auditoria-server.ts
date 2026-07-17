import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/supabase/errors";
import { requireAdmin } from "@/lib/supabase/perfis-server";
import {
  AUDITORIA_PAGE_SIZE,
  isAuditoriaAcao,
  type AuditoriaAcao,
  type AuditoriaRow,
} from "@/lib/auditoria";

export type AuditoriaFilters = {
  usuarioId?: string;
  tabela?: string;
  acao?: string;
  de?: string;
  ate?: string;
  page?: number;
};

export type AuditoriaListResult = {
  data: AuditoriaRow[];
  total: number;
  page: number;
  pageSize: number;
  error: string | null;
};

function asRecord(
  value: unknown,
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export async function listAuditoria(
  filters: AuditoriaFilters,
): Promise<AuditoriaListResult> {
  const pageSize = AUDITORIA_PAGE_SIZE;
  const page = Math.max(1, filters.page ?? 1);
  const empty: AuditoriaListResult = {
    data: [],
    total: 0,
    page,
    pageSize,
    error: null,
  };

  const admin = await requireAdmin();
  if (!admin.ok) {
    return { ...empty, error: admin.error };
  }

  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("auditoria")
    .select(
      "id, tabela_afetada, registro_id, acao, usuario_id, dados_antigos, dados_novos, data_hora",
      { count: "exact" },
    )
    .order("data_hora", { ascending: false })
    .range(from, to);

  if (filters.usuarioId?.trim()) {
    query = query.eq("usuario_id", filters.usuarioId.trim());
  }
  if (filters.tabela?.trim()) {
    query = query.eq("tabela_afetada", filters.tabela.trim());
  }
  if (filters.acao?.trim() && isAuditoriaAcao(filters.acao.trim())) {
    query = query.eq("acao", filters.acao.trim() as AuditoriaAcao);
  }
  if (filters.de?.trim()) {
    query = query.gte("data_hora", `${filters.de.trim()}T00:00:00`);
  }
  if (filters.ate?.trim()) {
    query = query.lte("data_hora", `${filters.ate.trim()}T23:59:59.999`);
  }

  const { data, error, count } = await query;
  if (error) {
    return {
      ...empty,
      error: friendlyError(error.message, "Erro ao listar auditoria."),
    };
  }

  const rows = data ?? [];
  const userIds = Array.from(
    new Set(
      rows
        .map((r) => r.usuario_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const names: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: perfis } = await supabase
      .from("perfis_usuario")
      .select("id, nome")
      .in("id", userIds);

    for (const p of perfis ?? []) {
      if (p.id && p.nome) names[p.id] = p.nome;
    }
  }

  const mapped: AuditoriaRow[] = rows.map((row) => ({
    id: row.id as string,
    tabela_afetada: row.tabela_afetada as string,
    registro_id: row.registro_id as string,
    acao: row.acao as AuditoriaAcao,
    usuario_id: (row.usuario_id as string | null) ?? null,
    dados_antigos: asRecord(row.dados_antigos),
    dados_novos: asRecord(row.dados_novos),
    data_hora: row.data_hora as string,
    usuario_nome: row.usuario_id
      ? (names[row.usuario_id as string] ?? null)
      : null,
  }));

  return {
    data: mapped,
    total: count ?? mapped.length,
    page,
    pageSize,
    error: null,
  };
}

export async function listUsuariosFiltroAuditoria(): Promise<
  { id: string; nome: string }[]
> {
  const admin = await requireAdmin();
  if (!admin.ok) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("perfis_usuario")
    .select("id, nome")
    .order("nome", { ascending: true });

  return (data ?? []).map((p) => ({
    id: p.id as string,
    nome: (p.nome as string) || "Sem nome",
  }));
}
