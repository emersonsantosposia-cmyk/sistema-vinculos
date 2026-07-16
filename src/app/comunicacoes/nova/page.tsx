import Link from "next/link";
import { ComunicacaoForm } from "@/components/comunicacoes/ComunicacaoForm";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function NovaComunicacaoPage() {
  return (
    <DashboardShell
      title="Nova Comunicação"
      actions={
        <Link
          href="/comunicacoes"
          className="btn-acao-secundario"
        >
          Voltar
        </Link>
      }
    >
      <ComunicacaoForm />
    </DashboardShell>
  );
}
