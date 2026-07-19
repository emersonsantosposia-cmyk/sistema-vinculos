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
import { Button, Input } from "@/components/ui/Form";
import { formatDate, formatPlaca } from "@/lib/format";
import type { Veiculo } from "@/lib/types";

type FiltersProps = {
  total: number;
};

type TableProps = {
  veiculos: Veiculo[];
  total: number;
  page: number;
  pageSize: number;
};

export function VeiculosFilters({ total }: FiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [pending, startTransition] = useTransition();

  function apply(nextQ: string) {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    startTransition(() => {
      router.push(`/veiculos${params.toString() ? `?${params}` : ""}`);
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
}: TableProps) {
  const rows = useMemo(() => veiculos, [veiculos]);

  return (
    <EntityListView
      empty={rows.length === 0}
      emptyMessage="Nenhum veículo encontrado com os filtros atuais."
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
              <th className="px-3 py-2.5 font-semibold">Placa</th>
              <th className="px-3 py-2.5 font-semibold">Marca</th>
              <th className="px-3 py-2.5 font-semibold">Modelo</th>
              <th className={`${LIST_COL_SECONDARY} px-3 py-2.5 font-semibold`}>
                Cor
              </th>
              <th className={`${LIST_COL_SECONDARY} px-3 py-2.5 font-semibold`}>
                Ano
              </th>
              <th className={`${LIST_COL_SECONDARY} px-3 py-2.5 font-semibold`}>
                Cadastro
              </th>
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
          basePath="/veiculos"
          total={total}
          page={page}
          pageSize={pageSize}
        />
      }
    />
  );
}
