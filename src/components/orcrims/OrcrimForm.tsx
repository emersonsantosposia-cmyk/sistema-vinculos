"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, FormActions, Input, Label, Select, Textarea } from "@/components/ui/Form";
import { UFS } from "@/lib/format";
import { createOrcrim, updateOrcrim } from "@/lib/supabase/orcrims";
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

      setStatus(null);
      if (saveError || !data) {
        setError(saveError ?? "Erro ao salvar orcrim.");
        return;
      }
      router.push(`/orcrims/${data.id}`);
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
