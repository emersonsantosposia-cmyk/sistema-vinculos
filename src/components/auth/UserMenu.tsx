"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AboutSystemModal } from "@/components/auth/AboutSystemModal";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button, Input, Label } from "@/components/ui/Form";
import { ModalShell } from "@/components/ui/ModalShell";
import {
  formatPerfilAcesso,
  type PerfilUsuario,
} from "@/lib/perfis";
import { createClient } from "@/lib/supabase/client";
import { limparSessaoAtiva } from "@/lib/sessao";

function iniciais(nome: string) {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function ChangePasswordModal({
  email,
  onClose,
}: {
  email: string;
  onClose: () => void;
}) {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (novaSenha.length < 8) {
      setError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (novaSenha !== confirmar) {
      setError("Nova senha e confirmação não coincidem.");
      return;
    }
    if (novaSenha === senhaAtual) {
      setError("A nova senha deve ser diferente da senha atual.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: senhaAtual,
      });

      if (signInError) {
        setError(
          signInError.message === "Invalid login credentials"
            ? "Senha atual incorreta."
            : signInError.message,
        );
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: novaSenha,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess("Senha alterada com sucesso.");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmar("");
    });
  }

  return (
    <ModalShell
      title="Trocar senha"
      description="Informe a senha atual e defina a nova senha."
      onClose={onClose}
      size="sm"
      asForm
      onSubmit={handleSubmit}
      labelledBy="trocar-senha-titulo"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Confirmar"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
      {error ? (
        <p className="rounded border border-danger-border bg-danger-bg px-2 py-1.5 text-xs text-danger-fg">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded border border-border bg-panel-soft px-2 py-1.5 text-xs text-gold">
          {success}
        </p>
      ) : null}

      <div>
        <Label htmlFor="senha_atual">Senha atual</Label>
        <Input
          id="senha_atual"
          type="password"
          autoComplete="current-password"
          value={senhaAtual}
          onChange={(e) => setSenhaAtual(e.target.value)}
          required
          disabled={pending}
        />
      </div>

      <div>
        <Label htmlFor="nova_senha">Nova senha</Label>
        <Input
          id="nova_senha"
          type="password"
          autoComplete="new-password"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          required
          minLength={8}
          disabled={pending}
        />
      </div>

      <div>
        <Label htmlFor="confirmar_senha">Confirmar nova senha</Label>
        <Input
          id="confirmar_senha"
          type="password"
          autoComplete="new-password"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          required
          minLength={8}
          disabled={pending}
        />
      </div>
      </div>
    </ModalShell>
  );
}

export function UserMenu() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPerfil(null);
        setEmail(null);
        return;
      }

      setEmail(user.email ?? null);

      const { data } = await supabase
        .from("perfis_usuario")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      setPerfil((data as PerfilUsuario | null) ?? null);
    }

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    function close() {
      setMenuOpen(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    function onPointerDown(e: MouseEvent) {
      if (menuRef.current?.contains(e.target as Node)) return;
      close();
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [menuOpen]);

  function handleLogout() {
    setMenuOpen(false);
    startTransition(async () => {
      limparSessaoAtiva();
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    });
  }

  const nome =
    perfil?.nome?.trim() ||
    email?.split("@")[0] ||
    "Carregando…";
  const perfilLabel = formatPerfilAcesso(perfil);

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-11 w-11 min-h-[44px] min-w-[44px] max-w-[240px] items-center justify-center gap-2 overflow-hidden rounded-full border border-border bg-panel text-left hover:bg-panel-hover sm:h-auto sm:w-auto sm:min-h-0 sm:min-w-0 sm:justify-start sm:overflow-visible sm:rounded sm:px-2.5 sm:py-1.5"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={`Menu do usuário: ${nome}`}
        >
          <span
            className="inline-flex size-full items-center justify-center rounded-full bg-panel-soft text-[10px] font-semibold tracking-wide text-gold sm:size-7 sm:rounded"
            aria-hidden
          >
            {iniciais(nome)}
          </span>
          <div className="hidden min-w-0 flex-1 sm:block">
            <p className="truncate text-xs font-medium text-foreground">
              {nome}
            </p>
            <p className="truncate text-[11px] text-muted">{perfilLabel}</p>
          </div>
          <span
            className={`hidden shrink-0 text-[10px] text-muted transition-transform sm:inline ${menuOpen ? "rotate-180" : ""}`}
            aria-hidden
          >
            ▾
          </span>
        </button>

        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 z-50 mt-1 min-w-[12rem] overflow-hidden rounded border border-border bg-panel py-1 shadow-[var(--cor-sombra-dropdown)]"
          >
            <div className="border-b border-border px-3 py-2 sm:hidden">
              <p className="truncate text-xs font-medium text-foreground">
                {nome}
              </p>
              <p className="truncate text-[11px] text-muted">{perfilLabel}</p>
            </div>
            <div className="border-b border-border px-3 py-2 sm:hidden">
              <p className="mb-1.5 text-[10px] tracking-wide text-muted uppercase">
                Tema
              </p>
              <ThemeToggle className="w-full justify-center" />
            </div>
            <button
              type="button"
              role="menuitem"
              className="flex min-h-[44px] w-full items-center px-3 text-left text-sm text-foreground hover:bg-panel-hover sm:min-h-0 sm:py-2"
              onClick={() => {
                setMenuOpen(false);
                setPasswordOpen(true);
              }}
            >
              Trocar senha
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex min-h-[44px] w-full items-center px-3 text-left text-sm text-foreground hover:bg-panel-hover sm:min-h-0 sm:py-2"
              onClick={() => {
                setMenuOpen(false);
                setAboutOpen(true);
              }}
            >
              Sobre o sistema
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex min-h-[44px] w-full items-center px-3 text-left text-sm text-foreground hover:bg-panel-hover disabled:opacity-50 sm:min-h-0 sm:py-2"
              disabled={pending || !email}
              onClick={handleLogout}
            >
              {pending ? "Saindo…" : "Sair"}
            </button>
          </div>
        ) : null}
      </div>

      {passwordOpen && email ? (
        <ChangePasswordModal
          email={email}
          onClose={() => setPasswordOpen(false)}
        />
      ) : null}

      {aboutOpen ? (
        <AboutSystemModal onClose={() => setAboutOpen(false)} />
      ) : null}
    </>
  );
}
