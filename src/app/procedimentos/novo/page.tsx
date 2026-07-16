import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ProcedimentoForm } from "@/components/procedimentos/ProcedimentoForm";

export default function NovoProcedimentoPage() {
  return (
    <DashboardShell
      title="Novo Procedimento"
      actions={
        <Link
          href="/procedimentos"
          className="btn-acao-secundario"
        >
          Voltar
        </Link>
      }
    >
      <ProcedimentoForm />
    </DashboardShell>
  );
}
