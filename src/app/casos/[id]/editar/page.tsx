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

  if (!caso) notFound();

  return (
    <DashboardShell
      title="Editar caso"
      actions={
        <Link
          href={`/casos/${id}`}
          className="inline-flex h-8 items-center rounded border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Voltar ao detalhe
        </Link>
      }
    >
      <CasoForm initial={caso} />
    </DashboardShell>
  );
}
