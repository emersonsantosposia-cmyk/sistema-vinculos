import Link from "next/link";
import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ErrorBanner } from "@/components/ui/Form";
import {
  BUSCA_TIPO_LABEL,
  buscaGlobal,
  type BuscaEntidadeTipo,
  type BuscaResultado,
} from "@/lib/supabase/busca-server";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

const TIPO_ORDER: BuscaEntidadeTipo[] = [
  "pessoa",
  "empresa",
  "veiculo",
  "endereco",
  "caso",
];

function groupByTipo(results: BuscaResultado[]) {
  const map = new Map<BuscaEntidadeTipo, BuscaResultado[]>();
  for (const tipo of TIPO_ORDER) map.set(tipo, []);
  for (const item of results) {
    const list = map.get(item.tipo) ?? [];
    list.push(item);
    map.set(item.tipo, list);
  }
  return map;
}

async function BuscaContent({ q }: { q?: string }) {
  const term = q?.trim() ?? "";

  if (term.length < 2) {
    return (
      <p className="text-sm text-muted">
        Digite pelo menos 2 caracteres na busca do topo para pesquisar pessoas,
        empresas, veículos, endereços e casos.
      </p>
    );
  }

  const { data, error } = await buscaGlobal(term, 25);
  const grouped = groupByTipo(data);
  const total = data.length;

  return (
    <div className="space-y-5">
      {error ? <ErrorBanner>{error}</ErrorBanner> : null}

      <p className="text-sm text-muted">
        {total === 0
          ? `Nenhum resultado para “${term}”.`
          : `${total} resultado${total === 1 ? "" : "s"} para “${term}”.`}
      </p>

      {TIPO_ORDER.map((tipo) => {
        const items = grouped.get(tipo) ?? [];
        if (items.length === 0) return null;
        return (
          <section key={tipo}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {BUSCA_TIPO_LABEL[tipo]} ({items.length})
            </h3>
            <ul className="divide-y divide-border rounded border border-border bg-panel">
              {items.map((item) => (
                <li key={`${item.tipo}-${item.id}`}>
                  <Link
                    href={item.href}
                    className="flex items-start justify-between gap-3 px-3 py-2.5 hover:bg-zinc-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {item.titulo}
                      </p>
                      {item.subtitulo ? (
                        <p className="truncate text-xs text-muted">
                          {item.subtitulo}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs text-zinc-500">
                      Abrir →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export default async function BuscaPage({ searchParams }: Props) {
  const { q } = await searchParams;

  return (
    <DashboardShell title="Busca">
      <Suspense
        fallback={
          <p className="text-sm text-muted">Carregando resultados…</p>
        }
      >
        <BuscaContent q={q} />
      </Suspense>
    </DashboardShell>
  );
}
