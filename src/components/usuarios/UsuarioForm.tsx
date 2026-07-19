"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, FormActions, Input, Label, Select } from "@/components/ui/Form";
import { maskCpfInput } from "@/lib/format";
import {
  PERFIL_ROLES,
  UNIDADES,
  type PerfilRole,
  type PerfilUsuario,
  type Unidade,
} from "@/lib/perfis";

type Props = {
  initial?: PerfilUsuario;
};

export function UsuarioForm({ initial }: Props) {
  const isEdit = Boolean(initial);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [senhaGerada, setSenhaGerada] = useState<string | null>(null);

  const [nome, setNome] = useState(initial?.nome ?? "");
  const [matricula, setMatricula] = useState(initial?.matricula ?? "");
  const [cpf, setCpf] = useState(
    initial?.cpf ? maskCpfInput(initial.cpf) : "",
  );
  const [email, setEmail] = useState(initial?.email ?? "");
  const [role, setRole] = useState<PerfilRole>(
    initial?.role ?? "analista",
  );
  const [unidade, setUnidade] = useState<Unidade | "">(
    initial?.unidade ?? "",
  );
  const [senha, setSenha] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      setError(null);
      setSenhaGerada(null);

      const payload = {
        nome,
        matricula,
        cpf,
        email,
        role,
        unidade: role === "administrador" ? null : unidade || null,
        ...(isEdit ? {} : { senha }),
      };

      const res = await fetch(
        isEdit ? `/api/usuarios/${initial!.id}` : "/api/usuarios",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        id?: string;
      };

      if (!res.ok) {
        setError(json.error || "Não foi possível salvar o usuário.");
        return;
      }

      router.push("/usuarios");
      router.refresh();
    });
  }

  function handleRedefinirSenha() {
    if (!initial) return;
    if (
      !window.confirm(
        "Gerar uma nova senha temporária para este usuário? A senha atual deixará de funcionar.",
      )
    ) {
      return;
    }

    startTransition(async () => {
      setError(null);
      setSenhaGerada(null);
      const res = await fetch(`/api/usuarios/${initial.id}/redefinir-senha`, {
        method: "POST",
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        senhaTemporaria?: string;
      };
      if (!res.ok) {
        setError(json.error || "Não foi possível redefinir a senha.");
        return;
      }
      setSenhaGerada(json.senhaTemporaria ?? null);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-4">
      {error ? (
        <p className="rounded border border-danger-border bg-danger-bg px-3 py-2 text-xs text-danger-fg">
          {error}
        </p>
      ) : null}

      {senhaGerada ? (
        <p className="rounded border border-border bg-panel-soft px-3 py-2 text-sm text-foreground">
          Nova senha temporária (copie agora — não será exibida de novo):{" "}
          <span className="font-mono font-semibold text-gold">{senhaGerada}</span>
        </p>
      ) : null}

      <div>
        <Label htmlFor="nome">Nome completo</Label>
        <Input
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          disabled={pending}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="matricula">Matrícula</Label>
          <Input
            id="matricula"
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            required
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="cpf">CPF</Label>
          <Input
            id="cpf"
            value={cpf}
            onChange={(e) => setCpf(maskCpfInput(e.target.value))}
            placeholder="000.000.000-00"
            required
            disabled={pending}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={pending}
        />
      </div>

      <div>
        <Label htmlFor="role">Perfil de acesso</Label>
        <Select
          id="role"
          value={role}
          onChange={(e) => {
            const next = e.target.value as PerfilRole;
            setRole(next);
            if (next === "administrador") setUnidade("");
          }}
          disabled={pending}
        >
          {PERFIL_ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </div>

      {role === "analista" ? (
        <div>
          <Label htmlFor="unidade">Unidade de lotação</Label>
          <Select
            id="unidade"
            value={unidade}
            onChange={(e) => setUnidade(e.target.value as Unidade | "")}
            required
            disabled={pending}
          >
            <option value="">Selecione…</option>
            {UNIDADES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {!isEdit ? (
        <div>
          <Label htmlFor="senha">Senha temporária</Label>
          <Input
            id="senha"
            type="text"
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            minLength={8}
            disabled={pending}
          />
          <p className="mt-1 text-[11px] text-muted">
            Mínimo de 8 caracteres. Informe ao servidor no credenciamento.
          </p>
        </div>
      ) : null}

      <FormActions>
        <Link href="/usuarios" className="btn-acao-secundario text-xs">
          Cancelar
        </Link>
        {isEdit ? (
          <Button
            type="button"
            variant="secondary"
            onClick={handleRedefinirSenha}
            disabled={pending}
          >
            Redefinir senha
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending
            ? "Salvando…"
            : isEdit
              ? "Salvar alterações"
              : "Criar usuário"}
        </Button>
      </FormActions>
    </form>
  );
}
