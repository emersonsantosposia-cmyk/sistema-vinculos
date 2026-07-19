import Link from "next/link";
import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import {
  OrcrimsFilters,
  OrcrimsTable,
} from "@/components/orcrims/OrcrimsTable";
import { ErrorBanner } from "@/components/ui/Form";
import { normalizePage } from "@/lib/pagination";
import { listOrcrims } from "@/lib/supabase/orcrims-server";

type Props = {
  searchParams: Promise<{ q?: string; estado?: string; page?: string }>;
};

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-8 w-full max-w-md animate-pulse rounded bg-panel-hover" />
      <div className="h-48 animate-pulse rounded border border-border bg-panel-soft" />
      <p className="text-sm text-muted">Carregando orcrims…</p>
    </div>
  );
}

async function Content({
  q,
  estado,
  page,
}: {
  q?: string;
  estado?: string;
  page?: string;
}) {
  const { data, total, page: currentPage, pageSize, error } = await listOrcrims({
    q,
    estado,
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
        <OrcrimsFilters total={total} />
      </Suspense>
      <OrcrimsTable
        orcrims={data}
        total={total}
        page={currentPage}
        pageSize={pageSize}
      />
    </>
  );
}

export default async function OrcrimsPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <DashboardShell
      title="Orcrims"
      actions={
        <Link href="/orcrims/novo" className="btn-acao">
          Nova Orcrim
        </Link>
      }
    >
      <Suspense fallback={<LoadingSkeleton />}>
        <Content q={params.q} estado={params.estado} page={params.page} />
      </Suspense>
    </DashboardShell>
  );
}
