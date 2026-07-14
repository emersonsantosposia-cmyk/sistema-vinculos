"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col bg-sidebar text-sidebar-fg">
      <div className="border-b border-zinc-700 px-4 py-4">
        <p className="text-[11px] font-medium tracking-wider text-zinc-400 uppercase">
          Sistema interno
        </p>
        <h1 className="mt-1 text-sm font-semibold text-white">
          Rede Lince
        </h1>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {NAV_ITEMS.map((item) => {
          const active =
            !item.disabled &&
            (pathname === item.href || pathname.startsWith(`${item.href}/`));

          if (item.disabled) {
            return (
              <span
                key={item.href}
                className="cursor-not-allowed rounded px-3 py-2 text-sm text-zinc-500"
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
                  ? "bg-zinc-700 font-medium text-white"
                  : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-700 px-4 py-3 text-[10px] text-zinc-600">
        Investigação / Inteligência
      </div>
    </aside>
  );
}
