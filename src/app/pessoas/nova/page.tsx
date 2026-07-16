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
          className="btn-acao-secundario"
        >
          Voltar
        </Link>
      }
    >
      <PessoaForm />
    </DashboardShell>
  );
}
