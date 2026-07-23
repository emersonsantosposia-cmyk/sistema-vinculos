"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button, FormActions, Input, Label, Select, Textarea } from "@/components/ui/Form";
import { UFS } from "@/lib/format";
import {
  createOrcrim,
  updateOrcrim,
  uploadFotoOrcrim,
} from "@/lib/supabase/orcrims";
import { useSignedStorageUrl } from "@/lib/supabase/storage-urls";
import type { Orcrim } from "@/lib/types";

type Props = {
  initial?: Orcrim;
};

export function OrcrimForm({ initial }: Props) {
  const isEdit = Boolean(initial);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [nome, setNome] = useState(initial?.nome ?? "");
  const [sigla, setSigla] = useState(initial?.sigla ?? "");
  const [estadoOrigem, setEstadoOrigem] = useState(
    initial?.estado_origem ?? "",
  );
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  const { url: existingFotoUrl, loading: existingFotoLoading } =
    useSignedStorageUrl("fotos-orcrims", initial?.foto_url);

  useEffect(() => {
    if (!foto) {
      setFotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(foto);
    setFotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      setError("Informe o nome da orcrim.");
      return;
    }

    startTransition(async () => {
      setError(null);
      setStatus(isEdit ? "Atualizando orcrim…" : "Salvando orcrim…");

      const payload = {
        nome,
        sigla,
        estado_origem: estadoOrigem,
        descricao,
      };

      const { data, error: saveError } = isEdit
        ? await updateOrcrim(initial!.id, payload)
        : await createOrcrim(payload);

      if (saveError || !data) {
        setStatus(null);
        setError(saveError ?? "Erro ao salvar orcrim.");
        return;
      }

      if (foto) {
        setStatus("Enviando foto…");
        const { error: uploadError } = await uploadFotoOrcrim({
          orcrimId: data.id,
          file: foto,
        });
        if (uploadError) {
          setStatus(null);
          setError(
            `${uploadError} A orcrim foi salva, mas a foto pode estar incompleta.`,
          );
          router.push(`/orcrims/${data.id}`);
          router.refresh();
          return;
        }
      }

      setStatus("Concluído. Redirecionando…");
      router.push(`/orcrims/${data.id}`);
      router.refresh();
    });
  }

  const previewSrc = fotoPreview ?? (foto ? null : existingFotoUrl);

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
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
          Dados da orcrim
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
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
            <Label htmlFor="sigla">Sigla</Label>
            <Input
              id="sigla"
              value={sigla}
              onChange={(e) => setSigla(e.target.value)}
              maxLength={40}
              disabled={pending}
            />
          </div>
          <div>
            <Label htmlFor="estado_origem">Estado de origem</Label>
            <Select
              id="estado_origem"
              value={estadoOrigem}
              onChange={(e) => setEstadoOrigem(e.target.value)}
              disabled={pending}
            >
              <option value="">Selecione…</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={10}
              disabled={pending}
              className="min-h-[12rem]"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="foto">
              Foto
              {isEdit ? " (opcional — substitui a atual)" : ""}
            </Label>
            {isEdit && initial?.foto_url ? (
              <div className="mb-2">
                {existingFotoLoading ? (
                  <div className="flex h-32 w-full max-w-xs items-center justify-center rounded border border-border bg-panel-soft text-xs text-muted">
                    Carregando foto atual…
                  </div>
                ) : previewSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewSrc}
                    alt="Foto atual da orcrim"
                    className="h-32 w-full max-w-xs rounded border border-border object-cover bg-panel-soft"
                  />
                ) : null}
              </div>
            ) : fotoPreview ? (
              <div className="mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fotoPreview}
                  alt="Pré-visualização da foto"
                  className="h-32 w-full max-w-xs rounded border border-border object-cover bg-panel-soft"
                />
              </div>
            ) : null}
            <Input
              id="foto"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
              disabled={pending}
            />
          </div>
        </div>
      </section>

      <FormActions>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            router.push(isEdit ? `/orcrims/${initial!.id}` : "/orcrims")
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
              : "Salvar orcrim"}
        </Button>
      </FormActions>
    </form>
  );
}
