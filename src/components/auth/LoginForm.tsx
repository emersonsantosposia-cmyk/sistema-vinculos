"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { Button, Input, Label } from "@/components/ui/Form";
import { createClient } from "@/lib/supabase/client";

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      setError(null);
      const supabase = createClient();
      const { error: signError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signError) {
        setError(
          signError.message === "Invalid login credentials"
            ? "E-mail ou senha inválidos."
            : signError.message,
        );
        return;
      }
      const next = searchParams.get("next");
      const dest =
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : "/";
      router.push(dest);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm space-y-4 rounded border border-border bg-panel p-6 shadow-[0_16px_48px_rgba(0,0,0,0.45)]"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-full overflow-hidden rounded border border-border bg-black">
          <img
            src="/rede-lince-institucional.png"
            alt="Rede Lince · PPF"
            width={420}
            height={238}
            className="block h-auto w-full object-cover"
          />
        </div>
        <p className="text-[10px] font-medium tracking-[0.22em] text-muted uppercase">
          Sistema de contrainteligência
        </p>
        <h1
          className="text-xl font-bold tracking-[0.28em] text-gold"
          style={{
            fontFamily: "var(--font-dash-display), ui-sans-serif, system-ui",
          }}
        >
          REDE LINCE
        </h1>
        <p className="text-xs text-muted">
          Acesso restrito. Usuários são criados pelo administrador no Supabase
          (Authentication → Users). Não há cadastro público.
        </p>
      </div>

      {error ? (
        <p className="rounded border border-danger-border bg-danger-bg px-2 py-1.5 text-xs text-danger-fg">
          {error}
        </p>
      ) : null}

      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={pending}
        />
      </div>
      <div>
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={pending}
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}

export function LoginForm() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-sm rounded border border-border bg-panel p-5 text-sm text-muted">
          Carregando…
        </div>
      }
    >
      <LoginFormInner />
    </Suspense>
  );
}
