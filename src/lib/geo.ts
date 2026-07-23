/** Utilitários geográficos locais (sem serviços externos). */

const EARTH_RADIUS_M = 6_371_000;

/** Distância em metros entre dois pontos (Haversine). */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lng2 - lng1);
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Formata metros para exibição (m ou km). */
export function formatDistancia(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return km < 10 ? `${km.toFixed(2)} km` : `${km.toFixed(1)} km`;
}

export type GeoPoint = { id: string; latitude: number; longitude: number };

export type GeoParProximo<T extends GeoPoint> = {
  a: T;
  b: T;
  metros: number;
};

/** Pares com distância < maxMetros, ordenados do mais próximo ao mais distante. */
export function paresProximos<T extends GeoPoint>(
  pontos: T[],
  maxMetros: number,
): GeoParProximo<T>[] {
  const out: GeoParProximo<T>[] = [];
  for (let i = 0; i < pontos.length; i++) {
    for (let j = i + 1; j < pontos.length; j++) {
      const a = pontos[i]!;
      const b = pontos[j]!;
      const metros = haversineMeters(
        a.latitude,
        a.longitude,
        b.latitude,
        b.longitude,
      );
      if (metros <= maxMetros) out.push({ a, b, metros });
    }
  }
  out.sort((x, y) => x.metros - y.metros);
  return out;
}

/** Pontos dentro do raio a partir de um centro (exclui o próprio centro). */
export function pontosNoRaio<T extends GeoPoint>(
  centro: T,
  pontos: T[],
  raioMetros: number,
): Array<{ ponto: T; metros: number }> {
  const out: Array<{ ponto: T; metros: number }> = [];
  for (const p of pontos) {
    if (p.id === centro.id) continue;
    const metros = haversineMeters(
      centro.latitude,
      centro.longitude,
      p.latitude,
      p.longitude,
    );
    if (metros <= raioMetros) out.push({ ponto: p, metros });
  }
  out.sort((a, b) => a.metros - b.metros);
  return out;
}
