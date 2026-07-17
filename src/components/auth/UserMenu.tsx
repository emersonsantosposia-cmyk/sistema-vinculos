"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button, Input, Label } from "@/components/ui/Form";
import {
  formatPerfilAcesso,
  type PerfilUsuario,
} from "@/lib/perfis";
import { createClient } from "@/lib/supabase/client";

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
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trocar-senha-titulo"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-3 rounded-md border border-border bg-panel p-4 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2
              id="trocar-senha-titulo"
              className="text-sm font-bold tracking-[0.14em] text-gold uppercase"
            >
              Trocar senha
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Informe a senha atual e defina a nova senha.
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>

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

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Confirmar"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function UserMenu() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
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
          className="flex max-w-[240px] items-center gap-2 rounded border border-border bg-panel px-2.5 py-1.5 text-left hover:bg-panel-hover"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">
              {nome}
            </p>
            <p className="truncate text-[11px] text-muted">{perfilLabel}</p>
          </div>
          <span
            className={`shrink-0 text-[10px] text-muted transition-transform ${menuOpen ? "rotate-180" : ""}`}
            aria-hidden
          >
            ▾
          </span>
        </button>

        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 z-50 mt-1 min-w-[11rem] overflow-hidden rounded border border-border bg-panel py-1 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
          >
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-panel-hover"
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
              className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-panel-hover disabled:opacity-50"
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
    </>
  );
}
