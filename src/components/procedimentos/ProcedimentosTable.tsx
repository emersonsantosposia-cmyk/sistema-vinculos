"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Input, Select } from "@/components/ui/Form";
import { formatDate, labelProcedimentoTipo } from "@/lib/format";
import { PROCEDIMENTO_TIPOS, type Procedimento } from "@/lib/types";

type Props = {
  procedimentos: Procedimento[];
};

export function ProcedimentosFilters({ procedimentos }: Props) {
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
      router.push(`/procedimentos${params.toString() ? `?${params}` : ""}`);
    });
  }

  return (
    <div className="mb-3 flex flex-wrap items-end gap-2">
      <div className="min-w-[220px] flex-1">
        <label className="mb-1 block text-xs font-medium text-muted">
          Buscar
        </label>
        <Input
          placeholder="Nome ou resumo…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply(q, tipo);
          }}
        />
      </div>
      <div className="w-44">
        <label className="mb-1 block text-xs font-medium text-muted">
          Tipo
        </label>
        <Select
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value);
            apply(q, e.target.value);
          }}
        >
          <option value="">Todos</option>
          {PROCEDIMENTO_TIPOS.map((t) => (
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
        className="h-8 rounded border border-border bg-panel px-3 text-sm font-medium text-muted-strong hover:bg-panel-hover hover:text-gold-bright disabled:opacity-50"
      >
        Filtrar
      </button>
      <p className="ml-auto self-center text-xs text-muted">
        {procedimentos.length} registro{procedimentos.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function ProcedimentosTable({ procedimentos }: Props) {
  const rows = useMemo(() => procedimentos, [procedimentos]);

  if (rows.length === 0) {
    return (
      <div className="rounded border border-border bg-panel px-4 py-10 text-center text-sm text-muted">
        Nenhum procedimento encontrado com os filtros atuais.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-border bg-panel">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-panel-soft text-xs font-bold tracking-[0.14em] text-gold uppercase">
            <th className="px-3 py-2.5 font-semibold">Nome</th>
            <th className="px-3 py-2.5 font-semibold">Tipo</th>
            <th className="px-3 py-2.5 font-semibold">Data</th>
            <th className="px-3 py-2.5 font-semibold">Cadastro</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((procedimento) => (
            <tr
              key={procedimento.id}
              className="border-b border-border last:border-b-0 hover:bg-panel-hover"
            >
              <td className="px-3 py-2">
                <Link
                  href={`/procedimentos/${procedimento.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {procedimento.nome || "Sem nome"}
                </Link>
              </td>
              <td className="px-3 py-2 text-muted-strong">
                {labelProcedimentoTipo(procedimento.tipo)}
              </td>
              <td className="px-3 py-2 text-muted-strong">
                {procedimento.data
                  ? formatDate(`${procedimento.data}T12:00:00`)
                  : "—"}
              </td>
              <td className="px-3 py-2 text-muted">
                {formatDate(procedimento.data_cadastro)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
