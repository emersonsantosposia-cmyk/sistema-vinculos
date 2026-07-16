import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { Sidebar } from "@/components/layout/Sidebar";
import { UserMenu } from "@/components/auth/UserMenu";

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
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center gap-3 border-b border-border bg-[color:var(--cor-fundo-secundaria)] px-5">
          <h2 className="titulo-institucional hidden min-w-0 shrink-0 truncate text-sm sm:block sm:max-w-[9rem] md:max-w-[12rem]">
            {title}
          </h2>
          <GlobalSearch />
          <div className="flex shrink-0 items-center gap-3">
            {actions ? (
              <div className="flex items-center gap-2">{actions}</div>
            ) : null}
            <UserMenu />
          </div>
        </header>
        <main
          className={`flex-1 overflow-auto ${flush ? "p-0" : "p-5"}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
