"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Input } from "@/components/ui/Form";
import { formatDate } from "@/lib/format";
import type { Caso } from "@/lib/types";

type Props = {
  casos: Caso[];
};

export function CasosFilters({ casos }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [pending, startTransition] = useTransition();

  function apply(nextQ: string) {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    startTransition(() => {
      router.push(`/casos${params.toString() ? `?${params}` : ""}`);
    });
  }

  return (
    <div className="mb-3 flex flex-wrap items-end gap-2">
      <div className="min-w-[220px] flex-1">
        <label className="mb-1 block text-xs font-medium text-zinc-600">
          Buscar
        </label>
        <Input
          placeholder="Número ou nome…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply(q);
          }}
        />
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => apply(q)}
        className="h-8 rounded border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
      >
        Filtrar
      </button>
      <p className="ml-auto self-center text-xs text-muted">
        {casos.length} registro{casos.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function CasosTable({ casos }: Props) {
  const rows = useMemo(() => casos, [casos]);

  if (rows.length === 0) {
    return (
      <div className="rounded border border-border bg-panel px-4 py-10 text-center text-sm text-muted">
        Nenhum caso encontrado com os filtros atuais.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-border bg-panel">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-zinc-50 text-xs font-semibold tracking-wide text-zinc-600 uppercase">
            <th className="px-3 py-2.5 font-semibold">Número</th>
            <th className="px-3 py-2.5 font-semibold">Nome</th>
            <th className="px-3 py-2.5 font-semibold">Abertura</th>
            <th className="px-3 py-2.5 font-semibold">Cadastro</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((caso) => (
            <tr
              key={caso.id}
              className="border-b border-border last:border-b-0 hover:bg-zinc-50"
            >
              <td className="px-3 py-2">
                <Link
                  href={`/casos/${caso.id}`}
                  className="font-medium text-zinc-900 hover:underline"
                >
                  {caso.numero || "Sem número"}
                </Link>
              </td>
              <td className="px-3 py-2 text-zinc-700">{caso.nome || "—"}</td>
              <td className="px-3 py-2 text-zinc-700">
                {caso.data_abertura
                  ? formatDate(`${caso.data_abertura}T12:00:00`)
                  : "—"}
              </td>
              <td className="px-3 py-2 text-zinc-600">
                {formatDate(caso.data_cadastro)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
