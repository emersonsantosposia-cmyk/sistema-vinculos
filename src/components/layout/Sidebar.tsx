"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-fg">
      <div className="border-b border-border px-3 py-3">
        <div className="overflow-hidden rounded border border-border bg-black">
          <img
            src="/rede-lince-institucional.png"
            alt="Rede Lince · PPF"
            width={224}
            height={127}
            className="block h-auto w-full object-cover object-center"
          />
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {NAV_ITEMS.map((item) => {
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
                className="cursor-not-allowed rounded px-3 py-2 text-sm text-muted"
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
              className={`rounded px-3 py-2 text-sm transition-colors ${
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

      <div className="border-t border-border px-4 py-3 text-[10px] tracking-wide text-muted uppercase">
        Investigação / Inteligência
      </div>
    </aside>
  );
}
