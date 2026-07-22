"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  applySortToParams,
  toggleSortDir,
  type SortColumnDef,
  type SortDir,
} from "@/lib/list-sort";

type SortableThProps = {
  /** Coluna no banco / ?sort= */
  sortKey: string;
  label: string;
  activeSort: string;
  activeDir: SortDir;
  basePath: string;
  className?: string;
};

/**
 * Cabeçalho de coluna ordenável: 1º clique ASC (ou ASC se outra coluna),
 * clique no mesmo cabeçalho alterna ASC ↔ DESC.
 */
export function SortableTh({
  sortKey,
  label,
  activeSort,
  activeDir,
  basePath,
  className = "",
}: SortableThProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const isActive = activeSort === sortKey;

  function onClick() {
    const nextDir: SortDir = isActive ? toggleSortDir(activeDir) : "asc";
    const params = applySortToParams(searchParams, sortKey, nextDir);
    const qs = params.toString();
    startTransition(() => {
      router.push(`${basePath}${qs ? `?${qs}` : ""}`);
    });
  }

  const indicator = isActive ? (activeDir === "asc" ? "▲" : "▼") : "⇅";

  return (
    <th className={`px-3 py-2.5 font-semibold ${className}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={`group inline-flex max-w-full items-center gap-1 text-left uppercase tracking-[0.14em] transition-colors hover:text-gold-bright disabled:opacity-60 ${
          isActive ? "text-gold" : "text-gold"
        }`}
        title={
          isActive
            ? activeDir === "asc"
              ? "Ordenado crescente — clique para decrescente"
              : "Ordenado decrescente — clique para crescente"
            : `Ordenar por ${label}`
        }
        aria-sort={
          isActive
            ? activeDir === "asc"
              ? "ascending"
              : "descending"
            : "none"
        }
      >
        <span className="truncate">{label}</span>
        <span
          className={`shrink-0 text-[0.65rem] normal-case tracking-normal ${
            isActive
              ? "text-gold-bright opacity-100"
              : "text-muted opacity-40 group-hover:opacity-80"
          }`}
          aria-hidden
        >
          {indicator}
        </span>
      </button>
    </th>
  );
}

type MobileSortBarProps = {
  columns: readonly SortColumnDef[];
  activeSort: string;
  activeDir: SortDir;
  basePath: string;
  className?: string;
};

/** Seletor de ordenação para o layout de cards no mobile. */
export function MobileSortBar({
  columns,
  activeSort,
  activeDir,
  basePath,
  className = "",
}: MobileSortBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function pushSort(sortKey: string, dir: SortDir) {
    const params = applySortToParams(searchParams, sortKey, dir);
    const qs = params.toString();
    startTransition(() => {
      router.push(`${basePath}${qs ? `?${qs}` : ""}`);
    });
  }

  return (
    <div
      className={`flex flex-wrap items-end gap-2 sm:hidden ${className}`}
    >
      <label className="min-w-0 flex-1 text-xs font-medium text-muted">
        Ordenar por
        <select
          className="mt-1 h-11 min-h-[44px] w-full rounded border border-field-border bg-field px-2 text-sm text-foreground outline-none focus:border-gold sm:h-8 sm:min-h-0"
          value={activeSort}
          disabled={pending}
          onChange={(e) => pushSort(e.target.value, activeDir)}
        >
          {columns.map((col) => (
            <option key={col.key} value={col.key}>
              {col.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={pending}
        onClick={() => pushSort(activeSort, toggleSortDir(activeDir))}
        className="inline-flex h-11 min-h-[44px] items-center justify-center rounded border border-border bg-panel px-3 text-sm font-medium text-muted-strong hover:border-border-strong hover:text-gold-bright disabled:opacity-50 sm:h-8 sm:min-h-0"
        title={
          activeDir === "asc"
            ? "Crescente — clique para decrescente"
            : "Decrescente — clique para crescente"
        }
        aria-label={
          activeDir === "asc" ? "Ordem crescente" : "Ordem decrescente"
        }
      >
        {activeDir === "asc" ? "▲" : "▼"}
      </button>
    </div>
  );
}
