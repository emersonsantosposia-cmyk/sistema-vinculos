import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function Label({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 block text-xs font-medium tracking-wide text-muted-strong uppercase"
    >
      {children}
    </label>
  );
}

const fieldBase =
  "rounded border border-field-border bg-field text-sm text-foreground outline-none placeholder:text-muted focus:border-gold";

/** Altura confortável para toque no mobile; compacta a partir de sm. */
const fieldTouch = "min-h-[44px] h-11 w-full sm:h-8 sm:min-h-0";

export function Input({
  className = "",
  type,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const isFile = type === "file";
  return (
    <input
      type={type}
      className={`${fieldTouch} px-2.5 ${fieldBase} ${
        isFile
          ? "py-2 file:mr-3 file:rounded file:border-0 file:bg-panel-soft file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-muted-strong sm:py-0"
          : ""
      } ${className}`}
      {...props}
    />
  );
}

export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`${fieldTouch} px-2 ${fieldBase} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full min-h-[5.5rem] px-2.5 py-2.5 sm:py-2 ${fieldBase} ${className}`}
      {...props}
    />
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const variants = {
    primary:
      "bg-gold font-semibold text-gold-ink hover:bg-gold-bright active:bg-gold",
    secondary:
      "border border-border bg-panel text-muted-strong hover:border-border-strong hover:bg-panel-hover hover:text-gold-bright",
    danger:
      "border border-danger-border bg-danger-bg text-danger-fg hover:bg-danger",
    ghost: "text-muted-strong hover:bg-panel-hover hover:text-gold-bright",
  };

  return (
    <button
      className={`inline-flex h-11 min-h-[44px] items-center justify-center gap-1.5 rounded px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:min-h-0 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

/**
 * Barra de ações de formulário: sticky no rodapé no mobile (toque ≥44px),
 * alinhada à direita no desktop.
 */
export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-5 mt-6 border-t border-border bg-[color:var(--cor-fundo-secundaria)]/95 px-5 py-3 backdrop-blur-sm sm:static sm:z-auto sm:mx-0 sm:mt-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&_a]:inline-flex [&_a]:h-11 [&_a]:min-h-[44px] [&_a]:items-center [&_a]:justify-center sm:[&_a]:h-8 sm:[&_a]:min-h-0 [&_button]:h-11 [&_button]:min-h-[44px] sm:[&_button]:h-8 sm:[&_button]:min-h-0">
        {children}
      </div>
    </div>
  );
}

export function Panel({
  title,
  actions,
  children,
  className = "",
}: {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded border border-border bg-panel ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          {title ? (
            <h3 className="text-sm font-bold tracking-[0.12em] text-gold uppercase">
              {title}
            </h3>
          ) : (
            <span />
          )}
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-6 text-center text-sm text-muted">{children}</p>
  );
}

export function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded border border-warning-border bg-warning-bg px-3 py-2 text-sm text-warning-fg">
      {children}
    </div>
  );
}

/** Classes compartilhadas para Links estilizados como botão. */
export const linkPrimaryClass = "btn-acao";
export const linkSecondaryClass = "btn-acao-secundario";
