import Link from "next/link";
import { EnderecoForm } from "@/components/enderecos/EnderecoForm";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ErrorBanner } from "@/components/ui/Form";
import { getEnderecoById } from "@/lib/supabase/enderecos-server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarEnderecoPage({ params }: Props) {
  const { id } = await params;
  const { data: endereco, error } = await getEnderecoById(id);

  if (error) {
    return (
      <DashboardShell
        title="Editar endereço"
        actions={
          <Link
            href={`/enderecos/${id}`}
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

  if (!endereco) {
    return (
      <DashboardShell
        title="Editar endereço"
        actions={
          <Link href="/enderecos" className="btn-acao-secundario">
            Voltar à lista
          </Link>
        }
      >
        <ErrorBanner>
          Não foi possível carregar este endereço para edição.{" "}
          <Link href={`/enderecos/${id}`} className="font-medium underline">
            Voltar ao detalhe
          </Link>
        </ErrorBanner>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Editar endereço"
      actions={
        <Link
          href={`/enderecos/${id}`}
          className="btn-acao-secundario"
        >
          Voltar ao detalhe
        </Link>
      }
    >
      <EnderecoForm initial={endereco} />
    </DashboardShell>
  );
}
