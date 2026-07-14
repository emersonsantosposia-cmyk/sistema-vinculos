"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Button,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/Form";
import { PessoaAvatar } from "@/components/pessoas/PessoaAvatar";
import {
  createVinculo,
  deleteVinculo,
  listVinculosDaEntidade,
  searchEntidades,
} from "@/lib/supabase/vinculos";
import { ENTIDADE_TIPOS, type EntidadeTipo } from "@/lib/types";
import {
  ENTIDADE_HREFS,
  ENTIDADE_LABELS,
  ENTIDADE_VINCULOS_ADD,
  ENTIDADE_VINCULOS_TITULOS,
  TIPOS_VINCULO_COMUNS,
  type EntidadeOpcao,
  type VinculoCard,
} from "@/lib/vinculos-types";

type Props = {
  entidadeTipo: EntidadeTipo;
  entidadeId: string;
};

function VinculoPessoaCard({
  card,
  pending,
  onRemover,
}: {
  card: VinculoCard;
  pending: boolean;
  onRemover: (id: string) => void;
}) {
  const href = `${ENTIDADE_HREFS.pessoa}/${card.outroId}`;

  return (
    <div className="rounded border border-border bg-white px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={href}
          className="flex min-w-0 items-center gap-3 font-medium text-zinc-900 hover:underline"
        >
          <PessoaAvatar
            path={card.foto_perfil_path}
            nome={card.titulo}
            size="md"
          />
          <span className="truncate text-xs">{card.titulo}</span>
        </Link>
        <Button
          type="button"
          variant="ghost"
          className="shrink-0 text-xs text-red-700 hover:bg-red-50"
          onClick={() => onRemover(card.id)}
          disabled={pending}
        >
          Remover
        </Button>
      </div>
    </div>
  );
}

function VinculoListaItem({
  card,
  pending,
  onRemover,
}: {
  card: VinculoCard;
  pending: boolean;
  onRemover: (id: string) => void;
}) {
  const href = `${ENTIDADE_HREFS[card.outroTipo]}/${card.outroId}`;
  const meta = [card.subtitulo, card.tipo_vinculo, card.observacao]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex items-start justify-between gap-2 py-2 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <Link
          href={href}
          className="text-sm font-medium text-zinc-900 hover:underline"
        >
          {card.titulo}
        </Link>
        {meta ? <p className="mt-0.5 text-xs text-muted">{meta}</p> : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        className="shrink-0 text-xs text-red-700 hover:bg-red-50"
        onClick={() => onRemover(card.id)}
        disabled={pending}
      >
        Remover
      </Button>
    </li>
  );
}

