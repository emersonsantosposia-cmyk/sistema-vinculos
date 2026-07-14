"use client";

import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { fixLeafletIcons } from "@/lib/leaflet-icons";
import "leaflet/dist/leaflet.css";

fixLeafletIcons();

const DEFAULT_CENTER: [number, number] = [-14.235, -51.9253]; // Brasil
const DEFAULT_ZOOM = 4;

function Recenter({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

function ClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

type ViewerProps = {
  latitude: number;
  longitude: number;
  label?: string | null;
  className?: string;
};

export function MapViewer({
  latitude,
  longitude,
  label,
  className = "",
}: ViewerProps) {
  const center: [number, number] = [latitude, longitude];

  return (
    <div className={`overflow-hidden rounded border border-border ${className}`}>
      <MapContainer
        center={center}
        zoom={16}
        scrollWheelZoom
        className="h-[280px] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={center} />
        <Recenter center={center} zoom={16} />
      </MapContainer>
      {label ? (
        <p className="border-t border-border bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          {label} · {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </p>
      ) : null}
    </div>
  );
}

type PickerProps = {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  className?: string;
};

export function MapPicker({
  latitude,
  longitude,
  onChange,
  className = "",
}: PickerProps) {
  const hasPoint =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  const center: [number, number] = hasPoint
    ? [latitude, longitude]
    : DEFAULT_CENTER;
  const zoom = hasPoint ? 16 : DEFAULT_ZOOM;

  return (
    <div className={`overflow-hidden rounded border border-border ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        className="h-[280px] w-full cursor-crosshair"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {hasPoint ? <Marker position={[latitude, longitude]} /> : null}
        <ClickHandler onPick={onChange} />
        <Recenter center={center} zoom={zoom} />
      </MapContainer>
      <p className="border-t border-border bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
        Clique no mapa para posicionar o marcador e preencher latitude/longitude.
      </p>
    </div>
  );
}
