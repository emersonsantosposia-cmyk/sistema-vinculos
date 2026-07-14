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
          className="inline-flex h-8 items-center rounded border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Voltar
        </Link>
      }
    >
      <ProcedimentoForm />
    </DashboardShell>
  );
}
