import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import {
  UsuariosFilters,
  UsuariosTable,
} from "@/components/usuarios/UsuariosTable";
import { ErrorBanner } from "@/components/ui/Form";
import {
  getCurrentPerfil,
  listPerfis,
} from "@/lib/supabase/perfis-server";

type Props = {
  searchParams: Promise<{
    q?: string;
    unidade?: string;
    status?: string;
  }>;
};

export default async function UsuariosPage({ searchParams }: Props) {
  const { perfil, userId } = await getCurrentPerfil();
  if (!userId) redirect("/login?next=/usuarios");
  if (!perfil?.ativo || perfil.role !== "administrador") {
    redirect("/");
  }

  const params = await searchParams;
  const statusRaw = params.status;
  const status =
    statusRaw === "ativo" || statusRaw === "inativo" || statusRaw === "todos"
      ? statusRaw
      : "todos";

  const { data, error } = await listPerfis({
    q: params.q,
    unidade: params.unidade,
    status,
  });

  return (
    <DashboardShell
      title="Usuários"
      actions={
        <Link href="/usuarios/novo" className="btn-acao">
          Novo usuário
        </Link>
      }
    >
      {error ? (
        <ErrorBanner>
          {error}{" "}
          <Link href="/login" className="font-medium underline">
            Ir para login
          </Link>
        </ErrorBanner>
      ) : null}

      <Suspense fallback={null}>
        <UsuariosFilters />
      </Suspense>

      <UsuariosTable usuarios={data} currentUserId={userId} />
    </DashboardShell>
  );
}
