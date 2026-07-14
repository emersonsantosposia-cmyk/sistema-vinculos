import Link from "next/link";
import { Suspense } from "react";
import { CasosFilters, CasosTable } from "@/components/casos/CasosTable";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ErrorBanner } from "@/components/ui/Form";
import { listCasos } from "@/lib/supabase/casos-server";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-8 w-full max-w-md animate-pulse rounded bg-zinc-200" />
      <div className="h-48 animate-pulse rounded border border-border bg-zinc-100" />
      <p className="text-sm text-muted">Carregando casos…</p>
    </div>
  );
}

async function Content({ q }: { q?: string }) {
  const { data, error } = await listCasos({ q });
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
        <CasosFilters casos={data} />
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
          className="inline-flex h-8 items-center rounded bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Novo Caso
        </Link>
      }
    >
      <Suspense fallback={<LoadingSkeleton />}>
        <Content q={params.q} />
      </Suspense>
    </DashboardShell>
  );
}
