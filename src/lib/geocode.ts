/**
 * Geocodificação Nominatim (OpenStreetMap) — apenas server-side.
 * O Nominatim rejeita User-Agents de browser (403); a chamada real
 * fica em /api/geocode com User-Agent identificando a aplicação.
 *
 * Usa busca estruturada (street/city/state/postalcode/country) em vez de
 * texto livre "q", com degradês progressivos de campos.
 */

import type { GeocodePrecisao } from "@/lib/types";

export type { GeocodePrecisao };

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  displayName: string;
  precisao: GeocodePrecisao;
};

export type EnderecoGeocode = {
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
};

export const GEOCODE_FAIL_USER_MSG =
  "Não foi possível localizar as coordenadas deste endereço automaticamente; você pode ajustar manualmente.";

export const GEOCODE_PRECISAO_LABEL: Record<GeocodePrecisao, string> = {
  exata: "Localização exata",
  rua: "Localização aproximada (nível de rua)",
  bairro_cidade: "Localização aproximada (nível de bairro/cidade)",
};

const NOMINATIM_UA =
  "RedeLince/1.5 (sistema-vinculos; geocoding; https://github.com/local/sistema-vinculos)";

type NominatimAddress = {
  house_number?: string;
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  postcode?: string;
};

type NominatimHit = {
  lat: string;
  lon: string;
  display_name: string;
  osm_type?: string;
  class?: string;
  type?: string;
  address?: NominatimAddress;
};

/** Parâmetros estruturados da API Nominatim /search. */
export type NominatimStructuredParams = {
  street?: string;
  city?: string;
  state?: string;
  postalcode?: string;
  country: string;
};

function formatCep(cep: string | null | undefined): string {
  const digits = cep?.replace(/\D/g, "") ?? "";
  if (digits.length === 8) {
    return digits.replace(/^(\d{5})(\d{3})$/, "$1-$2");
  }
  return digits;
}

/**
 * Monta street no formato Nominatim: "número logradouro" ou só logradouro.
 * (Convenção documentada: house number + street name.)
 */
export function buildStructuredStreet(
  logradouro?: string | null,
  numero?: string | null,
): string {
  const rua = logradouro?.trim() || "";
  const num = numero?.trim() || "";
  if (rua && num) return `${num} ${rua}`;
  return rua || num;
}

/**
 * Consultas estruturadas em ordem: completa → sem CEP → sem número →
 * cidade+UF+CEP → cidade+UF. Sem texto livre "q".
 */
export function buildStructuredGeocodeFallbacks(
  endereco: EnderecoGeocode,
): NominatimStructuredParams[] {
  const streetWithNumber = buildStructuredStreet(
    endereco.logradouro,
    endereco.numero,
  );
  const streetOnly = endereco.logradouro?.trim() || "";
  const city = endereco.cidade?.trim() || "";
  const state = endereco.estado?.trim() || "";
  const postalcode = formatCep(endereco.cep);
  const country = "Brasil";

  const candidates: NominatimStructuredParams[] = [
    {
      street: streetWithNumber || undefined,
      city: city || undefined,
      state: state || undefined,
      postalcode: postalcode || undefined,
      country,
    },
    {
      street: streetWithNumber || undefined,
      city: city || undefined,
      state: state || undefined,
      country,
    },
    {
      street: streetOnly || undefined,
      city: city || undefined,
      state: state || undefined,
      country,
    },
    {
      city: city || undefined,
      state: state || undefined,
      postalcode: postalcode || undefined,
      country,
    },
    {
      city: city || undefined,
      state: state || undefined,
      country,
    },
  ];

  const seen = new Set<string>();
  const out: NominatimStructuredParams[] = [];
  for (const c of candidates) {
    const hasLocality = Boolean(c.street || c.city || c.postalcode);
    if (!hasLocality) continue;
    const key = JSON.stringify(c);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

/** @deprecated Preferir buildStructuredGeocodeFallbacks — mantido para compat. */
export function buildGeocodeQuery(endereco: EnderecoGeocode): string {
  const street = buildStructuredStreet(endereco.logradouro, endereco.numero);
  return [street, endereco.bairro, endereco.cidade, endereco.estado, formatCep(endereco.cep), "Brasil"]
    .filter(Boolean)
    .join(", ");
}

/** @deprecated Preferir buildStructuredGeocodeFallbacks. */
export function buildGeocodeQueryFallbacks(endereco: EnderecoGeocode): string[] {
  return buildStructuredGeocodeFallbacks(endereco).map((p) =>
    [p.street, p.city, p.state, p.postalcode, p.country].filter(Boolean).join(", "),
  );
}

/**
 * Classifica a precisão a partir dos metadados do Nominatim.
 * - exata: house_number no address, ou class/type de imóvel (place/house, building/…)
 * - rua: class highway
 * - bairro_cidade: demais
 */
export function classifyGeocodePrecisao(
  hit: Pick<NominatimHit, "class" | "type" | "address" | "osm_type">,
): GeocodePrecisao {
  const cls = (hit.class ?? "").toLowerCase();
  const typ = (hit.type ?? "").toLowerCase();
  const houseNumber = hit.address?.house_number?.trim();

  if (houseNumber) return "exata";

  const exactTypes = new Set([
    "house",
    "residential",
    "apartments",
    "detached",
    "terrace",
    "bungalow",
    "static_caravan",
    "cabin",
    "farm",
    "houseboat",
  ]);
  if (
    (cls === "place" && typ === "house") ||
    (cls === "building" && (exactTypes.has(typ) || typ === "yes")) ||
    (cls === "building" && typ === "house")
  ) {
    return "exata";
  }

  if (cls === "highway") return "rua";

  return "bairro_cidade";
}

export function labelGeocodePrecisao(
  precisao: GeocodePrecisao | null | undefined,
  ajustadaManualmente?: boolean,
): string | null {
  if (ajustadaManualmente) return "Localização ajustada manualmente";
  if (!precisao) return null;
  return GEOCODE_PRECISAO_LABEL[precisao];
}

function parseNominatimHit(json: unknown): GeocodeResult | null {
  if (!Array.isArray(json) || json.length === 0) return null;
  const hit = json[0] as NominatimHit;
  const latitude = Number(hit.lat);
  const longitude = Number(hit.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    latitude,
    longitude,
    displayName: hit.display_name,
    precisao: classifyGeocodePrecisao(hit),
  };
}

async function fetchNominatim(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "pt-BR",
      "User-Agent": NOMINATIM_UA,
    },
    cache: "no-store",
  });
}

