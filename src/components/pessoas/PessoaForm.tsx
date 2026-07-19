"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button, FormActions, Input, Label, Select } from "@/components/ui/Form";
import { ImageLightbox } from "@/components/shared/ImageLightbox";
import { calcularIdade, formatIdade } from "@/lib/format";
import {
  addRedesSociais,
  createPessoa,
  removeRedeSocial,
  updatePessoa,
  uploadFotoPessoa,
} from "@/lib/supabase/pessoas";
import type { PessoaComRelacoes } from "@/lib/supabase/pessoas-server";
import { useSignedStorageUrl } from "@/lib/supabase/storage-urls";
import { PESSOA_TIPOS, type PessoaTipo } from "@/lib/types";

type RedeLinha = { id: string; rede: string; link: string };

function newId() {
  return crypto.randomUUID();
}

function revokeUrls(urls: string[]) {
  for (const url of urls) URL.revokeObjectURL(url);
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

type Props = {
  initial?: PessoaComRelacoes;
};

export function PessoaForm({ initial }: Props) {
  const isEdit = Boolean(initial);
  const pessoa = initial?.pessoa;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [tipo, setTipo] = useState<PessoaTipo>(pessoa?.tipo ?? "ppf");
  const [nome, setNome] = useState(pessoa?.nome ?? "");
  const [alcunha, setAlcunha] = useState(pessoa?.alcunha ?? "");
  const [cpf, setCpf] = useState(pessoa?.cpf ?? "");
  const [dataNascimento, setDataNascimento] = useState(
    toDateInputValue(pessoa?.data_nascimento),
  );
  const [nomeMae, setNomeMae] = useState(pessoa?.nome_mae ?? "");
  const [nomePai, setNomePai] = useState(pessoa?.nome_pai ?? "");
  const [profissao, setProfissao] = useState(pessoa?.profissao ?? "");
  const [redes, setRedes] = useState<RedeLinha[]>(() => {
    if (initial?.redes.length) {
      return initial.redes.map((r) => ({
        id: r.id,
        rede: r.rede ?? "",
        link: r.link ?? "",
      }));
    }
    return [{ id: newId(), rede: "", link: "" }];
  });
  const [fotoPerfil, setFotoPerfil] = useState<File | null>(null);
  const [perfilPreview, setPerfilPreview] = useState<string | null>(null);
  const [outrasFotos, setOutrasFotos] = useState<File[]>([]);
  const [galeriaPreviews, setGaleriaPreviews] = useState<string[]>([]);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(
    null,
  );

  const { url: existingPerfilUrl, loading: existingPerfilLoading } =
    useSignedStorageUrl("fotos-pessoas", initial?.foto_perfil_path);

  const idadeCalculada = useMemo(
    () => calcularIdade(dataNascimento || null),
    [dataNascimento],
  );

  useEffect(() => {
    if (!fotoPerfil) {
      setPerfilPreview(null);
      return;
    }
    const url = URL.createObjectURL(fotoPerfil);
    setPerfilPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [fotoPerfil]);

  useEffect(() => {
    const urls = outrasFotos.map((f) => URL.createObjectURL(f));
    setGaleriaPreviews(urls);
    return () => revokeUrls(urls);
  }, [outrasFotos]);

  function updateRede(id: string, field: "rede" | "link", value: string) {
    setRedes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  }

  function addRede() {
    setRedes((prev) => [...prev, { id: newId(), rede: "", link: "" }]);
  }

  function removeRede(id: string) {
    setRedes((prev) =>
      prev.length <= 1 ? prev : prev.filter((r) => r.id !== id),
    );
  }

  async function syncRedesSociais(pessoaId: string) {
    if (isEdit && initial?.redes.length) {
      for (const rede of initial.redes) {
        const { error: removeError } = await removeRedeSocial(rede.id);
        if (removeError) return removeError;
      }
    }
    const { error: redesError } = await addRedesSociais(
      pessoaId,
      redes.map((r) => ({ rede: r.rede, link: r.link })),
    );
    return redesError;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      setError("Informe o nome.");
      return;
    }

    startTransition(async () => {
      setError(null);
      setStatus(isEdit ? "Atualizando pessoa…" : "Salvando pessoa…");

      const payload = {
        tipo,
        nome: nome.trim(),
        alcunha,
        cpf,
        data_nascimento: dataNascimento || null,
        nome_mae: nomeMae,
        nome_pai: nomePai,
        profissao,
      };

      let pessoaId: string;

      if (isEdit) {
        const { data: updated, error: updateError } = await updatePessoa(
          pessoa!.id,
          payload,
        );
        if (updateError || !updated) {
          setStatus(null);
          setError(updateError ?? "Erro ao atualizar pessoa.");
          return;
        }
        pessoaId = updated.id;
      } else {
        const { data: created, error: createError } = await createPessoa(payload);
        if (createError || !created) {
          setStatus(null);
          setError(createError ?? "Erro ao salvar pessoa.");
          return;
        }
        pessoaId = created.id;
      }

      setStatus("Salvando redes sociais…");
      const redesError = await syncRedesSociais(pessoaId);
      if (redesError) {
        setStatus(null);
        setError(
          `${redesError} A pessoa foi salva, mas as redes podem estar incompletas.`,
        );
        router.push(`/pessoas/${pessoaId}`);
        router.refresh();
        return;
      }

      try {
        if (fotoPerfil) {
          setStatus("Enviando foto de perfil…");
          const { error: fotoError } = await uploadFotoPessoa({
            pessoaId,
            file: fotoPerfil,
            tipo: "perfil",
          });
          if (fotoError) throw new Error(fotoError);
        }

        if (outrasFotos.length > 0) {
          setStatus("Enviando fotos da galeria…");
          const uploads = outrasFotos.map((file, index) =>
            uploadFotoPessoa({
              pessoaId,
              file,
              tipo: "outra",
              pathSuffix: `galeria-${Date.now()}-${index}`,
            }),
          );
          const results = await Promise.all(uploads);
          const failed = results.find((r) => r.error);
          if (failed?.error) throw new Error(failed.error);
        }
      } catch (uploadErr) {
        const message =
          uploadErr instanceof Error ? uploadErr.message : "Erro no upload.";
        setStatus(null);
        setError(
          `${message} A pessoa foi salva, mas as fotos podem estar incompletas.`,
        );
        router.push(`/pessoas/${pessoaId}`);
        router.refresh();
        return;
      }

      setStatus("Concluído. Redirecionando…");
      router.push(`/pessoas/${pessoaId}`);
      router.refresh();
    });
  }

  const perfilDisplaySrc =
    perfilPreview ?? (fotoPerfil ? null : existingPerfilUrl);

  return (
    <>
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6 pb-2">
      {error ? (
        <div className="rounded border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-fg">
          {error}
        </div>
      ) : null}

      {pending && status ? (
        <div className="rounded border border-border bg-panel-soft px-3 py-2 text-sm text-muted-strong">
          {status}
        </div>
      ) : null}

      <section className="rounded border border-border bg-panel p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Dados principais
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="tipo">Tipo</Label>
            <Select
              id="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as PessoaTipo)}
              required
              disabled={pending}
            >
              {PESSOA_TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              disabled={pending}
            />
          </div>
          <div>
            <Label htmlFor="alcunha">Alcunha</Label>
            <Input
              id="alcunha"
              value={alcunha}
              onChange={(e) => setAlcunha(e.target.value)}
              placeholder="Apelido ou nome de guerra"
              disabled={pending}
            />
          </div>
          <div>
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              disabled={pending}
            />
          </div>
          <div>
            <Label htmlFor="data_nascimento">Data de nascimento</Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
              <Input
                id="data_nascimento"
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                disabled={pending}
                className="w-full min-w-0 flex-1 sm:min-w-[11rem]"
                max={new Date().toISOString().slice(0, 10)}
              />
              <div className="w-full sm:min-w-[7.5rem] sm:w-auto">
                <Label htmlFor="idade_calculada">Idade</Label>
                <Input
                  id="idade_calculada"
                  readOnly
                  tabIndex={-1}
                  value={
                    idadeCalculada === null
                      ? ""
                      : formatIdade(dataNascimento)
                  }
                  placeholder="—"
                  disabled={pending}
                  className="bg-panel-soft text-muted-strong"
                  aria-live="polite"
                />
              </div>
            </div>
            <p className="mt-1 text-[11px] text-muted">
              A idade é calculada automaticamente e não é editável.
            </p>
          </div>
          <div>
            <Label htmlFor="profissao">Profissão</Label>
            <Input
              id="profissao"
              value={profissao}
              onChange={(e) => setProfissao(e.target.value)}
              disabled={pending}
            />
          </div>
          <div>
            <Label htmlFor="nome_mae">Nome da mãe</Label>
            <Input
              id="nome_mae"
              value={nomeMae}
              onChange={(e) => setNomeMae(e.target.value)}
              disabled={pending}
            />
          </div>
          <div>
            <Label htmlFor="nome_pai">Nome do pai</Label>
            <Input
              id="nome_pai"
              value={nomePai}
              onChange={(e) => setNomePai(e.target.value)}
              disabled={pending}
            />
          </div>
        </div>
      </section>

      <section className="rounded border border-border bg-panel p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Redes sociais
          </h3>
          <Button
            type="button"
            variant="secondary"
            onClick={addRede}
            disabled={pending}
          >
            Adicionar linha
          </Button>
        </div>
        <div className="space-y-2">
          {redes.map((linha) => (
            <div key={linha.id} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Input
                className="min-w-[140px] flex-1"
                placeholder="Rede (ex.: Instagram)"
                value={linha.rede}
                onChange={(e) => updateRede(linha.id, "rede", e.target.value)}
                disabled={pending}
              />
              <Input
                className="min-w-[180px] flex-[2]"
                placeholder="Link ou @usuário"
                value={linha.link}
                onChange={(e) => updateRede(linha.id, "link", e.target.value)}
                disabled={pending}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => removeRede(linha.id)}
                disabled={pending || redes.length <= 1}
              >
                Remover
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Fotos</h3>
          <p className="mt-0.5 text-xs text-muted">
            A foto de perfil aparece na listagem e no topo do detalhe. As
            demais ficam só na galeria.
            {isEdit
              ? " No modo edição, enviar novas fotos é opcional — substitui o perfil ou adiciona à galeria."
              : ""}
          </p>
        </div>

        <div className="rounded-lg border-2 border-gold bg-panel p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Foto de perfil
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Uma imagem principal (JPEG, PNG, WebP ou GIF). Usada como avatar
                em todo o sistema.
                {isEdit ? " Deixe em branco para manter a foto atual." : ""}
              </p>
            </div>
            <span className="shrink-0 rounded bg-gold px-2 py-0.5 text-[10px] font-semibold tracking-wide text-gold-ink uppercase">
              Perfil
            </span>
          </div>

          <div className="flex flex-col items-start gap-4 sm:flex-row">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-panel-soft">
              {existingPerfilLoading && isEdit && !perfilPreview ? (
                <div className="h-full w-full animate-pulse bg-panel-hover" />
              ) : perfilDisplaySrc ? (
                <button
                  type="button"
                  className="h-full w-full cursor-zoom-in p-0"
                  onClick={() =>
                    setLightbox({
                      src: perfilDisplaySrc,
                      alt: "Foto de perfil",
                    })
                  }
                  title="Ver foto maior"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={perfilDisplaySrc}
                    alt="Preview do perfil"
                    className="h-full w-full object-cover"
                  />
                </button>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-10 w-10 text-muted"
                  aria-hidden
                >
                  <path d="M12 12a4.5 4.5 0 100-9 4.5 4.5 0 000 9zm0 1.5c-4.1 0-7.5 2.4-7.5 5.25V20a1 1 0 001 1h13a1 1 0 001-1v-1.25c0-2.85-3.4-5.25-7.5-5.25z" />
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="foto_perfil">
                {isEdit ? "Substituir imagem de perfil" : "Selecionar imagem de perfil"}
              </Label>
              <Input
                id="foto_perfil"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => setFotoPerfil(e.target.files?.[0] ?? null)}
                disabled={pending}
              />
              {fotoPerfil ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-muted">
                    {fotoPerfil.name} (
                    {Math.round(fotoPerfil.size / 1024)} KB)
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setFotoPerfil(null)}
                    disabled={pending}
                  >
                    Remover
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted">
                  {isEdit
                    ? "Nenhuma nova imagem selecionada."
                    : "Nenhuma imagem selecionada."}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded border border-dashed border-border bg-panel p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Galeria (outras fotos)
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Fotos adicionais exibidas apenas na página de detalhe.
                {isEdit ? " Novas imagens serão adicionadas à galeria existente." : ""}
              </p>
            </div>
            <span className="shrink-0 rounded border border-border bg-panel-soft px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted uppercase">
              Galeria
            </span>
          </div>

          <Label htmlFor="outras_fotos">Selecionar imagens da galeria</Label>
          <Input
            id="outras_fotos"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) =>
              setOutrasFotos(Array.from(e.target.files ?? []))
            }
            disabled={pending}
          />

          {galeriaPreviews.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {galeriaPreviews.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  className="aspect-square overflow-hidden rounded border border-border bg-panel-soft transition hover:border-border-strong hover:ring-2 hover:ring-gold/30"
                  onClick={() =>
                    setLightbox({
                      src,
                      alt: `Preview galeria ${i + 1}`,
                    })
                  }
                  title="Ver foto maior"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Preview galeria ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted">
              Nenhuma foto de galeria selecionada.
            </p>
          )}
        </div>
      </section>

      <FormActions>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            router.push(isEdit ? `/pessoas/${pessoa!.id}` : "/pessoas")
          }
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending
            ? isEdit
              ? "Salvando alterações…"
              : "Salvando…"
            : isEdit
              ? "Salvar alterações"
              : "Salvar pessoa"}
        </Button>
      </FormActions>
    </form>

      {lightbox ? (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </>
  );
}
