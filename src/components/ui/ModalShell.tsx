"use client";

import { useEffect, useId, type ReactNode } from "react";
import { Button } from "@/components/ui/Form";

const SIZE_CLASS = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-2xl",
  "2xl": "sm:max-w-3xl",
  "4xl": "sm:max-w-4xl",
} as const;

export type ModalSize = keyof typeof SIZE_CLASS;

type Props = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  /** Classes de z-index, ex.: z-[60] */
  zClass?: string;
  /** Backdrop escuro genérico (auditoria / vínculos). */
  darkBackdrop?: boolean;
  /** Fecha ao clicar no overlay (default true). */
  closeOnBackdrop?: boolean;
  labelledBy?: string;
  describedBy?: string;
  /** Conteúdo renderizado como <form> (ex.: trocar senha). */
  asForm?: boolean;
  onSubmit?: (e: React.FormEvent) => void;
};

/**
 * Modal responsivo: quase tela cheia no celular; caixa centralizada no desktop.
 */
export function ModalShell({
  title,
  description,
  onClose,
  children,
  footer,
  size = "sm",
  zClass = "z-[60]",
  darkBackdrop = false,
  closeOnBackdrop = true,
  labelledBy,
  describedBy,
  asForm = false,
  onSubmit,
}: Props) {
  const autoId = useId();
  const titleId = labelledBy ?? `${autoId}-titulo`;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const panelClass = `flex max-h-full w-full flex-col overflow-hidden rounded-md border border-border bg-panel shadow-[var(--cor-sombra-modal)] sm:max-h-[min(90vh,40rem)] ${SIZE_CLASS[size]}`;

  const header = (
    <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border px-4 py-3">
      <div className="min-w-0">
        <h2
          id={titleId}
          className="text-sm font-bold tracking-[0.14em] text-gold uppercase"
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted">{description}</p>
        ) : null}
      </div>
      <Button type="button" variant="ghost" onClick={onClose}>
        Fechar
      </Button>
    </div>
  );

  const body = (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
      {children}
    </div>
  );

  const footerEl = footer ? (
    <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-panel-soft/80 px-4 py-3 sm:flex-row sm:justify-end [&_button]:h-11 [&_button]:min-h-[44px] sm:[&_button]:h-8 sm:[&_button]:min-h-0">
      {footer}
    </div>
  ) : null;

  const inner = asForm ? (
    <form
      className={panelClass}
      onClick={(e) => e.stopPropagation()}
      onSubmit={onSubmit}
    >
      {header}
      {body}
      {footerEl}
    </form>
  ) : (
    <div className={panelClass} onClick={(e) => e.stopPropagation()}>
      {header}
      {body}
      {footerEl}
    </div>
  );

  return (
    <div
      className={`fixed inset-0 ${zClass} flex items-stretch justify-center p-2 sm:items-center sm:p-4 ${
        darkBackdrop
          ? "bg-black/65"
          : "bg-[color:var(--cor-fundo-overlay)]"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={describedBy}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      {inner}
    </div>
  );
}
