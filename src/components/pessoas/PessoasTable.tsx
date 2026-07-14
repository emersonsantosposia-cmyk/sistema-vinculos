"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { PessoaAvatar } from "@/components/pessoas/PessoaAvatar";
import { Input, Select } from "@/components/ui/Form";
import { formatCpf, formatDate, formatIdade, labelPessoaTipo } from "@/lib/format";
import type { PessoaListItem } from "@/lib/types";
import { PESSOA_TIPOS } from "@/lib/types";

const SHOW_IDADE_KEY = "rede-lince:pessoas-mostrar-idade";

type Props = {
  pessoas: PessoaListItem[];
};

export function PessoasFilters({
  pessoas,
  showIdade,
  onShowIdadeChange,
}: Props & {
  showIdade: boolean;
  onShowIdadeChange: (value: boolean) => void;
}) {
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
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-medium text-zinc-600">
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
        </div>
        <div className="w-44">
          <label className="mb-1 block text-xs font-medium text-zinc-600">
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
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => apply(q, tipo)}
          className="h-8 rounded border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
        >
          {pending ? "Filtrando…" : "Filtrar"}
        </button>
        <label className="mb-0.5 flex h-8 cursor-pointer items-center gap-2 rounded border border-zinc-200 bg-white px-2.5 text-xs text-zinc-700">
          <input
            type="checkbox"
            className="accent-zinc-900"
            checked={showIdade}
            onChange={(e) => onShowIdadeChange(e.target.checked)}
          />
          Mostrar idade
        </label>
        <p className="ml-auto self-center text-xs text-muted">
          {pessoas.length} registro{pessoas.length === 1 ? "" : "s"}
        </p>
      </div>
      {pending ? (
        <p className="text-xs text-muted">Atualizando listagem…</p>
      ) : null}
    </div>
  );
}

export function PessoasTable({
  pessoas,
  showIdade,
}: Props & { showIdade: boolean }) {
  const rows = useMemo(() => pessoas, [pessoas]);

  if (rows.length === 0) {
    return (
      <div className="rounded border border-border bg-panel px-4 py-10 text-center text-sm text-muted">
        Nenhuma pessoa encontrada com os filtros atuais.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-border bg-panel">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-zinc-50 text-xs font-semibold tracking-wide text-zinc-600 uppercase">
            <th className="px-3 py-2.5 font-semibold">Nome</th>
            <th className="px-3 py-2.5 font-semibold">Tipo</th>
            <th className="px-3 py-2.5 font-semibold">CPF</th>
            {showIdade ? (
              <th className="px-3 py-2.5 font-semibold">Idade</th>
            ) : null}
            <th className="px-3 py-2.5 font-semibold">Profissão</th>
            <th className="px-3 py-2.5 font-semibold">Cadastro</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((pessoa) => (
            <tr
              key={pessoa.id}
              className="border-b border-border last:border-b-0 hover:bg-zinc-50"
            >
              <td className="px-3 py-2">
                <Link
                  href={`/pessoas/${pessoa.id}`}
                  className="inline-flex items-center gap-2.5 font-medium text-zinc-900 hover:underline"
                >
                  <PessoaAvatar
                    path={pessoa.foto_perfil_path}
                    nome={pessoa.nome}
                    size="sm"
                  />
                  <span>{pessoa.nome}</span>
                </Link>
              </td>
              <td className="px-3 py-2 text-zinc-700">
                {labelPessoaTipo(pessoa.tipo)}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-zinc-700">
                {formatCpf(pessoa.cpf)}
              </td>
              {showIdade ? (
                <td className="px-3 py-2 text-zinc-700">
                  {formatIdade(pessoa.data_nascimento)}
                </td>
              ) : null}
              <td className="px-3 py-2 text-zinc-700">
                {pessoa.profissao || "—"}
              </td>
              <td className="px-3 py-2 text-zinc-600">
                {formatDate(pessoa.data_cadastro)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Lista de pessoas com preferência de coluna “Idade” (localStorage). */
export function PessoasLista({ pessoas }: Props) {
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
        pessoas={pessoas}
        showIdade={ready ? showIdade : true}
        onShowIdadeChange={handleShowIdadeChange}
      />
      <PessoasTable
        pessoas={pessoas}
        showIdade={ready ? showIdade : true}
      />
    </>
  );
}
