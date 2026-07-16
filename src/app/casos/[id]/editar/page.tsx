import Link from "next/link";
import { notFound } from "next/navigation";
import { CasoForm } from "@/components/casos/CasoForm";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ErrorBanner } from "@/components/ui/Form";
import { getCasoById } from "@/lib/supabase/casos-server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarCasoPage({ params }: Props) {
  const { id } = await params;
  const { data: caso, error } = await getCasoById(id);

  if (error) {
    return (
      <DashboardShell
        title="Editar caso"
        actions={
          <Link
            href={`/casos/${id}`}
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

  if (!caso) notFound();

  return (
    <DashboardShell
      title="Editar caso"
      actions={
        <Link
          href={`/casos/${id}`}
          className="btn-acao-secundario"
        >
          Voltar ao detalhe
        </Link>
      }
    >
      <CasoForm initial={caso} />
    </DashboardShell>
  );
}
