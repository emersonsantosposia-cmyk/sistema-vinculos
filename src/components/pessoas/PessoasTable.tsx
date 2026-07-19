"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
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
import { Input, Select } from "@/components/ui/Form";
import { formatCpf, formatDate, formatIdade, labelPessoaTipo } from "@/lib/format";
import type { PessoaListItem } from "@/lib/types";
import { PESSOA_TIPOS } from "@/lib/types";

const SHOW_IDADE_KEY = "rede-lince:pessoas-mostrar-idade";

type FiltersProps = {
  total: number;
  showIdade: boolean;
  onShowIdadeChange: (value: boolean) => void;
};

type TableProps = {
  pessoas: PessoaListItem[];
  total: number;
  page: number;
  pageSize: number;
  showIdade: boolean;
};

type ListaProps = {
  pessoas: PessoaListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export function PessoasFilters({
  total,
  showIdade,
  onShowIdadeChange,
}: FiltersProps) {
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
        <button
          type="button"
          disabled={pending}
          onClick={() => apply(q, tipo)}
          className="h-8 rounded border border-border bg-panel px-3 text-sm font-medium text-muted-strong hover:bg-panel-hover hover:text-gold-bright disabled:opacity-50"
        >
          {pending ? "Filtrando…" : "Filtrar"}
        </button>
        <label className="flex h-8 cursor-pointer items-center gap-2 rounded border border-border bg-panel px-2.5 text-xs text-muted-strong">
          <input
            type="checkbox"
            className="accent-[var(--cor-destaque-dourado)]"
            checked={showIdade}
            onChange={(e) => onShowIdadeChange(e.target.checked)}
          />
          Mostrar idade
        </label>
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
  showIdade,
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
            {showIdade ? (
              <>
                <ListCardMetaSep />
                <span>{formatIdade(pessoa.data_nascimento)}</span>
              </>
            ) : null}
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
              {showIdade ? (
                <th className={`${LIST_COL_SECONDARY} px-3 py-2.5 font-semibold`}>
                  Idade
                </th>
              ) : null}
              <th className={`${LIST_COL_SECONDARY} px-3 py-2.5 font-semibold`}>
                Profissão
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
                {showIdade ? (
                  <td
                    className={`${LIST_COL_SECONDARY} px-3 py-2 text-muted-strong`}
                  >
                    {formatIdade(pessoa.data_nascimento)}
                  </td>
                ) : null}
                <td
                  className={`${LIST_COL_SECONDARY} px-3 py-2 text-muted-strong`}
                >
                  {pessoa.profissao || "—"}
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

/** Lista de pessoas com preferência de coluna “Idade” (localStorage). */
export function PessoasLista({ pessoas, total, page, pageSize }: ListaProps) {
  const [showIdade, setShowIdade] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SHOW_IDADE_KEY);
      if (stored === "0") setShowIdade(false);
      if (stored === "1") setShowIdade(true);
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  function handleShowIdadeChange(value: boolean) {
    setShowIdade(value);
    try {
      localStorage.setItem(SHOW_IDADE_KEY, value ? "1" : "0");
    } catch {
      // ignore
    }
  }

  return (
    <>
      <PessoasFilters
        total={total}
        showIdade={ready ? showIdade : true}
        onShowIdadeChange={handleShowIdadeChange}
      />
      <PessoasTable
        pessoas={pessoas}
        total={total}
        page={page}
        pageSize={pageSize}
        showIdade={ready ? showIdade : true}
      />
    </>
  );
}
