"use client";

import dynamic from "next/dynamic";

const MapViewerInner = dynamic(
  () => import("@/components/maps/LeafletMaps").then((m) => m.MapViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[280px] items-center justify-center rounded border border-border bg-panel-soft text-sm text-muted">
        Carregando mapa…
      </div>
    ),
  },
);

const MapPickerInner = dynamic(
  () => import("@/components/maps/LeafletMaps").then((m) => m.MapPicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[280px] items-center justify-center rounded border border-border bg-panel-soft text-sm text-muted">
        Carregando mapa…
      </div>
    ),
  },
);

export function MapViewer(props: {
  latitude: number;
  longitude: number;
  label?: string | null;
  className?: string;
}) {
  return <MapViewerInner {...props} />;
}

export function MapPicker(props: {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  className?: string;
}) {
  return <MapPickerInner {...props} />;
}
