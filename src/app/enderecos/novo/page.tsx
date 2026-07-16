import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { EnderecoForm } from "@/components/enderecos/EnderecoForm";

export default function NovoEnderecoPage() {
  return (
    <DashboardShell
      title="Novo endereço"
      actions={
        <Link
          href="/enderecos"
          className="btn-acao-secundario"
        >
          Voltar
        </Link>
      }
    >
      <EnderecoForm />
    </DashboardShell>
  );
}
