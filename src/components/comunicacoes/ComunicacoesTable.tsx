"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  EntityListView,
  ListCardLink,
  ListCardMeta,
  ListCardMetaSep,
  ListCardTitle,
  LIST_COL_SECONDARY,
} from "@/components/shared/EntityListView";
import {
  ListFilterField,
  ListFilterSearch,
  ListFilterTotal,
  ListFiltersBar,
} from "@/components/shared/ListFiltersBar";
import { ListPagination } from "@/components/shared/ListPagination";
import { Input, Select } from "@/components/ui/Form";
import {
  labelComunicacaoStatus,
  labelComunicacaoTipo,
} from "@/lib/format";
import {
  COMUNICACAO_STATUS,
  COMUNICACAO_TIPOS,
  type Comunicacao,
} from "@/lib/types";

type FiltersProps = {
  total: number;
};

type TableProps = {
  comunicacoes: Comunicacao[];
  total: number;
  page: number;
  pageSize: number;
};

export function ComunicacoesFilters({ total }: FiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [tipo, setTipo] = useState(searchParams.get("tipo") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [pending, startTransition] = useTransition();

  function apply(nextQ: string, nextTipo: string, nextStatus: string) {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextTipo) params.set("tipo", nextTipo);
    if (nextStatus) params.set("status", nextStatus);
    startTransition(() => {
      router.push(`/comunicacoes${params.toString() ? `?${params}` : ""}`);
    });
  }

  return (
    <ListFiltersBar>
      <ListFilterSearch>
        <label className="mb-1 block text-xs font-medium text-muted">
          Buscar
        </label>
        <Input
          placeholder="Valor (número, e-mail, identificador…)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply(q, tipo, status);
          }}
        />
      </ListFilterSearch>
      <ListFilterField className="w-full sm:w-52">
        <label className="mb-1 block text-xs font-medium text-muted">
          Tipo
        </label>
        <Select
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value);
            apply(q, e.target.value, status);
          }}
        >
          <option value="">Todos</option>
          {COMUNICACAO_TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </ListFilterField>
      <ListFilterField className="w-full sm:w-40">
        <label className="mb-1 block text-xs font-medium text-muted">
          Status
        </label>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            apply(q, tipo, e.target.value);
          }}
        >
          <option value="">Todos</option>
          {COMUNICACAO_STATUS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </ListFilterField>
      <button
        type="button"
        disabled={pending}
        onClick={() => apply(q, tipo, status)}
        className="h-8 rounded border border-border bg-panel px-3 text-sm font-medium text-muted-strong hover:bg-panel-hover hover:text-gold-bright disabled:opacity-50"
      >
        Filtrar
      </button>
      <ListFilterTotal>
        {total} registro{total === 1 ? "" : "s"} no total
      </ListFilterTotal>
    </ListFiltersBar>
  );
}

export function ComunicacoesTable({
  comunicacoes,
  total,
  page,
  pageSize,
}: TableProps) {
  const rows = useMemo(() => comunicacoes, [comunicacoes]);

  return (
    <EntityListView
      empty={rows.length === 0}
      emptyMessage="Nenhuma comunicação encontrada com os filtros atuais."
      cards={rows.map((comunicacao) => (
        <ListCardLink
          key={comunicacao.id}
          href={`/comunicacoes/${comunicacao.id}`}
        >
          <ListCardTitle>{comunicacao.valor}</ListCardTitle>
          <ListCardMeta>
            <span>{labelComunicacaoTipo(comunicacao.tipo)}</span>
            <ListCardMetaSep />
            <span>{labelComunicacaoStatus(comunicacao.status)}</span>
            {comunicacao.operadora_provedor ? (
              <>
                <ListCardMetaSep />
                <span>{comunicacao.operadora_provedor}</span>
              </>
            ) : null}
          </ListCardMeta>
        </ListCardLink>
      ))}
      table={
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-panel-soft text-xs font-bold tracking-[0.14em] text-gold uppercase">
              <th className="px-3 py-2.5 font-semibold">Tipo</th>
              <th className="px-3 py-2.5 font-semibold">Valor</th>
              <th className={`${LIST_COL_SECONDARY} px-3 py-2.5 font-semibold`}>
                Operadora/Provedor
              </th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((comunicacao) => (
              <tr
                key={comunicacao.id}
                className="border-b border-border last:border-b-0 hover:bg-panel-hover"
              >
                <td className="px-3 py-2 text-muted-strong">
                  {labelComunicacaoTipo(comunicacao.tipo)}
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/comunicacoes/${comunicacao.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {comunicacao.valor}
                  </Link>
                </td>
                <td
                  className={`${LIST_COL_SECONDARY} px-3 py-2 text-muted-strong`}
                >
                  {comunicacao.operadora_provedor || "—"}
                </td>
                <td className="px-3 py-2 text-muted-strong">
                  {labelComunicacaoStatus(comunicacao.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
      pagination={
        <ListPagination
          basePath="/comunicacoes"
          total={total}
          page={page}
          pageSize={pageSize}
        />
      }
    />
  );
}
