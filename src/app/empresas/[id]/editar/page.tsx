import Link from "next/link";
import { notFound } from "next/navigation";
import { EmpresaForm } from "@/components/empresas/EmpresaForm";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ErrorBanner } from "@/components/ui/Form";
import { getEmpresaById } from "@/lib/supabase/empresas-server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarEmpresaPage({ params }: Props) {
  const { id } = await params;
  const { data: empresa, error } = await getEmpresaById(id);

  if (error) {
    return (
      <DashboardShell
        title="Editar empresa"
        actions={
          <Link
            href={`/empresas/${id}`}
            className="inline-flex h-8 items-center rounded border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Voltar ao detalhe
          </Link>
        }
      >
        <ErrorBanner>
          {error}{" "}
          <Link href="/login" className="font-medium underline">
            Ir para login
          </Link>
        </ErrorBanner>
      </DashboardShell>
    );
  }

  if (!empresa) notFound();

  return (
    <DashboardShell
      title="Editar empresa"
      actions={
        <Link
          href={`/empresas/${id}`}
          className="inline-flex h-8 items-center rounded border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Voltar ao detalhe
        </Link>
      }
    >
      <EmpresaForm initial={empresa} />
    </DashboardShell>
  );
}
