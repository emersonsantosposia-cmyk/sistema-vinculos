"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
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
    // Sem `page` → volta para a página 1
    startTransition(() => {
      router.push(`/enderecos${params.toString() ? `?${params}` : ""}`);
    });
  }

  return (
    <div className="mb-3 flex flex-wrap items-end gap-2">
      <div className="min-w-[220px] flex-1">
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
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => apply(q)}
        className="h-8 rounded border border-border bg-panel px-3 text-sm font-medium text-muted-strong hover:bg-panel-hover hover:text-gold-bright disabled:opacity-50"
      >
        Filtrar
      </button>
      <p className="ml-auto self-center text-xs text-muted">
        {total} registro{total === 1 ? "" : "s"} no total
      </p>
    </div>
  );
}

export function EnderecosTable({
  enderecos,
  total,
  page,
  pageSize,
}: TableProps) {
  const rows = useMemo(() => enderecos, [enderecos]);

  if (rows.length === 0) {
    return (
      <div className="rounded border border-border bg-panel px-4 py-10 text-center text-sm text-muted">
        Nenhum endereço encontrado com os filtros atuais.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded border border-border bg-panel">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-panel-soft text-xs font-bold tracking-[0.14em] text-gold uppercase">
              <th className="px-3 py-2.5 font-semibold">Nome</th>
              <th className="px-3 py-2.5 font-semibold">Endereço</th>
              <th className="px-3 py-2.5 font-semibold">CEP</th>
              <th className="px-3 py-2.5 font-semibold">UF</th>
              <th className="px-3 py-2.5 font-semibold">Cadastro</th>
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
                <td className="px-3 py-2 text-muted-strong">{endereco.estado || "—"}</td>
                <td className="px-3 py-2 text-muted">
                  {formatDate(endereco.data_cadastro)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ListPagination
        basePath="/enderecos"
        total={total}
        page={page}
        pageSize={pageSize}
      />
    </div>
  );
}
