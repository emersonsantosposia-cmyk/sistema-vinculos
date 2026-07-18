import Link from "next/link";
import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ImportarPastaDocumentos } from "@/components/documentos/ImportarPastaDocumentos";
import {
  DocumentosFilters,
  DocumentosTable,
} from "@/components/documentos/DocumentosTable";
import { ErrorBanner } from "@/components/ui/Form";
import { canChooseUnidade } from "@/lib/perfis";
import { getCurrentPerfil } from "@/lib/supabase/perfis-server";
import { listDocumentos } from "@/lib/supabase/documentos-server";

type Props = {
  searchParams: Promise<{ q?: string; tipo?: string; unidade?: string }>;
};

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-8 w-full max-w-md animate-pulse rounded bg-panel-hover" />
      <div className="h-48 animate-pulse rounded border border-border bg-panel-soft" />
      <p className="text-sm text-muted">Carregando documentos…</p>
    </div>
  );
}

async function Content({
  q,
  tipo,
  unidade,
}: {
  q?: string;
  tipo?: string;
  unidade?: string;
}) {
  const { perfil } = await getCurrentPerfil();
  const showUnidadeFilter = canChooseUnidade(perfil);
  const { data, error } = await listDocumentos({
    q,
    tipo,
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
        <DocumentosFilters
          documentos={data}
          showUnidadeFilter={showUnidadeFilter}
        />
      </Suspense>
      <DocumentosTable documentos={data} />
    </>
  );
}

export default async function DocumentosPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <DashboardShell
      title="Documentos"
      actions={
        <>
          <ImportarPastaDocumentos />
          <Link
            href="/documentos/novo"
            className="btn-acao"
          >
            Novo Documento
          </Link>
        </>
      }
    >
      <Suspense fallback={<LoadingSkeleton />}>
        <Content q={params.q} tipo={params.tipo} unidade={params.unidade} />
      </Suspense>
    </DashboardShell>
  );
}
