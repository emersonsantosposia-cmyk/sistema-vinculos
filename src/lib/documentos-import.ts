import { isDocumentoTipo } from "@/lib/format";
import type { DocumentoTipo } from "@/lib/types";

/** Converte lastModified do arquivo para YYYY-MM-DD (campo `data`). */
export function fileLastModifiedToDate(lastModified: number): string {
  const d = new Date(lastModified);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Extrai o tipo do prefixo do nome do arquivo (antes do primeiro
 * separador entre `_`, `-` ou espaço). Coincide com RCI/INFO/RDCI
 * (case-insensitive); aceita aliases RELINT→INFO e DADOS→RDCI;
 * caso contrário OUTROS.
 */
export function detectTipoFromFilename(filename: string): DocumentoTipo {
  const separators = ["_", "-", " "]
    .map((s) => filename.indexOf(s))
    .filter((i) => i >= 0);

  const prefix =
    separators.length === 0
      ? filename.includes(".")
        ? filename.slice(0, filename.lastIndexOf("."))
        : filename
      : filename.slice(0, Math.min(...separators));

  const normalized = prefix.trim().toUpperCase();
  if (normalized === "RELINT") return "INFO";
  if (normalized === "DADOS") return "RDCI";
  if (isDocumentoTipo(normalized)) return normalized;
  return "OUTROS";
}
