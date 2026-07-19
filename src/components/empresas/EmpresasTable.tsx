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
import { formatCnpj, formatDate } from "@/lib/format";
import type { Empresa } from "@/lib/types";

type FiltersProps = {
  total: number;
};

type TableProps = {
  empresas: Empresa[];
  total: number;
  page: number;
  pageSize: number;
};

export function EmpresasFilters({ total }: FiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [pending, startTransition] = useTransition();

  function apply(nextQ: string) {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    startTransition(() => {
      router.push(`/empresas${params.toString() ? `?${params}` : ""}`);
    });
  }

  return (
    <ListFiltersBar>
      <ListFilterSearch>
        <label className="mb-1 block text-xs font-medium text-muted">
          Buscar
        </label>
        <Input
          placeholder="Nome fantasia, razão social ou CNPJ…"
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

export function EmpresasTable({
  empresas,
  total,
  page,
  pageSize,
}: TableProps) {
  const rows = useMemo(() => empresas, [empresas]);

  return (
    <EntityListView
      empty={rows.length === 0}
      emptyMessage="Nenhuma empresa encontrada com os filtros atuais."
      cards={rows.map((empresa) => (
        <ListCardLink key={empresa.id} href={`/empresas/${empresa.id}`}>
          <ListCardTitle>
            {empresa.nome_fantasia || empresa.razao_social}
          </ListCardTitle>
          <ListCardMeta>
            <span className="font-mono">{formatCnpj(empresa.cnpj)}</span>
            {empresa.razao_social &&
            empresa.nome_fantasia &&
            empresa.razao_social !== empresa.nome_fantasia ? (
              <>
                <ListCardMetaSep />
                <span className="truncate">{empresa.razao_social}</span>
              </>
            ) : null}
          </ListCardMeta>
        </ListCardLink>
      ))}
      table={
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-panel-soft text-xs font-bold tracking-[0.14em] text-gold uppercase">
              <th className="px-3 py-2.5 font-semibold">Nome fantasia</th>
              <th className="px-3 py-2.5 font-semibold">Razão social</th>
              <th className="px-3 py-2.5 font-semibold">CNPJ</th>
              <th className={`${LIST_COL_SECONDARY} px-3 py-2.5 font-semibold`}>
                CNAE
              </th>
              <th className={`${LIST_COL_SECONDARY} px-3 py-2.5 font-semibold`}>
                Cadastro
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((empresa) => (
              <tr
                key={empresa.id}
                className="border-b border-border last:border-b-0 hover:bg-panel-hover"
              >
                <td className="px-3 py-2">
                  <Link
                    href={`/empresas/${empresa.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {empresa.nome_fantasia || empresa.razao_social}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-strong">
                  {empresa.razao_social}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-muted-strong">
                  {formatCnpj(empresa.cnpj)}
                </td>
                <td
                  className={`${LIST_COL_SECONDARY} px-3 py-2 text-muted-strong`}
                >
                  {empresa.cnae_principal || "—"}
                </td>
                <td className={`${LIST_COL_SECONDARY} px-3 py-2 text-muted`}>
                  {formatDate(empresa.data_cadastro)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
      pagination={
        <ListPagination
          basePath="/empresas"
          total={total}
          page={page}
          pageSize={pageSize}
        />
      }
    />
  );
}
