"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  Button,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/Form";
import { PessoaAvatar } from "@/components/pessoas/PessoaAvatar";
import { VeiculoAvatar } from "@/components/veiculos/VeiculoAvatar";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import {
  createVinculo,
  deleteVinculo,
  listVinculosDaEntidade,
  searchEntidades,
  updateVinculo,
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

type FormMode = "create" | "edit";

function resolveTipoSelectValue(tipo: string | null | undefined): {
  select: string;
  custom: string;
} {
  if (!tipo) return { select: "", custom: "" };
  if ((TIPOS_VINCULO_COMUNS as readonly string[]).includes(tipo)) {
    return { select: tipo, custom: "" };
  }
  return { select: "__custom", custom: tipo };
}

/** Primeira letra maiúscula; restante em minúsculas. */
function formatTipoVinculoLabel(tipo: string | null | undefined): string {
  const raw = tipo?.trim();
  if (!raw) return "Sem tipo";
  const lower = raw.toLocaleLowerCase("pt-BR");
  return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
}

function VinculoCardBox({
  card,
  pending,
  onRemover,
  onEditar,
  onDetalhe,
}: {
  card: VinculoCard;
  pending: boolean;
  onRemover: (id: string) => void;
  onEditar: (card: VinculoCard) => void;
  onDetalhe: (card: VinculoCard) => void;
}) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isPessoa = card.outroTipo === "pessoa";
  const isVeiculo = card.outroTipo === "veiculo";
  const isRestrito = Boolean(card.restrito);
  const showSubtitulo =
    !isRestrito &&
    (card.outroTipo === "veiculo" || card.outroTipo === "endereco") &&
    Boolean(card.subtitulo);
  const tipoLabel = formatTipoVinculoLabel(card.tipo_vinculo);
  const entidadeHref = `${ENTIDADE_HREFS[card.outroTipo]}/${card.outroId}`;
  const entidadeTipoLabel = ENTIDADE_LABELS[card.outroTipo];

  useEffect(() => {
    if (!menu) return;

    function close() {
      setMenu(null);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    function onPointerDown(e: MouseEvent) {
      if (menuRef.current?.contains(e.target as Node)) return;
      close();
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("scroll", close, true);
    };
  }, [menu]);

  function openMenu(e: React.MouseEvent) {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  }

  const cardContent = isRestrito ? (
    <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="truncate text-[11px] font-medium normal-case text-gold">
          {tipoLabel}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted">
          {entidadeTipoLabel}
        </p>
        <p className="mt-0.5 truncate text-sm font-medium text-muted-strong italic">
          {card.titulo}
        </p>
      </div>
    </div>
  ) : isPessoa ? (
    <div className="flex flex-1 flex-col items-center gap-3 text-center">
      <button
        type="button"
        className="w-full text-[11px] font-medium normal-case text-gold break-words hover:text-gold-bright hover:underline"
        onClick={() => onDetalhe(card)}
        title="Ver detalhes do vínculo"
      >
        {tipoLabel}
      </button>
      <PessoaAvatar
        path={card.foto_perfil_path}
        nome={card.titulo}
        size="card"
      />
      <Link
        href={entidadeHref}
        className="w-full text-sm font-semibold text-foreground break-words hover:text-gold hover:underline"
        title={`Abrir ${ENTIDADE_LABELS[card.outroTipo].toLowerCase()}`}
      >
        {card.titulo}
      </Link>
    </div>
  ) : (
    <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
      {isVeiculo ? (
        <VeiculoAvatar
          path={card.foto_url}
          alt={card.titulo}
          size="md"
          className="shrink-0"
        />
      ) : null}
      <div className="min-w-0 flex-1 overflow-hidden">
        <button
          type="button"
          className="block w-full truncate text-left text-[11px] font-medium normal-case text-gold hover:text-gold-bright hover:underline"
          onClick={() => onDetalhe(card)}
          title="Ver detalhes do vínculo"
        >
          {tipoLabel}
        </button>
        <Link
          href={entidadeHref}
          className="mt-0.5 block truncate text-sm font-medium text-foreground hover:text-gold hover:underline"
          title={`Abrir ${ENTIDADE_LABELS[card.outroTipo].toLowerCase()}`}
        >
          {card.titulo}
        </Link>
        {showSubtitulo ? (
          <p
            className="mt-0.5 truncate text-xs text-muted"
            title={card.subtitulo ?? undefined}
          >
            {card.subtitulo}
          </p>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      <div
        className={
          isPessoa
            ? "flex h-full flex-col rounded border border-border bg-panel px-4 py-4 transition-colors hover:border-border-strong"
            : "rounded border border-border bg-panel px-3 py-2.5 transition-colors hover:border-border-strong"
        }
        onContextMenu={openMenu}
      >
        {cardContent}
      </div>

      {menu ? (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[9.5rem] rounded border border-border bg-panel py-1 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
          style={{ left: menu.x, top: menu.y }}
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left text-sm text-gold hover:bg-panel-hover disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => {
              setMenu(null);
              onEditar(card);
            }}
            disabled={pending}
          >
            Editar
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left text-sm text-danger-fg hover:bg-danger-bg disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => {
              setMenu(null);
              onRemover(card.id);
            }}
            disabled={pending}
          >
            Remover
          </button>
        </div>
      ) : null}
    </>
  );
}

function VinculoDetalheModal({
  card,
  onClose,
}: {
  card: VinculoCard;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vinculo-detalhe-titulo"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-md border border-border bg-panel p-4 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              id="vinculo-detalhe-titulo"
              className="text-sm font-bold tracking-[0.14em] text-gold uppercase"
            >
              Detalhes do vínculo
            </p>
            <p className="mt-1 text-sm text-foreground">{card.titulo}</p>
            <p className="mt-0.5 text-xs text-muted">
              {ENTIDADE_LABELS[card.outroTipo]}
              {card.tipo_vinculo
                ? ` · ${formatTipoVinculoLabel(card.tipo_vinculo)}`
                : ""}
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <dl className="mt-4 space-y-3 border-t border-border pt-3">
          <div>
            <dt className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
              Usuário
            </dt>
            <dd className="mt-0.5 text-sm text-foreground">
              {card.usuario_nome?.trim() || "Não informado"}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
              Data de criação
            </dt>
            <dd className="mt-0.5 text-sm text-foreground">
              {formatDateTime(card.data_cadastro)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
              Fundamentação
            </dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">
              {card.fundamentacao?.trim() || "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex justify-end">
          {card.restrito ? (
            <p className="text-xs text-muted italic">
              Sem permissão para abrir este registro.
            </p>
          ) : (
            <a
              href={`${ENTIDADE_HREFS[card.outroTipo]}/${card.outroId}`}
              className="btn-acao-secundario text-xs"
            >
              Abrir entidade
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function VinculosSection({ entidadeTipo, entidadeId }: Props) {
  const [cards, setCards] = useState<VinculoCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<VinculoCard | null>(null);
  const [pending, startTransition] = useTransition();

  const [usuarioAtualNome, setUsuarioAtualNome] = useState<string>("Carregando…");
  const [dataCriacaoPreview, setDataCriacaoPreview] = useState(
    () => new Date().toISOString(),
  );

  const [destinoTipo, setDestinoTipo] = useState<EntidadeTipo>("pessoa");
  const [busca, setBusca] = useState("");
  const [opcoes, setOpcoes] = useState<EntidadeOpcao[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [selecionada, setSelecionada] = useState<EntidadeOpcao | null>(null);
  const [tipoVinculo, setTipoVinculo] = useState<string>("");
  const [tipoVinculoCustom, setTipoVinculoCustom] = useState("");
  const [fundamentacao, setFundamentacao] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [abertos, setAbertos] = useState<Set<EntidadeTipo>>(new Set());

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

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setUsuarioAtualNome("Usuário não identificado");
        return;
      }
      setUsuarioAtualNome(
        (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          user.email?.split("@")[0] ||
          user.email ||
          "Você",
      );
    });
  }, []);

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
  }, [entidadeTipo, entidadeId]);

  useEffect(() => {
    setAbertos(new Set());
    void load();
  }, [load]);

  useEffect(() => {
    if (!formOpen || formMode !== "create") return;
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
    formMode,
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
    setFundamentacao("");
    setEditandoId(null);
    setFormMode("create");
    setDataCriacaoPreview(new Date().toISOString());
  }

  function abrirFormulario(tipo: EntidadeTipo) {
    setDestinoTipo(tipo);
    resetFormFields();
    setError(null);
    setFormOpen(true);
    setFormMode("create");
    setAbertos((prev) => new Set(prev).add(tipo));
  }

  function abrirEdicao(card: VinculoCard) {
    const tipoVals = resolveTipoSelectValue(card.tipo_vinculo);
    setFormMode("edit");
    setEditandoId(card.id);
    setDestinoTipo(card.outroTipo);
    setSelecionada({
      id: card.outroId,
      titulo: card.titulo,
      subtitulo: card.subtitulo,
      foto_perfil_path: card.foto_perfil_path,
      foto_url: card.foto_url,
    });
    setTipoVinculo(tipoVals.select);
    setTipoVinculoCustom(tipoVals.custom);
    setFundamentacao(card.fundamentacao ?? "");
    setDataCriacaoPreview(card.data_cadastro);
    setError(null);
    setFormOpen(true);
    setAbertos((prev) => new Set(prev).add(card.outroTipo));
    setDetalhe(null);
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
    const tipoFinal =
      tipoVinculo === "__custom"
        ? tipoVinculoCustom.trim()
        : tipoVinculo.trim();
    const fundamentacaoFinal = fundamentacao.trim();

    if (!fundamentacaoFinal) {
      setError("Informe a fundamentação do vínculo.");
      return;
    }

    if (formMode === "edit" && editandoId) {
      startTransition(async () => {
        setError(null);
        const { error: updateError } = await updateVinculo(editandoId, {
          tipoVinculo: tipoFinal || null,
          fundamentacao: fundamentacaoFinal,
        });
        if (updateError) {
          setError(updateError);
          return;
        }
        fecharFormulario();
        await load();
      });
      return;
    }

    if (!selecionada) {
      setError("Selecione a entidade a vincular.");
      return;
    }

    startTransition(async () => {
      setError(null);
      const { error: createError } = await createVinculo({
        origemTipo: entidadeTipo,
        origemId: entidadeId,
        destinoTipo,
        destinoId: selecionada.id,
        tipoVinculo: tipoFinal || null,
        fundamentacao: fundamentacaoFinal,
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
      if (detalhe?.id === id) setDetalhe(null);
    });
  }

  const formUsuarioLabel =
    formMode === "edit"
      ? cards.find((c) => c.id === editandoId)?.usuario_nome ||
        usuarioAtualNome
      : usuarioAtualNome;

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!formOpen) return;
    formRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [formOpen, formMode, editandoId, destinoTipo]);

  function renderVinculoForm(mode: FormMode) {
    return (
      <form
        ref={formRef}
        onSubmit={handleSalvar}
        className="space-y-3 rounded border border-border bg-panel-soft p-3"
      >
        {error ? (
          <p className="rounded border border-danger-border bg-danger-bg px-3 py-2 text-xs text-danger-fg">
            {error}
          </p>
        ) : null}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-foreground">
              {mode === "edit"
                ? "Editar vínculo"
                : `Novo vínculo com ${ENTIDADE_LABELS[destinoTipo].toLowerCase()}`}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {mode === "edit"
                ? "Altere o tipo de vínculo ou a fundamentação."
                : "Tipo de destino pré-selecionado. Busque e escolha o registro."}
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

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Usuário</Label>
            <Input value={formUsuarioLabel} readOnly disabled />
          </div>
          <div>
            <Label>Data de criação</Label>
            <Input
              value={formatDateTime(dataCriacaoPreview)}
              readOnly
              disabled
            />
          </div>
        </div>

        {mode === "create" ? (
          <div>
            <Label htmlFor="destino_tipo">Tipo da entidade</Label>
            <Select
              id="destino_tipo"
              value={destinoTipo}
              onChange={(e) => {
                const next = e.target.value as EntidadeTipo;
                setDestinoTipo(next);
                setSelecionada(null);
                setBusca("");
                setOpcoes([]);
                setAbertos((prev) => new Set(prev).add(next));
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
        ) : null}

        <div>
          {selecionada ? (
            <>
              <Label>Entidade</Label>
              <div className="flex items-center justify-between gap-2 rounded border border-border bg-panel px-2.5 py-1.5">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {selecionada.titulo}
                  </p>
                  {selecionada.subtitulo ? (
                    <p className="text-xs text-muted">{selecionada.subtitulo}</p>
                  ) : null}
                </div>
                {mode === "create" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setSelecionada(null)}
                    disabled={pending}
                  >
                    Trocar
                  </Button>
                ) : null}
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
              <div className="mt-1 max-h-44 overflow-auto rounded border border-border bg-panel">
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
                          className="w-full px-3 py-2 text-left hover:bg-panel-hover"
                          onClick={() => {
                            setSelecionada(opcao);
                            setBusca("");
                            setOpcoes([]);
                          }}
                        >
                          <p className="text-sm font-medium text-foreground">
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
          <Label htmlFor={`tipo_vinculo_${mode}`}>Tipo de vínculo</Label>
          <Select
            id={`tipo_vinculo_${mode}`}
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
          <Label htmlFor={`fundamentacao_vinculo_${mode}`}>
            Fundamentação
          </Label>
          <Textarea
            id={`fundamentacao_vinculo_${mode}`}
            rows={3}
            value={fundamentacao}
            onChange={(e) => setFundamentacao(e.target.value)}
            placeholder="Descreva a fundamentação deste vínculo"
            disabled={pending}
            required
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={
              pending ||
              !fundamentacao.trim() ||
              (mode === "create" && !selecionada)
            }
          >
            {pending
              ? "Salvando…"
              : mode === "edit"
                ? "Salvar alterações"
                : "Salvar vínculo"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Relações desta entidade com outras do sistema, agrupadas por tipo.
      </p>

      {error ? (
        <p className="rounded border border-danger-border bg-danger-bg px-3 py-2 text-xs text-danger-fg">
          {error}
        </p>
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
            const mostrandoFormCriacao =
              formOpen && formMode === "create" && destinoTipo === tipo;
            return (
              <section
                key={tipo}
                className="overflow-hidden rounded border border-border bg-panel"
              >
                <button
                  type="button"
                  onClick={() => toggleSecao(tipo)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-panel-hover"
                  aria-expanded={aberto}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={`text-muted transition-transform ${aberto ? "rotate-90" : ""}`}
                      aria-hidden
                    >
                      ▸
                    </span>
                    <span className="text-sm font-bold tracking-[0.12em] text-gold uppercase">
                      {ENTIDADE_VINCULOS_TITULOS[tipo]}
                    </span>
                    <span className="rounded bg-panel-soft px-1.5 py-0.5 text-[10px] font-medium text-muted">
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

                    {mostrandoFormCriacao ? renderVinculoForm("create") : null}

                    {items.length === 0 && !mostrandoFormCriacao ? (
                      <p className="py-1 text-xs text-muted">
                        Nenhum vínculo cadastrado
                      </p>
                    ) : (
                      <div
                        className={
                          tipo === "pessoa"
                            ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                            : "grid gap-2"
                        }
                      >
                        {items.map((card) =>
                          formOpen &&
                          formMode === "edit" &&
                          editandoId === card.id ? (
                            <div
                              key={card.id}
                              className={
                                tipo === "pessoa" ? "col-span-full" : undefined
                              }
                            >
                              {renderVinculoForm("edit")}
                            </div>
                          ) : (
                            <VinculoCardBox
                              key={card.id}
                              card={card}
                              pending={pending}
                              onRemover={handleRemover}
                              onEditar={abrirEdicao}
                              onDetalhe={setDetalhe}
                            />
                          ),
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      {detalhe ? (
        <VinculoDetalheModal
          card={detalhe}
          onClose={() => setDetalhe(null)}
        />
      ) : null}
    </div>
  );
}
