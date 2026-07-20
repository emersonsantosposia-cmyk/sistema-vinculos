import { NextResponse } from "next/server";
import {
  GEOCODE_FAIL_USER_MSG,
  geocodeViaNominatim,
  type EnderecoGeocode,
} from "@/lib/geocode";

/**
 * Proxy server-side para Nominatim.
 * Necessário porque o Nominatim bloqueia User-Agents de browser (HTTP 403).
 */
export async function POST(request: Request) {
  let body: EnderecoGeocode;
  try {
    body = (await request.json()) as EnderecoGeocode;
  } catch {
    return NextResponse.json(
      { data: null, error: "Requisição de geocodificação inválida." },
      { status: 400 },
    );
  }

  const result = await geocodeViaNominatim(body);

  if (!result.data) {
    return NextResponse.json(
      { data: null, error: result.error ?? GEOCODE_FAIL_USER_MSG },
      { status: 200 },
    );
  }

  return NextResponse.json({ data: result.data, error: null });
}
