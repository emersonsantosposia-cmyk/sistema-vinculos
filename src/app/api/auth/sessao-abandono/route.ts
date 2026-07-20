import { NextResponse } from "next/server";

/**
 * Endpoint residual (204). Antes era beacon de abandono de aba.
 * O logout por fechamento de aba foi removido — multi-aba é permitido.
 * Mantido apenas para não quebrar clients antigos que ainda chamem a URL.
 */
export async function POST() {
  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  return new NextResponse(null, { status: 204 });
}
