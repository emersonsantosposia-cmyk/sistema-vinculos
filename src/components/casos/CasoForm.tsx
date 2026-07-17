"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button, Input, Label, Select } from "@/components/ui/Form";
import {
  canChooseUnidade,
  defaultUnidadeForPerfil,
  UNIDADES,
  type PerfilUsuario,
  type Unidade,
} from "@/lib/perfis";
import { createCaso, updateCaso } from "@/lib/supabase/casos";
import { createClient } from "@/lib/supabase/client";
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
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [perfilReady, setPerfilReady] = useState(false);

  const lockedUnidade = perfil ? !canChooseUnidade(perfil) : false;
  const [unidade, setUnidade] = useState<Unidade | "">(
    defaultUnidadeForPerfil(null, initial?.unidade),
  );
  const [numero, setNumero] = useState(initial?.numero ?? "");
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [dataAbertura, setDataAbertura] = useState(
    toDateInputValue(initial?.data_abertura),
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      setError(null);
      if (!unidade) {
        setError("Selecione a unidade.");
        return;
      }
      setStatus(isEdit ? "Atualizando caso…" : "Salvando caso…");

      const payload = {
        unidade,
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
        <Button type="submit" disabled={pending || !perfilReady}>
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
