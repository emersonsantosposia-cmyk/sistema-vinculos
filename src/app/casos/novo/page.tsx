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
          className="inline-flex h-8 items-center rounded border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Voltar
        </Link>
      }
    >
      <CasoForm />
    </DashboardShell>
  );
}
