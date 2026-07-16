import Link from "next/link";
import { notFound } from "next/navigation";
import { ComunicacaoForm } from "@/components/comunicacoes/ComunicacaoForm";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ErrorBanner } from "@/components/ui/Form";
import { getComunicacaoById } from "@/lib/supabase/comunicacoes-server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarComunicacaoPage({ params }: Props) {
  const { id } = await params;
  const { data: comunicacao, error } = await getComunicacaoById(id);

  if (error) {
    return (
      <DashboardShell
        title="Editar comunicação"
        actions={
          <Link
            href={`/comunicacoes/${id}`}
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

  if (!comunicacao) notFound();

  return (
    <DashboardShell
      title="Editar comunicação"
      actions={
        <Link
          href={`/comunicacoes/${id}`}
          className="btn-acao-secundario"
        >
          Voltar ao detalhe
        </Link>
      }
    >
      <ComunicacaoForm initial={comunicacao} />
    </DashboardShell>
  );
}
