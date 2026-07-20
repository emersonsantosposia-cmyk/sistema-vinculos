import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { CadastroMeta } from "@/components/shared/CadastroMeta";
import { EmpresaDeleteButton } from "@/components/shared/EntityDeletes";
import { EntidadeDetailLayout } from "@/components/shared/EntidadeDetailLayout";
import { ObservacoesTimeline } from "@/components/shared/ObservacoesTimeline";
import { VinculosDiagramPanel } from "@/components/shared/VinculosDiagramPanel";
import { ErrorBanner, Panel } from "@/components/ui/Form";
import { formatCnpj } from "@/lib/format";
import { getEmpresaById } from "@/lib/supabase/empresas-server";

type Props = {
  params: Promise<{ id: string }>;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}

export default async function EmpresaDetailPage({ params }: Props) {
  const { id } = await params;
  const { data: empresa, error } = await getEmpresaById(id);

  if (error) {
    return (
      <DashboardShell title="Empresa">
        <ErrorBanner>
          {error}{" "}
          <Link href="/login" className="font-medium underline">
            Ir para login
          </Link>
        </ErrorBanner>
      </DashboardShell>
    );
  }

  if (!empresa) notFound();

  return (
    <DashboardShell
      title="Empresa"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href={`/empresas/${empresa.id}/editar`}
            className="btn-acao"
          >
            Editar
          </Link>
          <EmpresaDeleteButton id={empresa.id} />
          <Link
            href="/empresas"
            className="btn-acao-secundario"
          >
            Voltar à lista
          </Link>
        </div>
      }
    >
      <EntidadeDetailLayout
        entidadeTipo="empresa"
        entidadeId={empresa.id}
        dados={
          <Panel title="Dados cadastrais">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Nome fantasia"
                value={empresa.nome_fantasia || "—"}
              />
              <Field label="Razão social" value={empresa.razao_social} />
              <Field label="CNPJ" value={formatCnpj(empresa.cnpj)} />
              <Field
                label="CNAE principal"
                value={empresa.cnae_principal || "—"}
              />
              <CadastroMeta
                dataCadastro={empresa.data_cadastro}
                usuarioCadastroId={empresa.usuario_cadastro}
              />
            </dl>
          </Panel>
        }
        extras={
          <VinculosDiagramPanel entidadeTipo="empresa" entidadeId={empresa.id} />
        }
        observacoes={
          <Panel title="Observações">
            <ObservacoesTimeline
              entidadeTipo="empresa"
              entidadeId={empresa.id}
            />
          </Panel>
        }
      />
    </DashboardShell>
  );
}
