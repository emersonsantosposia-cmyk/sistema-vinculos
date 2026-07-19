"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { NAV_ITEMS } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";

type SidebarProps = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

function NavLinks({
  isAdmin,
  pathname,
  onNavigate,
}: {
  isAdmin: boolean;
  pathname: string;
  onNavigate?: () => void;
}) {
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
      {items.map((item) => {
        const active =
          !item.disabled &&
          (item.href === "/"
            ? pathname === "/"
            : pathname === item.href ||
              pathname.startsWith(`${item.href}/`));

        if (item.disabled) {
          return (
            <span
              key={item.href}
              className="cursor-not-allowed rounded px-3 py-2 text-sm whitespace-nowrap text-muted"
              title="Em breve"
            >
              {item.label}
            </span>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`rounded px-3 py-2 text-sm whitespace-nowrap transition-colors ${
              active
                ? "bg-panel-hover font-medium text-gold shadow-[inset_0_0_0_1px_var(--cor-borda-destaque)]"
                : "text-muted-strong hover:bg-panel hover:text-gold-bright"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function BrandBlock() {
  return (
    <div className="border-b border-border px-3 py-3">
      <div className="overflow-hidden rounded border border-border bg-[color:var(--cor-fundo-primaria)]">
        <img
          src="/rede-lince-institucional.png"
          alt="Rede Lince · PPF"
          width={224}
          height={127}
          className="block h-auto w-full object-contain object-center"
        />
      </div>
    </div>
  );
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const titleId = useId();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data } = await supabase
        .from("perfis_usuario")
        .select("role, ativo")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;
      setIsAdmin(data?.role === "administrador" && data?.ativo === true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    onMobileClose?.();
    // Fecha o drawer ao mudar de rota; onMobileClose é estável via useCallback no shell.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onMobileClose?.();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen, onMobileClose]);

  return (
    <>
      <aside
        className="notranslate hidden w-56 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-fg sm:flex"
        translate="no"
      >
        <BrandBlock />
        <NavLinks isAdmin={isAdmin} pathname={pathname} />
        <div className="border-t border-border px-4 py-3 text-[10px] tracking-wide text-muted uppercase">
          Investigação / Inteligência
        </div>
      </aside>

      <div
        className={`fixed inset-0 z-50 sm:hidden ${
          mobileOpen ? "" : "pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          tabIndex={mobileOpen ? 0 : -1}
          aria-label="Fechar menu"
          className={`absolute inset-0 bg-[color:var(--cor-fundo-overlay)] transition-opacity duration-200 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={onMobileClose}
        />
        <aside
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          translate="no"
          className={`notranslate absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] max-w-full flex-col border-r border-border bg-sidebar text-sidebar-fg shadow-[var(--cor-sombra-modal)] transition-transform duration-200 ease-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <p
              id={titleId}
              className="titulo-institucional text-xs tracking-wide"
            >
              Menu
            </p>
            <button
              type="button"
              onClick={onMobileClose}
              className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded border border-border bg-panel text-muted-strong hover:bg-panel-hover hover:text-gold"
              aria-label="Fechar menu"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                aria-hidden
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <BrandBlock />
          <NavLinks
            isAdmin={isAdmin}
            pathname={pathname}
            onNavigate={onMobileClose}
          />
          <div className="border-t border-border px-4 py-3 text-[10px] tracking-wide text-muted uppercase">
            Investigação / Inteligência
          </div>
        </aside>
      </div>
    </>
  );
}
