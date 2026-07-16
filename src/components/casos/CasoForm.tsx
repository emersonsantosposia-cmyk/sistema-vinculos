"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Input, Label } from "@/components/ui/Form";
import { createCaso, updateCaso } from "@/lib/supabase/casos";
import type { Caso } from "@/lib/types";

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

type Props = {
  initial?: Caso;
};

export function CasoForm({ initial }: Props) {
  const isEdit = Boolean(initial);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [numero, setNumero] = useState(initial?.numero ?? "");
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [dataAbertura, setDataAbertura] = useState(
    toDateInputValue(initial?.data_abertura),
  );
  const [linkCronos, setLinkCronos] = useState(initial?.link_cronos ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      setError(null);
      setStatus(isEdit ? "Atualizando caso…" : "Salvando caso…");

      const payload = {
        numero,
        nome,
        data_abertura: dataAbertura,
        link_cronos: linkCronos,
      };

      const { data, error: saveError } = isEdit
        ? await updateCaso(initial!.id, payload)
        : await createCaso(payload);

      setStatus(null);
      if (saveError || !data) {
        setError(saveError ?? "Erro ao salvar caso.");
        return;
      }
      router.push(`/casos/${data.id}`);
      router.refresh();
    });
  }

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
          Dados do caso
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="numero">Número</Label>
            <Input
              id="numero"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              disabled={pending}
            />
          </div>
          <div>
            <Label htmlFor="data_abertura">Data de abertura</Label>
            <Input
              id="data_abertura"
              type="date"
              value={dataAbertura}
              onChange={(e) => setDataAbertura(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="link_cronos">Link do CRONOS</Label>
            <Input
              id="link_cronos"
              type="url"
              value={linkCronos}
              onChange={(e) => setLinkCronos(e.target.value)}
              placeholder="https://..."
              disabled={pending}
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            router.push(isEdit ? `/casos/${initial!.id}` : "/casos")
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
              : "Salvar caso"}
        </Button>
      </div>
    </form>
  );
}
