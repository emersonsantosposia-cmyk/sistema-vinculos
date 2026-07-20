import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { CadastroMeta } from "@/components/shared/CadastroMeta";
import { ComunicacaoDeleteButton } from "@/components/shared/EntityDeletes";
import { EntidadeDetailLayout } from "@/components/shared/EntidadeDetailLayout";
import { ObservacoesTimeline } from "@/components/shared/ObservacoesTimeline";
import { VinculosDiagramPanel } from "@/components/shared/VinculosDiagramPanel";
import { ErrorBanner, Panel } from "@/components/ui/Form";
import {
  comunicacaoMostraOperadora,
  labelComunicacaoStatus,
  labelComunicacaoTipo,
  labelComunicacaoValor,
} from "@/lib/format";
import { getComunicacaoById } from "@/lib/supabase/comunicacoes-server";

type Props = {
  params: Promise<{ id: string }>;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm whitespace-pre-wrap text-foreground">
        {value}
      </dd>
    </div>
  );
}

export default async function ComunicacaoDetailPage({ params }: Props) {
  const { id } = await params;
  const { data: comunicacao, error } = await getComunicacaoById(id);

  if (error) {
    return (
      <DashboardShell title="Comunicação">
        <ErrorBanner>
          {error}{" "}
          <Link href="/login" className="font-medium underline">
            Ir para login
          </Link>
        </ErrorBanner>
      </DashboardShell>
    );
  }

  if (!comunicacao) notFound();

  return (
    <DashboardShell
      title="Comunicação"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href={`/comunicacoes/${comunicacao.id}/editar`}
            className="btn-acao"
          >
            Editar
          </Link>
          <ComunicacaoDeleteButton id={comunicacao.id} />
          <Link
            href="/comunicacoes"
            className="btn-acao-secundario"
          >
            Voltar à lista
          </Link>
        </div>
      }
    >
      <EntidadeDetailLayout
        entidadeTipo="comunicacao"
        entidadeId={comunicacao.id}
        dados={
          <Panel title="Dados cadastrais">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Tipo"
                value={labelComunicacaoTipo(comunicacao.tipo)}
              />
              <Field
                label="Status"
                value={labelComunicacaoStatus(comunicacao.status)}
              />
              <Field
                label={labelComunicacaoValor(comunicacao.tipo)}
                value={comunicacao.valor}
              />
              {comunicacaoMostraOperadora(comunicacao.tipo) ? (
                <Field
                  label="Operadora/Provedor"
                  value={comunicacao.operadora_provedor || "—"}
                />
              ) : null}
              <Field label="Fonte" value={comunicacao.fonte || "—"} />
              <div className="sm:col-span-2">
                <Field
                  label="Observação geral"
                  value={comunicacao.observacao_geral || "—"}
                />
              </div>
              <CadastroMeta
                dataCadastro={comunicacao.data_cadastro}
                usuarioCadastroId={comunicacao.usuario_cadastro}
              />
            </dl>
          </Panel>
        }
        extras={
          <VinculosDiagramPanel
            entidadeTipo="comunicacao"
            entidadeId={comunicacao.id}
          />
        }
        observacoes={
          <Panel title="Observações">
            <ObservacoesTimeline
              entidadeTipo="comunicacao"
              entidadeId={comunicacao.id}
            />
          </Panel>
        }
      />
    </DashboardShell>
  );
}
