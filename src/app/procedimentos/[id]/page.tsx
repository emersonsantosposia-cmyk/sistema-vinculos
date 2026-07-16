import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ProcedimentoDeleteButton } from "@/components/shared/EntityDeletes";
import { ObservacoesTimeline } from "@/components/shared/ObservacoesTimeline";
import { VinculosSection } from "@/components/shared/VinculosSection";
import { ErrorBanner, Panel } from "@/components/ui/Form";
import { formatDate, labelProcedimentoTipo } from "@/lib/format";
import { getProcedimentoById } from "@/lib/supabase/procedimentos-server";

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

export default async function ProcedimentoDetailPage({ params }: Props) {
  const { id } = await params;
  const { data: procedimento, error } = await getProcedimentoById(id);

  if (error) {
    return (
      <DashboardShell title="Procedimento">
        <ErrorBanner>
          {error}{" "}
          <Link href="/login" className="font-medium underline">
            Ir para login
          </Link>
        </ErrorBanner>
      </DashboardShell>
    );
  }

  if (!procedimento) notFound();

  return (
    <DashboardShell
      title="Procedimento"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href={`/procedimentos/${procedimento.id}/editar`}
            className="btn-acao"
          >
            Editar
          </Link>
          <ProcedimentoDeleteButton id={procedimento.id} />
          <Link
            href="/procedimentos"
            className="btn-acao-secundario"
          >
            Voltar à lista
          </Link>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <Panel title="Dados cadastrais">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Tipo"
                value={labelProcedimentoTipo(procedimento.tipo)}
              />
              <Field
                label="Data"
                value={
                  procedimento.data
                    ? formatDate(`${procedimento.data}T12:00:00`)
                    : "—"
                }
              />
              <div className="sm:col-span-2">
                <Field label="Nome" value={procedimento.nome || "—"} />
              </div>
              <div className="sm:col-span-2">
                <Field label="Resumo">
                  <p className="whitespace-pre-wrap">
                    {procedimento.resumo || "—"}
                  </p>
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Link do CRONOS">
                  {procedimento.link_cronos ? (
                    <a
                      href={procedimento.link_cronos}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all underline-offset-2 hover:underline"
                    >
                      {procedimento.link_cronos}
                    </a>
                  ) : (
                    "—"
                  )}
                </Field>
              </div>
              <Field
                label="Data de cadastro"
                value={formatDate(procedimento.data_cadastro)}
              />
            </dl>
          </Panel>
          <Panel title="Vínculos">
            <VinculosSection
              entidadeTipo="procedimento"
              entidadeId={procedimento.id}
            />
          </Panel>
        </div>
        <div>
          <Panel title="Observações">
            <ObservacoesTimeline
              entidadeTipo="procedimento"
              entidadeId={procedimento.id}
            />
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}