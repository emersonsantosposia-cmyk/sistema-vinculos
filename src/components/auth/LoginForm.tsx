"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { Button, Input, Label } from "@/components/ui/Form";
import {
  getEmailDomain,
  resolveLoginEmail,
} from "@/lib/auth/login-email";
import { createClient } from "@/lib/supabase/client";
import { mensagemMotivoSessao } from "@/lib/sessao";

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const motivoMsg = mensagemMotivoSessao(searchParams.get("motivo"));
  const emailDomain = getEmailDomain();
  const showDomainSuffix = Boolean(emailDomain) && !login.includes("@");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      setError(null);

      if (!login.trim()) {
        setError("Informe o usuário.");
        return;
      }

      const email = resolveLoginEmail(login);
      if (!email.includes("@")) {
        setError(
          "Domínio de e-mail não configurado. Defina NEXT_PUBLIC_EMAIL_DOMAIN.",
        );
        return;
      }

      const supabase = createClient();
      const { error: signError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signError) {
        setError(
          signError.message === "Invalid login credentials"
            ? "Usuário ou senha inválidos."
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
      className="w-full max-w-sm space-y-4 rounded border border-border bg-panel p-6 shadow-[var(--cor-sombra-modal)]"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-full overflow-hidden rounded border border-border bg-black">
          <img
            src="/rede-lince-institucional.png"
            alt="Rede Lince · PPF"
            width={2048}
            height={460}
            className="block h-auto w-full object-contain object-center"
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
          Acesso restrito. Usuários são criados pelo administrador em{" "}
          <span className="text-muted-strong">Usuários</span>. Não há cadastro
          público.
        </p>
      </div>

      {motivoMsg ? (
        <p
          className="rounded border border-[var(--cor-borda-destaque)] bg-[color:var(--cor-alerta-fundo)] px-2 py-1.5 text-xs text-muted-strong"
          role="status"
        >
          {motivoMsg}
        </p>
      ) : null}

      {error ? (
        <p className="rounded border border-danger-border bg-danger-bg px-2 py-1.5 text-xs text-danger-fg">
          {error}
        </p>
      ) : null}

      <div>
        <Label htmlFor="login">Usuário</Label>
        {showDomainSuffix ? (
          <div className="flex overflow-hidden rounded border border-field-border bg-field focus-within:border-gold">
            <input
              id="login"
              type="text"
              autoComplete="username"
              inputMode="text"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="nome.sobrenome"
              required
              disabled={pending}
              className="min-h-[44px] h-11 w-full flex-1 border-0 bg-transparent px-2.5 text-sm text-foreground outline-none placeholder:text-muted sm:h-8 sm:min-h-0 disabled:opacity-60"
            />
            <span
              className="flex shrink-0 items-center border-l border-field-border bg-panel-soft px-2.5 text-sm text-muted select-none"
              aria-hidden
            >
              @{emailDomain}
            </span>
          </div>
        ) : (
          <Input
            id="login"
            type="text"
            autoComplete="username"
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="usuario@dominio"
            required
            disabled={pending}
          />
        )}
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
