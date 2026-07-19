"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ListPagination } from "@/components/shared/ListPagination";
import { Button, Input, Select } from "@/components/ui/Form";
import {
  AUDITORIA_ACOES,
  AUDITORIA_TABELAS,
  diffAuditoria,
  labelAuditoriaAcao,
  labelAuditoriaTabela,
  resumoAuditoria,
  type AuditoriaRow,
} from "@/lib/auditoria";
import { formatDateTime } from "@/lib/format";

type FilterUser = { id: string; nome: string };

export function AuditoriaFilters({ usuarios }: { usuarios: FilterUser[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [usuarioId, setUsuarioId] = useState(
    searchParams.get("usuario") ?? "",
  );
  const [tabela, setTabela] = useState(searchParams.get("tabela") ?? "");
  const [acao, setAcao] = useState(searchParams.get("acao") ?? "");
  const [de, setDe] = useState(searchParams.get("de") ?? "");
  const [ate, setAte] = useState(searchParams.get("ate") ?? "");
  const [pending, startTransition] = useTransition();

  function apply(resetPage = true) {
    const params = new URLSearchParams();
    if (usuarioId) params.set("usuario", usuarioId);
    if (tabela) params.set("tabela", tabela);
    if (acao) params.set("acao", acao);
    if (de) params.set("de", de);
    if (ate) params.set("ate", ate);
    if (!resetPage) {
      const page = searchParams.get("page");
      if (page) params.set("page", page);
    }
    startTransition(() => {
      router.push(`/auditoria${params.toString() ? `?${params}` : ""}`);
    });
  }

  function clear() {
    setUsuarioId("");
    setTabela("");
    setAcao("");
    setDe("");
    setAte("");
    startTransition(() => {
      router.push("/auditoria");
    });
  }

  return (
    <div className="mb-3 space-y-2 rounded border border-border bg-panel p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-xs font-medium text-muted">
            Usuário
          </label>
          <Select
            value={usuarioId}
            onChange={(e) => setUsuarioId(e.target.value)}
          >
            <option value="">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-xs font-medium text-muted">
            Tabela / entidade
          </label>
          <Select value={tabela} onChange={(e) => setTabela(e.target.value)}>
            <option value="">Todas</option>
            {AUDITORIA_TABELAS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-[9rem]">
          <label className="mb-1 block text-xs font-medium text-muted">
            Ação
          </label>
          <Select value={acao} onChange={(e) => setAcao(e.target.value)}>
            <option value="">Todas</option>
            {AUDITORIA_ACOES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-[10rem]">
          <label className="mb-1 block text-xs font-medium text-muted">
            De
          </label>
          <Input
            type="date"
            value={de}
            onChange={(e) => setDe(e.target.value)}
          />
        </div>
        <div className="w-[10rem]">
          <label className="mb-1 block text-xs font-medium text-muted">
            Até
          </label>
          <Input
            type="date"
            value={ate}
            onChange={(e) => setAte(e.target.value)}
          />
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => apply(true)}
          className="h-8 rounded border border-border bg-panel px-3 text-sm font-medium text-muted-strong hover:bg-panel-hover hover:text-gold-bright disabled:opacity-50"
        >
          Filtrar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={clear}
          className="h-8 rounded px-2 text-sm text-muted hover:text-gold-bright disabled:opacity-50"
        >
          Limpar
        </button>
      </div>
    </div>
  );
}

function DiffModal({
  row,
  onClose,
}: {
  row: AuditoriaRow;
  onClose: () => void;
}) {
  const diffs = useMemo(
    () => diffAuditoria(row.dados_antigos, row.dados_novos),
    [row],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auditoria-diff-titulo"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-md border border-border bg-panel p-4 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="auditoria-diff-titulo"
              className="text-sm font-bold tracking-[0.14em] text-gold uppercase"
            >
              Detalhe da edição
            </h2>
            <p className="mt-1 text-xs text-muted">
              {labelAuditoriaTabela(row.tabela_afetada)} ·{" "}
              {formatDateTime(row.data_hora)} ·{" "}
              {row.usuario_nome || "Usuário não identificado"}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-muted">
              registro {row.registro_id}
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>

        {diffs.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Nenhuma diferença de campo detectada.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded border border-border">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-panel-soft text-xs font-bold tracking-[0.12em] text-gold uppercase">
                  <th className="px-3 py-2">Campo</th>
                  <th className="px-3 py-2">Valor antigo</th>
                  <th className="px-3 py-2">Valor novo</th>
                </tr>
              </thead>
              <tbody>
                {diffs.map((d) => (
                  <tr
                    key={d.campo}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-3 py-2 font-mono text-xs text-gold">
                      {d.campo}
                    </td>
                    <td className="px-3 py-2 whitespace-pre-wrap text-danger-fg">
                      {d.antigo}
                    </td>
                    <td className="px-3 py-2 whitespace-pre-wrap text-foreground">
                      {d.novo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function AuditoriaTable({
  rows,
  total,
  page,
  pageSize,
}: {
  rows: AuditoriaRow[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const [selected, setSelected] = useState<AuditoriaRow | null>(null);

  if (rows.length === 0) {
    return (
      <div className="rounded border border-border bg-panel px-4 py-10 text-center text-sm text-muted">
        Nenhum registro de auditoria com os filtros atuais.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded border border-border bg-panel">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-panel-soft text-xs font-bold tracking-[0.14em] text-gold uppercase">
              <th className="px-3 py-2.5 font-semibold">Data/hora</th>
              <th className="px-3 py-2.5 font-semibold">Usuário</th>
              <th className="px-3 py-2.5 font-semibold">Tabela</th>
              <th className="px-3 py-2.5 font-semibold">Ação</th>
              <th className="px-3 py-2.5 font-semibold">Resumo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const clickable = row.acao === "update";
              return (
                <tr
                  key={row.id}
                  className={`border-b border-border last:border-b-0 ${
                    clickable
                      ? "cursor-pointer hover:bg-panel-hover"
                      : "hover:bg-panel-hover/60"
                  }`}
                  onClick={() => {
                    if (clickable) setSelected(row);
                  }}
                  title={
                    clickable
                      ? "Clique para ver o detalhe das alterações"
                      : undefined
                  }
                >
                  <td className="px-3 py-2 whitespace-nowrap text-muted-strong">
                    {formatDateTime(row.data_hora)}
                  </td>
                  <td className="px-3 py-2 text-foreground">
                    {row.usuario_nome || (
                      <span className="text-muted">Não identificado</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-strong">
                    {labelAuditoriaTabela(row.tabela_afetada)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                        row.acao === "insert"
                          ? "bg-panel-soft text-gold"
                          : row.acao === "delete"
                            ? "bg-danger-bg text-danger-fg"
                            : "bg-panel-soft text-muted-strong"
                      }`}
                    >
                      {labelAuditoriaAcao(row.acao)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-strong">
                    {resumoAuditoria(row)}
                    {clickable ? (
                      <span className="ml-2 text-[10px] text-gold">
                        ver diff
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ListPagination
        basePath="/auditoria"
        total={total}
        page={page}
        pageSize={pageSize}
      />

      {selected ? (
        <DiffModal row={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}
