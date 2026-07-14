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

function buildQuery(endereco: EnderecoGeocode): string {
  const cep = endereco.cep?.replace(/\D/g, "");
  return [
    [endereco.logradouro, endereco.numero].filter(Boolean).join(", "),
    endereco.bairro,
    endereco.cidade,
    endereco.estado,
    cep ? cep.replace(/^(\d{5})(\d{3})$/, "$1-$2") : null,
    "Brasil",
  ]
    .filter(Boolean)
    .join(", ");
}

/** Geocodificação via Nominatim (OpenStreetMap) — sem chave de API. */
export async function geocodeEndereco(
  endereco: EnderecoGeocode,
): Promise<{ data: GeocodeResult | null; error: string | null }> {
  const query = buildQuery(endereco);
  if (!endereco.cidade && !endereco.cep && !endereco.logradouro) {
    return {
      data: null,
      error: "Informe ao menos logradouro/cidade/CEP para geocodificar.",
    };
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "br");
    url.searchParams.set("q", query);

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Language": "pt-BR",
      },
    });

    if (!res.ok) {
      return { data: null, error: "Falha na geocodificação." };
    }

    const json = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;

    if (!json.length) {
      return { data: null, error: "Endereço não encontrado no mapa." };
    }

    return {
      data: {
        latitude: Number(json[0].lat),
        longitude: Number(json[0].lon),
        displayName: json[0].display_name,
      },
      error: null,
    };
  } catch {
    return {
      data: null,
      error: "Não foi possível consultar o serviço de mapas.",
    };
  }
}
