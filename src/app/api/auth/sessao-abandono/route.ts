import { NextResponse } from "next/server";

/**
 * Reforço best-effort disparado via `navigator.sendBeacon` no `pagehide`.
 *
 * IMPORTANTE: este NÃO é o mecanismo confiável de "logout ao fechar a aba".
 * O `pagehide` também ocorre em F5/atualização; chamar `signOut` aqui
 * encerraria a sessão indevidamente após um simples refresh.
 *
 * O mecanismo confiável é a Parte 2.2 em `SessionGuard`: na próxima carga,
 * se `sessionStorage.sessao_ativa` estiver ausente e ainda houver usuário
 * Supabase (cookies), força `signOut` + redirect para o login.
 *
 * Este endpoint existe para eventual telemetria/abandono e responde 204
 * sem invalidar cookies (de propósito).
 */
export async function POST() {
  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  return new NextResponse(null, { status: 204 });
}