function structuredSearchUrl(params: NominatimStructuredParams): string {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "br");
  url.searchParams.set("country", params.country);
  if (params.street) url.searchParams.set("street", params.street);
  if (params.city) url.searchParams.set("city", params.city);
  if (params.state) url.searchParams.set("state", params.state);
  if (params.postalcode) {
    url.searchParams.set("postalcode", params.postalcode);
  }
  return url.toString();
}

/** Consulta Nominatim estruturada com User-Agent adequado (só no servidor). */
export async function geocodeViaNominatim(
  endereco: EnderecoGeocode,
): Promise<{ data: GeocodeResult | null; error: string | null }> {
  if (!endereco.cidade && !endereco.cep && !endereco.logradouro) {
    return {
      data: null,
      error: "Informe ao menos logradouro, cidade ou CEP para geocodificar.",
    };
  }

  const queries = buildStructuredGeocodeFallbacks(endereco);
  if (queries.length === 0) {
    return {
      data: null,
      error: "Informe ao menos logradouro, cidade ou CEP para geocodificar.",
    };
  }

  try {
    for (let i = 0; i < queries.length; i++) {
      const params = queries[i]!;
      const url = structuredSearchUrl(params);

      let res = await fetchNominatim(url);

      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 1100));
        res = await fetchNominatim(url);
      }

      if (!res.ok) {
        console.error(
          `[geocode] Nominatim HTTP ${res.status} para params:`,
          params,
        );
        if (res.status === 403 || res.status >= 500) {
          return { data: null, error: GEOCODE_FAIL_USER_MSG };
        }
        if (i < queries.length - 1) {
          await new Promise((r) => setTimeout(r, 1100));
          continue;
        }
        return { data: null, error: GEOCODE_FAIL_USER_MSG };
      }

      const data = parseNominatimHit(await res.json());
      if (data) {
        return { data, error: null };
      }

      if (i < queries.length - 1) {
        await new Promise((r) => setTimeout(r, 1100));
      }
    }

    return { data: null, error: GEOCODE_FAIL_USER_MSG };
  } catch (err) {
    console.error("[geocode] falha ao consultar Nominatim:", err);
    return { data: null, error: GEOCODE_FAIL_USER_MSG };
  }
}

/**
 * Cliente: chama /api/geocode (proxy server-side).
 * Nunca chama Nominatim direto do browser (403 por User-Agent).
 */
export async function geocodeEndereco(
  endereco: EnderecoGeocode,
): Promise<{ data: GeocodeResult | null; error: string | null }> {
  try {
    const res = await fetch("/api/geocode", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(endereco),
    });

    const payload = (await res.json().catch(() => null)) as {
      data?: GeocodeResult | null;
      error?: string | null;
    } | null;

    if (!res.ok) {
      return {
        data: null,
        error: payload?.error ?? GEOCODE_FAIL_USER_MSG,
      };
    }

    if (!payload?.data) {
      return {
        data: null,
        error: payload?.error ?? GEOCODE_FAIL_USER_MSG,
      };
    }

    return { data: payload.data, error: null };
  } catch {
    return { data: null, error: GEOCODE_FAIL_USER_MSG };
  }
}
