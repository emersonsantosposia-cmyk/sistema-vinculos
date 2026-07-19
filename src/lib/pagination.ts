/** Tamanho padrão de página das listagens de entidades e auditoria. */
export const LIST_PAGE_SIZE = 25;

export type PaginatedListResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  error: string | null;
};

export function normalizePage(page?: number | string | null): number {
  const n = typeof page === "string" ? Number.parseInt(page, 10) : page;
  if (!n || !Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export function pageRange(
  page: number,
  pageSize: number = LIST_PAGE_SIZE,
): { from: number; to: number } {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

/** Ex.: "Mostrando 1-25 de 340 registros" */
export function formatShowingLabel(
  total: number,
  page: number,
  pageSize: number,
): string {
  if (total <= 0) {
    return "Nenhum registro";
  }
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const reg = total === 1 ? "registro" : "registros";
  return `Mostrando ${from}-${to} de ${total} ${reg}`;
}

export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
}
