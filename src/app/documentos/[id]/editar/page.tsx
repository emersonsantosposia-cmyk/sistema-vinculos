import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DocumentoForm } from "@/components/documentos/DocumentoForm";
import { ErrorBanner } from "@/components/ui/Form";
import { getDocumentoById } from "@/lib/supabase/documentos-server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarDocumentoPage({ params }: Props) {
  const { id } = await params;
  const { data: documento, error } = await getDocumentoById(id);

  if (error) {
    return (
      <DashboardShell
        title="Editar documento"
        actions={
          <Link
            href={`/documentos/${id}`}
            className="btn-acao-secundario"
          >
            Voltar ao detalhe
          </Link>
        }
      >
        <ErrorBanner>
          {error}{" "}
          <Link href="/login" className="font-medium underline">
            Ir para login
          </Link>
        </ErrorBanner>
      </DashboardShell>
    );
  }

  if (!documento) notFound();

  return (
    <DashboardShell
      title="Editar documento"
      actions={
        <Link
          href={`/documentos/${id}`}
          className="btn-acao-secundario"
        >
          Voltar ao detalhe
        </Link>
      }
    >
      <DocumentoForm initial={documento} />
    </DashboardShell>
  );
}
