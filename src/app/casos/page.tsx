import Link from "next/link";
import { Suspense } from "react";
import { CasosFilters, CasosTable } from "@/components/casos/CasosTable";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ErrorBanner } from "@/components/ui/Form";
import { canChooseUnidade } from "@/lib/perfis";
import { listCasos } from "@/lib/supabase/casos-server";
import { getCurrentPerfil } from "@/lib/supabase/perfis-server";

type Props = {
  searchParams: Promise<{ q?: string; unidade?: string }>;
};

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-8 w-full max-w-md animate-pulse rounded bg-panel-hover" />
      <div className="h-48 animate-pulse rounded border border-border bg-panel-soft" />
      <p className="text-sm text-muted">Carregando casos…</p>
    </div>
  );
}

async function Content({ q, unidade }: { q?: string; unidade?: string }) {
  const { perfil } = await getCurrentPerfil();
  const showUnidadeFilter = canChooseUnidade(perfil);
  const { data, error } = await listCasos({
    q,
    unidade: showUnidadeFilter ? unidade : undefined,
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
        <CasosFilters casos={data} showUnidadeFilter={showUnidadeFilter} />
      </Suspense>
      <CasosTable casos={data} />
    </>
  );
}

export default async function CasosPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <DashboardShell
      title="Casos"
      actions={
        <Link
          href="/casos/novo"
          className="btn-acao"
        >
          Novo Caso
        </Link>
      }
    >
      <Suspense fallback={<LoadingSkeleton />}>
        <Content q={params.q} unidade={params.unidade} />
      </Suspense>
    </DashboardShell>
  );
}
