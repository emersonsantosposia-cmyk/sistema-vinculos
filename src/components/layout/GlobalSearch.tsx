"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  BUSCA_TIPO_LABEL,
  buscaGlobal,
  type BuscaResultado,
} from "@/lib/supabase/busca";

const DEBOUNCE_MS = 280;
const MIN_CHARS = 2;

export function GlobalSearch() {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<BuscaResultado[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [activeIndex, setActiveIndex] = useState(-1);

  const runSearch = useCallback((value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < MIN_CHARS) {
      setResults([]);
      setError(null);
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
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function goToResultsPage(value = query) {
    const trimmed = value.trim();
    if (trimmed.length < MIN_CHARS) return;
    setOpen(false);
    router.push(`/busca?q=${encodeURIComponent(trimmed)}`);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (open && activeIndex >= 0 && results[activeIndex]) {
        setOpen(false);
        router.push(results[activeIndex].href);
        return;
      }
      goToResultsPage();
      return;
    }

    if (!open || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    }
  }

  const showDropdown = open && query.trim().length >= MIN_CHARS;
  const empty =
    !pending && !error && results.length === 0 && query.trim().length >= MIN_CHARS;

  return (
    <div ref={rootRef} className="relative min-w-0 max-w-xl flex-1">
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
          id="global-search"
          type="search"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
          }
          autoComplete="off"
          placeholder="Buscar pessoa, CPF, empresa, CNPJ, placa, endereço, caso…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="campo-institucional h-8 w-full rounded pl-8 pr-3 text-sm"
        />
      </div>

      {showDropdown ? (
        <div
          id={listId}
          role="listbox"
          className="absolute right-0 left-0 z-40 mt-1 max-h-80 overflow-auto rounded border border-border bg-panel shadow-[var(--cor-sombra-dropdown)]"
        >
          {pending && results.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-muted">Buscando…</p>
          ) : null}

          {error ? (
            <p className="px-3 py-2.5 text-xs text-danger-fg">{error}</p>
          ) : null}

          {empty ? (
            <p className="px-3 py-2.5 text-xs text-muted">
              Nenhum resultado para “{query.trim()}”.
            </p>
          ) : null}

          {results.map((item, index) => (
            <Link
              key={`${item.tipo}-${item.id}`}
              id={`${listId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              href={item.href}
              onClick={() => setOpen(false)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`block border-b border-border px-3 py-2 last:border-b-0 ${
                index === activeIndex
                  ? "bg-panel-hover"
                  : "hover:bg-panel-soft"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium text-foreground">
                  {item.titulo}
                </span>
                <span className="shrink-0 rounded border border-border bg-panel-soft px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-strong uppercase">
                  {BUSCA_TIPO_LABEL[item.tipo]}
                </span>
              </div>
              {item.subtitulo ? (
                <p className="mt-0.5 truncate text-xs text-muted">
                  {item.subtitulo}
                </p>
              ) : null}
            </Link>
          ))}

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
