import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { EmpresaDeleteButton } from "@/components/shared/EntityDeletes";
import { ObservacoesTimeline } from "@/components/shared/ObservacoesTimeline";
import { VinculosSection } from "@/components/shared/VinculosSection";
import { ErrorBanner, Panel } from "@/components/ui/Form";
import { formatCnpj, formatDate } from "@/lib/format";
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
      <dd className="mt-0.5 text-sm text-zinc-900">{value}</dd>
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

  const titulo = empresa.nome_fantasia || empresa.razao_social;

  return (
    <DashboardShell
      title={titulo}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href={`/empresas/${empresa.id}/editar`}
            className="inline-flex h-8 items-center rounded border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Editar
          </Link>
          <EmpresaDeleteButton id={empresa.id} />
          <Link
            href="/empresas"
            className="inline-flex h-8 items-center rounded border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
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
                label="Nome fantasia"
                value={empresa.nome_fantasia || "—"}
              />
              <Field label="Razão social" value={empresa.razao_social} />
              <Field label="CNPJ" value={formatCnpj(empresa.cnpj)} />
              <Field
                label="CNAE principal"
                value={empresa.cnae_principal || "—"}
              />
              <Field
                label="Data de cadastro"
                value={formatDate(empresa.data_cadastro)}
              />
            </dl>
          </Panel>
          <Panel title="Vínculos">
            <VinculosSection entidadeTipo="empresa" entidadeId={empresa.id} />
          </Panel>
        </div>
        <div>
          <Panel title="Observações">
            <ObservacoesTimeline
              entidadeTipo="empresa"
              entidadeId={empresa.id}
            />
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}
