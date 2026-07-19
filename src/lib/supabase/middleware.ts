import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/sessao-abandono"];

/** Página de erro quando o deploy está sem configuração do Supabase. */
const CONFIG_ERROR_PATH = "/indisponivel";

const ENV_URL = "NEXT_PUBLIC_SUPABASE_URL";
const ENV_ANON = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

let missingConfigLogged = false;
let configOkLogged = false;

/**
 * Lê env em runtime via chave dinâmica.
 * Acesso estático `process.env.NEXT_PUBLIC_*` pode ser inlined pelo
 * Turbopack/webpack no bundle do middleware — aí comentar o .env.local
 * e reiniciar não surte efeito até limpar `.next`.
 */
function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isValidSupabaseConfig(
  url: string | undefined,
  key: string | undefined,
): boolean {
  if (!url || !key) return false;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
  } catch {
    return false;
  }

  // Chave anon típica (JWT ou sb_*) — rejeita placeholders óbvios.
  if (key.length < 20) return false;
  if (/^(your|changeme|todo|xxx|\.\.\.)/i.test(key)) return false;

  return true;
}

function logMissingConfig(pathname: string, reason: string) {
  if (missingConfigLogged) return;
  missingConfigLogged = true;
  console.error(
    `[Rede Lince] Configuração Supabase inválida ou ausente (${reason}). ` +
      `Bloqueando acesso (inclui /login). Path: ${pathname}. ` +
      `Defina ${ENV_URL} e ${ENV_ANON} no .env.local e reinicie o servidor ` +
      `(se o bloqueio não aparecer após comentar as vars, apague a pasta .next).`,
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

  // Inclui /login e demais rotas “públicas”: sem config, nada funciona.
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = CONFIG_ERROR_PATH;
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl);
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = readEnv(ENV_URL);
  const key = readEnv(ENV_ANON);

  if (!url || !key) {
    return blockForMissingConfig(request, "variáveis ausentes");
  }

  if (!isValidSupabaseConfig(url, key)) {
    return blockForMissingConfig(request, "variáveis inválidas");
  }

  if (!configOkLogged) {
    configOkLogged = true;
    console.info(
      "[Rede Lince] Middleware: configuração Supabase presente (URL + ANON).",
    );
  }

  const supabase = createServerClient(url, key, {
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
