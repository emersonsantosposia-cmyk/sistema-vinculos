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
  comunicacaoMostraOperadora,
  labelComunicacaoValor,
} from "@/lib/format";
import {
  createComunicacao,
  updateComunicacao,
} from "@/lib/supabase/comunicacoes";
import {
  COMUNICACAO_STATUS,
  COMUNICACAO_TIPOS,
  type Comunicacao,
  type ComunicacaoStatus,
  type ComunicacaoTipo,
} from "@/lib/types";

type Props = {
  initial?: Comunicacao;
};

export function ComunicacaoForm({ initial }: Props) {
  const isEdit = Boolean(initial);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [tipo, setTipo] = useState<ComunicacaoTipo | "">(initial?.tipo ?? "");
  const [valor, setValor] = useState(initial?.valor ?? "");
  const [operadora, setOperadora] = useState(
    initial?.operadora_provedor ?? "",
  );
  const [status, setStatus] = useState<ComunicacaoStatus>(
    initial?.status ?? "desconhecido",
  );
  const [fonte, setFonte] = useState(initial?.fonte ?? "");
  const [observacaoGeral, setObservacaoGeral] = useState(
    initial?.observacao_geral ?? "",
  );

  const mostraOperadora = comunicacaoMostraOperadora(tipo);
  const valorLabel = labelComunicacaoValor(tipo || null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tipo) {
      setError("Selecione o tipo.");
      return;
    }
    if (!valor.trim()) {
      setError(`Informe o campo "${valorLabel}".`);
      return;
    }

    startTransition(async () => {
      setError(null);
      setStatusMsg(
        isEdit ? "Atualizando comunicação…" : "Salvando comunicação…",
      );

      const payload = {
        tipo,
        valor,
        operadora_provedor: mostraOperadora ? operadora : null,
        status,
        fonte,
        observacao_geral: observacaoGeral,
      };

      const { data, error: saveError } = isEdit
        ? await updateComunicacao(initial!.id, payload)
        : await createComunicacao(payload);

      setStatusMsg(null);
      if (saveError || !data) {
        setError(saveError ?? "Erro ao salvar comunicação.");
        return;
      }
      router.push(`/comunicacoes/${data.id}`);
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
      {pending && statusMsg ? (
        <div className="rounded border border-border bg-panel-soft px-3 py-2 text-sm text-muted-strong">
          {statusMsg}
        </div>
      ) : null}

      <section className="rounded border border-border bg-panel p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Dados da comunicação
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="tipo">Tipo</Label>
            <Select
              id="tipo"
              value={tipo}
              onChange={(e) =>
                setTipo(e.target.value as ComunicacaoTipo | "")
              }
              required
              disabled={pending}
            >
              <option value="">Selecione</option>
              {COMUNICACAO_TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as ComunicacaoStatus)
              }
              disabled={pending}
            >
              {COMUNICACAO_STATUS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div className={mostraOperadora ? "" : "sm:col-span-2"}>
            <Label htmlFor="valor">{valorLabel}</Label>
            <Input
              id="valor"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
              disabled={pending}
            />
          </div>
          {mostraOperadora ? (
            <div>
              <Label htmlFor="operadora_provedor">Operadora/Provedor</Label>
              <Input
                id="operadora_provedor"
                value={operadora}
                onChange={(e) => setOperadora(e.target.value)}
                placeholder="Ex.: Vivo, Claro, Tim…"
                disabled={pending}
              />
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <Label htmlFor="fonte">Fonte</Label>
            <Input
              id="fonte"
              value={fonte}
              onChange={(e) => setFonte(e.target.value)}
              placeholder="De onde veio essa informação"
              disabled={pending}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="observacao_geral">Observação geral</Label>
            <Textarea
              id="observacao_geral"
              value={observacaoGeral}
              onChange={(e) => setObservacaoGeral(e.target.value)}
              rows={4}
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
              isEdit ? `/comunicacoes/${initial!.id}` : "/comunicacoes",
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
              : "Salvar comunicação"}
        </Button>
      </div>
    </form>
  );
}
