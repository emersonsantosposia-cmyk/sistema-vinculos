import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { CadastroMeta } from "@/components/shared/CadastroMeta";
import { DocumentoDeleteButton } from "@/components/shared/EntityDeletes";
import { EntidadeDetailLayout } from "@/components/shared/EntidadeDetailLayout";
import { ObservacoesTimeline } from "@/components/shared/ObservacoesTimeline";
import { EnderecosMapaPanel } from "@/components/shared/EnderecosMapaPanel";
import { VinculosDiagramPanel } from "@/components/shared/VinculosDiagramPanel";
import { ErrorBanner, Panel } from "@/components/ui/Form";
import { formatDate, labelDocumentoTipo } from "@/lib/format";
import { getDocumentoById } from "@/lib/supabase/documentos-server";

type Props = {
  params: Promise<{ id: string }>;
};

function Field({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground">
        {children ?? value ?? "—"}
      </dd>
    </div>
  );
}

export default async function DocumentoDetailPage({ params }: Props) {
  const { id } = await params;
  const { data: documento, error } = await getDocumentoById(id);

  if (error) {
    return (
      <DashboardShell title="Documento">
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
      title="Documento"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href={`/documentos/${documento.id}/editar`}
            className="btn-acao"
          >
            Editar
          </Link>
          <DocumentoDeleteButton id={documento.id} />
          <Link
            href="/documentos"
            className="btn-acao-secundario"
          >
            Voltar à lista
          </Link>
        </div>
      }
    >
      <EntidadeDetailLayout
        entidadeTipo="documento"
        entidadeId={documento.id}
        dados={
          <Panel title="Dados cadastrais">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label="Unidade" value={documento.unidade || "—"} />
              <Field
                label="Tipo"
                value={labelDocumentoTipo(documento.tipo)}
              />
              <Field
                label="Data"
                value={
                  documento.data
                    ? formatDate(`${documento.data}T12:00:00`)
                    : "—"
                }
              />
              <div className="sm:col-span-2">
                <Field label="Nome" value={documento.nome || "—"} />
              </div>
              <div className="sm:col-span-2">
                <Field label="Resumo">
                  <p className="whitespace-pre-wrap">
                    {documento.resumo || "—"}
                  </p>
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Link do CRONOS">
                  {documento.link_cronos ? (
                    <a
                      href={documento.link_cronos}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all underline-offset-2 hover:underline"
                    >
                      {documento.link_cronos}
                    </a>
                  ) : (
                    "—"
                  )}
                </Field>
              </div>
              <CadastroMeta
                dataCadastro={documento.data_cadastro}
                usuarioCadastroId={documento.usuario_cadastro}
              />
            </dl>
          </Panel>
        }
        extras={
          <div className="space-y-3">
            <VinculosDiagramPanel
              entidadeTipo="documento"
              entidadeId={documento.id}
            />
            <EnderecosMapaPanel
              raizTipo="documento"
              raizId={documento.id}
            />
          </div>
        }
        observacoes={
          <Panel title="Observações">
            <ObservacoesTimeline
              entidadeTipo="documento"
              entidadeId={documento.id}
            />
          </Panel>
        }
      />
    </DashboardShell>
  );
}
