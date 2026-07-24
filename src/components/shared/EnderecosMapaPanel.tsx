"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatDistancia,
  haversineMeters,
  paresProximos,
  pontosNoRaio,
} from "@/lib/geo";
import {
  categoriaMarcador,
  coletarEnderecosRelacionados,
  MARCADOR_CORES,
  MARCADOR_LEGENDA,
  type EnderecoMapaItem,
  type MarcadorCategoria,
} from "@/lib/supabase/enderecos-mapa";
import type { MapaFerramenta } from "@/components/maps/EnderecosRelacionadosMap";

const MapInner = dynamic(
  () =>
    import("@/components/maps/EnderecosRelacionadosMap").then(
      (m) => m.EnderecosRelacionadosMapInner,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-panel-soft text-sm text-muted">
        Carregando mapa…
      </div>
    ),
  },
);

const RAIOS_PRESET = [
  { label: "200 m", value: 200 },
  { label: "500 m", value: 500 },
  { label: "1 km", value: 1000 },
  { label: "2 km", value: 2000 },
] as const;

type Props = {
  raizTipo: "caso" | "documento";
  raizId: string;
};

export function EnderecosMapaPanel({ raizTipo, raizId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comCoords, setComCoords] = useState<EnderecoMapaItem[]>([]);
  const [semCoords, setSemCoords] = useState<EnderecoMapaItem[]>([]);
  const [raizLabel, setRaizLabel] = useState(
    raizTipo === "caso" ? "Caso" : "Documento",
  );
  const [painelAberto, setPainelAberto] = useState(true);
  const [ferramenta, setFerramenta] = useState<MapaFerramenta>("navegar");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [raioMetros, setRaioMetros] = useState(500);
  const [paresMaxMetros, setParesMaxMetros] = useState(500);

  const close = useCallback(() => {
    setOpen(false);
    setFerramenta("navegar");
    setSelecionados([]);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await coletarEnderecosRelacionados(
      raizTipo,
      raizId,
    );
    setLoading(false);
    if (err || !data) {
      setError(err ?? "Não foi possível carregar os endereços.");
      setComCoords([]);
      setSemCoords([]);
      return;
    }
    setComCoords(data.comCoords);
    setSemCoords(data.semCoords);
    setRaizLabel(data.raizLabel);
  }, [raizTipo, raizId]);

  function openMapa() {
    setOpen(true);
    void load();
  }

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  function onToggleSelecao(id: string) {
    setSelecionados((prev) => {
      if (ferramenta === "raio") {
        return prev[0] === id ? [] : [id];
      }
      // medir: até 2
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1]!, id];
      return [...prev, id];
    });
  }

  const plotados = useMemo(
    () =>
      comCoords
        .filter((i) => i.latitude != null && i.longitude != null)
        .map((i) => ({
          ...i,
          id: i.enderecoId,
          latitude: i.latitude as number,
          longitude: i.longitude as number,
        })),
    [comCoords],
  );

  const medidaEntre =
    ferramenta === "medir" && selecionados.length === 2
      ? ([selecionados[0]!, selecionados[1]!] as [string, string])
      : null;

  const distanciaMedida = useMemo(() => {
    if (!medidaEntre) return null;
    const a = plotados.find((p) => p.enderecoId === medidaEntre[0]);
    const b = plotados.find((p) => p.enderecoId === medidaEntre[1]);
    if (!a || !b) return null;
    return haversineMeters(a.latitude, a.longitude, b.latitude, b.longitude);
  }, [medidaEntre, plotados]);

  const raioCentroId =
    ferramenta === "raio" && selecionados[0] ? selecionados[0] : null;

  const noRaio = useMemo(() => {
    if (!raioCentroId) return [];
    const centro = plotados.find((p) => p.enderecoId === raioCentroId);
    if (!centro) return [];
    return pontosNoRaio(centro, plotados, raioMetros);
  }, [raioCentroId, plotados, raioMetros]);

  const destaqueIds = useMemo(() => {
    if (ferramenta !== "raio" || !raioCentroId) return new Set<string>();
    const s = new Set<string>([raioCentroId]);
    for (const n of noRaio) s.add(n.ponto.enderecoId);
    return s;
  }, [ferramenta, raioCentroId, noRaio]);

  const pares = useMemo(
    () => paresProximos(plotados, paresMaxMetros),
    [plotados, paresMaxMetros],
  );

  const categoriasUsadas = useMemo(() => {
    const set = new Set<MarcadorCategoria>();
    for (const i of comCoords) set.add(categoriaMarcador(i));
    return [...set];
  }, [comCoords]);

  return (
    <>
      <button
        type="button"
        onClick={openMapa}
        className="group flex w-full min-h-[44px] items-center justify-between gap-3 rounded-lg border border-[var(--cor-borda-destaque)] bg-[color:var(--cor-alerta-fundo)] px-4 py-3 text-left transition-colors hover:bg-[color:var(--cor-card-fundo-hover)]"
      >
        <span>
          <span className="block text-sm font-semibold text-[var(--cor-destaque-dourado-claro)]">
            Ver mapa dos endereços
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            Análise geográfica dos endereços vinculados (diretos e via
            entidades).
          </span>
        </span>
        <span
          className="rounded-full border border-[var(--cor-borda-destaque)] px-2 py-1 text-xs text-[var(--cor-destaque-dourado)]"
          aria-hidden
        >
          Abrir
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[1100] flex flex-col bg-[var(--cor-fundo)]"
          role="dialog"
          aria-modal="true"
          aria-label="Mapa dos endereços relacionados"
        >
          <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2 sm:px-4">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold text-foreground sm:text-base">
                Mapa dos endereços — {raizLabel}
              </h2>
              <p className="hidden text-xs text-muted sm:block">
                Proximidade geográfica é indício, não vínculo. O mapa reflete
                apenas os endereços já cadastrados e vinculados.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPainelAberto((v) => !v)}
              className="btn-acao-secundario min-h-[44px] min-w-[44px] sm:hidden"
              aria-expanded={painelAberto}
            >
              {painelAberto ? "Mapa" : "Painel"}
            </button>
            <button
              type="button"
              onClick={close}
              className="btn-acao-secundario min-h-[44px] min-w-[44px] text-lg leading-none"
              aria-label="Fechar mapa"
            >
              ×
            </button>
          </header>

          <p className="shrink-0 border-b border-border bg-panel-soft px-3 py-1.5 text-[11px] text-muted sm:hidden">
            Proximidade geográfica é indício, não vínculo. O mapa reflete apenas
            os endereços já cadastrados e vinculados.
          </p>

          <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
            <div
              className={`min-h-0 ${
                painelAberto
                  ? "flex max-h-[45vh] flex-col border-b border-border sm:max-h-none sm:w-[min(100%,22rem)] sm:border-b-0 sm:border-r"
                  : "hidden sm:flex sm:w-[min(100%,22rem)] sm:flex-col sm:border-r sm:border-border"
              } bg-panel`}
            >
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
                {loading ? (
                  <p className="text-sm text-muted">Coletando endereços…</p>
                ) : null}
                {error ? (
                  <p className="rounded border border-danger-border bg-danger-bg px-2 py-1.5 text-xs text-danger-fg">
                    {error}
                  </p>
                ) : null}

                {!loading && !error ? (
                  <p className="text-xs text-muted">
                    {comCoords.length} plotado(s)
                    {semCoords.length > 0
                      ? ` · ${semCoords.length} sem coordenadas`
                      : ""}
                  </p>
                ) : null}

                <section>
                  <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-strong uppercase">
                    Ferramentas
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ["navegar", "Navegar"],
                        ["medir", "Medir"],
                        ["raio", "Raio"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        className={`min-h-[44px] rounded border px-3 text-xs font-medium sm:min-h-[36px] ${
                          ferramenta === id
                            ? "border-[var(--cor-borda-destaque)] bg-[color:var(--cor-alerta-fundo)] text-foreground"
                            : "border-border bg-panel-soft text-muted hover:border-[var(--cor-borda-destaque)]"
                        }`}
                        onClick={() => {
                          setFerramenta(id);
                          setSelecionados([]);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {ferramenta === "medir" ? (
                    <p className="mt-2 text-xs text-muted">
                      Clique em dois marcadores para medir a distância.
                      {distanciaMedida != null ? (
                        <span className="mt-1 block font-semibold text-foreground">
                          Distância: {formatDistancia(distanciaMedida)}
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                  {ferramenta === "raio" ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs text-muted">
                        Clique em um marcador (centro) e escolha o raio.
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {RAIOS_PRESET.map((r) => (
                          <button
                            key={r.value}
                            type="button"
                            className={`min-h-[44px] rounded border px-2.5 text-xs sm:min-h-[36px] ${
                              raioMetros === r.value
                                ? "border-[var(--cor-borda-destaque)] bg-[color:var(--cor-alerta-fundo)]"
                                : "border-border"
                            }`}
                            onClick={() => setRaioMetros(r.value)}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                      {raioCentroId ? (
                        <ul className="space-y-1 text-xs">
                          <li className="font-medium text-foreground">
                            Dentro do raio ({noRaio.length}):
                          </li>
                          {noRaio.length === 0 ? (
                            <li className="text-muted">Nenhum outro endereço.</li>
                          ) : (
                            noRaio.map(({ ponto, metros }) => (
                              <li key={ponto.enderecoId}>
                                <a
                                  href={ponto.href}
                                  className="text-[var(--cor-destaque-dourado)] underline-offset-2 hover:underline"
                                >
                                  {ponto.titulo}
                                </a>
                                <span className="text-muted">
                                  {" "}
                                  · {formatDistancia(metros)}
                                </span>
                              </li>
                            ))
                          )}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                </section>

                <section>
                  <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-strong uppercase">
                    Pares próximos
                  </h3>
                  <label className="mb-2 flex items-center gap-2 text-xs text-muted">
                    Até
                    <select
                      className="min-h-[44px] rounded border border-border bg-panel px-2 text-foreground sm:min-h-[32px]"
                      value={paresMaxMetros}
                      onChange={(e) => setParesMaxMetros(Number(e.target.value))}
                    >
                      {RAIOS_PRESET.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {pares.length === 0 ? (
                    <p className="text-xs text-muted">
                      Nenhum par abaixo de {formatDistancia(paresMaxMetros)}.
                    </p>
                  ) : (
                    <ul className="max-h-48 space-y-2 overflow-y-auto text-xs">
                      {pares.map(({ a, b, metros }) => (
                        <li
                          key={`${a.enderecoId}-${b.enderecoId}`}
                          className="rounded border border-border bg-panel-soft px-2 py-1.5"
                        >
                          <span className="font-medium text-foreground">
                            {formatDistancia(metros)}
                          </span>
                          <div className="mt-0.5 text-muted">
                            <a
                              href={a.href}
                              className="text-[var(--cor-destaque-dourado)] underline-offset-2 hover:underline"
                            >
                              {a.titulo}
                            </a>
                            {" ↔ "}
                            <a
                              href={b.href}
                              className="text-[var(--cor-destaque-dourado)] underline-offset-2 hover:underline"
                            >
                              {b.titulo}
                            </a>
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted">
                            {resumoEntidades(a)} · {resumoEntidades(b)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {categoriasUsadas.length > 0 ? (
                  <section>
                    <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-strong uppercase">
                      Legenda
                    </h3>
                    <p className="mb-2 text-[11px] text-muted">
                      Cor = tipo da entidade intermediária (ou vínculo direto).
                    </p>
                    <ul className="space-y-1 text-xs">
                      {categoriasUsadas.map((c) => (
                        <li key={c} className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-full border border-white shadow"
                            style={{ background: MARCADOR_CORES[c] }}
                          />
                          {MARCADOR_LEGENDA[c]}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {semCoords.length > 0 ? (
                  <section>
                    <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-strong uppercase">
                      Endereços sem coordenadas (não plotados)
                    </h3>
                    <ul className="space-y-1.5 text-xs">
                      {semCoords.map((e) => (
                        <li key={e.enderecoId}>
                          <a
                            href={`${e.href}/editar`}
                            className="text-[var(--cor-destaque-dourado)] underline-offset-2 hover:underline"
                          >
                            {e.titulo}
                          </a>
                          <span className="text-muted"> — preencher no cadastro</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            </div>

            <div className="relative min-h-0 flex-1">
              {!loading && comCoords.length === 0 && semCoords.length === 0 && !error ? (
                <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted">
                  Nenhum endereço vinculado a este {raizLabel.toLowerCase()}{" "}
                  (direto ou via entidades).
                </div>
              ) : (
                <MapInner
                  itens={comCoords}
                  raizLabel={raizLabel}
                  ferramenta={ferramenta}
                  selecionados={selecionados}
                  onToggleSelecao={onToggleSelecao}
                  raioMetros={ferramenta === "raio" ? raioMetros : null}
                  raioCentroId={raioCentroId}
                  destaqueIds={destaqueIds}
                  medidaEntre={medidaEntre}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function resumoEntidades(item: EnderecoMapaItem): string {
  if (item.caminhos.some((c) => c.modo === "direto")) return "direto";
  const nomes: string[] = [];
  const seen = new Set<string>();
  for (const c of item.caminhos) {
    if (c.viaDocumento) {
      const key = `doc:${c.viaDocumento.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        nomes.push(c.viaDocumento.titulo);
      }
    }
    if (c.intermediario) {
      const key = `${c.intermediario.tipo}:${c.intermediario.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        nomes.push(c.intermediario.titulo);
      }
    }
  }
  return nomes.length ? nomes.join(", ") : "—";
}
