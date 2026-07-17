import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { VeiculoDeleteButton } from "@/components/shared/EntityDeletes";
import { ObservacoesTimeline } from "@/components/shared/ObservacoesTimeline";
import { VinculosDiagramPanel } from "@/components/shared/VinculosDiagramPanel";
import { VinculosSection } from "@/components/shared/VinculosSection";
import { ErrorBanner, Panel } from "@/components/ui/Form";
import { VeiculoFoto } from "@/components/veiculos/VeiculoFoto";
import { formatDate, formatPlaca } from "@/lib/format";
import { getVeiculoById } from "@/lib/supabase/veiculos-server";

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

export default async function VeiculoDetailPage({ params }: Props) {
  const { id } = await params;
  const { data: veiculo, error } = await getVeiculoById(id);

  if (error) {
    return (
      <DashboardShell title="Veículo">
        <ErrorBanner>
          {error}{" "}
          <Link href="/login" className="font-medium underline">
            Ir para login
          </Link>
        </ErrorBanner>
      </DashboardShell>
    );
  }

  if (!veiculo) notFound();

  const titulo =
    formatPlaca(veiculo.placa) !== "—"
      ? formatPlaca(veiculo.placa)
      : [veiculo.marca, veiculo.modelo].filter(Boolean).join(" ") ||
        "Veículo sem placa";

  return (
    <DashboardShell
      title={titulo}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href={`/veiculos/${veiculo.id}/editar`}
            className="btn-acao"
          >
            Editar
          </Link>
          <VeiculoDeleteButton id={veiculo.id} />
          <Link
            href="/veiculos"
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
              <Field label="Placa" value={formatPlaca(veiculo.placa)} />
              <Field label="Cor" value={veiculo.cor || "—"} />
              <Field label="Marca" value={veiculo.marca || "—"} />
              <Field label="Modelo" value={veiculo.modelo || "—"} />
              <Field
                label="Ano de fabricação"
                value={
                  veiculo.ano_fabricacao != null
                    ? String(veiculo.ano_fabricacao)
                    : "—"
                }
              />
              <Field
                label="Ano modelo"
                value={
                  veiculo.ano_modelo != null ? String(veiculo.ano_modelo) : "—"
                }
              />
              <Field
                label="Data de cadastro"
                value={formatDate(veiculo.data_cadastro)}
              />
            </dl>
          </Panel>
          <Panel title="Foto ilustrativa">
            <VeiculoFoto
              path={veiculo.foto_url}
              alt={`${veiculo.marca ?? ""} ${veiculo.modelo ?? ""}`.trim()}
            />
          </Panel>
          <VinculosDiagramPanel entidadeTipo="veiculo" entidadeId={veiculo.id} />

          <Panel title="Vínculos">
            <VinculosSection entidadeTipo="veiculo" entidadeId={veiculo.id} />
          </Panel>
        </div>
        <div>
          <Panel title="Observações">
            <ObservacoesTimeline
              entidadeTipo="veiculo"
              entidadeId={veiculo.id}
            />
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}