import Link from "next/link";
import { Suspense } from "react";
import {
  EmpresasFilters,
  EmpresasTable,
} from "@/components/empresas/EmpresasTable";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ErrorBanner } from "@/components/ui/Form";
import { normalizePage } from "@/lib/pagination";
import { listEmpresas } from "@/lib/supabase/empresas-server";

type Props = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-8 w-full max-w-md animate-pulse rounded bg-panel-hover" />
      <div className="h-48 animate-pulse rounded border border-border bg-panel-soft" />
      <p className="text-sm text-muted">Carregando empresas…</p>
    </div>
  );
}

async function Content({ q, page }: { q?: string; page?: string }) {
  const { data, total, page: currentPage, pageSize, error } = await listEmpresas({
    q,
    page: normalizePage(page),
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
        <EmpresasFilters total={total} />
      </Suspense>
      <EmpresasTable
        empresas={data}
        total={total}
        page={currentPage}
        pageSize={pageSize}
      />
    </>
  );
}

export default async function EmpresasPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <DashboardShell
      title="Empresas"
      actions={
        <Link href="/empresas/nova" className="btn-acao">
          Nova Empresa
        </Link>
      }
    >
      <Suspense fallback={<LoadingSkeleton />}>
        <Content q={params.q} page={params.page} />
      </Suspense>
    </DashboardShell>
  );
}
