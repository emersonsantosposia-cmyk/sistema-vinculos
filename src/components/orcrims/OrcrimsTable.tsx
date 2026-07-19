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
import { Button, Input, Select } from "@/components/ui/Form";
import { formatDate, UFS } from "@/lib/format";
import type { Orcrim } from "@/lib/types";

type FiltersProps = {
  total: number;
};

type TableProps = {
  orcrims: Orcrim[];
  total: number;
  page: number;
  pageSize: number;
};

export function OrcrimsFilters({ total }: FiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [estado, setEstado] = useState(searchParams.get("estado") ?? "");
  const [pending, startTransition] = useTransition();

  function apply(nextQ: string, nextEstado: string) {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextEstado) params.set("estado", nextEstado);
    startTransition(() => {
      router.push(`/orcrims${params.toString() ? `?${params}` : ""}`);
    });
  }

  return (
    <ListFiltersBar>
      <ListFilterSearch>
        <label className="mb-1 block text-xs font-medium text-muted">
          Buscar
        </label>
        <Input
          placeholder="Nome ou sigla…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply(q, estado);
          }}
        />
      </ListFilterSearch>
      <ListFilterField className="w-full sm:w-36">
        <label className="mb-1 block text-xs font-medium text-muted">
          Estado
        </label>
        <Select
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value);
            apply(q, e.target.value);
          }}
        >
          <option value="">Todos</option>
          {UFS.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </Select>
      </ListFilterField>
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => apply(q, estado)}
      >
        Filtrar
      </Button>
      <ListFilterTotal>
        {total} registro{total === 1 ? "" : "s"} no total
      </ListFilterTotal>
    </ListFiltersBar>
  );
}

export function OrcrimsTable({
  orcrims,
  total,
  page,
  pageSize,
}: TableProps) {
  const rows = useMemo(() => orcrims, [orcrims]);

  return (
    <EntityListView
      empty={rows.length === 0}
      emptyMessage="Nenhuma orcrim encontrada com os filtros atuais."
      cards={rows.map((orcrim) => (
        <ListCardLink key={orcrim.id} href={`/orcrims/${orcrim.id}`}>
          <ListCardTitle>{orcrim.nome || "Sem nome"}</ListCardTitle>
          <ListCardMeta>
            <span>{orcrim.sigla || "—"}</span>
            <ListCardMetaSep />
            <span>{orcrim.estado_origem || "—"}</span>
          </ListCardMeta>
        </ListCardLink>
      ))}
      table={
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-panel-soft text-xs font-bold tracking-[0.14em] text-gold uppercase">
              <th className="px-3 py-2.5 font-semibold">Nome</th>
              <th className="px-3 py-2.5 font-semibold">Sigla</th>
              <th className="px-3 py-2.5 font-semibold">Estado de origem</th>
              <th className={`${LIST_COL_SECONDARY} px-3 py-2.5 font-semibold`}>
                Cadastro
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((orcrim) => (
              <tr
                key={orcrim.id}
                className="border-b border-border last:border-b-0 hover:bg-panel-hover"
              >
                <td className="px-3 py-2">
                  <Link
                    href={`/orcrims/${orcrim.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {orcrim.nome || "Sem nome"}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-strong">
                  {orcrim.sigla || "—"}
                </td>
                <td className="px-3 py-2 text-muted-strong">
                  {orcrim.estado_origem || "—"}
                </td>
                <td className={`${LIST_COL_SECONDARY} px-3 py-2 text-muted`}>
                  {formatDate(orcrim.data_cadastro)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
      pagination={
        <ListPagination
          basePath="/orcrims"
          total={total}
          page={page}
          pageSize={pageSize}
        />
      }
    />
  );
}
