import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0 dash-bg-layer" aria-hidden />
      <div className="pointer-events-none absolute inset-0 dash-grid-layer opacity-[0.08]" aria-hidden />
      <div className="relative z-10 w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
