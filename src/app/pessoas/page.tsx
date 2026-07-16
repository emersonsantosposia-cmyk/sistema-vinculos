import Link from "next/link";
import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PessoasLista } from "@/components/pessoas/PessoasTable";
import { ErrorBanner } from "@/components/ui/Form";
import { listPessoas } from "@/lib/supabase/pessoas-server";

type Props = {
  searchParams: Promise<{ q?: string; tipo?: string }>;
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
}: {
  q?: string;
  tipo?: string;
}) {
  const { data, error } = await listPessoas({ q, tipo });

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
        <PessoasLista pessoas={data} />
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
        <PessoasContent q={params.q} tipo={params.tipo} />
      </Suspense>
    </DashboardShell>
  );
}
