import type { ReactNode } from "react";

/**
 * Barra de filtros das listagens: empilhada no mobile, em linha a partir de sm.
 */
export function ListFiltersBar({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end ${className}`}
    >
      {children}
    </div>
  );
}

/** Campo de busca (ocupa a linha no mobile). */
export function ListFilterSearch({ children }: { children: ReactNode }) {
  return <div className="min-w-0 w-full sm:min-w-[220px] sm:flex-1">{children}</div>;
}

/** Select / campo auxiliar. */
export function ListFilterField({
  children,
  className = "w-full sm:w-44",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

/** Total de registros alinhado à direita em telas maiores. */
export function ListFilterTotal({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs text-muted sm:ml-auto sm:self-center">{children}</p>
  );
}
