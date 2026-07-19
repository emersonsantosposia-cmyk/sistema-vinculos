"use client";

import { useCallback, useEffect, useState } from "react";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { AppFooter } from "@/components/layout/AppFooter";
import { Sidebar } from "@/components/layout/Sidebar";
import { SessionGuard } from "@/components/auth/SessionGuard";
import { UserMenu } from "@/components/auth/UserMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

function MenuIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  useEffect(() => {
    function onResize() {
      if (window.matchMedia("(min-width: 640px)").matches) {
        setMobileSearchOpen(false);
      }
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <SessionGuard>
      <div className="flex min-h-screen overflow-x-hidden bg-background">
        <Sidebar mobileOpen={mobileNavOpen} onMobileClose={closeMobileNav} />
        <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
          <header className="shrink-0 border-b border-border bg-[color:var(--cor-fundo-secundaria)]">
            <div className="relative flex h-12 min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-5">
              <button
                type="button"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border bg-panel text-muted-strong hover:bg-panel-hover hover:text-gold sm:hidden"
                aria-label="Abrir menu de navegação"
                aria-expanded={mobileNavOpen}
                aria-controls="mobile-nav-drawer"
                onClick={() => setMobileNavOpen(true)}
              >
                <MenuIcon className="h-4 w-4" />
              </button>

              <div
                className={`min-w-0 shrink-0 items-center gap-2 sm:hidden ${
                  mobileSearchOpen ? "hidden" : "flex"
                }`}
              >
                <img
                  src="/rede-lince-institucional.png"
                  alt="Rede Lince"
                  width={96}
                  height={28}
                  className="h-7 w-auto max-w-[5.5rem] object-contain object-left"
                />
              </div>

              <h2
                className={`titulo-institucional hidden min-w-0 shrink-0 truncate text-sm sm:block sm:max-w-[9rem] md:max-w-[12rem] ${
                  mobileSearchOpen ? "max-sm:hidden" : ""
                }`}
              >
                {title}
              </h2>

              <GlobalSearch
                mobileExpanded={mobileSearchOpen}
                onMobileExpandedChange={setMobileSearchOpen}
              />

              <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:ml-0 sm:gap-3">
                {actions ? (
                  <div className="hidden items-center gap-2 sm:flex">
                    {actions}
                  </div>
                ) : null}
                <div className="hidden sm:block">
                  <ThemeToggle compact />
                </div>
                <UserMenu />
              </div>
            </div>

            {actions ? (
              <div className="flex flex-wrap gap-2 border-t border-border px-3 py-2 sm:hidden [&_.btn-acao]:min-h-10 [&_.btn-acao]:flex-1 [&_.btn-acao]:justify-center [&_.btn-acao-secundario]:min-h-10 [&_.btn-acao-secundario]:flex-1 [&_.btn-acao-secundario]:justify-center [&_button]:min-h-10 [&_button]:flex-1">
                {actions}
              </div>
            ) : null}
          </header>
          <main
            className={`min-w-0 flex-1 overflow-x-hidden overflow-y-auto ${flush ? "p-0" : "p-5"}`}
          >
            {children}
          </main>
          <AppFooter />
        </div>
      </div>
    </SessionGuard>
  );
}
