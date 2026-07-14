import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { VeiculoForm } from "@/components/veiculos/VeiculoForm";
import { ErrorBanner } from "@/components/ui/Form";
import { getVeiculoById } from "@/lib/supabase/veiculos-server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarVeiculoPage({ params }: Props) {
  const { id } = await params;
  const { data: veiculo, error } = await getVeiculoById(id);

  if (error) {
    return (
      <DashboardShell
        title="Editar veículo"
        actions={
          <Link
            href={`/veiculos/${id}`}
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

  if (!veiculo) notFound();

  return (
    <DashboardShell
      title="Editar veículo"
      actions={
        <Link
          href={`/veiculos/${id}`}
          className="inline-flex h-8 items-center rounded border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Voltar ao detalhe
        </Link>
      }
    >
      <VeiculoForm initial={veiculo} />
    </DashboardShell>
  );
}
