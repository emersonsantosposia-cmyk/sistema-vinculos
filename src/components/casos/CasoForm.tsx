"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button, FormActions, Input, Label, Select, Textarea } from "@/components/ui/Form";
import {
  canChooseUnidade,
  defaultUnidadeForPerfil,
  UNIDADES,
  type PerfilUsuario,
  type Unidade,
} from "@/lib/perfis";
import { createCaso, updateCaso } from "@/lib/supabase/casos";
import { createClient } from "@/lib/supabase/client";
import { CASO_STATUS, type Caso, type CasoStatus } from "@/lib/types";

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
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [perfilReady, setPerfilReady] = useState(false);

  const lockedUnidade = perfil ? !canChooseUnidade(perfil) : false;
  const [unidade, setUnidade] = useState<Unidade | "">(
    defaultUnidadeForPerfil(null, initial?.unidade),
  );
  const [numero, setNumero] = useState(initial?.numero ?? "");
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [dataAbertura, setDataAbertura] = useState(
    toDateInputValue(initial?.data_abertura),
  );
  const [status, setStatus] = useState<CasoStatus>(
    initial?.status ?? "em_andamento",
  );
  const [dataEncerramento, setDataEncerramento] = useState(
    toDateInputValue(initial?.data_encerramento),
  );
  const [linkCronos, setLinkCronos] = useState(initial?.link_cronos ?? "");

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPerfilReady(true);
        return;
      }
      const { data } = await supabase
        .from("perfis_usuario")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      const p = (data as PerfilUsuario | null) ?? null;
      setPerfil(p);
      setUnidade((prev) => {
        if (initial?.unidade) return defaultUnidadeForPerfil(p, initial.unidade);
        if (prev) return prev;
        return defaultUnidadeForPerfil(p);
      });
      setPerfilReady(true);
    })();
  }, [initial?.unidade]);

  function handleStatusChange(next: CasoStatus) {
    setStatus(next);
    if (next !== "encerrado") {
      setDataEncerramento("");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      setError(null);
      if (!unidade) {
        setError("Selecione a unidade.");
        return;
      }
      if (status === "encerrado" && !dataEncerramento) {
        setError("Informe a data de encerramento.");
        return;
      }
      setStatusMsg(isEdit ? "Atualizando caso…" : "Salvando caso…");

      const payload = {
        unidade,
        numero,
        nome,
        descricao,
        data_abertura: dataAbertura,
        status,
        data_encerramento:
          status === "encerrado" ? dataEncerramento : null,
        link_cronos: linkCronos,
      };

      const { data, error: saveError } = isEdit
        ? await updateCaso(initial!.id, payload)
        : await createCaso(payload);

      setStatusMsg(null);
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
      {pending && statusMsg ? (
        <div className="rounded border border-border bg-panel-soft px-3 py-2 text-sm text-muted-strong">
          {statusMsg}
        </div>
      ) : null}

      <section className="rounded border border-border bg-panel p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Dados do caso
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="unidade">Unidade</Label>
            <Select
              id="unidade"
              value={unidade}
              onChange={(e) => setUnidade(e.target.value as Unidade | "")}
              disabled={pending || !perfilReady || lockedUnidade}
              required
            >
              <option value="">Selecione</option>
              {UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
            {lockedUnidade ? (
              <p className="mt-1 text-[11px] text-muted">
                Unidade fixada conforme sua lotação.
              </p>
            ) : null}
          </div>
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
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={status}
              onChange={(e) =>
                handleStatusChange(e.target.value as CasoStatus)
              }
              disabled={pending}
              required
            >
              {CASO_STATUS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          {status === "encerrado" ? (
            <div>
              <Label htmlFor="data_encerramento">Data de encerramento</Label>
              <Input
                id="data_encerramento"
                type="date"
                value={dataEncerramento}
                onChange={(e) => setDataEncerramento(e.target.value)}
                disabled={pending}
                required
              />
            </div>
          ) : null}
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
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              rows={5}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o caso (opcional)"
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

      <FormActions>
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
        <Button type="submit" disabled={pending || !perfilReady}>
          {pending
            ? isEdit
              ? "Salvando alterações…"
              : "Salvando…"
            : isEdit
              ? "Salvar alterações"
              : "Salvar caso"}
        </Button>
      </FormActions>
    </form>
  );
}
