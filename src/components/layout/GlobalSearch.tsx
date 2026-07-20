"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  BUSCA_TIPO_LABEL,
  buscaGlobal,
  type BuscaEntidadeTipo,
  type BuscaResultado,
} from "@/lib/supabase/busca";

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

const TIPO_ORDER: BuscaEntidadeTipo[] = [
  "pessoa",
  "empresa",
  "veiculo",
  "endereco",
  "documento",
  "caso",
  "comunicacao",
  "orcrim",
  "usuario",
];

function groupByTipo(results: BuscaResultado[]) {
  const map = new Map<BuscaEntidadeTipo, BuscaResultado[]>();
  for (const tipo of TIPO_ORDER) map.set(tipo, []);
  for (const item of results) {
    const list = map.get(item.tipo) ?? [];
    list.push(item);
    map.set(item.tipo, list);
  }
  return map;
}

function flatResults(grouped: Map<BuscaEntidadeTipo, BuscaResultado[]>) {
  const flat: BuscaResultado[] = [];
  for (const tipo of TIPO_ORDER) {
    flat.push(...(grouped.get(tipo) ?? []));
  }
  return flat;
}

type PanelLayout = {
  position: "absolute" | "fixed";
  top?: number | string;
  left?: number;
  width?: number;
  maxHeight: number;
};

