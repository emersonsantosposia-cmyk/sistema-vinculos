import Link from "next/link";
import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PessoasLista } from "@/components/pessoas/PessoasTable";
import { ErrorBanner } from "@/components/ui/Form";
import { normalizePage } from "@/lib/pagination";
import { listPessoas } from "@/lib/supabase/pessoas-server";

type Props = {
  searchParams: Promise<{ q?: string; tipo?: string; page?: string }>;
};

function PessoasLoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-8 w-full max-w-md animate-pulse rounded bg-panel-hover" />
      <div className="h-48 animate-pulse rounded border border-border bg-panel-soft" />
      <p className="text-sm text-muted">Carregando pessoas…</p>
    </div>
  );
}

async function PessoasContent({
  q,
  tipo,
  page,
}: {
  q?: string;
  tipo?: string;
  page?: string;
}) {
  const { data, total, page: currentPage, pageSize, error } = await listPessoas({
    q,
    tipo,
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
        <PessoasLista
          pessoas={data}
          total={total}
          page={currentPage}
          pageSize={pageSize}
        />
      </Suspense>
    </>
  );
}

export default async function PessoasPage({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <DashboardShell
      title="Pessoas"
      actions={
        <Link
          href="/pessoas/nova"
          className="btn-acao"
        >
          Nova Pessoa
        </Link>
      }
    >
      <Suspense fallback={<PessoasLoadingSkeleton />}>
        <PessoasContent q={params.q} tipo={params.tipo} page={params.page} />
      </Suspense>
    </DashboardShell>
  );
}
