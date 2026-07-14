"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Button, ErrorBanner, Select } from "@/components/ui/Form";
import { formatDate } from "@/lib/format";
import {
  detectTipoFromFilename,
  fileLastModifiedToDate,
} from "@/lib/procedimentos-import";
import {
  createProcedimentosBatch,
  findExistingProcedimentoNomes,
} from "@/lib/supabase/procedimentos";
import {
  PROCEDIMENTO_TIPOS,
  type ProcedimentoTipo,
} from "@/lib/types";

type PreviewRow = {
  id: string;
  nome: string;
  tipo: ProcedimentoTipo;
  data: string;
  selected: boolean;
  jaExiste: boolean;
};

type Summary = {
  criados: number;
  ignorados: number;
};

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
};

function supportsDirectoryPicker(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

async function readFilesFromDirectory(
  dirHandle: FileSystemDirectoryHandle,
): Promise<File[]> {
  const files: File[] = [];
  const handle = dirHandle as FileSystemDirectoryHandle & {
    values(): AsyncIterableIterator<FileSystemHandle>;
  };
  for await (const entry of handle.values()) {
    if (entry.kind !== "file") continue;
    files.push(await (entry as FileSystemFileHandle).getFile());
  }
  return files;
}

export function ImportarPastaProcedimentos() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [unsupportedMsg, setUnsupportedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  const resetPreview = useCallback(() => {
    setRows(null);
    setError(null);
    setStatus(null);
    setSummary(null);
  }, []);

  function handlePickFolder() {
    setUnsupportedMsg(null);
    setError(null);
    setSummary(null);

    if (!supportsDirectoryPicker()) {
      setUnsupportedMsg(
        "A importação de pasta não é suportada neste navegador. Use o Google Chrome ou o Microsoft Edge.",
      );
      return;
    }

    startTransition(async () => {
      setStatus("Abrindo seletor de pastas…");
      try {
        const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
        if (!picker) {
          setUnsupportedMsg(
            "A importação de pasta não é suportada neste navegador. Use o Google Chrome ou o Microsoft Edge.",
          );
          setStatus(null);
          return;
        }

        let dirHandle: FileSystemDirectoryHandle;
        try {
          dirHandle = await picker.call(window);
        } catch (err) {
          setStatus(null);
          // Usuário cancelou o seletor
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError("Não foi possível abrir a pasta selecionada.");
          return;
        }

        setStatus("Lendo arquivos da pasta…");
        const files = await readFilesFromDirectory(dirHandle);

        if (files.length === 0) {
          setStatus(null);
          setError(
            "Nenhum arquivo encontrado na pasta (subpastas são ignoradas).",
          );
          setRows([]);
          return;
        }

        const parsed = files.map((file, index) => ({
          id: `${file.name}-${file.lastModified}-${index}`,
          nome: file.name,
          tipo: detectTipoFromFilename(file.name),
          data: fileLastModifiedToDate(file.lastModified),
        }));

        setStatus("Verificando duplicados…");
        const { nomes: existing, error: dupError } =
          await findExistingProcedimentoNomes(parsed.map((p) => p.nome));

        if (dupError) {
          setStatus(null);
          setError(dupError);
          return;
        }

        setRows(
          parsed.map((p) => {
            const jaExiste = existing.has(p.nome);
            return {
              ...p,
              jaExiste,
              selected: !jaExiste,
            };
          }),
        );
        setStatus(null);
        setError(null);
      } catch (err) {
        setStatus(null);
        setError(
          err instanceof Error
            ? err.message
            : "Erro ao ler a pasta selecionada.",
        );
      }
    });
  }

  function updateRow(id: string, patch: Partial<PreviewRow>) {
    setRows((prev) =>
      prev ? prev.map((r) => (r.id === id ? { ...r, ...patch } : r)) : prev,
    );
  }

  function toggleAll(selected: boolean) {
    setRows((prev) =>
      prev ? prev.map((r) => ({ ...r, selected })) : prev,
    );
  }

  function handleConfirm() {
    if (!rows) return;
    const selected = rows.filter((r) => r.selected);
    const ignored = rows.length - selected.length;

    if (selected.length === 0) {
      setSummary({ criados: 0, ignorados: ignored });
      setRows(null);
      return;
    }

    startTransition(async () => {
      setError(null);
      setStatus(`Importando ${selected.length} procedimento(s)…`);

      const { created, error: saveError } = await createProcedimentosBatch(
        selected.map((r) => ({
          tipo: r.tipo,
          nome: r.nome,
          resumo: null,
          data: r.data,
          link_cronos: null,
        })),
      );

      setStatus(null);
      if (saveError) {
        setError(saveError);
        return;
      }

      setSummary({
        criados: created,
        ignorados: ignored + (selected.length - created),
      });
      setRows(null);
      router.refresh();
    });
  }

  const selectedCount = rows?.filter((r) => r.selected).length ?? 0;

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={handlePickFolder}
      >
        Importar de pasta
      </Button>

      {unsupportedMsg || error || status || summary || rows ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16 sm:pt-24">
          <div className="w-full max-w-4xl rounded border border-border bg-panel shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-zinc-900">
                {summary
                  ? "Importação concluída"
                  : rows
                    ? "Pré-visualização da importação"
                    : "Importar de pasta"}
              </h3>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={resetPreview}
              >
                Fechar
              </Button>
            </div>

            <div className="space-y-4 p-4">
              {unsupportedMsg ? (
                <ErrorBanner>{unsupportedMsg}</ErrorBanner>
              ) : null}
              {error ? (
                <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {error}
                </div>
              ) : null}
              {status ? (
                <p className="text-sm text-muted">{status}</p>
              ) : null}

              {summary ? (
                <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
                  <p>
                    <strong>{summary.criados}</strong> procedimento
                    {summary.criados === 1 ? "" : "s"} criado
                    {summary.criados === 1 ? "" : "s"} com sucesso.
                  </p>
                  <p className="mt-1">
                    <strong>{summary.ignorados}</strong> ignorado
                    {summary.ignorados === 1 ? "" : "s"} (duplicados ou
                    desmarcados).
                  </p>
                </div>
              ) : null}

              {rows && rows.length > 0 ? (
                <>
                  <p className="text-sm text-muted">
                    {rows.length} arquivo{rows.length === 1 ? "" : "s"} na pasta
                    (sem subpastas). Revise o tipo, desmarque o que não quiser
                    importar e confirme.
                  </p>

                  <div className="overflow-x-auto rounded border border-border">
                    <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-border bg-zinc-50 text-xs font-semibold tracking-wide text-zinc-600 uppercase">
                          <th className="w-10 px-3 py-2.5">
                            <input
                              type="checkbox"
                              aria-label="Selecionar todos"
                              checked={
                                rows.length > 0 &&
                                rows.every((r) => r.selected)
                              }
                              onChange={(e) => toggleAll(e.target.checked)}
                            />
                          </th>
                          <th className="px-3 py-2.5 font-semibold">Tipo</th>
                          <th className="px-3 py-2.5 font-semibold">Nome</th>
                          <th className="px-3 py-2.5 font-semibold">Data</th>
                          <th className="px-3 py-2.5 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr
                            key={row.id}
                            className={`border-b border-border last:border-b-0 ${
                              row.jaExiste
                                ? "bg-amber-50/80"
                                : "hover:bg-zinc-50"
                            }`}
                          >
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={row.selected}
                                onChange={(e) =>
                                  updateRow(row.id, {
                                    selected: e.target.checked,
                                  })
                                }
                                aria-label={`Importar ${row.nome}`}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Select
                                className="min-w-[7rem]"
                                value={row.tipo}
                                onChange={(e) =>
                                  updateRow(row.id, {
                                    tipo: e.target.value as ProcedimentoTipo,
                                  })
                                }
                              >
                                {PROCEDIMENTO_TIPOS.map((t) => (
                                  <option key={t.value} value={t.value}>
                                    {t.label}
                                  </option>
                                ))}
                              </Select>
                            </td>
                            <td className="px-3 py-2 font-medium text-zinc-900">
                              {row.nome}
                            </td>
                            <td className="px-3 py-2 text-zinc-700">
                              {formatDate(row.data)}
                            </td>
                            <td className="px-3 py-2">
                              {row.jaExiste ? (
                                <span className="inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900">
                                  Já existe
                                </span>
                              ) : (
                                <span className="text-xs text-muted">Novo</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted">
                      {selectedCount} de {rows.length} selecionado
                      {selectedCount === 1 ? "" : "s"} para importar
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={pending}
                        onClick={resetPreview}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        disabled={pending || selectedCount === 0}
                        onClick={handleConfirm}
                      >
                        Confirmar importação
                      </Button>
                    </div>
                  </div>
                </>
              ) : null}

              {rows && rows.length === 0 && !status && !error ? (
                <p className="text-sm text-muted">
                  Nenhum arquivo encontrado na pasta escolhida.
                </p>
              ) : null}

              {summary || unsupportedMsg ? (
                <div className="flex justify-end">
                  <Button type="button" onClick={resetPreview}>
                    Ok
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
