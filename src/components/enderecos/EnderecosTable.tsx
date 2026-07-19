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
import { Input } from "@/components/ui/Form";
import { formatCep, formatDate, formatEnderecoResumo } from "@/lib/format";
import type { Endereco } from "@/lib/types";

type FiltersProps = {
  total: number;
};

type TableProps = {
  enderecos: Endereco[];
  total: number;
  page: number;
  pageSize: number;
};

export function EnderecosFilters({ total }: FiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [pending, startTransition] = useTransition();

  function apply(nextQ: string) {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    startTransition(() => {
      router.push(`/enderecos${params.toString() ? `?${params}` : ""}`);
    });
  }

  return (
    <ListFiltersBar>
      <ListFilterSearch>
        <label className="mb-1 block text-xs font-medium text-muted">
          Buscar
        </label>
        <Input
          placeholder="Nome, logradouro, cidade, bairro ou CEP…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply(q);
          }}
        />
      </ListFilterSearch>
      <button
        type="button"
        disabled={pending}
        onClick={() => apply(q)}
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

export function EnderecosTable({
  enderecos,
  total,
  page,
  pageSize,
}: TableProps) {
  const rows = useMemo(() => enderecos, [enderecos]);

  return (
    <EntityListView
      empty={rows.length === 0}
      emptyMessage="Nenhum endereço encontrado com os filtros atuais."
      cards={rows.map((endereco) => {
        const titulo =
          endereco.nome ||
          formatEnderecoResumo(endereco).split(" — ")[0] ||
          "Sem nome";
        return (
          <ListCardLink key={endereco.id} href={`/enderecos/${endereco.id}`}>
            <ListCardTitle>{titulo}</ListCardTitle>
            <ListCardMeta>
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
              <th className="px-3 py-2.5 font-semibold">Nome</th>
              <th className="px-3 py-2.5 font-semibold">Endereço</th>
              <th className="px-3 py-2.5 font-semibold">CEP</th>
              <th className="px-3 py-2.5 font-semibold">UF</th>
              <th className={`${LIST_COL_SECONDARY} px-3 py-2.5 font-semibold`}>
                Cadastro
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((endereco) => (
              <tr
                key={endereco.id}
                className="border-b border-border last:border-b-0 hover:bg-panel-hover"
              >
                <td className="px-3 py-2">
                  <Link
                    href={`/enderecos/${endereco.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {endereco.nome ||
                      formatEnderecoResumo(endereco).split(" — ")[0] ||
                      "Sem nome"}
                  </Link>
                </td>
                <td className="max-w-[280px] truncate px-3 py-2 text-muted-strong">
                  {formatEnderecoResumo(endereco)}
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
          basePath="/enderecos"
          total={total}
          page={page}
          pageSize={pageSize}
        />
      }
    />
  );
}
