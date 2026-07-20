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
import { PessoaAvatar } from "@/components/pessoas/PessoaAvatar";
import { Button, Input, Select } from "@/components/ui/Form";
import { formatCpf, formatDate, labelPessoaTipo } from "@/lib/format";
import type { PessoaListItem } from "@/lib/types";
import { PESSOA_TIPOS } from "@/lib/types";

type FiltersProps = {
  total: number;
};

type TableProps = {
  pessoas: PessoaListItem[];
  total: number;
  page: number;
  pageSize: number;
};

type ListaProps = {
  pessoas: PessoaListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export function PessoasFilters({ total }: FiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [tipo, setTipo] = useState(searchParams.get("tipo") ?? "");
  const [pending, startTransition] = useTransition();

  function apply(nextQ: string, nextTipo: string) {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextTipo) params.set("tipo", nextTipo);
    startTransition(() => {
      router.push(`/pessoas${params.toString() ? `?${params}` : ""}`);
    });
  }

  return (
    <div className="mb-3 space-y-2">
      <ListFiltersBar>
        <ListFilterSearch>
          <label className="mb-1 block text-xs font-medium text-muted">
            Buscar
          </label>
          <Input
            placeholder="Nome ou CPF…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") apply(q, tipo);
            }}
            disabled={pending}
          />
        </ListFilterSearch>
        <ListFilterField>
          <label className="mb-1 block text-xs font-medium text-muted">
            Tipo
          </label>
          <Select
            value={tipo}
            disabled={pending}
            onChange={(e) => {
              setTipo(e.target.value);
              apply(q, e.target.value);
            }}
          >
            <option value="">Todos</option>
            {PESSOA_TIPOS.map((t) => (
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
          onClick={() => apply(q, tipo)}
        >
          {pending ? "Filtrando…" : "Filtrar"}
        </Button>
        <ListFilterTotal>
          {total} registro{total === 1 ? "" : "s"} no total
        </ListFilterTotal>
      </ListFiltersBar>
      {pending ? (
        <p className="text-xs text-muted">Atualizando listagem…</p>
      ) : null}
    </div>
  );
}

export function PessoasTable({
  pessoas,
  total,
  page,
  pageSize,
}: TableProps) {
  const rows = useMemo(() => pessoas, [pessoas]);

  return (
    <EntityListView
      empty={rows.length === 0}
      emptyMessage="Nenhuma pessoa encontrada com os filtros atuais."
      cards={rows.map((pessoa) => (
        <ListCardLink key={pessoa.id} href={`/pessoas/${pessoa.id}`}>
          <ListCardTitle
            leading={
              <PessoaAvatar
                path={pessoa.foto_perfil_path}
                nome={pessoa.nome}
                size="sm"
              />
            }
          >
            {pessoa.nome}
          </ListCardTitle>
          <ListCardMeta>
            <span>{labelPessoaTipo(pessoa.tipo)}</span>
            <ListCardMetaSep />
            <span className="font-mono">{formatCpf(pessoa.cpf)}</span>
            <ListCardMetaSep />
            <span>{pessoa.alcunha?.trim() || "—"}</span>
            <ListCardMetaSep />
            <span>{formatDate(pessoa.data_cadastro)}</span>
          </ListCardMeta>
        </ListCardLink>
      ))}
      table={
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-panel-soft text-xs font-bold tracking-[0.14em] text-gold uppercase">
              <th className="px-3 py-2.5 font-semibold">Nome</th>
              <th className="px-3 py-2.5 font-semibold">Tipo</th>
              <th className="px-3 py-2.5 font-semibold">CPF</th>
              <th className={`${LIST_COL_SECONDARY} px-3 py-2.5 font-semibold`}>
                Alcunha
              </th>
              <th className={`${LIST_COL_SECONDARY} px-3 py-2.5 font-semibold`}>
                Cadastro
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((pessoa) => (
              <tr
                key={pessoa.id}
                className="border-b border-border last:border-b-0 hover:bg-panel-hover"
              >
                <td className="px-3 py-2">
                  <Link
                    href={`/pessoas/${pessoa.id}`}
                    className="inline-flex items-center gap-2.5 font-medium text-foreground hover:underline"
                  >
                    <PessoaAvatar
                      path={pessoa.foto_perfil_path}
                      nome={pessoa.nome}
                      size="sm"
                    />
                    <span>{pessoa.nome}</span>
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-strong">
                  {labelPessoaTipo(pessoa.tipo)}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-muted-strong">
                  {formatCpf(pessoa.cpf)}
                </td>
                <td
                  className={`${LIST_COL_SECONDARY} px-3 py-2 text-muted-strong`}
                >
                  {pessoa.alcunha?.trim() || "—"}
                </td>
                <td className={`${LIST_COL_SECONDARY} px-3 py-2 text-muted`}>
                  {formatDate(pessoa.data_cadastro)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
      pagination={
        <ListPagination
          basePath="/pessoas"
          total={total}
          page={page}
          pageSize={pageSize}
        />
      }
    />
  );
}

export function PessoasLista({ pessoas, total, page, pageSize }: ListaProps) {
  return (
    <>
      <PessoasFilters total={total} />
      <PessoasTable
        pessoas={pessoas}
        total={total}
        page={page}
        pageSize={pageSize}
      />
    </>
  );
}
