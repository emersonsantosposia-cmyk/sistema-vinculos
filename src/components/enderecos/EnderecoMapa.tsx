"use client";

import { MapViewer } from "@/components/maps/MapComponents";
import { labelGeocodePrecisao } from "@/lib/geocode";
import type { GeocodePrecisao } from "@/lib/types";

type Props = {
  latitude?: number | null;
  longitude?: number | null;
  label?: string | null;
  coordenadasAjustadasManualmente?: boolean;
  geocodePrecisao?: GeocodePrecisao | null;
};

export function EnderecoMapa({
  latitude,
  longitude,
  label,
  coordenadasAjustadasManualmente = false,
  geocodePrecisao = null,
}: Props) {
  const lat =
    typeof latitude === "number"
      ? latitude
      : latitude != null
        ? Number(latitude)
        : NaN;
  const lng =
    typeof longitude === "number"
      ? longitude
      : longitude != null
        ? Number(longitude)
        : NaN;

  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  if (!hasCoords) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded border border-dashed border-border bg-panel-soft px-4 py-8 text-center">
        <p className="text-sm text-muted">
          Sem coordenadas para exibir o mapa.
        </p>
        <p className="mt-1 text-xs text-muted">
          Preencha latitude/longitude ou use a geocodificação no cadastro.
        </p>
      </div>
    );
  }

  const precisaoLabel = labelGeocodePrecisao(
    geocodePrecisao,
    coordenadasAjustadasManualmente,
  );

  return (
    <MapViewer
      latitude={lat}
      longitude={lng}
      label={label}
      precisaoLabel={precisaoLabel}
    />
  );
}
