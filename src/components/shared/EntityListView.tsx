import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Listagem responsiva: cards empilhados em &lt;640px; tabela com scroll suave a partir de sm.
 */
export function EntityListView({
  empty,
  emptyMessage,
  cards,
  table,
  pagination,
  before,
}: {
  empty: boolean;
  emptyMessage: string;
  cards: ReactNode;
  table: ReactNode;
  pagination?: ReactNode;
  before?: ReactNode;
}) {
  if (empty) {
    return (
      <div className="rounded border border-border bg-panel px-4 py-10 text-center text-sm text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {before}
      <ul className="space-y-2 sm:hidden">{cards}</ul>
      <div className="hidden scroll-smooth overflow-x-auto rounded border border-border bg-panel sm:block">
        {table}
      </div>
      {pagination}
    </div>
  );
}

/** Card clicável que navega para o detalhe. */
export function ListCardLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="block rounded border border-border bg-panel px-3 py-3 transition-colors hover:border-border-strong hover:bg-panel-hover"
      >
        {children}
      </Link>
    </li>
  );
}

/** Card acionável (ex.: abrir modal), sem navegação. */
export function ListCardButton({
  onClick,
  children,
  disabled,
  title,
}: {
  onClick?: () => void;
  children: ReactNode;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <li>
      <button
        type="button"
        title={title}
        disabled={disabled}
        onClick={onClick}
        className={`w-full rounded border border-border bg-panel px-3 py-3 text-left transition-colors ${
          disabled
            ? "cursor-default"
            : "hover:border-border-strong hover:bg-panel-hover"
        }`}
      >
        {children}
      </button>
    </li>
  );
}

/** Card com área principal clicável e rodapé de ações (ex.: Usuários). */
export function ListCardShell({
  href,
  children,
  actions,
}: {
  href: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <li className="overflow-hidden rounded border border-border bg-panel">
      <Link
        href={href}
        className="block px-3 py-3 transition-colors hover:bg-panel-hover"
      >
        {children}
      </Link>
      <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
        {actions}
      </div>
    </li>
  );
}

export function ListCardTitle({
  children,
  leading,
}: {
  children: ReactNode;
  leading?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      {leading}
      <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
        {children}
      </p>
    </div>
  );
}

export function ListCardMeta({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-strong">
      {children}
    </p>
  );
}

export function ListCardMetaSep() {
  return <span className="text-muted" aria-hidden>·</span>;
}

/** Classe para colunas secundárias: ocultas no tablet, visíveis no desktop. */
export const LIST_COL_SECONDARY = "hidden lg:table-cell";
