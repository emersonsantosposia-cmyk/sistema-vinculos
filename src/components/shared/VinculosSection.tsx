"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  Button,
  Input,
  Label,
  Panel,
  Textarea,
} from "@/components/ui/Form";
import { ModalShell } from "@/components/ui/ModalShell";
import { PessoaAvatar } from "@/components/pessoas/PessoaAvatar";
import { EntidadeStorageAvatar } from "@/components/shared/EntidadeStorageAvatar";
import { VeiculoAvatar } from "@/components/veiculos/VeiculoAvatar";
import { clampFixedMenuPosition } from "@/lib/clamp-fixed-menu";
import { fotoBucketForEntidade } from "@/lib/entity-fotos";
import { formatDateTime } from "@/lib/format";
import {
  createVinculo,
  deleteVinculo,
  getEntidadeResumo,
  listTiposVinculoSugeridos,
  listVinculosDaEntidade,
  searchEntidades,
  updateVinculo,
} from "@/lib/supabase/vinculos";
import { ENTIDADE_TIPOS, type EntidadeTipo } from "@/lib/types";
import {
  formatTipoVinculoLabel,
  inversoSugeridoDeTermo,
  rotuloTipoVinculoDoCard,
  termosDiretosUnicos,
  termosInversosUnicos,
} from "@/lib/vinculos-format";
import {
  ENTIDADE_HREFS,
  ENTIDADE_LABELS,
  ENTIDADE_VINCULOS_ADD,
  ENTIDADE_VINCULOS_TITULOS,
  type EntidadeOpcao,
  type TipoVinculoSugerido,
  type VinculoCard,
} from "@/lib/vinculos-types";

type Props = {
  entidadeTipo: EntidadeTipo;
  entidadeId: string;
};

type FormMode = "create" | "edit";

/** Altura fixa da grade desktop: 4 linhas de cards + 3 gaps (gap-2). */
const PESSOAS_CARD_H = "h-[7.5rem]";
const PESSOAS_GRADE_MAX_H =
  "max-h-[calc(4*7.5rem+3*0.5rem)]";

