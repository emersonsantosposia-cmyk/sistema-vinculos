"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Input, Select } from "@/components/ui/Form";
import { formatDate, labelCasoStatus } from "@/lib/format";
import { UNIDADES } from "@/lib/perfis";
import type { Caso } from "@/lib/types";

type Props = {
  casos: Caso[];
};

type FiltersProps = Props & {
  /** Admin e Analista CGIN veem o filtro; demais analistas não. */
  showUnidadeFilter?: boolean;
};

export function CasosFilters({
  casos,
  showUnidadeFilter = true,
}: FiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [unidade, setUnidade] = useState(
    showUnidadeFilter ? (searchParams.get("unidade") ?? "") : "",
  );
  const [pending, startTransition] = useTransition();

  function apply(nextQ: string, nextUnidade: string) {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (showUnidadeFilter && nextUnidade) params.set("unidade", nextUnidade);
    startTransition(() => {
      router.push(`/casos${params.toString() ? `?${params}` : ""}`);
    });
  }

  return (
    <div className="mb-3 flex flex-wrap items-end gap-2">
      <div className="min-w-[220px] flex-1">
        <label className="mb-1 block text-xs font-medium text-muted">
          Buscar
        </label>
        <Input
          placeholder="Número ou nome…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply(q, unidade);
          }}
        />
      </div>
      {showUnidadeFilter ? (
        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-muted">
            Unidade
          </label>
          <Select
            value={unidade}
            onChange={(e) => {
              setUnidade(e.target.value);
              apply(q, e.target.value);
            }}
          >
            <option value="">Todas</option>
            {UNIDADES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => apply(q, unidade)}
        className="h-8 rounded border border-border bg-panel px-3 text-sm font-medium text-muted-strong hover:bg-panel-hover hover:text-gold-bright disabled:opacity-50"
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
      <table className="w-full min-w-[860px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-panel-soft text-xs font-bold tracking-[0.14em] text-gold uppercase">
            <th className="px-3 py-2.5 font-semibold">Número</th>
            <th className="px-3 py-2.5 font-semibold">Nome</th>
            <th className="px-3 py-2.5 font-semibold">Unidade</th>
            <th className="px-3 py-2.5 font-semibold">Status</th>
            <th className="px-3 py-2.5 font-semibold">Abertura</th>
            <th className="px-3 py-2.5 font-semibold">Cadastro</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((caso) => (
            <tr
              key={caso.id}
              className="border-b border-border last:border-b-0 hover:bg-panel-hover"
            >
              <td className="px-3 py-2">
                <Link
                  href={`/casos/${caso.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {caso.numero || "Sem número"}
                </Link>
              </td>
              <td className="px-3 py-2 text-muted-strong">{caso.nome || "—"}</td>
              <td className="px-3 py-2 text-muted-strong">
                {caso.unidade || "—"}
              </td>
              <td className="px-3 py-2 text-muted-strong">
                {labelCasoStatus(caso.status)}
              </td>
              <td className="px-3 py-2 text-muted-strong">
                {caso.data_abertura
                  ? formatDate(`${caso.data_abertura}T12:00:00`)
                  : "—"}
              </td>
              <td className="px-3 py-2 text-muted">
                {formatDate(caso.data_cadastro)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