export function GlobalSearch({
  mobileExpanded = false,
  onMobileExpandedChange,
}: {
  /** No mobile, quando true mostra o campo expandido. */
  mobileExpanded?: boolean;
  onMobileExpandedChange?: (open: boolean) => void;
} = {}) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<BuscaResultado[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [activeIndex, setActiveIndex] = useState(-1);
  const [panelLayout, setPanelLayout] = useState<PanelLayout>({
    position: "absolute",
    top: "calc(100% + 4px)",
    maxHeight: 384,
  });

  const grouped = useMemo(() => groupByTipo(results), [results]);
  const flat = useMemo(() => flatResults(grouped), [grouped]);

  useEffect(() => {
    if (!mobileExpanded) return;
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [mobileExpanded]);

  const runSearch = useCallback((value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < MIN_CHARS) {
      setResults([]);
      setError(null);
      setActiveIndex(-1);
      return;
    }

    startTransition(async () => {
      const { data, error: searchError } = await buscaGlobal(trimmed, 4);
      setResults(data);
      setError(searchError);
      setActiveIndex(data.length > 0 ? 0 : -1);
    });
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => runSearch(query), DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [query, runSearch]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        if (window.matchMedia("(max-width: 639px)").matches) {
          onMobileExpandedChange?.(false);
        }
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [onMobileExpandedChange]);

  const term = query.trim();
  const showDropdown = open && term.length >= MIN_CHARS;

  useEffect(() => {
    if (!showDropdown) return;

    function updatePanelLayout() {
      const root = rootRef.current;
      if (!root) return;

      const rect = root.getBoundingClientRect();
      const vv = window.visualViewport;
      const viewportTop = vv?.offsetTop ?? 0;
      const viewportHeight = vv?.height ?? window.innerHeight;
      const viewportBottom = viewportTop + viewportHeight;
      const gap = 4;
      const spaceBelow = Math.max(0, viewportBottom - rect.bottom - gap);
      const spaceAbove = Math.max(0, rect.top - viewportTop - gap);
      const isNarrow = window.matchMedia("(max-width: 639px)").matches;

      if (!isNarrow) {
        // `top` explícito é obrigatório: sem ele, flex+items-center usa a
        // posição estática e centraliza o painel por cima do input.
        setPanelLayout({
          position: "absolute",
          top: "calc(100% + 4px)",
          maxHeight: Math.min(384, Math.max(spaceBelow, 120)),
        });
        return;
      }

      // Mobile: painel fixo limitado ao visualViewport (respeita teclado virtual).
      const openUpward = spaceBelow < 140 && spaceAbove > spaceBelow;
      const available = openUpward ? spaceAbove : spaceBelow;
      const maxHeight = Math.min(384, available);
      const width = Math.min(rect.width, window.innerWidth - 16);
      const left = Math.max(
        8,
        Math.min(rect.left, window.innerWidth - width - 8),
      );

      setPanelLayout({
        position: "fixed",
        top: openUpward ? rect.top - gap - maxHeight : rect.bottom + gap,
        left,
        width,
        maxHeight,
      });
    }

    updatePanelLayout();

    const vv = window.visualViewport;
    vv?.addEventListener("resize", updatePanelLayout);
    vv?.addEventListener("scroll", updatePanelLayout);
    window.addEventListener("resize", updatePanelLayout);
    window.addEventListener("scroll", updatePanelLayout, true);

    return () => {
      vv?.removeEventListener("resize", updatePanelLayout);
      vv?.removeEventListener("scroll", updatePanelLayout);
      window.removeEventListener("resize", updatePanelLayout);
      window.removeEventListener("scroll", updatePanelLayout, true);
    };
  }, [showDropdown, results.length, pending]);

  function goToResultsPage(value = query) {
    const trimmed = value.trim();
    if (trimmed.length < MIN_CHARS) return;
    setOpen(false);
    onMobileExpandedChange?.(false);
    router.push(`/busca?q=${encodeURIComponent(trimmed)}`);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      onMobileExpandedChange?.(false);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (open && activeIndex >= 0 && flat[activeIndex]) {
        setOpen(false);
        onMobileExpandedChange?.(false);
        router.push(flat[activeIndex].href);
        return;
      }
      goToResultsPage();
      return;
    }

    if (!open || flat.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % flat.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? flat.length - 1 : i - 1));
    }
  }

  const empty = !pending && !error && results.length === 0 && term.length >= MIN_CHARS;

  const searchField = (
    <div className="relative min-w-0 flex-1">
      <label htmlFor="global-search" className="sr-only">
        Busca global
      </label>
      <div className="relative">
        <svg
          className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M8.5 3.5a5 5 0 103.156 8.802l3.27 3.271a.75.75 0 101.061-1.06l-3.271-3.271A5 5 0 008.5 3.5zm-3.5 5a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0z"
            clipRule="evenodd"
          />
        </svg>
        <input
          ref={inputRef}
          id="global-search"
          type="search"
          enterKeyHint="search"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
          }
          autoComplete="off"
          placeholder="Busca global"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            window.requestAnimationFrame(() => {
              inputRef.current?.scrollIntoView({
                block: "nearest",
                behavior: "smooth",
              });
            });
          }}
          onKeyDown={onKeyDown}
          className="campo-institucional h-11 min-h-[44px] w-full rounded pl-8 pr-3 text-sm sm:h-8 sm:min-h-0"
        />
      </div>
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={`relative min-w-0 ${
        mobileExpanded
          ? "flex min-w-0 flex-1 items-center gap-1.5"
          : "flex shrink-0 items-center sm:min-w-[6rem] sm:max-w-xl sm:flex-1"
      }`}
    >
      {/* Mobile: ícone que abre a busca */}
      {!mobileExpanded ? (
        <button
          type="button"
          className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded border border-border bg-panel text-muted-strong hover:bg-panel-hover hover:text-gold sm:hidden"
          aria-label="Abrir busca global"
          onClick={() => onMobileExpandedChange?.(true)}
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M8.5 3.5a5 5 0 103.156 8.802l3.27 3.271a.75.75 0 101.061-1.06l-3.271-3.271A5 5 0 008.5 3.5zm-3.5 5a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      ) : null}

      {/* Campo: sempre no desktop; no mobile só quando expandido */}
      <div
        className={`min-w-0 flex-1 items-center gap-1.5 ${
          mobileExpanded ? "flex" : "hidden sm:flex"
        }`}
      >
        {searchField}
        {mobileExpanded ? (
          <button
            type="button"
            className="inline-flex h-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded border border-border bg-panel px-3 text-xs text-muted-strong hover:bg-panel-hover sm:hidden"
            aria-label="Fechar busca"
            onClick={() => {
              setOpen(false);
              onMobileExpandedChange?.(false);
            }}
          >
            Fechar
          </button>
        ) : null}
      </div>

      {showDropdown ? (
        <div
          id={listId}
          role="listbox"
          style={{
            position: panelLayout.position,
            top: panelLayout.top,
            left: panelLayout.left,
            width: panelLayout.width,
            maxHeight: panelLayout.maxHeight,
          }}
          className={`z-50 overflow-auto rounded border border-border bg-panel shadow-[var(--cor-sombra-dropdown)] ${
            panelLayout.position === "absolute" ? "right-0 left-0" : ""
          }`}
        >
          {pending && results.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-muted">Buscando…</p>
          ) : null}

          {error ? (
            <p className="px-3 py-2.5 text-xs text-danger-fg">{error}</p>
          ) : null}

          {empty ? (
            <p className="px-3 py-2.5 text-xs text-muted">
              Nenhum resultado encontrado para &ldquo;{term}&rdquo;.
            </p>
          ) : null}

          {TIPO_ORDER.map((tipo) => {
            const items = grouped.get(tipo) ?? [];
            if (items.length === 0) return null;

            return (
              <section key={tipo} className="border-b border-border last:border-b-0">
                <h3 className="sticky top-0 z-[1] bg-panel-soft px-3 py-1.5 text-[10px] font-semibold tracking-[0.14em] text-muted-strong uppercase">
                  {BUSCA_TIPO_LABEL[tipo]}
                  <span className="ml-1 font-normal text-muted">
                    ({items.length})
                  </span>
                </h3>
                <ul>
                  {items.map((item) => {
                    const index = flat.findIndex(
                      (r) => r.tipo === item.tipo && r.id === item.id,
                    );
                    const aproximada = item.tipoCorrespondencia === "aproximada";

                    return (
                      <li key={`${item.tipo}-${item.id}`}>
                        <Link
                          id={`${listId}-option-${index}`}
                          role="option"
                          aria-selected={index === activeIndex}
                          href={item.href}
                          onClick={() => {
                            setOpen(false);
                            onMobileExpandedChange?.(false);
                          }}
                          onMouseEnter={() => setActiveIndex(index)}
                          className={`block px-3 py-2 ${
                            index === activeIndex
                              ? "bg-panel-hover"
                              : "hover:bg-panel-soft"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {item.titulo}
                              </p>
                              {item.campoCorrespondente ? (
                                <p className="mt-0.5 truncate text-[11px] text-muted">
                                  Campo: {item.campoCorrespondente}
                                </p>
                              ) : null}
                            </div>
                            {aproximada ? (
                              <span
                                className="shrink-0 rounded border border-warning-border bg-warning-bg px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-warning-fg uppercase"
                                title="Correspondência por similaridade (trigrama) — confira se o registro é o desejado"
                              >
                                aproximada
                              </span>
                            ) : null}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          <button
            type="button"
            onClick={() => goToResultsPage()}
            className="sticky bottom-0 w-full border-t border-border bg-panel-soft px-3 py-2 text-left text-xs font-medium tracking-wide text-gold uppercase hover:bg-panel-hover"
          >
            Ver todos os resultados
            {pending ? "…" : ""}
          </button>
        </div>
      ) : null}
    </div>
  );
}
