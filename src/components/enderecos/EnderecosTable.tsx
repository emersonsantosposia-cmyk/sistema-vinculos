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
import {
  formatCep,
  formatDate,
  formatEnderecoResumo,
  formatEnderecoTitulo,
} from "@/lib/format";
import {
  buildListFilterParams,
  ENTITY_SORT_COLUMNS,
  type SortDir,
} from "@/lib/list-sort";
import type { Endereco } from "@/lib/types";

const BASE = "/enderecos";
const SORT_COLS = ENTITY_SORT_COLUMNS.enderecos;

type FiltersProps = {
  total: number;
};

type TableProps = {
  enderecos: Endereco[];
  total: number;
  page: number;
  pageSize: number;
  sort: string;
  dir: SortDir;
};

export function EnderecosFilters({ total }: FiltersProps) {
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
          placeholder="Tipo, logradouro, cidade, bairro ou CEP…"
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

export function EnderecosTable({
  enderecos,
  total,
  page,
  pageSize,
  sort,
  dir,
}: TableProps) {
  const rows = useMemo(() => enderecos, [enderecos]);

  return (
    <EntityListView
      empty={rows.length === 0}
      emptyMessage="Nenhum endereço encontrado com os filtros atuais."
      before={
        <MobileSortBar
          columns={SORT_COLS}
          activeSort={sort}
          activeDir={dir}
          basePath={BASE}
        />
      }
      cards={rows.map((endereco) => {
        const titulo = formatEnderecoTitulo(endereco);
        return (
          <ListCardLink key={endereco.id} href={`/enderecos/${endereco.id}`}>
            <ListCardTitle>{titulo}</ListCardTitle>
            <ListCardMeta>
              {endereco.tipo ? (
                <>
                  <span>{endereco.tipo}</span>
                  <ListCardMetaSep />
                </>
              ) : null}
              <span className="line-clamp-2">
                {formatEnderecoResumo(endereco)}
              </span>
              <ListCardMetaSep />
              <span>{endereco.estado || "—"}</span>
              <ListCardMetaSep />
              <span className="font-mono">{formatCep(endereco.cep)}</span>
            </ListCardMeta>
          </ListCardLink>
        );
      })}
      table={
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-panel-soft text-xs font-bold tracking-[0.14em] text-gold uppercase">
              <SortableTh
                sortKey="logradouro"
                label="Endereço"
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
                sortKey="cep"
                label="CEP"
                activeSort={sort}
                activeDir={dir}
                basePath={BASE}
              />
              <SortableTh
                sortKey="estado"
                label="UF"
                activeSort={sort}
                activeDir={dir}
                basePath={BASE}
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
            {rows.map((endereco) => (
              <tr
                key={endereco.id}
                className="border-b border-border last:border-b-0 hover:bg-panel-hover"
              >
                <td className="max-w-[320px] px-3 py-2">
                  <Link
                    href={`/enderecos/${endereco.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {formatEnderecoTitulo(endereco)}
                  </Link>
                  {endereco.bairro || endereco.cidade ? (
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {[endereco.bairro, endereco.cidade, endereco.estado]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-muted-strong">
                  {endereco.tipo || "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-muted-strong">
                  {formatCep(endereco.cep)}
                </td>
                <td className="px-3 py-2 text-muted-strong">
                  {endereco.estado || "—"}
                </td>
                <td className={`${LIST_COL_SECONDARY} px-3 py-2 text-muted`}>
                  {formatDate(endereco.data_cadastro)}
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
