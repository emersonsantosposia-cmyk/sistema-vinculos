"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

function SunIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.7 4.7l1.6 1.6M17.7 17.7l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.7 19.3l1.6-1.6M17.7 6.3l1.6-1.6" />
    </svg>
  );
}

function MoonIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden
    >
      <path d="M20.5 14.2A7.8 7.8 0 019.8 3.5 7.9 7.9 0 0012 19.2a7.8 7.8 0 008.5-5z" />
    </svg>
  );
}

type Props = {
  className?: string;
  compact?: boolean;
};

const toggleBase =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded border border-border bg-panel text-xs text-muted-strong transition-colors hover:border-border-strong hover:text-gold sm:min-h-0 sm:py-1.5";

export function ThemeToggle({ className = "", compact = false }: Props) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  function handleToggle() {
    // Escolha explícita light/dark — a partir daqui o SO é ignorado.
    setTheme(isDark ? "light" : "dark");
  }

  const sizeClass = compact
    ? "h-11 w-11 min-w-[44px] px-0 sm:h-[34px] sm:w-auto sm:min-w-0 sm:px-2.5"
    : "h-11 min-w-[44px] px-2.5 sm:h-[34px] sm:min-w-0";

  if (!mounted) {
    return (
      <button
        type="button"
        className={`${toggleBase} ${sizeClass} ${className}`}
        aria-hidden
        tabIndex={-1}
        disabled
      >
        <span className="h-4 w-4" />
        {compact ? null : <span className="hidden w-10 sm:inline" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`${toggleBase} ${sizeClass} ${className}`}
      title={isDark ? "Alternar para tema claro" : "Alternar para tema escuro"}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
    >
      {isDark ? (
        <SunIcon className="h-4 w-4 text-gold" />
      ) : (
        <MoonIcon className="h-4 w-4 text-gold" />
      )}
      {compact ? null : (
        <span className="hidden sm:inline">
          {isDark ? "Claro" : "Escuro"}
        </span>
      )}
    </button>
  );
}
