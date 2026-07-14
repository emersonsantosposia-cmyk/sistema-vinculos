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
          className="inline-flex h-8 items-center rounded border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Voltar
        </Link>
      }
    >
      <EmpresaForm />
    </DashboardShell>
  );
}
