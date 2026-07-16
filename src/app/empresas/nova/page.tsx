import Link from "next/link";
import { EmpresaForm } from "@/components/empresas/EmpresaForm";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function NovaEmpresaPage() {
  return (
    <DashboardShell
      title="Nova Empresa"
      actions={
        <Link
          href="/empresas"
          className="btn-acao-secundario"
        >
          Voltar
        </Link>
      }
    >
      <EmpresaForm />
    </DashboardShell>
  );
}
