type Props = {
  latitude?: number | null;
  longitude?: number | null;
  label?: string | null;
};

/** Placeholder visual — integração com API de mapas virá depois. */
export function MapaPlaceholder({ latitude, longitude, label }: Props) {
  const hasCoords =
    typeof latitude === "number" &&
    !Number.isNaN(latitude) &&
    typeof longitude === "number" &&
    !Number.isNaN(longitude);

  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center">
      <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
        Mapa (placeholder)
      </p>
      {label ? (
        <p className="mt-2 text-sm font-medium text-zinc-700">{label}</p>
      ) : null}
      {hasCoords ? (
        <p className="mt-1 font-mono text-xs text-zinc-600">
          {latitude}, {longitude}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">
          Coordenadas não informadas. Integração do mapa será feita depois.
        </p>
      )}
      <p className="mt-3 max-w-sm text-[11px] text-zinc-400">
        Este bloco será substituído por um componente de mapa (ex.: Leaflet /
        Mapbox / Google Maps).
      </p>
    </div>
  );
}
