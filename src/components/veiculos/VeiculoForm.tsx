"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button, FormActions, Input, Label } from "@/components/ui/Form";
import { maskPlacaInput } from "@/lib/format";
import {
  createVeiculo,
  updateVeiculo,
  uploadFotoVeiculo,
} from "@/lib/supabase/veiculos";
import { useSignedStorageUrl } from "@/lib/supabase/storage-urls";
import type { Veiculo } from "@/lib/types";

function parseAno(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1900 || n > 2100) return null;
  return n;
}

type Props = {
  initial?: Veiculo;
};

export function VeiculoForm({ initial }: Props) {
  const isEdit = Boolean(initial);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [placa, setPlaca] = useState(
    initial?.placa ? maskPlacaInput(initial.placa) : "",
  );
  const [marca, setMarca] = useState(initial?.marca ?? "");
  const [modelo, setModelo] = useState(initial?.modelo ?? "");
  const [cor, setCor] = useState(initial?.cor ?? "");
  const [anoFabricacao, setAnoFabricacao] = useState(
    initial?.ano_fabricacao != null ? String(initial.ano_fabricacao) : "",
  );
  const [anoModelo, setAnoModelo] = useState(
    initial?.ano_modelo != null ? String(initial.ano_modelo) : "",
  );
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  const { url: existingFotoUrl, loading: existingFotoLoading } =
    useSignedStorageUrl("fotos-veiculos", initial?.foto_url);

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

    const fab = parseAno(anoFabricacao);
    const mod = parseAno(anoModelo);
    if (anoFabricacao.trim() && fab === null) {
      setError("Ano de fabricação inválido.");
      return;
    }
    if (anoModelo.trim() && mod === null) {
      setError("Ano modelo inválido.");
      return;
    }

    startTransition(async () => {
      setError(null);
      setStatus(isEdit ? "Atualizando veículo…" : "Salvando veículo…");

      const payload = {
        placa,
        marca,
        modelo,
        cor,
        ano_fabricacao: fab,
        ano_modelo: mod,
      };

      let veiculoId: string;

      if (isEdit) {
        const { data, error: updateError } = await updateVeiculo(
          initial!.id,
          payload,
        );
        if (updateError || !data) {
          setStatus(null);
          setError(updateError ?? "Erro ao atualizar veículo.");
          return;
        }
        veiculoId = data.id;
      } else {
        const { data, error: createError } = await createVeiculo(payload);
        if (createError || !data) {
          setStatus(null);
          setError(createError ?? "Erro ao salvar veículo.");
          return;
        }
        veiculoId = data.id;
      }

      if (foto) {
        setStatus("Enviando foto…");
        const { error: uploadError } = await uploadFotoVeiculo({
          veiculoId,
          file: foto,
        });
        if (uploadError) {
          setStatus(null);
          setError(
            `${uploadError} O veículo foi salvo, mas a foto pode estar incompleta.`,
          );
          router.push(`/veiculos/${veiculoId}`);
          router.refresh();
          return;
        }
      }

      setStatus("Concluído. Redirecionando…");
      router.push(`/veiculos/${veiculoId}`);
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
          Dados do veículo
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="placa">Placa</Label>
            <Input
              id="placa"
              value={placa}
              onChange={(e) => setPlaca(maskPlacaInput(e.target.value))}
              placeholder="ABC-1234 ou ABC1D23"
              className="font-mono uppercase"
              disabled={pending}
            />
          </div>
          <div>
            <Label htmlFor="cor">Cor</Label>
            <Input
              id="cor"
              value={cor}
              onChange={(e) => setCor(e.target.value)}
              disabled={pending}
            />
          </div>
          <div>
            <Label htmlFor="marca">Marca</Label>
            <Input
              id="marca"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              disabled={pending}
            />
          </div>
          <div>
            <Label htmlFor="modelo">Modelo</Label>
            <Input
              id="modelo"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              disabled={pending}
            />
          </div>
          <div>
            <Label htmlFor="ano_fabricacao">Ano de fabricação</Label>
            <Input
              id="ano_fabricacao"
              value={anoFabricacao}
              onChange={(e) =>
                setAnoFabricacao(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              disabled={pending}
            />
          </div>
          <div>
            <Label htmlFor="ano_modelo">Ano modelo</Label>
            <Input
              id="ano_modelo"
              value={anoModelo}
              onChange={(e) =>
                setAnoModelo(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              disabled={pending}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="foto">
              Foto ilustrativa do modelo
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
                    alt="Foto atual do veículo"
                    className="h-32 w-full max-w-xs rounded border border-border object-cover bg-panel-soft"
                  />
                ) : null}
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
            router.push(isEdit ? `/veiculos/${initial!.id}` : "/veiculos")
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
              : "Salvar veículo"}
        </Button>
      </FormActions>
    </form>
  );
}
