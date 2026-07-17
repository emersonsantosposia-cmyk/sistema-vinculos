import {
  formatAppVersionLabel,
  getAppVersion,
} from "@/lib/app-version";

/** Rodapé discreto com a versão (todas as telas do shell). */
export function AppFooter() {
  return (
    <footer className="shrink-0 border-t border-border bg-[color:var(--cor-fundo-secundaria)] px-5 py-2">
      <p className="text-center text-[11px] tracking-wide text-muted">
        {formatAppVersionLabel()}
        <span className="sr-only"> versão {getAppVersion()}</span>
      </p>
    </footer>
  );
}
