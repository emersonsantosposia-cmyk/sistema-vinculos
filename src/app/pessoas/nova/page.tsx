import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PessoaForm } from "@/components/pessoas/PessoaForm";

export default function NovaPessoaPage() {
  return (
    <DashboardShell
      title="Nova Pessoa"
      actions={
        <Link
          href="/pessoas"
          className="inline-flex h-8 items-center rounded border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Voltar
        </Link>
      }
    >
      <PessoaForm />
    </DashboardShell>
  );
}
