import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PessoaForm } from "@/components/pessoas/PessoaForm";
import { ErrorBanner } from "@/components/ui/Form";
import { getPessoaById } from "@/lib/supabase/pessoas-server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarPessoaPage({ params }: Props) {
  const { id } = await params;
  const { data, error } = await getPessoaById(id);

  if (error) {
    return (
      <DashboardShell
        title="Editar pessoa"
        actions={
          <Link
            href={`/pessoas/${id}`}
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

  if (!data) notFound();

  return (
    <DashboardShell
      title="Editar pessoa"
      actions={
        <Link
          href={`/pessoas/${id}`}
          className="btn-acao-secundario"
        >
          Voltar ao detalhe
        </Link>
      }
    >
      <PessoaForm initial={data} />
    </DashboardShell>
  );
}
