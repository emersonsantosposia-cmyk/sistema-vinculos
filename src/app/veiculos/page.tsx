import Link from "next/link";
import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ErrorBanner } from "@/components/ui/Form";
import {
  VeiculosFilters,
  VeiculosTable,
} from "@/components/veiculos/VeiculosTable";
import { listVeiculos } from "@/lib/supabase/veiculos-server";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-8 w-full max-w-md animate-pulse rounded bg-zinc-200" />
      <div className="h-48 animate-pulse rounded border border-border bg-zinc-100" />
      <p className="text-sm text-muted">Carregando veículos…</p>
    </div>
  );
}

async function Content({ q }: { q?: string }) {
  const { data, error } = await listVeiculos({ q });
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
        <VeiculosFilters veiculos={data} />
      </Suspense>
      <VeiculosTable veiculos={data} />
    </>
  );
}

export default async function VeiculosPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <DashboardShell
      title="Veículos"
      actions={
        <Link
          href="/veiculos/novo"
          className="inline-flex h-8 items-center rounded bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Novo Veículo
        </Link>
      }
    >
      <Suspense fallback={<LoadingSkeleton />}>
        <Content q={params.q} />
      </Suspense>
    </DashboardShell>
  );
}
