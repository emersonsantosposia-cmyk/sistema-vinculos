"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/**
 * Wrapper do next-themes.
 * - attribute="data-theme" alinha com as variáveis CSS do sistema
 * - defaultTheme="system" + enableSystem: primeira visita segue o SO
 * - Após escolha manual (setTheme light/dark), persiste no localStorage
 *
 * next-themes injeta um <script> inline para evitar flash de tema (FOUC).
 * No React 19 / Next 16 isso gera o aviso "Encountered a script tag while
 * rendering React component" — falso positivo: o script é intencional e
 * executa corretamente no SSR. Filtramos só esse aviso em desenvolvimento.
 */
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const first = args[0];
    if (
      typeof first === "string" &&
      first.includes("Encountered a script tag")
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}

export function ThemeProvider({ children }: Props) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      storageKey="rede-lince-theme"
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
}
