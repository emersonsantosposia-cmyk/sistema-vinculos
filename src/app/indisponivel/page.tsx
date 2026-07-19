import type { Metadata } from "next";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { formatAppVersionLabel } from "@/lib/app-version";

export const metadata: Metadata = {
  title: "Sistema indisponível",
  robots: { index: false, follow: false },
};

export default function IndisponivelPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0 dash-bg-layer" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 dash-grid-layer opacity-[0.08]"
        aria-hidden
      />
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <main className="relative z-10 w-full max-w-md rounded-md border border-border bg-panel px-6 py-8 text-center shadow-[var(--cor-sombra-modal)]">
        <p className="text-xs font-semibold tracking-[0.16em] text-gold uppercase">
          Rede Lince
        </p>
        <h1 className="mt-3 text-xl font-semibold text-foreground">
          Sistema temporariamente indisponível
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Configuração ausente ou inválida. O acesso foi bloqueado por
          segurança. Contate o administrador do sistema ou verifique as
          variáveis de ambiente do deploy (
          <code className="text-xs text-foreground">NEXT_PUBLIC_SUPABASE_URL</code>
          {" e "}
          <code className="text-xs text-foreground">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>
          ).
        </p>
      </main>

      <p className="absolute right-0 bottom-4 left-0 z-10 text-center text-[11px] tracking-wide text-muted">
        {formatAppVersionLabel()}
      </p>
    </div>
  );
}
