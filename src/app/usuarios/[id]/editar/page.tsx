import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { UsuarioForm } from "@/components/usuarios/UsuarioForm";
import { ErrorBanner } from "@/components/ui/Form";
import {
  getCurrentPerfil,
  getPerfilById,
} from "@/lib/supabase/perfis-server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarUsuarioPage({ params }: Props) {
  const { perfil, userId } = await getCurrentPerfil();
  if (!userId) redirect("/login?next=/usuarios");
  if (!perfil?.ativo || perfil.role !== "administrador") {
    redirect("/");
  }

  const { id } = await params;
  const { data, error } = await getPerfilById(id);

  if (error) {
    return (
      <DashboardShell
        title="Editar usuário"
        actions={
          <Link href="/usuarios" className="btn-acao-secundario">
            Voltar à lista
          </Link>
        }
      >
        <ErrorBanner>{error}</ErrorBanner>
      </DashboardShell>
    );
  }

  if (!data) notFound();

  return (
    <DashboardShell
      title="Editar usuário"
      actions={
        <Link href="/usuarios" className="btn-acao-secundario">
          Voltar à lista
        </Link>
      }
    >
      <UsuarioForm initial={data} />
    </DashboardShell>
  );
}
