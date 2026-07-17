import { LoginForm } from "@/components/auth/LoginForm";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { formatAppVersionLabel } from "@/lib/app-version";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0 dash-bg-layer" aria-hidden />
      <div className="pointer-events-none absolute inset-0 dash-grid-layer opacity-[0.08]" aria-hidden />
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <div className="relative z-10 w-full max-w-sm">
        <LoginForm />
      </div>
      <p className="absolute right-0 bottom-4 left-0 z-10 text-center text-[11px] tracking-wide text-muted">
        {formatAppVersionLabel()}
      </p>
    </div>
  );
}
