import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { EnderecoMapa } from "@/components/enderecos/EnderecoMapa";
import { EnderecoDeleteButton } from "@/components/shared/EntityDeletes";
import { ObservacoesTimeline } from "@/components/shared/ObservacoesTimeline";
import { VinculosSection } from "@/components/shared/VinculosSection";
import { ErrorBanner, Panel } from "@/components/ui/Form";
import { formatCep, formatDate, formatEnderecoResumo } from "@/lib/format";
import { getEnderecoById } from "@/lib/supabase/enderecos-server";

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

export default async function EnderecoDetailPage({ params }: Props) {
  const { id } = await params;
  const { data: endereco, error } = await getEnderecoById(id);

  if (error) {
    return (
      <DashboardShell title="Endereço">
        <ErrorBanner>
          {error}{" "}
          <Link href="/login" className="font-medium underline">
            Ir para login
          </Link>
        </ErrorBanner>
      </DashboardShell>
    );
  }

  if (!endereco) notFound();

  const titulo =
    endereco.nome ||
    formatEnderecoResumo(endereco).split(" — ")[0] ||
    "Endereço sem nome";

  return (
    <DashboardShell
      title={titulo}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href={`/enderecos/${endereco.id}/editar`}
            className="inline-flex h-8 items-center rounded border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Editar
          </Link>
          <EnderecoDeleteButton id={endereco.id} />
          <Link
            href="/enderecos"
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
              <Field label="Nome" value={endereco.nome || "—"} />
              <Field label="CEP" value={formatCep(endereco.cep)} />
              <Field label="Logradouro" value={endereco.logradouro || "—"} />
              <Field label="Número" value={endereco.numero || "—"} />
              <Field label="Bairro" value={endereco.bairro || "—"} />
              <Field label="Complemento" value={endereco.complemento || "—"} />
              <Field label="Cidade" value={endereco.cidade || "—"} />
              <Field label="Estado" value={endereco.estado || "—"} />
              <Field
                label="Latitude"
                value={endereco.latitude != null ? String(endereco.latitude) : "—"}
              />
              <Field
                label="Longitude"
                value={endereco.longitude != null ? String(endereco.longitude) : "—"}
              />
              <Field
                label="Data de cadastro"
                value={formatDate(endereco.data_cadastro)}
              />
            </dl>
          </Panel>
          <Panel title="Mapa">
            <EnderecoMapa
              latitude={endereco.latitude}
              longitude={endereco.longitude}
              label={titulo}
            />
          </Panel>
          <Panel title="Vínculos">
            <VinculosSection entidadeTipo="endereco" entidadeId={endereco.id} />
          </Panel>
        </div>
        <div>
          <Panel title="Observações">
            <ObservacoesTimeline entidadeTipo="endereco" entidadeId={endereco.id} />
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}
