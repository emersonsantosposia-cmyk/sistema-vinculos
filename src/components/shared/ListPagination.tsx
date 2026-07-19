"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Form";
import {
  formatShowingLabel,
  totalPages as calcTotalPages,
} from "@/lib/pagination";

type Props = {
  /** Base path sem query, ex.: "/empresas". */
  basePath: string;
  total: number;
  page: number;
  pageSize: number;
};

/**
 * Controles de paginação no padrão da Auditoria (Anterior / Próxima),
 * com contagem “Mostrando X–Y de Z registros”.
 */
export function ListPagination({ basePath, total, page, pageSize }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = calcTotalPages(total, pageSize);

  function goToPage(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete("page");
    else params.set("page", String(next));
    const qs = params.toString();
    router.push(`${basePath}${qs ? `?${qs}` : ""}`);
  }

  if (total <= 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
      <p>
        {formatShowingLabel(total, page, pageSize)}
        {totalPages > 1 ? (
          <span>
            {" "}
            · página {page} de {totalPages}
          </span>
        ) : null}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          className="text-xs"
          disabled={page <= 1}
          onClick={() => goToPage(page - 1)}
        >
          Anterior
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="text-xs"
          disabled={page >= totalPages}
          onClick={() => goToPage(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}
