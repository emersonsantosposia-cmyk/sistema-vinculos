import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { CasoDeleteButton } from "@/components/shared/EntityDeletes";
import { ObservacoesTimeline } from "@/components/shared/ObservacoesTimeline";
import { VinculosSection } from "@/components/shared/VinculosSection";
import { ErrorBanner, Panel } from "@/components/ui/Form";
import { formatDate } from "@/lib/format";
import { getCasoById } from "@/lib/supabase/casos-server";

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
      <dd className="mt-0.5 text-sm text-zinc-900">
        {children ?? value ?? "—"}
      </dd>
    </div>
  );
}

export default async function CasoDetailPage({ params }: Props) {
  const { id } = await params;
  const { data: caso, error } = await getCasoById(id);

  if (error) {
    return (
      <DashboardShell title="Caso">
        <ErrorBanner>
          {error}{" "}
          <Link href="/login" className="font-medium underline">
            Ir para login
          </Link>
        </ErrorBanner>
      </DashboardShell>
    );
  }

  if (!caso) notFound();

  const titulo = caso.nome || caso.numero || "Caso sem nome";

  return (
    <DashboardShell
      title={titulo}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href={`/casos/${caso.id}/editar`}
            className="inline-flex h-8 items-center rounded border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Editar
          </Link>
          <CasoDeleteButton id={caso.id} />
          <Link
            href="/casos"
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
              <Field label="Número" value={caso.numero || "—"} />
              <Field
                label="Data de abertura"
                value={
                  caso.data_abertura
                    ? formatDate(`${caso.data_abertura}T12:00:00`)
                    : "—"
                }
              />
              <div className="sm:col-span-2">
                <Field label="Nome" value={caso.nome || "—"} />
              </div>
              <div className="sm:col-span-2">
                <Field label="Link do CRONOS">
                  {caso.link_cronos ? (
                    <a
                      href={caso.link_cronos}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all underline-offset-2 hover:underline"
                    >
                      {caso.link_cronos}
                    </a>
                  ) : (
                    "—"
                  )}
                </Field>
              </div>
              <Field
                label="Data de cadastro"
                value={formatDate(caso.data_cadastro)}
              />
            </dl>
          </Panel>
          <Panel title="Vínculos">
            <VinculosSection entidadeTipo="caso" entidadeId={caso.id} />
          </Panel>
        </div>
        <div>
          <Panel title="Observações">
            <ObservacoesTimeline entidadeTipo="caso" entidadeId={caso.id} />
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}
