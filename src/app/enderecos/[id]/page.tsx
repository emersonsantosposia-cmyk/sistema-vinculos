import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { EnderecoMapa } from "@/components/enderecos/EnderecoMapa";
import { CadastroMeta } from "@/components/shared/CadastroMeta";
import { EnderecoDeleteButton } from "@/components/shared/EntityDeletes";
import { EntidadeDetailLayout } from "@/components/shared/EntidadeDetailLayout";
import { ObservacoesTimeline } from "@/components/shared/ObservacoesTimeline";
import { VinculosDiagramPanel } from "@/components/shared/VinculosDiagramPanel";
import { ErrorBanner, Panel } from "@/components/ui/Form";
import { EntidadeStorageFoto } from "@/components/shared/EntidadeStorageFoto";
import { formatCep, formatEnderecoTitulo } from "@/lib/format";
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
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
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

  const titulo = formatEnderecoTitulo(endereco);

  return (
    <DashboardShell
      title="Endereço"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href={`/enderecos/${endereco.id}/editar`}
            prefetch={false}
            className="btn-acao"
          >
            Editar
          </Link>
          <EnderecoDeleteButton id={endereco.id} />
          <Link
            href="/enderecos"
            className="btn-acao-secundario"
          >
            Voltar à lista
          </Link>
        </div>
      }
    >
      <EntidadeDetailLayout
        entidadeTipo="endereco"
        entidadeId={endereco.id}
        dados={
          <Panel title="Dados cadastrais">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label="Tipo" value={endereco.tipo || "—"} />
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
              <CadastroMeta
                dataCadastro={endereco.data_cadastro}
                usuarioCadastroId={endereco.usuario_cadastro}
              />
            </dl>
          </Panel>
        }
        extras={
          <>
            <Panel title="Foto">
              <EntidadeStorageFoto
                bucket="fotos-enderecos"
                path={endereco.foto_url}
                alt={titulo}
              />
            </Panel>
            <Panel title="Mapa">
              <EnderecoMapa
                latitude={endereco.latitude}
                longitude={endereco.longitude}
                label={titulo}
                coordenadasAjustadasManualmente={
                  endereco.coordenadas_ajustadas_manualmente
                }
                geocodePrecisao={endereco.geocode_precisao}
              />
            </Panel>
            <VinculosDiagramPanel entidadeTipo="endereco" entidadeId={endereco.id} />
          </>
        }
        observacoes={
          <Panel title="Observações">
            <ObservacoesTimeline entidadeTipo="endereco" entidadeId={endereco.id} />
          </Panel>
        }
      />
    </DashboardShell>
  );
}
