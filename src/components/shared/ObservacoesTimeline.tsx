"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Button, EmptyState, Textarea } from "@/components/ui/Form";
import { formatObservacaoDataHora } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import {
  createObservacao,
  deleteObservacao,
  listObservacoes,
  resolveUserDisplayNames,
  updateObservacao,
} from "@/lib/supabase/observacoes";
import type { EntidadeTipo, Observacao } from "@/lib/types";

type Props = {
  entidadeTipo: EntidadeTipo;
  entidadeId: string;
};

export function ObservacoesTimeline({ entidadeTipo, entidadeId }: Props) {
  const [items, setItems] = useState<Observacao[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTexto, setEditTexto] = useState("");
  const [itemPendingId, setItemPendingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setCurrentUserId(data.user?.id ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  function startEdit(item: Observacao) {
    if (!currentUserId || item.usuario !== currentUserId) return;
    setError(null);
    setEditingId(item.id);
    setEditTexto(item.mensagem);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTexto("");
  }

  function handleSaveEdit(id: string) {
    const item = items.find((o) => o.id === id);
    if (!currentUserId || item?.usuario !== currentUserId) {
      setError("Só o autor pode editar esta observação.");
      return;
    }
    const texto = editTexto.trim();
    if (!texto) {
      setError("A observação não pode ficar vazia.");
      return;
    }

    setItemPendingId(id);
    startTransition(async () => {
      setError(null);
      const { data, error: updateError } = await updateObservacao(id, texto);
      setItemPendingId(null);

      if (updateError || !data) {
        setError(updateError ?? "Erro ao atualizar observação.");
        return;
      }

      setItems((prev) => prev.map((o) => (o.id === id ? data : o)));
      setEditingId(null);
      setEditTexto("");
    });
  }

  function handleDelete(id: string) {
    const item = items.find((o) => o.id === id);
    if (!currentUserId || item?.usuario !== currentUserId) {
      setError("Só o autor pode excluir esta observação.");
      return;
    }
    if (!window.confirm("Excluir esta observação?")) return;

    setItemPendingId(id);
    startTransition(async () => {
      setError(null);
      const { error: deleteError } = await deleteObservacao(id);
      setItemPendingId(null);

      if (deleteError) {
        setError(deleteError);
        return;
      }

      setItems((prev) => prev.filter((o) => o.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setEditTexto("");
      }
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {error ? (
            <p className="text-xs text-danger-fg">{error}</p>
          ) : (
            <span className="text-xs text-muted">
              Publicada na timeline desta entidade.
            </span>
          )}
          <Button
            type="submit"
            className="h-11 min-h-[44px] w-full sm:h-8 sm:min-h-0 sm:w-auto"
            disabled={pending || !mensagem.trim()}
          >
            {pending && !itemPendingId ? "Salvando…" : "Adicionar observação"}
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
          {items.map((item) => {
            const isEditing = editingId === item.id;
            const itemBusy = itemPendingId === item.id;
            const isAuthor =
              Boolean(currentUserId) && item.usuario === currentUserId;

            return (
              <li key={item.id} className="py-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-xs font-semibold text-muted-strong">
                      {displayName(item.usuario)}
                    </span>
                    <span className="text-[11px] text-muted">
                      {formatObservacaoDataHora(item.data_hora)}
                    </span>
                  </div>

                  {isAuthor && !isEditing ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-7 px-2.5 text-[11px]"
                        onClick={() => startEdit(item)}
                        disabled={pending || Boolean(editingId)}
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        className="h-7 px-2.5 text-[11px]"
                        onClick={() => handleDelete(item.id)}
                        disabled={pending || Boolean(editingId)}
                      >
                        {itemBusy ? "Excluindo…" : "Excluir"}
                      </Button>
                    </div>
                  ) : null}
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      rows={3}
                      value={editTexto}
                      onChange={(e) => setEditTexto(e.target.value)}
                      disabled={itemBusy}
                      autoFocus
                    />
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-7 px-2.5 text-[11px]"
                        onClick={cancelEdit}
                        disabled={itemBusy}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        className="h-7 px-2.5 text-[11px]"
                        onClick={() => handleSaveEdit(item.id)}
                        disabled={itemBusy || !editTexto.trim()}
                      >
                        {itemBusy ? "Salvando…" : "Salvar"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-strong">
                    {item.mensagem}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
