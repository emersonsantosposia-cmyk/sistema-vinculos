import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/sessao-abandono"];

/** Página de erro quando o deploy está sem configuração do Supabase. */
const CONFIG_ERROR_PATH = "/indisponivel";

let missingConfigLogged = false;

function isValidSupabaseConfig(
  url: string | undefined,
  key: string | undefined,
): boolean {
  const trimmedUrl = url?.trim();
  const trimmedKey = key?.trim();
  if (!trimmedUrl || !trimmedKey) return false;

  try {
    const parsed = new URL(trimmedUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
  } catch {
    return false;
  }

  // Chave anon típica (JWT ou sb_*) — rejeita placeholders óbvios.
  if (trimmedKey.length < 20) return false;
  if (/^(your|changeme|todo|xxx)/i.test(trimmedKey)) return false;

  return true;
}

function logMissingConfig(pathname: string, reason: string) {
  if (missingConfigLogged) return;
  missingConfigLogged = true;
  console.error(
    `[Rede Lince] Configuração Supabase inválida ou ausente (${reason}). ` +
      `Bloqueando acesso a rotas protegidas. Path inicial: ${pathname}. ` +
      `Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.`,
  );
}

function blockForMissingConfig(request: NextRequest, reason: string) {
  const pathname = request.nextUrl.pathname;
  logMissingConfig(pathname, reason);

  // A própria página de erro (e seus assets já excluídos do matcher) passa.
  if (
    pathname === CONFIG_ERROR_PATH ||
    pathname.startsWith(`${CONFIG_ERROR_PATH}/`)
  ) {
    return NextResponse.next({ request });
  }

  // APIs: 503 JSON em vez de redirect HTML.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        error:
          "Sistema temporariamente indisponível — configuração ausente.",
      },
      { status: 503 },
    );
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = CONFIG_ERROR_PATH;
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl);
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url?.trim() || !key?.trim()) {
    return blockForMissingConfig(request, "variáveis ausentes");
  }

  if (!isValidSupabaseConfig(url, key)) {
    return blockForMissingConfig(request, "variáveis inválidas");
  }

  const supabase = createServerClient(url.trim(), key.trim(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const isConfigErrorPage =
    pathname === CONFIG_ERROR_PATH ||
    pathname.startsWith(`${CONFIG_ERROR_PATH}/`);

  // Com config OK, a página de erro de configuração não deve ser usada.
  if (isConfigErrorPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = user ? "/" : "/login";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (!user && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname === "/login") {
    const redirectUrl = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get("next");
    redirectUrl.pathname =
      next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
