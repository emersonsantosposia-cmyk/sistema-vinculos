import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ProcedimentoForm } from "@/components/procedimentos/ProcedimentoForm";
import { ErrorBanner } from "@/components/ui/Form";
import { getProcedimentoById } from "@/lib/supabase/procedimentos-server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarProcedimentoPage({ params }: Props) {
  const { id } = await params;
  const { data: procedimento, error } = await getProcedimentoById(id);

  if (error) {
    return (
      <DashboardShell
        title="Editar procedimento"
        actions={
          <Link
            href={`/procedimentos/${id}`}
            className="btn-acao-secundario"
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

  if (!procedimento) notFound();

  return (
    <DashboardShell
      title="Editar procedimento"
      actions={
        <Link
          href={`/procedimentos/${id}`}
          className="btn-acao-secundario"
        >
          Voltar ao detalhe
        </Link>
      }
    >
      <ProcedimentoForm initial={procedimento} />
    </DashboardShell>
  );
}
