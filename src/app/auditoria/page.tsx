import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  AuditoriaFilters,
  AuditoriaTable,
} from "@/components/auditoria/AuditoriaTable";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ErrorBanner } from "@/components/ui/Form";
import { getCurrentPerfil } from "@/lib/supabase/perfis-server";
import {
  listAuditoria,
  listUsuariosFiltroAuditoria,
} from "@/lib/supabase/auditoria-server";

type Props = {
  searchParams: Promise<{
    usuario?: string;
    tabela?: string;
    acao?: string;
    de?: string;
    ate?: string;
    page?: string;
  }>;
};

export default async function AuditoriaPage({ searchParams }: Props) {
  const { perfil, userId } = await getCurrentPerfil();
  if (!userId) redirect("/login?next=/auditoria");
  if (!perfil?.ativo || perfil.role !== "administrador") {
    redirect("/");
  }

  const params = await searchParams;
  const pageNum = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1;

  const [{ data, total, pageSize, error }, usuarios] = await Promise.all([
    listAuditoria({
      usuarioId: params.usuario,
      tabela: params.tabela,
      acao: params.acao,
      de: params.de,
      ate: params.ate,
      page,
    }),
    listUsuariosFiltroAuditoria(),
  ]);

  return (
    <DashboardShell title="Auditoria">
      <p className="mb-3 text-xs text-muted">
        Histórico de criações, edições e exclusões no sistema. Clique em uma
        edição para ver o detalhe campo a campo.
      </p>

      {error ? (
        <ErrorBanner>
          {error}{" "}
          <Link href="/login" className="font-medium underline">
            Ir para login
          </Link>
        </ErrorBanner>
      ) : null}

      <Suspense fallback={null}>
        <AuditoriaFilters usuarios={usuarios} />
      </Suspense>

      <AuditoriaTable
        rows={data}
        total={total}
        page={page}
        pageSize={pageSize}
      />
    </DashboardShell>
  );
}
