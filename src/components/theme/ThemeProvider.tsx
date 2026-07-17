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
 */
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
