import Link from "next/link";
import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { EnderecosFilters, EnderecosTable } from "@/components/enderecos/EnderecosTable";
import { ErrorBanner } from "@/components/ui/Form";
import { normalizePage } from "@/lib/pagination";
import { listEnderecos } from "@/lib/supabase/enderecos-server";

type Props = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-8 w-full max-w-md animate-pulse rounded bg-panel-hover" />
      <div className="h-48 animate-pulse rounded border border-border bg-panel-soft" />
      <p className="text-sm text-muted">Carregando endereços…</p>
    </div>
  );
}

async function Content({ q, page }: { q?: string; page?: string }) {
  const { data, total, page: currentPage, pageSize, error } = await listEnderecos({
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
        <EnderecosFilters total={total} />
      </Suspense>
      <EnderecosTable
        enderecos={data}
        total={total}
        page={currentPage}
        pageSize={pageSize}
      />
    </>
  );
}

export default async function EnderecosPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <DashboardShell
      title="Endereços"
      actions={
        <Link
          href="/enderecos/novo"
          className="btn-acao"
        >
          Novo endereço
        </Link>
      }
    >
      <Suspense fallback={<LoadingSkeleton />}>
        <Content q={params.q} page={params.page} />
      </Suspense>
    </DashboardShell>
  );
}
