"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Button,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/Form";
import {
  createProcedimento,
  updateProcedimento,
} from "@/lib/supabase/procedimentos";
import {
  PROCEDIMENTO_TIPOS,
  type Procedimento,
  type ProcedimentoTipo,
} from "@/lib/types";

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

type Props = {
  initial?: Procedimento;
};

export function ProcedimentoForm({ initial }: Props) {
  const isEdit = Boolean(initial);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [tipo, setTipo] = useState<ProcedimentoTipo | "">(initial?.tipo ?? "");
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [resumo, setResumo] = useState(initial?.resumo ?? "");
  const [data, setData] = useState(toDateInputValue(initial?.data));
  const [linkCronos, setLinkCronos] = useState(initial?.link_cronos ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      setError(null);
      setStatus(isEdit ? "Atualizando procedimento…" : "Salvando procedimento…");

      const payload = {
        tipo: tipo || null,
        nome,
        resumo,
        data,
        link_cronos: linkCronos,
      };

      const { data: row, error: saveError } = isEdit
        ? await updateProcedimento(initial!.id, payload)
        : await createProcedimento(payload);

      setStatus(null);
      if (saveError || !row) {
        setError(saveError ?? "Erro ao salvar procedimento.");
        return;
      }
      router.push(`/procedimentos/${row.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      {error ? (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {pending && status ? (
        <div className="rounded border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
          {status}
        </div>
      ) : null}

      <section className="rounded border border-border bg-panel p-4">
        <h3 className="mb-3 text-sm font-semibold text-zinc-900">
          Dados do procedimento
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="tipo">Tipo</Label>
            <Select
              id="tipo"
              value={tipo}
              onChange={(e) =>
                setTipo(e.target.value as ProcedimentoTipo | "")
              }
              disabled={pending}
            >
              <option value="">Selecione</option>
              {PROCEDIMENTO_TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="data">Data</Label>
            <Input
              id="data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
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
            <Label htmlFor="resumo">Resumo</Label>
            <Textarea
              id="resumo"
              rows={5}
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
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
            router.push(
              isEdit ? `/procedimentos/${initial!.id}` : "/procedimentos",
            )
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
              : "Salvar procedimento"}
        </Button>
      </div>
    </form>
  );
}
