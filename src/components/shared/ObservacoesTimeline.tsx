"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Button, EmptyState, Textarea } from "@/components/ui/Form";
import { formatObservacaoDataHora } from "@/lib/format";
import {
  createObservacao,
  listObservacoes,
  resolveUserDisplayNames,
} from "@/lib/supabase/observacoes";
import type { EntidadeTipo, Observacao } from "@/lib/types";

type Props = {
  entidadeTipo: EntidadeTipo;
  entidadeId: string;
};

export function ObservacoesTimeline({ entidadeTipo, entidadeId }: Props) {
  const [items, setItems] = useState<Observacao[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: listError } = await listObservacoes(
      entidadeTipo,
      entidadeId,
    );
    if (listError) {
      setError(listError);
      setItems([]);
      setLoading(false);
      return;
    }
    setItems(data);
    const ids = data
      .map((o) => o.usuario)
      .filter((id): id is string => Boolean(id));
    const resolved = await resolveUserDisplayNames(ids);
    setNames(resolved);
    setLoading(false);
  }, [entidadeTipo, entidadeId]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const texto = mensagem.trim();
    if (!texto) return;

    startTransition(async () => {
      setError(null);
      const { data, error: createError } = await createObservacao({
        entidadeTipo,
        entidadeId,
        mensagem: texto,
      });

      if (createError || !data) {
        setError(createError ?? "Erro ao salvar observação.");
        return;
      }

      if (data.usuario && !names[data.usuario]) {
        const resolved = await resolveUserDisplayNames([data.usuario]);
        setNames((prev) => ({ ...prev, ...resolved }));
      }

      setItems((prev) => [data, ...prev]);
      setMensagem("");
    });
  }

  function displayName(usuario: string | null): string {
    if (!usuario) return "Usuário desconhecido";
    return names[usuario] ?? `Usuário ${usuario.slice(0, 8)}`;
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          rows={3}
          placeholder="Escreva uma nova observação..."
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          disabled={pending}
        />
        <div className="flex items-center justify-between gap-3">
          {error ? (
            <p className="text-xs text-danger-fg">{error}</p>
          ) : (
            <span className="text-xs text-muted">
              Publicada na timeline desta entidade.
            </span>
          )}
          <Button type="submit" disabled={pending || !mensagem.trim()}>
            {pending ? "Salvando…" : "Adicionar observação"}
          </Button>
        </div>
      </form>

      {loading ? (
        <p className="py-4 text-center text-sm text-muted">
          Carregando observações…
        </p>
      ) : items.length === 0 ? (
        <EmptyState>Nenhuma observação registrada.</EmptyState>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {items.map((item) => (
            <li key={item.id} className="py-3">
              <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-xs font-semibold text-muted-strong">
                  {displayName(item.usuario)}
                </span>
                <span className="text-[11px] text-muted">
                  {formatObservacaoDataHora(item.data_hora)}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-strong">
                {item.mensagem}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
