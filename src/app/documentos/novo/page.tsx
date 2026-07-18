import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DocumentoForm } from "@/components/documentos/DocumentoForm";

export default function NovoDocumentoPage() {
  return (
    <DashboardShell
      title="Novo Documento"
      actions={
        <Link
          href="/documentos"
          className="btn-acao-secundario"
        >
          Voltar
        </Link>
      }
    >
      <DocumentoForm />
    </DashboardShell>
  );
}
