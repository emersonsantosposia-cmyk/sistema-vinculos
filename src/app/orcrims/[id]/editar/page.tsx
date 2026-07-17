import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { OrcrimForm } from "@/components/orcrims/OrcrimForm";
import { ErrorBanner } from "@/components/ui/Form";
import { getOrcrimById } from "@/lib/supabase/orcrims-server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarOrcrimPage({ params }: Props) {
  const { id } = await params;
  const { data: orcrim, error } = await getOrcrimById(id);

  if (error) {
    return (
      <DashboardShell
        title="Editar orcrim"
        actions={
          <Link href={`/orcrims/${id}`} className="btn-acao-secundario">
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

  if (!orcrim) notFound();

  return (
    <DashboardShell
      title="Editar orcrim"
      actions={
        <Link href={`/orcrims/${id}`} className="btn-acao-secundario">
          Voltar ao detalhe
        </Link>
      }
    >
      <OrcrimForm initial={orcrim} />
    </DashboardShell>
  );
}
