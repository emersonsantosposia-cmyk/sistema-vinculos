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
  ListFilterSearch,
  ListFilterTotal,
  ListFiltersBar,
} from "@/components/shared/ListFiltersBar";
import { ListPagination } from "@/components/shared/ListPagination";
import { MobileSortBar, SortableTh } from "@/components/shared/ListSort";
import { Button, Input } from "@/components/ui/Form";
import { formatDate, formatPlaca } from "@/lib/format";
import {
  buildListFilterParams,
  ENTITY_SORT_COLUMNS,
  type SortDir,
} from "@/lib/list-sort";
import type { Veiculo } from "@/lib/types";

const BASE = "/veiculos";
const SORT_COLS = ENTITY_SORT_COLUMNS.veiculos;

type FiltersProps = {
  total: number;
};

type TableProps = {
  veiculos: Veiculo[];
  total: number;
  page: number;
  pageSize: number;
  sort: string;
  dir: SortDir;
};

export function VeiculosFilters({ total }: FiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [pending, startTransition] = useTransition();

  function apply(nextQ: string) {
    const params = buildListFilterParams(searchParams, { q: nextQ });
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
          placeholder="Placa, marca, modelo ou cor…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply(q);
          }}
        />
      </ListFilterSearch>
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => apply(q)}
      >
        Filtrar
      </Button>
      <ListFilterTotal>
        {total} registro{total === 1 ? "" : "s"} no total
      </ListFilterTotal>
    </ListFiltersBar>
  );
}

export function VeiculosTable({
  veiculos,
  total,
  page,
  pageSize,
  sort,
  dir,
}: TableProps) {
  const rows = useMemo(() => veiculos, [veiculos]);

  return (
    <EntityListView
      empty={rows.length === 0}
      emptyMessage="Nenhum veículo encontrado com os filtros atuais."
      before={
        <MobileSortBar
          columns={SORT_COLS}
          activeSort={sort}
          activeDir={dir}
          basePath={BASE}
        />
      }
      cards={rows.map((veiculo) => (
        <ListCardLink key={veiculo.id} href={`/veiculos/${veiculo.id}`}>
          <ListCardTitle>
            <span className="font-mono">{formatPlaca(veiculo.placa)}</span>
          </ListCardTitle>
          <ListCardMeta>
            <span>{veiculo.marca || "—"}</span>
            <ListCardMetaSep />
            <span>{veiculo.modelo || "—"}</span>
            {veiculo.cor ? (
              <>
                <ListCardMetaSep />
                <span>{veiculo.cor}</span>
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
                sortKey="placa"
                label="Placa"
                activeSort={sort}
                activeDir={dir}
                basePath={BASE}
              />
              <SortableTh
                sortKey="marca"
                label="Marca"
                activeSort={sort}
                activeDir={dir}
                basePath={BASE}
              />
              <SortableTh
                sortKey="modelo"
                label="Modelo"
                activeSort={sort}
                activeDir={dir}
                basePath={BASE}
              />
              <SortableTh
                sortKey="cor"
                label="Cor"
                activeSort={sort}
                activeDir={dir}
                basePath={BASE}
                className={LIST_COL_SECONDARY}
              />
              <SortableTh
                sortKey="ano_fabricacao"
                label="Ano"
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
            {rows.map((veiculo) => (
              <tr
                key={veiculo.id}
                className="border-b border-border last:border-b-0 hover:bg-panel-hover"
              >
                <td className="px-3 py-2">
                  <Link
                    href={`/veiculos/${veiculo.id}`}
                    className="font-mono text-sm font-medium text-foreground hover:underline"
                  >
                    {formatPlaca(veiculo.placa)}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-strong">
                  {veiculo.marca || "—"}
                </td>
                <td className="px-3 py-2 text-muted-strong">
                  {veiculo.modelo || "—"}
                </td>
                <td
                  className={`${LIST_COL_SECONDARY} px-3 py-2 text-muted-strong`}
                >
                  {veiculo.cor || "—"}
                </td>
                <td
                  className={`${LIST_COL_SECONDARY} px-3 py-2 text-muted-strong`}
                >
                  {veiculo.ano_fabricacao || veiculo.ano_modelo
                    ? `${veiculo.ano_fabricacao ?? "—"}/${veiculo.ano_modelo ?? "—"}`
                    : "—"}
                </td>
                <td className={`${LIST_COL_SECONDARY} px-3 py-2 text-muted`}>
                  {formatDate(veiculo.data_cadastro)}
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
