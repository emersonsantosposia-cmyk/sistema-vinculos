"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button, FormActions, Input, Label } from "@/components/ui/Form";
import { maskCnpjInput } from "@/lib/format";
import {
  createEmpresa,
  updateEmpresa,
  uploadFotoEmpresa,
} from "@/lib/supabase/empresas";
import { useSignedStorageUrl } from "@/lib/supabase/storage-urls";
import type { Empresa } from "@/lib/types";

type Props = {
  initial?: Empresa;
};

export function EmpresaForm({ initial }: Props) {
  const isEdit = Boolean(initial);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [nomeFantasia, setNomeFantasia] = useState(initial?.nome_fantasia ?? "");
  const [razaoSocial, setRazaoSocial] = useState(initial?.razao_social ?? "");
  const [cnpj, setCnpj] = useState(
    initial?.cnpj ? maskCnpjInput(initial.cnpj) : "",
  );
  const [cnaePrincipal, setCnaePrincipal] = useState(
    initial?.cnae_principal ?? "",
  );
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  const { url: existingFotoUrl, loading: existingFotoLoading } =
    useSignedStorageUrl("fotos-empresas", initial?.foto_url);

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
    if (!razaoSocial.trim()) {
      setError("Informe a razão social.");
      return;
    }

    startTransition(async () => {
      setError(null);
      setStatus(isEdit ? "Atualizando empresa…" : "Salvando empresa…");

      const payload = {
        nome_fantasia: nomeFantasia,
        razao_social: razaoSocial,
        cnpj,
        cnae_principal: cnaePrincipal,
        website,
      };

      const { data, error: saveError } = isEdit
        ? await updateEmpresa(initial!.id, payload)
        : await createEmpresa(payload);

      if (saveError || !data) {
        setStatus(null);
        setError(saveError ?? "Erro ao salvar empresa.");
        return;
      }

      if (foto) {
        setStatus("Enviando foto…");
        const { error: uploadError } = await uploadFotoEmpresa({
          empresaId: data.id,
          file: foto,
        });
        if (uploadError) {
          setStatus(null);
          setError(
            `${uploadError} A empresa foi salva, mas a foto pode estar incompleta.`,
          );
          router.push(`/empresas/${data.id}`);
          router.refresh();
          return;
        }
      }

      setStatus("Concluído. Redirecionando…");
      router.push(`/empresas/${data.id}`);
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
          Dados da empresa
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="nome_fantasia">Nome fantasia</Label>
            <Input
              id="nome_fantasia"
              value={nomeFantasia}
              onChange={(e) => setNomeFantasia(e.target.value)}
              disabled={pending}
            />
          </div>
          <div>
            <Label htmlFor="razao_social">Razão social</Label>
            <Input
              id="razao_social"
              value={razaoSocial}
              onChange={(e) => setRazaoSocial(e.target.value)}
              required
              disabled={pending}
            />
          </div>
          <div>
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              value={cnpj}
              onChange={(e) => setCnpj(maskCnpjInput(e.target.value))}
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
              disabled={pending}
            />
          </div>
          <div>
            <Label htmlFor="cnae_principal">CNAE principal</Label>
            <Input
              id="cnae_principal"
              value={cnaePrincipal}
              onChange={(e) => setCnaePrincipal(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://www.exemplo.com.br"
              disabled={pending}
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
                    alt="Foto atual da empresa"
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
            router.push(isEdit ? `/empresas/${initial!.id}` : "/empresas")
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
              : "Salvar empresa"}
        </Button>
      </FormActions>
    </form>
  );
}
