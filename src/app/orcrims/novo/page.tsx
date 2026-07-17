import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { OrcrimForm } from "@/components/orcrims/OrcrimForm";

export default function NovaOrcrimPage() {
  return (
    <DashboardShell
      title="Nova Orcrim"
      actions={
        <Link href="/orcrims" className="btn-acao-secundario">
          Voltar
        </Link>
      }
    >
      <OrcrimForm />
    </DashboardShell>
  );
}
