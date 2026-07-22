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
import { MobileSortBar, SortableTh } from "@/components/shared/ListSort";
import { Button, Input, Select } from "@/components/ui/Form";
import { formatDate, labelDocumentoTipo } from "@/lib/format";
import {
  buildListFilterParams,
  ENTITY_SORT_COLUMNS,
  type SortDir,
} from "@/lib/list-sort";
import { UNIDADES } from "@/lib/perfis";
import { DOCUMENTO_TIPOS, type Documento } from "@/lib/types";

const BASE = "/documentos";
const SORT_COLS = ENTITY_SORT_COLUMNS.documentos;

type FiltersProps = {
  total: number;
  showUnidadeFilter?: boolean;
};

type TableProps = {
  documentos: Documento[];
  total: number;
  page: number;
  pageSize: number;
  sort: string;
  dir: SortDir;
};

export function DocumentosFilters({
  total,
  showUnidadeFilter = true,
}: FiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [tipo, setTipo] = useState(searchParams.get("tipo") ?? "");
  const [unidade, setUnidade] = useState(
    showUnidadeFilter ? (searchParams.get("unidade") ?? "") : "",
  );
  const [pending, startTransition] = useTransition();

  function apply(nextQ: string, nextTipo: string, nextUnidade: string) {
    const params = buildListFilterParams(searchParams, {
      q: nextQ,
      tipo: nextTipo || null,
      unidade: showUnidadeFilter ? nextUnidade || null : null,
    });
    startTransition(() => {
      router.push(`${BASE}${params.toString() ? `?${params}` : ""}`);
    });
  }

  return (
    <ListFiltersBar>
      <ListFilterSearch>
        <label className="mb-1 block text-xs font-medium text-muted">
          Buscar
        </label>
        <Input
          placeholder="Nome ou resumo…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply(q, tipo, unidade);
          }}
        />
      </ListFilterSearch>
      {showUnidadeFilter ? (
        <ListFilterField className="w-full sm:w-40">
          <label className="mb-1 block text-xs font-medium text-muted">
            Unidade
          </label>
          <Select
            value={unidade}
            onChange={(e) => {
              setUnidade(e.target.value);
              apply(q, tipo, e.target.value);
            }}
          >
            <option value="">Todas</option>
            {UNIDADES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </ListFilterField>
      ) : null}
      <ListFilterField>
        <label className="mb-1 block text-xs font-medium text-muted">
          Tipo
        </label>
        <Select
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value);
            apply(q, e.target.value, unidade);
          }}
        >
          <option value="">Todos</option>
          {DOCUMENTO_TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </ListFilterField>
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => apply(q, tipo, unidade)}
      >
        Filtrar
      </Button>
      <ListFilterTotal>
        {total} registro{total === 1 ? "" : "s"} no total
      </ListFilterTotal>
    </ListFiltersBar>
  );
}

export function DocumentosTable({
  documentos,
  total,
  page,
  pageSize,
  sort,
  dir,
}: TableProps) {
  const rows = useMemo(() => documentos, [documentos]);

  return (
    <EntityListView
      empty={rows.length === 0}
      emptyMessage="Nenhum documento encontrado com os filtros atuais."
      before={
        <MobileSortBar
          columns={SORT_COLS}
          activeSort={sort}
          activeDir={dir}
          basePath={BASE}
        />
      }
      cards={rows.map((documento) => (
        <ListCardLink key={documento.id} href={`/documentos/${documento.id}`}>
          <ListCardTitle>{documento.nome || "Sem nome"}</ListCardTitle>
          <ListCardMeta>
            <span>{labelDocumentoTipo(documento.tipo)}</span>
            <ListCardMetaSep />
            <span>{documento.unidade || "—"}</span>
            {documento.data ? (
              <>
                <ListCardMetaSep />
                <span>{formatDate(`${documento.data}T12:00:00`)}</span>
              </>
            ) : null}
          </ListCardMeta>
        </ListCardLink>
      ))}
      table={
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-panel-soft text-xs font-bold tracking-[0.14em] text-gold uppercase">
              <SortableTh
                sortKey="nome"
                label="Nome"
                activeSort={sort}
                activeDir={dir}
                basePath={BASE}
              />
              <SortableTh
                sortKey="unidade"
                label="Unidade"
                activeSort={sort}
                activeDir={dir}
                basePath={BASE}
              />
              <SortableTh
                sortKey="tipo"
                label="Tipo"
                activeSort={sort}
                activeDir={dir}
                basePath={BASE}
              />
              <SortableTh
                sortKey="data"
                label="Data"
                activeSort={sort}
                activeDir={dir}
                basePath={BASE}
                className={LIST_COL_SECONDARY}
              />
              <SortableTh
                sortKey="data_cadastro"
                label="Cadastro"
                activeSort={sort}
                activeDir={dir}
                basePath={BASE}
                className={LIST_COL_SECONDARY}
              />
            </tr>
          </thead>
          <tbody>
            {rows.map((documento) => (
              <tr
                key={documento.id}
                className="border-b border-border last:border-b-0 hover:bg-panel-hover"
              >
                <td className="px-3 py-2">
                  <Link
                    href={`/documentos/${documento.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {documento.nome || "Sem nome"}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-strong">
                  {documento.unidade || "—"}
                </td>
                <td className="px-3 py-2 text-muted-strong">
                  {labelDocumentoTipo(documento.tipo)}
                </td>
                <td
                  className={`${LIST_COL_SECONDARY} px-3 py-2 text-muted-strong`}
                >
                  {documento.data
                    ? formatDate(`${documento.data}T12:00:00`)
                    : "—"}
                </td>
                <td className={`${LIST_COL_SECONDARY} px-3 py-2 text-muted`}>
                  {formatDate(documento.data_cadastro)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
      pagination={
        <ListPagination
          basePath={BASE}
          total={total}
          page={page}
          pageSize={pageSize}
        />
      }
    />
  );
}
