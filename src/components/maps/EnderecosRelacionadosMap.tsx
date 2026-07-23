"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { fixLeafletIcons } from "@/lib/leaflet-icons";
import {
  categoriaMarcador,
  descreverCaminhos,
  MARCADOR_CORES,
  type EnderecoMapaItem,
} from "@/lib/supabase/enderecos-mapa";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";

fixLeafletIcons();

const BRASIL: [number, number] = [-14.235, -51.9253];

function coloredIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
    html: `<span style="
      display:block;width:18px;height:18px;border-radius:50%;
      background:${color};border:2px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,.45);
    "></span>`,
  });
}

function FitBounds({
  points,
}: {
  points: Array<{ latitude: number; longitude: number }>;
}) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0]!.latitude, points[0]!.longitude], 15);
      return;
    }
    const bounds = L.latLngBounds(
      points.map((p) => [p.latitude, p.longitude] as [number, number]),
    );
    map.fitBounds(bounds.pad(0.18));
  }, [map, points]);
  return null;
}

export type MapaFerramenta = "navegar" | "medir" | "raio";

type Props = {
  itens: EnderecoMapaItem[];
  raizLabel: string;
  ferramenta: MapaFerramenta;
  selecionados: string[];
  onToggleSelecao: (enderecoId: string) => void;
  raioMetros: number | null;
  raioCentroId: string | null;
  destaqueIds: Set<string>;
  medidaEntre: [string, string] | null;
  className?: string;
};

export function EnderecosRelacionadosMapInner({
  itens,
  raizLabel,
  ferramenta,
  selecionados,
  onToggleSelecao,
  raioMetros,
  raioCentroId,
  destaqueIds,
  medidaEntre,
  className = "",
}: Props) {
  const plotados = useMemo(
    () =>
      itens.filter(
        (i) => i.latitude != null && i.longitude != null,
      ) as Array<EnderecoMapaItem & { latitude: number; longitude: number }>,
    [itens],
  );

  const byId = useMemo(() => {
    const m = new Map<string, (typeof plotados)[number]>();
    for (const i of plotados) m.set(i.enderecoId, i);
    return m;
  }, [plotados]);

  const centroRaio = raioCentroId ? byId.get(raioCentroId) : null;
  const medidaPts =
    medidaEntre && byId.get(medidaEntre[0]) && byId.get(medidaEntre[1])
      ? ([byId.get(medidaEntre[0])!, byId.get(medidaEntre[1])!] as const)
      : null;

  const center: [number, number] =
    plotados.length > 0
      ? [plotados[0]!.latitude, plotados[0]!.longitude]
      : BRASIL;

  return (
    <div className={`h-full min-h-[240px] w-full ${className}`}>
      <MapContainer
        center={center}
        zoom={plotados.length ? 12 : 4}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={plotados} />

        {centroRaio && raioMetros != null ? (
          <Circle
            center={[centroRaio.latitude, centroRaio.longitude]}
            radius={raioMetros}
            pathOptions={{
              color: "#c9a227",
              fillColor: "#c9a227",
              fillOpacity: 0.12,
              weight: 2,
            }}
          />
        ) : null}

        {medidaPts ? (
          <Polyline
            positions={[
              [medidaPts[0].latitude, medidaPts[0].longitude],
              [medidaPts[1].latitude, medidaPts[1].longitude],
            ]}
            pathOptions={{ color: "#2563eb", weight: 3, dashArray: "6 6" }}
          />
        ) : null}

        <MarkerClusterGroup chunkedLoading showCoverageOnHover={false}>
          {plotados.map((item) => {
            const cat = categoriaMarcador(item);
            const color = MARCADOR_CORES[cat];
            const selected = selecionados.includes(item.enderecoId);
            const highlighted =
              destaqueIds.size === 0 || destaqueIds.has(item.enderecoId);
            const caminhos = descreverCaminhos(item, raizLabel);

            return (
              <Marker
                key={item.enderecoId}
                position={[item.latitude, item.longitude]}
                icon={coloredIcon(color)}
                opacity={highlighted ? 1 : 0.35}
                eventHandlers={{
                  click: () => {
                    if (ferramenta === "medir" || ferramenta === "raio") {
                      onToggleSelecao(item.enderecoId);
                    }
                  },
                }}
              >
                <Popup>
                  <div className="max-w-[260px] space-y-2 text-sm">
                    <p className="font-semibold text-foreground">
                      {item.titulo}
                    </p>
                    {caminhos.map((texto, idx) => (
                      <p key={idx} className="text-xs leading-snug text-muted">
                        {texto}
                      </p>
                    ))}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <a
                        href={item.href}
                        className="text-xs font-medium text-[var(--cor-destaque-dourado)] underline-offset-2 hover:underline"
                      >
                        Abrir endereço
                      </a>
                      {item.caminhos
                        .filter((c) => c.intermediario)
                        .map((c) => (
                          <a
                            key={`${c.intermediario!.tipo}-${c.intermediario!.id}`}
                            href={c.intermediario!.href}
                            className="text-xs font-medium text-[var(--cor-destaque-dourado)] underline-offset-2 hover:underline"
                          >
                            Abrir {c.intermediario!.titulo}
                          </a>
                        ))}
                    </div>
                    {selected && ferramenta !== "navegar" ? (
                      <p className="text-[11px] text-muted-strong">
                        Selecionado para {ferramenta === "medir" ? "medição" : "raio"}
                      </p>
                    ) : null}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
