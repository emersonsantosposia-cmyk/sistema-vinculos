import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { AppFooter } from "@/components/layout/AppFooter";
import { Sidebar } from "@/components/layout/Sidebar";
import { SessionGuard } from "@/components/auth/SessionGuard";
import { UserMenu } from "@/components/auth/UserMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function DashboardShell({
  title,
  actions,
  children,
  /** @deprecated Tema institucional é global; mantido só por compatibilidade. */
  variant: _variant = "default",
  /** Remove padding do main (ex.: Dashboard com banner full-bleed). */
  flush = false,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  variant?: "default" | "tactical";
  flush?: boolean;
}) {
  void _variant;

  return (
    <SessionGuard>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 items-center gap-3 border-b border-border bg-[color:var(--cor-fundo-secundaria)] px-5">
            <h2 className="titulo-institucional hidden min-w-0 shrink-0 truncate text-sm sm:block sm:max-w-[9rem] md:max-w-[12rem]">
              {title}
            </h2>
            <GlobalSearch />
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {actions ? (
                <div className="flex items-center gap-2">{actions}</div>
              ) : null}
              <ThemeToggle compact />
              <UserMenu />
            </div>
          </header>
          <main
            className={`flex-1 overflow-auto ${flush ? "p-0" : "p-5"}`}
          >
            {children}
          </main>
          <AppFooter />
        </div>
      </div>
    </SessionGuard>
  );
}
