import Link from "next/link";
import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import {
  OrcrimsFilters,
  OrcrimsTable,
} from "@/components/orcrims/OrcrimsTable";
import { ErrorBanner } from "@/components/ui/Form";
import { listOrcrims } from "@/lib/supabase/orcrims-server";

type Props = {
  searchParams: Promise<{ q?: string; estado?: string }>;
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

async function Content({ q, estado }: { q?: string; estado?: string }) {
  const { data, error } = await listOrcrims({ q, estado });
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
        <OrcrimsFilters orcrims={data} />
      </Suspense>
      <OrcrimsTable orcrims={data} />
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
        <Content q={params.q} estado={params.estado} />
      </Suspense>
    </DashboardShell>
  );
}