export function VinculosSection({ entidadeTipo, entidadeId }: Props) {
  const [cards, setCards] = useState<VinculoCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [destinoTipo, setDestinoTipo] = useState<EntidadeTipo>("pessoa");
  const [busca, setBusca] = useState("");
  const [opcoes, setOpcoes] = useState<EntidadeOpcao[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [selecionada, setSelecionada] = useState<EntidadeOpcao | null>(null);
  const [tipoVinculo, setTipoVinculo] = useState<string>("");
  const [tipoVinculoCustom, setTipoVinculoCustom] = useState("");
  const [observacao, setObservacao] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Tipos com accordion aberto (por padrão: só os que têm vínculos). */
  const [abertos, setAbertos] = useState<Set<EntidadeTipo>>(new Set());
  const abertosInitRef = useRef(false);

  const cardsPorTipo = useMemo(() => {
    const map = new Map<EntidadeTipo, VinculoCard[]>();
    for (const tipo of ENTIDADE_TIPOS) map.set(tipo, []);
    for (const card of cards) {
      const list = map.get(card.outroTipo) ?? [];
      list.push(card);
      map.set(card.outroTipo, list);
    }
    return map;
  }, [cards]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: listError } = await listVinculosDaEntidade(
      entidadeTipo,
      entidadeId,
    );
    if (listError) setError(listError);
    setCards(data);
    setLoading(false);

    if (!abertosInitRef.current) {
      abertosInitRef.current = true;
      const withItems = new Set<EntidadeTipo>();
      for (const c of data) withItems.add(c.outroTipo);
      // Se nenhum vínculo, deixa a 1ª seção aberta para orientar o usuário
      if (withItems.size === 0) withItems.add(ENTIDADE_TIPOS[0]);
      setAbertos(withItems);
    }
  }, [entidadeTipo, entidadeId]);

  useEffect(() => {
    abertosInitRef.current = false;
    void load();
  }, [load]);

  useEffect(() => {
    if (!formOpen) return;
    if (selecionada) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      const { data, error: searchError } = await searchEntidades(
        destinoTipo,
        busca,
      );
      setBuscando(false);
      if (searchError) {
        setError(searchError);
        setOpcoes([]);
        return;
      }
      setOpcoes(
        data.filter(
          (o) => !(destinoTipo === entidadeTipo && o.id === entidadeId),
        ),
      );
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    formOpen,
    destinoTipo,
    busca,
    selecionada,
    entidadeTipo,
    entidadeId,
  ]);

  function resetFormFields() {
    setBusca("");
    setOpcoes([]);
    setSelecionada(null);
    setTipoVinculo("");
    setTipoVinculoCustom("");
    setObservacao("");
  }

  function abrirFormulario(tipo: EntidadeTipo) {
    setDestinoTipo(tipo);
    resetFormFields();
    setError(null);
    setFormOpen(true);
    setAbertos((prev) => new Set(prev).add(tipo));
  }

  function fecharFormulario() {
    setFormOpen(false);
    resetFormFields();
  }

  function toggleSecao(tipo: EntidadeTipo) {
    setAbertos((prev) => {
      const next = new Set(prev);
      if (next.has(tipo)) next.delete(tipo);
      else next.add(tipo);
      return next;
    });
  }

  function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!selecionada) {
      setError("Selecione a entidade a vincular.");
      return;
    }
    const tipoFinal =
      tipoVinculo === "__custom"
        ? tipoVinculoCustom.trim()
        : tipoVinculo.trim();

    startTransition(async () => {
      setError(null);
      const { error: createError } = await createVinculo({
        origemTipo: entidadeTipo,
        origemId: entidadeId,
        destinoTipo,
        destinoId: selecionada.id,
        tipoVinculo: tipoFinal || null,
        observacao,
      });
      if (createError) {
        setError(createError);
        return;
      }
      fecharFormulario();
      await load();
      setAbertos((prev) => new Set(prev).add(destinoTipo));
    });
  }

  function handleRemover(id: string) {
    if (!window.confirm("Remover este vínculo?")) return;
    startTransition(async () => {
      setError(null);
      const { error: deleteError } = await deleteVinculo(id);
      if (deleteError) {
        setError(deleteError);
        return;
      }
      setCards((prev) => prev.filter((c) => c.id !== id));
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Relações desta entidade com outras do sistema, agrupadas por tipo.
      </p>

      {error ? (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </p>
      ) : null}

      {formOpen ? (
        <form
          onSubmit={handleSalvar}
          className="space-y-3 rounded border border-border bg-zinc-50 p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-zinc-900">
                Novo vínculo com {ENTIDADE_LABELS[destinoTipo].toLowerCase()}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Tipo de destino pré-selecionado. Busque e escolha o registro.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={fecharFormulario}
              disabled={pending}
            >
              Cancelar
            </Button>
          </div>

          <div>
            <Label htmlFor="destino_tipo">Tipo da entidade</Label>
            <Select
              id="destino_tipo"
              value={destinoTipo}
              onChange={(e) => {
                setDestinoTipo(e.target.value as EntidadeTipo);
                setSelecionada(null);
                setBusca("");
                setOpcoes([]);
              }}
              disabled={pending}
            >
              {ENTIDADE_TIPOS.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {ENTIDADE_LABELS[tipo]}
                </option>
              ))}
            </Select>
          </div>

          <div>
            {selecionada ? (
              <>
                <Label>Entidade</Label>
                <div className="flex items-center justify-between gap-2 rounded border border-zinc-300 bg-white px-2.5 py-1.5">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {selecionada.titulo}
                    </p>
                    {selecionada.subtitulo ? (
                      <p className="text-xs text-muted">
                        {selecionada.subtitulo}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setSelecionada(null)}
                    disabled={pending}
                  >
                    Trocar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Label htmlFor="busca_entidade">Buscar entidade</Label>
                <Input
                  id="busca_entidade"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder={`Buscar ${ENTIDADE_LABELS[destinoTipo].toLowerCase()}…`}
                  disabled={pending}
                  autoComplete="off"
                />
                <div className="mt-1 max-h-44 overflow-auto rounded border border-border bg-white">
                  {buscando ? (
                    <p className="px-3 py-2 text-xs text-muted">Buscando…</p>
                  ) : opcoes.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted">
                      Nenhum resultado. Digite para buscar.
                    </p>
                  ) : (
                    <ul>
                      {opcoes.map((opcao) => (
                        <li key={opcao.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-zinc-50"
                            onClick={() => {
                              setSelecionada(opcao);
                              setBusca("");
                              setOpcoes([]);
                            }}
                          >
                            <p className="text-sm font-medium text-zinc-900">
                              {opcao.titulo}
                            </p>
                            {opcao.subtitulo ? (
                              <p className="text-xs text-muted">
                                {opcao.subtitulo}
                              </p>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>

          <div>
            <Label htmlFor="tipo_vinculo">Tipo de vínculo</Label>
            <Select
              id="tipo_vinculo"
              value={tipoVinculo}
              onChange={(e) => setTipoVinculo(e.target.value)}
              disabled={pending}
            >
              <option value="">Selecione ou personalize</option>
              {TIPOS_VINCULO_COMUNS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value="__custom">Outro (digitar)…</option>
            </Select>
            {tipoVinculo === "__custom" ? (
              <Input
                className="mt-2"
                value={tipoVinculoCustom}
                onChange={(e) => setTipoVinculoCustom(e.target.value)}
                placeholder="Descreva o tipo de vínculo"
                disabled={pending}
              />
            ) : null}
          </div>

          <div>
            <Label htmlFor="obs_vinculo">Observação (opcional)</Label>
            <Textarea
              id="obs_vinculo"
              rows={2}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              disabled={pending}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={pending || !selecionada}>
              {pending ? "Salvando…" : "Salvar vínculo"}
            </Button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <p className="py-4 text-center text-sm text-muted">
          Carregando vínculos…
        </p>
      ) : (
        <div className="space-y-2">
          {ENTIDADE_TIPOS.map((tipo) => {
            const items = cardsPorTipo.get(tipo) ?? [];
            const aberto = abertos.has(tipo);
            return (
              <section
                key={tipo}
                className="overflow-hidden rounded border border-border bg-panel"
              >
                <button
                  type="button"
                  onClick={() => toggleSecao(tipo)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-zinc-50"
                  aria-expanded={aberto}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={`text-zinc-400 transition-transform ${aberto ? "rotate-90" : ""}`}
                      aria-hidden
                    >
                      ▸
                    </span>
                    <span className="text-sm font-semibold text-zinc-900">
                      {ENTIDADE_VINCULOS_TITULOS[tipo]}
                    </span>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                      {items.length}
                    </span>
                  </span>
                </button>

                {aberto ? (
                  <div className="space-y-2 border-t border-border px-3 py-3">
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        className="text-xs"
                        onClick={() => abrirFormulario(tipo)}
                        disabled={pending}
                      >
                        + Adicionar vínculo com {ENTIDADE_VINCULOS_ADD[tipo]}
                      </Button>
                    </div>

                    {items.length === 0 ? (
                      <p className="py-1 text-xs text-muted">
                        Nenhum vínculo cadastrado
                      </p>
                    ) : tipo === "pessoa" ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {items.map((card) => (
                          <VinculoPessoaCard
                            key={card.id}
                            card={card}
                            pending={pending}
                            onRemover={handleRemover}
                          />
                        ))}
                      </div>
                    ) : (
                      <ul className="divide-y divide-border rounded border border-border bg-white px-3">
                        {items.map((card) => (
                          <VinculoListaItem
                            key={card.id}
                            card={card}
                            pending={pending}
                            onRemover={handleRemover}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