function TipoVinculoCombobox({
  id,
  label,
  value,
  onChange,
  sugestoes,
  disabled,
  listId,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  sugestoes: string[];
  disabled?: boolean;
  listId: string;
}) {
  const hasSugestoes = sugestoes.length > 0;
  return (
    <div>
      {/* Sem uppercase: preserva nomes das entidades no rótulo direcional. */}
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-medium text-muted-strong"
      >
        {label}
      </label>
      <Input
        id={id}
        list={hasSugestoes ? listId : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          hasSugestoes
            ? "Digite ou escolha uma sugestão"
            : "Digite o tipo de vínculo"
        }
        disabled={disabled}
        autoComplete="off"
      />
      {hasSugestoes ? (
        <datalist id={listId}>
          {sugestoes.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      ) : null}
    </div>
  );
}

function VinculoCardBox({
  card,
  pending,
  onRemover,
  onEditar,
  onDetalhe,
  variant = "default",
}: {
  card: VinculoCard;
  pending: boolean;
  onRemover: (id: string) => void;
  onEditar: (card: VinculoCard) => void;
  onDetalhe: (card: VinculoCard) => void;
  /** Grade compacta desktop: só avatar + nome. */
  variant?: "default" | "compact";
}) {
  const { entidadeTipo: paginaTipo } = useVinculosContext();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isPessoa = card.outroTipo === "pessoa";
  const isCompact = variant === "compact" && isPessoa;
  const isVeiculo = card.outroTipo === "veiculo";
  const fotoBucket = fotoBucketForEntidade(card.outroTipo);
  const isRestrito = Boolean(card.restrito);
  const showSubtitulo =
    !isRestrito &&
    (card.outroTipo === "veiculo" || card.outroTipo === "endereco") &&
    Boolean(card.subtitulo);
  /**
   * Pessoa: papel da pessoa, exceto em endereço/empresa (papel da entidade
   * da página: Residência de, Local de trabalho de, Pertence a, …).
   */
  const tipoParaRotulo = rotuloTipoVinculoDoCard(card, paginaTipo);
  const tipoLabel = formatTipoVinculoLabel(tipoParaRotulo);
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

  useLayoutEffect(() => {
    if (!menu) return;
    const el = menuRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const next = clampFixedMenuPosition(menu.x, menu.y, width, height);
    if (next.x !== menu.x || next.y !== menu.y) {
      setMenu(next);
    }
  }, [menu]);

  function openMenu(e: React.MouseEvent) {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  }

  function linkAbsoluto(): string {
    if (typeof window === "undefined") return entidadeHref;
    return new URL(entidadeHref, window.location.origin).href;
  }

  function abrirEmNovaAba() {
    setMenu(null);
    window.open(entidadeHref, "_blank", "noopener,noreferrer");
  }

  function abrirEmNovaJanela() {
    setMenu(null);
    window.open(
      entidadeHref,
      "_blank",
      "noopener,noreferrer,width=1100,height=800",
    );
  }

  async function copiarEndereco() {
    setMenu(null);
    try {
      await navigator.clipboard.writeText(linkAbsoluto());
    } catch {
      // Fallback silencioso se clipboard estiver bloqueado.
    }
  }

  const cardContent = isRestrito ? (
    isCompact ? (
      <div className="flex h-full flex-col items-center gap-1 text-center">
        <p className="line-clamp-1 w-full text-[10px] font-medium normal-case leading-tight text-gold">
          {tipoLabel}
        </p>
        <PessoaAvatar nome={card.titulo} size="compact" />
        <p className="line-clamp-2 w-full text-[11px] leading-tight font-medium text-muted-strong italic">
          {card.titulo}
        </p>
      </div>
    ) : (
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
    )
  ) : isCompact ? (
    <div className="flex h-full flex-col items-center gap-1 text-center">
      <button
        type="button"
        className="line-clamp-1 w-full text-[10px] font-medium normal-case leading-tight text-gold hover:text-gold-bright hover:underline"
        onClick={() => onDetalhe(card)}
        title="Ver detalhes do vínculo"
      >
        {tipoLabel}
      </button>
      <Link
        href={entidadeHref}
        className="flex min-h-0 flex-1 flex-col items-center gap-1"
        title={`Abrir ${ENTIDADE_LABELS[card.outroTipo].toLowerCase()}`}
      >
        <PessoaAvatar
          path={card.foto_perfil_path}
          nome={card.titulo}
          size="compact"
        />
        <span className="line-clamp-2 w-full text-[11px] leading-tight font-medium text-foreground hover:text-gold">
          {card.titulo}
        </span>
      </Link>
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
      ) : fotoBucket && card.foto_url ? (
        <EntidadeStorageAvatar
          bucket={fotoBucket}
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
          isCompact
            ? `flex ${PESSOAS_CARD_H} flex-col rounded border border-border bg-panel px-1.5 py-1.5 transition-colors hover:border-border-strong`
            : isPessoa
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
          className="fixed z-50 min-w-[11rem] rounded border border-border bg-panel py-1 shadow-[var(--cor-sombra-dropdown)]"
          style={{ left: menu.x, top: menu.y }}
          role="menu"
        >
          {!isRestrito ? (
            <>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-panel-hover"
                onClick={abrirEmNovaAba}
              >
                Abrir em nova aba
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-panel-hover"
                onClick={abrirEmNovaJanela}
              >
                Abrir em nova janela
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-panel-hover"
                onClick={() => void copiarEndereco()}
              >
                Copiar endereço do link
              </button>
              <div
                className="my-1 border-t border-border"
                role="separator"
              />
            </>
          ) : null}
          {isCompact && !isRestrito ? (
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-panel-hover"
              onClick={() => {
                setMenu(null);
                onDetalhe(card);
              }}
            >
              Detalhes
            </button>
          ) : null}
          {!isRestrito ? (
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
          ) : null}
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
  const { entidadeTipo: paginaTipo } = useVinculosContext();
  const rotulo = rotuloTipoVinculoDoCard(card, paginaTipo);

  return (
    <ModalShell
      title="Detalhes do vínculo"
      onClose={onClose}
      size="md"
      darkBackdrop
      labelledBy="vinculo-detalhe-titulo"
      footer={
        card.restrito ? (
          <p className="text-xs text-muted italic sm:mr-auto">
            Sem permissão para abrir este registro.
          </p>
        ) : (
          <a
            href={`${ENTIDADE_HREFS[card.outroTipo]}/${card.outroId}`}
            className="btn-acao-secundario text-xs"
          >
            Abrir entidade
          </a>
        )
      }
    >
      <p className="text-sm text-foreground">{card.titulo}</p>
      <p className="mt-0.5 text-xs text-muted">
        {ENTIDADE_LABELS[card.outroTipo]}
        {rotulo ? ` · ${formatTipoVinculoLabel(rotulo)}` : ""}
      </p>

      <dl className="mt-4 space-y-3 border-t border-border pt-3">
        {card.restrito ? (
          <div>
            <dt className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
              Acesso
            </dt>
            <dd className="mt-0.5 text-sm text-muted italic">
              Sem permissão para ver fundamentação ou metadados deste vínculo.
            </dd>
          </div>
        ) : (
          <>
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
          </>
        )}
      </dl>
    </ModalShell>
  );
}

type VinculosContextValue = {
  /** Tipo da entidade da página aberta (não confundir com destinoTipo do form). */
  entidadeTipo: EntidadeTipo;
  loading: boolean;
  error: string | null;
  pending: boolean;
  cardsPorTipo: Map<EntidadeTipo, VinculoCard[]>;
  abertos: Set<EntidadeTipo>;
  formOpen: boolean;
  formMode: FormMode;
  editandoId: string | null;
  destinoTipo: EntidadeTipo;
  toggleSecao: (tipo: EntidadeTipo) => void;
  abrirFormulario: (tipo: EntidadeTipo) => void;
  abrirEdicao: (card: VinculoCard) => void;
  handleRemover: (id: string) => void;
  setDetalhe: (card: VinculoCard | null) => void;
  renderVinculoForm: (mode: FormMode) => ReactNode;
};

const VinculosContext = createContext<VinculosContextValue | null>(null);

function useVinculosContext() {
  const ctx = useContext(VinculosContext);
  if (!ctx) {
    throw new Error("useVinculosContext deve ser usado dentro de VinculosProvider");
  }
  return ctx;
}

export function VinculosProvider({
  entidadeTipo,
  entidadeId,
  children,
}: Props & { children: ReactNode }) {
  const [cards, setCards] = useState<VinculoCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<VinculoCard | null>(null);
  const [pending, startTransition] = useTransition();

  const [destinoTipo, setDestinoTipo] = useState<EntidadeTipo>("pessoa");
  const [busca, setBusca] = useState("");
  const [opcoes, setOpcoes] = useState<EntidadeOpcao[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [selecionada, setSelecionada] = useState<EntidadeOpcao | null>(null);
  const [tipoAParaB, setTipoAParaB] = useState("");
  const [tipoBParaA, setTipoBParaA] = useState("");
  const [editIsOrigem, setEditIsOrigem] = useState(true);
  const [fundamentacao, setFundamentacao] = useState("");
  const [entidadeTitulo, setEntidadeTitulo] = useState<string>("esta entidade");
  const [paresSugeridos, setParesSugeridos] = useState<TipoVinculoSugerido[]>(
    [],
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [abertos, setAbertos] = useState<Set<EntidadeTipo>>(new Set());

  /** Tipos A/B do registro (origem/destino no banco) para filtrar sugestões. */
  const sugestaoOrigemTipo: EntidadeTipo =
    formMode === "edit" && !editIsOrigem ? destinoTipo : entidadeTipo;
  const sugestaoDestinoTipo: EntidadeTipo =
    formMode === "edit" && !editIsOrigem ? entidadeTipo : destinoTipo;

  const sugestoesDiretos = useMemo(
    () => termosDiretosUnicos(paresSugeridos),
    [paresSugeridos],
  );
  const sugestoesInversos = useMemo(
    () => termosInversosUnicos(paresSugeridos),
    [paresSugeridos],
  );

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
  }, [entidadeTipo, entidadeId]);

  useEffect(() => {
    setAbertos(new Set());
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const resumo = await getEntidadeResumo(entidadeTipo, entidadeId);
      if (cancelled) return;
      if (resumo?.titulo) setEntidadeTitulo(resumo.titulo);
    })();
    return () => {
      cancelled = true;
    };
  }, [entidadeTipo, entidadeId]);

  useEffect(() => {
    if (!formOpen) return;
    let cancelled = false;
    void (async () => {
      const { data } = await listTiposVinculoSugeridos(
        sugestaoOrigemTipo,
        sugestaoDestinoTipo,
      );
      if (cancelled) return;
      setParesSugeridos(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [formOpen, sugestaoOrigemTipo, sugestaoDestinoTipo]);

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
    setTipoAParaB("");
    setTipoBParaA("");
    setEditIsOrigem(true);
    setFundamentacao("");
    setEditandoId(null);
    setFormMode("create");
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
    setFormMode("edit");
    setEditandoId(card.id);
    setEditIsOrigem(card.is_origem);
    setDestinoTipo(card.outroTipo);
    setSelecionada({
      id: card.outroId,
      titulo: card.titulo,
      subtitulo: card.subtitulo,
      foto_perfil_path: card.foto_perfil_path,
      foto_url: card.foto_url,
    });
    setTipoAParaB(card.tipo_a_para_b ?? "");
    setTipoBParaA(card.tipo_b_para_a ?? "");
    setFundamentacao(card.fundamentacao ?? "");
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

  function handleTipoAParaBChange(value: string) {
    setTipoAParaB(value);
    const inverso = inversoSugeridoDeTermo(value, paresSugeridos);
    if (inverso !== null) {
      setTipoBParaA(inverso);
    }
  }

  function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    const tipoAFinal = tipoAParaB.trim();
    const tipoBFinal = tipoBParaA.trim();
    const fundamentacaoFinal = fundamentacao.trim();

    if (!fundamentacaoFinal) {
      setError("Informe a fundamentação do vínculo.");
      return;
    }

    if (formMode === "edit" && editandoId) {
      startTransition(async () => {
        setError(null);
        const { error: updateError } = await updateVinculo(editandoId, {
          tipoAParaB: tipoAFinal || null,
          tipoBParaA: tipoBFinal || null,
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
        tipoAParaB: tipoAFinal || null,
        tipoBParaA: tipoBFinal || null,
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
                ? "Altere os tipos de vínculo ou a fundamentação."
                : "Busque e escolha o registro a vincular."}
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
              <Label htmlFor="busca_entidade">
                Buscar {ENTIDADE_LABELS[destinoTipo].toLowerCase()}
              </Label>
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

        {(() => {
          const nomeOutro = selecionada?.titulo?.trim() || "a outra entidade";
          const nomeA =
            mode === "edit" && !editIsOrigem ? nomeOutro : entidadeTitulo;
          const nomeB =
            mode === "edit" && !editIsOrigem ? entidadeTitulo : nomeOutro;
          return (
            <div className="space-y-3">
              <TipoVinculoCombobox
                id={`tipo_a_para_b_${mode}`}
                listId={`sugestoes_tipo_a_${mode}`}
                label={`Tipo de vínculo (de ${nomeA} para ${nomeB})`}
                value={tipoAParaB}
                onChange={handleTipoAParaBChange}
                sugestoes={sugestoesDiretos}
                disabled={pending}
              />
              <TipoVinculoCombobox
                id={`tipo_b_para_a_${mode}`}
                listId={`sugestoes_tipo_b_${mode}`}
                label={`Tipo de vínculo (de ${nomeB} para ${nomeA})`}
                value={tipoBParaA}
                onChange={setTipoBParaA}
                sugestoes={sugestoesInversos}
                disabled={pending}
              />
            </div>
          );
        })()}

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

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="submit"
            className="w-full sm:w-auto"
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

  const value: VinculosContextValue = {
    entidadeTipo,
    loading,
    error,
    pending,
    cardsPorTipo,
    abertos,
    formOpen,
    formMode,
    editandoId,
    destinoTipo,
    toggleSecao,
    abrirFormulario,
    abrirEdicao,
    handleRemover,
    setDetalhe,
    renderVinculoForm,
  };

  return (
    <VinculosContext.Provider value={value}>
      {children}
      {detalhe ? (
        <VinculoDetalheModal
          card={detalhe}
          onClose={() => setDetalhe(null)}
        />
      ) : null}
    </VinculosContext.Provider>
  );
}

/** Subseções de vínculos (pessoas ocultas no desktop — vão para PessoasVinculadasPanel). */
export function VinculosSectionBody() {
  const {
    loading,
    error,
    pending,
    cardsPorTipo,
    abertos,
    formOpen,
    formMode,
    editandoId,
    destinoTipo,
    toggleSecao,
    abrirFormulario,
    abrirEdicao,
    handleRemover,
    setDetalhe,
    renderVinculoForm,
  } = useVinculosContext();

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
            const isPessoa = tipo === "pessoa";
            return (
              <section
                key={tipo}
                className={
                  isPessoa
                    ? "overflow-hidden rounded border border-border bg-panel lg:hidden"
                    : "overflow-hidden rounded border border-border bg-panel"
                }
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
                          isPessoa
                            ? "grid gap-3 sm:grid-cols-2"
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
                                isPessoa ? "col-span-full" : undefined
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
    </div>
  );
}

/**
 * Painel desktop (≥1024px) de pessoas vinculadas: grade 4×4 com scroll
 * interno se houver mais de 16. Já expandido (sem accordion).
 */
export function PessoasVinculadasPanel() {
  const {
    loading,
    pending,
    cardsPorTipo,
    formOpen,
    formMode,
    editandoId,
    destinoTipo,
    abrirFormulario,
    abrirEdicao,
    handleRemover,
    setDetalhe,
    renderVinculoForm,
  } = useVinculosContext();

  const items = cardsPorTipo.get("pessoa") ?? [];
  const mostrandoFormCriacao =
    formOpen && formMode === "create" && destinoTipo === "pessoa";
  const editandoPessoa =
    formOpen &&
    formMode === "edit" &&
    editandoId != null &&
    items.some((c) => c.id === editandoId);

  return (
    <Panel
      title="Pessoas vinculadas"
      actions={
        <Button
          type="button"
          variant="secondary"
          className="text-xs"
          onClick={() => abrirFormulario("pessoa")}
          disabled={pending || loading}
        >
          + Adicionar
        </Button>
      }
    >
      {loading ? (
        <p className="py-4 text-center text-sm text-muted">
          Carregando vínculos…
        </p>
      ) : (
        <div className="space-y-3">
          {mostrandoFormCriacao || editandoPessoa
            ? renderVinculoForm(mostrandoFormCriacao ? "create" : "edit")
            : null}

          {items.length === 0 && !mostrandoFormCriacao ? (
            <p className="py-1 text-xs text-muted">
              Nenhum vínculo cadastrado
            </p>
          ) : items.length > 0 ? (
            <div
              className={`grid grid-cols-4 gap-2 overflow-y-auto pr-0.5 ${PESSOAS_GRADE_MAX_H}`}
            >
              {items.map((card) =>
                formOpen &&
                formMode === "edit" &&
                editandoId === card.id ? null : (
                  <VinculoCardBox
                    key={card.id}
                    card={card}
                    pending={pending}
                    onRemover={handleRemover}
                    onEditar={abrirEdicao}
                    onDetalhe={setDetalhe}
                    variant="compact"
                  />
                ),
              )}
            </div>
          ) : null}
        </div>
      )}
    </Panel>
  );
}

/** Uso avulso (sem layout de detalhe). */
export function VinculosSection({ entidadeTipo, entidadeId }: Props) {
  return (
    <VinculosProvider entidadeTipo={entidadeTipo} entidadeId={entidadeId}>
      <VinculosSectionBody />
    </VinculosProvider>
  );
}
