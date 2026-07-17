import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { UsuarioForm } from "@/components/usuarios/UsuarioForm";
import { getCurrentPerfil } from "@/lib/supabase/perfis-server";

export default async function NovoUsuarioPage() {
  const { perfil, userId } = await getCurrentPerfil();
  if (!userId) redirect("/login?next=/usuarios/novo");
  if (!perfil?.ativo || perfil.role !== "administrador") {
    redirect("/");
  }

  return (
    <DashboardShell
      title="Novo usuário"
      actions={
        <Link href="/usuarios" className="btn-acao-secundario">
          Voltar à lista
        </Link>
      }
    >
      <UsuarioForm />
    </DashboardShell>
  );
}
