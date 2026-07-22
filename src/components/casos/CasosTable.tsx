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
import { formatDate, labelCasoStatus } from "@/lib/format";
import {
  buildListFilterParams,
  ENTITY_SORT_COLUMNS,
  type SortDir,
} from "@/lib/list-sort";
import { UNIDADES } from "@/lib/perfis";
import type { Caso } from "@/lib/types";

const BASE = "/casos";
const SORT_COLS = ENTITY_SORT_COLUMNS.casos;

type FiltersProps = {
  total: number;
  showUnidadeFilter?: boolean;
};

type TableProps = {
  casos: Caso[];
  total: number;
  page: number;
  pageSize: number;
  sort: string;
  dir: SortDir;
};

export function CasosFilters({
  total,
  showUnidadeFilter = true,
}: FiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [unidade, setUnidade] = useState(
    showUnidadeFilter ? (searchParams.get("unidade") ?? "") : "",
  );
  const [pending, startTransition] = useTransition();

  function apply(nextQ: string, nextUnidade: string) {
    const params = buildListFilterParams(searchParams, {
      q: nextQ,
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
          placeholder="Número ou nome…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply(q, unidade);
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
              apply(q, e.target.value);
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
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => apply(q, unidade)}
      >
        Filtrar
      </Button>
      <ListFilterTotal>
        {total} registro{total === 1 ? "" : "s"} no total
      </ListFilterTotal>
    </ListFiltersBar>
  );
}

export function CasosTable({
  casos,
  total,
  page,
  pageSize,
  sort,
  dir,
}: TableProps) {
  const rows = useMemo(() => casos, [casos]);

  return (
    <EntityListView
      empty={rows.length === 0}
      emptyMessage="Nenhum caso encontrado com os filtros atuais."
      before={
        <MobileSortBar
          columns={SORT_COLS}
          activeSort={sort}
          activeDir={dir}
          basePath={BASE}
        />
      }
      cards={rows.map((caso) => (
        <ListCardLink key={caso.id} href={`/casos/${caso.id}`}>
          <ListCardTitle>{caso.numero || "Sem número"}</ListCardTitle>
          <ListCardMeta>
            <span className="truncate">{caso.nome || "—"}</span>
            <ListCardMetaSep />
            <span>{labelCasoStatus(caso.status)}</span>
            {caso.unidade ? (
              <>
                <ListCardMetaSep />
                <span>{caso.unidade}</span>
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
                sortKey="numero"
                label="Número"
                activeSort={sort}
                activeDir={dir}
                basePath={BASE}
              />
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
                sortKey="status"
                label="Status"
                activeSort={sort}
                activeDir={dir}
                basePath={BASE}
              />
              <SortableTh
                sortKey="data_abertura"
                label="Abertura"
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
            {rows.map((caso) => (
              <tr
                key={caso.id}
                className="border-b border-border last:border-b-0 hover:bg-panel-hover"
              >
                <td className="px-3 py-2">
                  <Link
                    href={`/casos/${caso.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {caso.numero || "Sem número"}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-strong">
                  {caso.nome || "—"}
                </td>
                <td className="px-3 py-2 text-muted-strong">
                  {caso.unidade || "—"}
                </td>
                <td className="px-3 py-2 text-muted-strong">
                  {labelCasoStatus(caso.status)}
                </td>
                <td
                  className={`${LIST_COL_SECONDARY} px-3 py-2 text-muted-strong`}
                >
                  {caso.data_abertura
                    ? formatDate(`${caso.data_abertura}T12:00:00`)
                    : "—"}
                </td>
                <td className={`${LIST_COL_SECONDARY} px-3 py-2 text-muted`}>
                  {formatDate(caso.data_cadastro)}
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
