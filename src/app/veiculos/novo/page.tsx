import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { VeiculoForm } from "@/components/veiculos/VeiculoForm";

export default function NovoVeiculoPage() {
  return (
    <DashboardShell
      title="Novo Veículo"
      actions={
        <Link
          href="/veiculos"
          className="inline-flex h-8 items-center rounded border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Voltar
        </Link>
      }
    >
      <VeiculoForm />
    </DashboardShell>
  );
}
