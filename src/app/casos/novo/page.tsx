import Link from "next/link";
import { CasoForm } from "@/components/casos/CasoForm";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function NovoCasoPage() {
  return (
    <DashboardShell
      title="Novo Caso"
      actions={
        <Link
          href="/casos"
          className="btn-acao-secundario"
        >
          Voltar
        </Link>
      }
    >
      <CasoForm />
    </DashboardShell>
  );
}
