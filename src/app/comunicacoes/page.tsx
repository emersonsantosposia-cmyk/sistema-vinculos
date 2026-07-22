import Link from "next/link";
import { Suspense } from "react";
import {
  ComunicacoesFilters,
  ComunicacoesTable,
} from "@/components/comunicacoes/ComunicacoesTable";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ErrorBanner } from "@/components/ui/Form";
import { normalizeListSort } from "@/lib/list-sort";
import { normalizePage } from "@/lib/pagination";
import { listComunicacoes } from "@/lib/supabase/comunicacoes-server";

type Props = {
  searchParams: Promise<{
    q?: string;
    tipo?: string;
    status?: string;
    page?: string;
    sort?: string;
    dir?: string;
  }>;
};

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-8 w-full max-w-md animate-pulse rounded bg-panel-hover" />
      <div className="h-48 animate-pulse rounded border border-border bg-panel-soft" />
      <p className="text-sm text-muted">Carregando comunicações…</p>
    </div>
  );
}

async function Content({
  q,
  tipo,
  status,
  page,
  sort,
  dir,
}: {
  q?: string;
  tipo?: string;
  status?: string;
  page?: string;
  sort?: string;
  dir?: string;
}) {
  const order = normalizeListSort("comunicacoes", sort, dir);
  const { data, total, page: currentPage, pageSize, error } =
    await listComunicacoes({
      q,
      tipo,
      status,
      page: normalizePage(page),
      sort: order.sort,
      dir: order.dir,
    });
  return (
    <>
      {error ? (
        <ErrorBanner>
          {error}{" "}
          <Link href="/login" className="font-medium underline">
            Ir para login
          </Link>
        </ErrorBanner>
      ) : null}
      <Suspense fallback={null}>
        <ComunicacoesFilters total={total} />
      </Suspense>
      <ComunicacoesTable
        comunicacoes={data}
        total={total}
        page={currentPage}
        pageSize={pageSize}
        sort={order.sort}
        dir={order.dir}
      />
    </>
  );
}

export default async function ComunicacoesPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <DashboardShell
      title="Comunicações"
      actions={
        <Link
          href="/comunicacoes/nova"
          className="btn-acao"
        >
          Nova Comunicação
        </Link>
      }
    >
      <Suspense fallback={<LoadingSkeleton />}>
        <Content
          q={params.q}
          tipo={params.tipo}
          status={params.status}
          page={params.page}
          sort={params.sort}
          dir={params.dir}
        />
      </Suspense>
    </DashboardShell>
  );
}
