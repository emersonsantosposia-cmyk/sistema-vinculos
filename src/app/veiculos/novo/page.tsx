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
          className="btn-acao-secundario"
        >
          Voltar
        </Link>
      }
    >
      <VeiculoForm />
    </DashboardShell>
  );
}
