import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { CadastroMeta } from "@/components/shared/CadastroMeta";
import { OrcrimDeleteButton } from "@/components/shared/EntityDeletes";
import { ObservacoesTimeline } from "@/components/shared/ObservacoesTimeline";
import { VinculosDiagramPanel } from "@/components/shared/VinculosDiagramPanel";
import { VinculosSection } from "@/components/shared/VinculosSection";
import { ErrorBanner, Panel } from "@/components/ui/Form";
import { getOrcrimById } from "@/lib/supabase/orcrims-server";

type Props = {
  params: Promise<{ id: string }>;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground whitespace-pre-wrap">
        {value}
      </dd>
    </div>
  );
}

export default async function OrcrimDetailPage({ params }: Props) {
  const { id } = await params;
  const { data: orcrim, error } = await getOrcrimById(id);

  if (error) {
    return (
      <DashboardShell title="Orcrim">
        <ErrorBanner>
          {error}{" "}
          <Link href="/login" className="font-medium underline">
            Ir para login
          </Link>
        </ErrorBanner>
      </DashboardShell>
    );
  }

  if (!orcrim) notFound();

  return (
    <DashboardShell
      title="Orcrim"
      actions={
        <div className="flex items-center gap-2">
          <Link href={`/orcrims/${orcrim.id}/editar`} className="btn-acao">
            Editar
          </Link>
          <OrcrimDeleteButton id={orcrim.id} />
          <Link href="/orcrims" className="btn-acao-secundario">
            Voltar à lista
          </Link>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <Panel title="Dados cadastrais">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome" value={orcrim.nome} />
              <Field label="Sigla" value={orcrim.sigla || "—"} />
              <Field
                label="Estado de origem"
                value={orcrim.estado_origem || "—"}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Descrição"
                  value={orcrim.descricao || "—"}
                />
              </div>
              <CadastroMeta
                dataCadastro={orcrim.data_cadastro}
                usuarioCadastroId={orcrim.usuario_cadastro}
              />
            </dl>
          </Panel>
          <VinculosDiagramPanel entidadeTipo="orcrim" entidadeId={orcrim.id} />

          <Panel title="Vínculos">
            <VinculosSection entidadeTipo="orcrim" entidadeId={orcrim.id} />
          </Panel>
        </div>
        <div>
          <Panel title="Observações">
            <ObservacoesTimeline
              entidadeTipo="orcrim"
              entidadeId={orcrim.id}
            />
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}
