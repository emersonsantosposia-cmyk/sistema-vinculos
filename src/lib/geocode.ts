/**
 * Geocodificação Nominatim (OpenStreetMap) — apenas server-side.
 * O Nominatim rejeita User-Agents de browser (403); a chamada real
 * fica em /api/geocode com User-Agent identificando a aplicação.
 */

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  displayName: string;
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

const NOMINATIM_UA =
  "RedeLince/1.3 (sistema-vinculos; geocoding; https://github.com/local/sistema-vinculos)";

type NominatimHit = {
  lat: string;
  lon: string;
  display_name: string;
};

export function buildGeocodeQuery(endereco: EnderecoGeocode): string {
  const cepDigits = endereco.cep?.replace(/\D/g, "") ?? "";
  const cepFormatted =
    cepDigits.length === 8
      ? cepDigits.replace(/^(\d{5})(\d{3})$/, "$1-$2")
      : cepDigits || null;

  return [
    [endereco.logradouro, endereco.numero].filter(Boolean).join(", "),
    endereco.bairro,
    endereco.cidade,
    endereco.estado,
    cepFormatted,
    "Brasil",
  ]
    .filter(Boolean)
    .join(", ");
}

/** Queries em ordem: completa → sem bairro → rua+cidade → cidade+UF/CEP. */
export function buildGeocodeQueryFallbacks(endereco: EnderecoGeocode): string[] {
  const cepDigits = endereco.cep?.replace(/\D/g, "") ?? "";
  const cepFormatted =
    cepDigits.length === 8
      ? cepDigits.replace(/^(\d{5})(\d{3})$/, "$1-$2")
      : "";

  const street = [endereco.logradouro, endereco.numero]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(", ");
  const streetOnly = endereco.logradouro?.trim() || "";
  const cidade = endereco.cidade?.trim() || "";
  const estado = endereco.estado?.trim() || "";

  const candidates = [
    buildGeocodeQuery(endereco),
    // Bairros locais (ex.: "Vila São Jorge da Lagoa") costumam zerar o Nominatim.
    [street || streetOnly, cidade, estado, cepFormatted, "Brasil"]
      .filter(Boolean)
      .join(", "),
    [streetOnly, cidade, estado, "Brasil"].filter(Boolean).join(", "),
    [cidade, estado, cepFormatted, "Brasil"].filter(Boolean).join(", "),
    [cidade, estado, "Brasil"].filter(Boolean).join(", "),
  ];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of candidates) {
    const normalized = q.replace(/\s+/g, " ").trim();
    if (!normalized || normalized === "Brasil") continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function parseNominatimHit(
  json: unknown,
): GeocodeResult | null {
  if (!Array.isArray(json) || json.length === 0) return null;
  const hit = json[0] as NominatimHit;
  const latitude = Number(hit.lat);
  const longitude = Number(hit.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    latitude,
    longitude,
    displayName: hit.display_name,
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

/** Consulta Nominatim com User-Agent adequado (uso exclusivo no servidor). */
export async function geocodeViaNominatim(
  endereco: EnderecoGeocode,
): Promise<{ data: GeocodeResult | null; error: string | null }> {
  if (!endereco.cidade && !endereco.cep && !endereco.logradouro) {
    return {
      data: null,
      error: "Informe ao menos logradouro, cidade ou CEP para geocodificar.",
    };
  }

  const queries = buildGeocodeQueryFallbacks(endereco);
  if (queries.length === 0) {
    return {
      data: null,
      error: "Informe ao menos logradouro, cidade ou CEP para geocodificar.",
    };
  }

  try {
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "1");
      url.searchParams.set("countrycodes", "br");
      url.searchParams.set("q", query);

      let res = await fetchNominatim(url.toString());

      // Nominatim: máx. ~1 req/s — retentativa curta em 429.
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 1100));
        res = await fetchNominatim(url.toString());
      }

      if (!res.ok) {
        console.error(
          `[geocode] Nominatim HTTP ${res.status} para query: ${query}`,
        );
        // Em 403/5xx não adianta degradar a query na mesma sessão.
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

      // Sem resultado: tenta query mais frouxa (respeitando 1 req/s).
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
