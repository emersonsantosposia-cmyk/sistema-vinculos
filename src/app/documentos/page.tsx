import Link from "next/link";
import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ImportarPastaDocumentos } from "@/components/documentos/ImportarPastaDocumentos";
import {
  DocumentosFilters,
  DocumentosTable,
} from "@/components/documentos/DocumentosTable";
import { ErrorBanner } from "@/components/ui/Form";
import { normalizeListSort } from "@/lib/list-sort";
import { normalizePage } from "@/lib/pagination";
import { canChooseUnidade } from "@/lib/perfis";
import { getCurrentPerfil } from "@/lib/supabase/perfis-server";
import { listDocumentos } from "@/lib/supabase/documentos-server";

type Props = {
  searchParams: Promise<{
    q?: string;
    tipo?: string;
    unidade?: string;
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
      <p className="text-sm text-muted">Carregando documentos…</p>
    </div>
  );
}

async function Content({
  q,
  tipo,
  unidade,
  page,
  sort,
  dir,
}: {
  q?: string;
  tipo?: string;
  unidade?: string;
  page?: string;
  sort?: string;
  dir?: string;
}) {
  const { perfil } = await getCurrentPerfil();
  const showUnidadeFilter = canChooseUnidade(perfil);
  const order = normalizeListSort("documentos", sort, dir);
  const { data, total, page: currentPage, pageSize, error } = await listDocumentos({
    q,
    tipo,
    unidade: showUnidadeFilter ? unidade : undefined,
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
        <DocumentosFilters
          total={total}
          showUnidadeFilter={showUnidadeFilter}
        />
      </Suspense>
      <DocumentosTable
        documentos={data}
        total={total}
        page={currentPage}
        pageSize={pageSize}
        sort={order.sort}
        dir={order.dir}
      />
    </>
  );
}

export default async function DocumentosPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <DashboardShell
      title="Documentos"
      actions={
        <>
          <ImportarPastaDocumentos />
          <Link
            href="/documentos/novo"
            className="btn-acao"
          >
            Novo Documento
          </Link>
        </>
      }
    >
      <Suspense fallback={<LoadingSkeleton />}>
        <Content
          q={params.q}
          tipo={params.tipo}
          unidade={params.unidade}
          page={params.page}
          sort={params.sort}
          dir={params.dir}
        />
      </Suspense>
    </DashboardShell>
  );
}
