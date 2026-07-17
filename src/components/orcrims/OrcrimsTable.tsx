"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Input, Select } from "@/components/ui/Form";
import { formatDate, UFS } from "@/lib/format";
import type { Orcrim } from "@/lib/types";

type Props = {
  orcrims: Orcrim[];
};

export function OrcrimsFilters({ orcrims }: Props) {
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
    <div className="mb-3 flex flex-wrap items-end gap-2">
      <div className="min-w-[220px] flex-1">
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
      </div>
      <div className="w-36">
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
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => apply(q, estado)}
        className="h-8 rounded border border-border bg-panel px-3 text-sm font-medium text-muted-strong hover:bg-panel-hover hover:text-gold-bright disabled:opacity-50"
      >
        Filtrar
      </button>
      <p className="ml-auto self-center text-xs text-muted">
        {orcrims.length} registro{orcrims.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function OrcrimsTable({ orcrims }: Props) {
  const rows = useMemo(() => orcrims, [orcrims]);

  if (rows.length === 0) {
    return (
      <div className="rounded border border-border bg-panel px-4 py-10 text-center text-sm text-muted">
        Nenhuma orcrim encontrada com os filtros atuais.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-border bg-panel">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-panel-soft text-xs font-bold tracking-[0.14em] text-gold uppercase">
            <th className="px-3 py-2.5 font-semibold">Nome</th>
            <th className="px-3 py-2.5 font-semibold">Sigla</th>
            <th className="px-3 py-2.5 font-semibold">Estado de origem</th>
            <th className="px-3 py-2.5 font-semibold">Cadastro</th>
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
              <td className="px-3 py-2 text-muted">
                {formatDate(orcrim.data_cadastro)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
