import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PessoaAvatar } from "@/components/pessoas/PessoaAvatar";
import { PessoaDeleteButton } from "@/components/pessoas/PessoaDeleteButton";
import { PessoaFotosGaleria } from "@/components/pessoas/PessoaFotosGaleria";
import { ObservacoesTimeline } from "@/components/shared/ObservacoesTimeline";
import { VinculosSection } from "@/components/shared/VinculosSection";
import { ErrorBanner, Panel } from "@/components/ui/Form";
import { formatCpf, formatDate, formatNascimentoComIdade, labelPessoaTipo } from "@/lib/format";
import { getPessoaById } from "@/lib/supabase/pessoas-server";

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

export default async function PessoaDetailPage({ params }: Props) {
  const { id } = await params;
  const { data, error } = await getPessoaById(id);

  if (error) {
    return (
      <DashboardShell
        title="Pessoa"
        actions={
          <Link
            href="/pessoas"
            className="inline-flex h-8 items-center rounded border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Voltar à lista
          </Link>
        }
      >
        <ErrorBanner>
          {error}{" "}
          <Link href="/login" className="font-medium underline">
            Ir para login
          </Link>
        </ErrorBanner>
      </DashboardShell>
    );
  }

  if (!data) notFound();

  const { pessoa, redes, fotos, foto_perfil_path } = data;

  return (
    <DashboardShell
      title="Pessoa"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href={`/pessoas/${pessoa.id}/editar`}
            className="inline-flex h-8 items-center rounded border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Editar
          </Link>
          <PessoaDeleteButton pessoaId={pessoa.id} />
          <Link
            href="/pessoas"
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex flex-col items-center gap-2 sm:items-start">
                <PessoaAvatar
                  path={foto_perfil_path}
                  nome={pessoa.nome}
                  size="lg"
                />
                <p className="text-[11px] font-medium tracking-wide text-muted uppercase">
                  Foto de perfil
                </p>
              </div>
              <dl className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                <Field label="Nome" value={pessoa.nome} />
                <Field label="Tipo" value={labelPessoaTipo(pessoa.tipo)} />
                <Field label="CPF" value={formatCpf(pessoa.cpf)} />
                <Field
                  label="Nascimento"
                  value={formatNascimentoComIdade(pessoa.data_nascimento)}
                />
                <Field label="Profissão" value={pessoa.profissao || "—"} />
                <Field
                  label="Data de cadastro"
                  value={formatDate(pessoa.data_cadastro)}
                />
                <Field label="Nome da mãe" value={pessoa.nome_mae || "—"} />
                <Field label="Nome do pai" value={pessoa.nome_pai || "—"} />
              </dl>
            </div>
          </Panel>

          <Panel title="Redes sociais">
            {redes.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma rede cadastrada.</p>
            ) : (
              <ul className="divide-y divide-border">
                {redes.map((rede) => (
                  <li
                    key={rede.id}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0"
                  >
                    <span className="text-sm font-medium text-zinc-800">
                      {rede.rede || "Rede"}
                    </span>
                    {rede.link ? (
                      <a
                        href={
                          rede.link.startsWith("http")
                            ? rede.link
                            : `https://${rede.link}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-zinc-600 underline-offset-2 hover:underline"
                      >
                        {rede.link}
                      </a>
                    ) : (
                      <span className="text-sm text-muted">sem link</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Galeria de fotos">
            <PessoaFotosGaleria fotos={fotos} />
          </Panel>

          <Panel title="Vínculos">
            <VinculosSection entidadeTipo="pessoa" entidadeId={pessoa.id} />
          </Panel>
        </div>

        <div>
          <Panel title="Observações">
            <ObservacoesTimeline
              entidadeTipo="pessoa"
              entidadeId={pessoa.id}
            />
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}
