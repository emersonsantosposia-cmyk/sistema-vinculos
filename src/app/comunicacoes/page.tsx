import Link from "next/link";
import { Suspense } from "react";
import {
  ComunicacoesFilters,
  ComunicacoesTable,
} from "@/components/comunicacoes/ComunicacoesTable";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ErrorBanner } from "@/components/ui/Form";
import { listComunicacoes } from "@/lib/supabase/comunicacoes-server";

type Props = {
  searchParams: Promise<{ q?: string; tipo?: string; status?: string }>;
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
}: {
  q?: string;
  tipo?: string;
  status?: string;
}) {
  const { data, error } = await listComunicacoes({ q, tipo, status });
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
        <ComunicacoesFilters comunicacoes={data} />
      </Suspense>
      <ComunicacoesTable comunicacoes={data} />
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
        <Content q={params.q} tipo={params.tipo} status={params.status} />
      </Suspense>
    </DashboardShell>
  );
}
