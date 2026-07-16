import Link from "next/link";
import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ImportarPastaProcedimentos } from "@/components/procedimentos/ImportarPastaProcedimentos";
import {
  ProcedimentosFilters,
  ProcedimentosTable,
} from "@/components/procedimentos/ProcedimentosTable";
import { ErrorBanner } from "@/components/ui/Form";
import { listProcedimentos } from "@/lib/supabase/procedimentos-server";

type Props = {
  searchParams: Promise<{ q?: string; tipo?: string }>;
};

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-8 w-full max-w-md animate-pulse rounded bg-panel-hover" />
      <div className="h-48 animate-pulse rounded border border-border bg-panel-soft" />
      <p className="text-sm text-muted">Carregando procedimentos…</p>
    </div>
  );
}

async function Content({ q, tipo }: { q?: string; tipo?: string }) {
  const { data, error } = await listProcedimentos({ q, tipo });
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
        <ProcedimentosFilters procedimentos={data} />
      </Suspense>
      <ProcedimentosTable procedimentos={data} />
    </>
  );
}

export default async function ProcedimentosPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <DashboardShell
      title="Procedimentos"
      actions={
        <>
          <ImportarPastaProcedimentos />
          <Link
            href="/procedimentos/novo"
            className="btn-acao"
          >
            Novo Procedimento
          </Link>
        </>
      }
    >
      <Suspense fallback={<LoadingSkeleton />}>
        <Content q={params.q} tipo={params.tipo} />
      </Suspense>
    </DashboardShell>
  );
}
