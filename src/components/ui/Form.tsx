import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
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

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-8 w-full px-2.5 ${fieldBase} ${className}`}
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
      className={`h-8 w-full px-2 ${fieldBase} ${className}`}
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
      className={`w-full px-2.5 py-2 ${fieldBase} ${className}`}
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
    ghost:
      "text-muted-strong hover:bg-panel-hover hover:text-gold-bright",
  };

  return (
    <button
      className={`inline-flex h-8 items-center justify-center gap-1.5 rounded px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
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
