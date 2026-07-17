"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Input, Select } from "@/components/ui/Form";
import { formatCpf } from "@/lib/format";
import {
  labelPerfilRole,
  labelUnidade,
  UNIDADES,
  type PerfilUsuario,
} from "@/lib/perfis";

type Props = {
  usuarios: PerfilUsuario[];
  currentUserId: string;
};

export function UsuariosFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [unidade, setUnidade] = useState(searchParams.get("unidade") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "todos");
  const [pending, startTransition] = useTransition();

  function apply() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (unidade) params.set("unidade", unidade);
    if (status && status !== "todos") params.set("status", status);
    startTransition(() => {
      router.push(`/usuarios${params.toString() ? `?${params}` : ""}`);
    });
  }

  return (
    <div className="mb-3 flex flex-wrap items-end gap-2">
      <div className="min-w-[200px] flex-1">
        <label className="mb-1 block text-xs font-medium text-muted">
          Buscar
        </label>
        <Input
          placeholder="Nome, matrícula ou e-mail…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply();
          }}
        />
      </div>
      <div className="w-[9rem]">
        <label className="mb-1 block text-xs font-medium text-muted">
          Unidade
        </label>
        <Select
          value={unidade}
          onChange={(e) => setUnidade(e.target.value)}
        >
          <option value="">Todas</option>
          {UNIDADES.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-[9rem]">
        <label className="mb-1 block text-xs font-medium text-muted">
          Status
        </label>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="todos">Todos</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </Select>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={apply}
        className="h-8 rounded border border-border bg-panel px-3 text-sm font-medium text-muted-strong hover:bg-panel-hover hover:text-gold-bright disabled:opacity-50"
      >
        Filtrar
      </button>
    </div>
  );
}

export function UsuariosTable({ usuarios, currentUserId }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleCredenciamento(user: PerfilUsuario) {
    const ativar = !user.ativo;
    const msg = ativar
      ? `Recredenciar ${user.nome}? O login será liberado novamente.`
      : `Descredenciar ${user.nome}? O acesso aos dados e o login serão bloqueados.`;

    if (!window.confirm(msg)) return;

    setError(null);
    setPendingId(user.id);
    try {
      const res = await fetch(`/api/usuarios/${user.id}/credenciamento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: ativar }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Falha ao atualizar credenciamento.");
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  if (usuarios.length === 0) {
    return (
      <div className="rounded border border-border bg-panel px-4 py-10 text-center text-sm text-muted">
        Nenhum usuário encontrado com os filtros atuais.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error ? (
        <p className="rounded border border-danger-border bg-danger-bg px-3 py-2 text-xs text-danger-fg">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded border border-border bg-panel">
        <table className="w-full min-w-[880px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-panel-soft text-xs font-bold tracking-[0.14em] text-gold uppercase">
              <th className="px-3 py-2.5 font-semibold">Nome</th>
              <th className="px-3 py-2.5 font-semibold">Matrícula</th>
              <th className="px-3 py-2.5 font-semibold">E-mail</th>
              <th className="px-3 py-2.5 font-semibold">Perfil</th>
              <th className="px-3 py-2.5 font-semibold">Unidade</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
              <th className="px-3 py-2.5 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((user) => {
              const isSelf = user.id === currentUserId;
              const busy = pendingId === user.id;
              return (
                <tr
                  key={user.id}
                  className="border-b border-border last:border-b-0 hover:bg-panel-hover"
                >
                  <td className="px-3 py-2 font-medium text-foreground">
                    {user.nome}
                    <div className="font-mono text-[10px] text-muted">
                      {formatCpf(user.cpf)}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-strong">{user.matricula}</td>
                  <td className="px-3 py-2 text-muted-strong">{user.email}</td>
                  <td className="px-3 py-2 text-muted-strong">
                    {labelPerfilRole(user.role)}
                  </td>
                  <td className="px-3 py-2 text-muted-strong">
                    {labelUnidade(user.unidade)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                        user.ativo
                          ? "bg-panel-soft text-gold"
                          : "bg-danger-bg text-danger-fg"
                      }`}
                    >
                      {user.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      <Link
                        href={`/usuarios/${user.id}/editar`}
                        className="btn-acao-secundario text-[11px]"
                      >
                        Editar
                      </Link>
                      <Button
                        type="button"
                        variant="secondary"
                        className="text-[11px]"
                        disabled={busy || (isSelf && user.ativo)}
                        title={
                          isSelf && user.ativo
                            ? "Não é possível descredenciar a própria conta"
                            : undefined
                        }
                        onClick={() => void toggleCredenciamento(user)}
                      >
                        {busy
                          ? "…"
                          : user.ativo
                            ? "Descredenciar"
                            : "Recredenciar"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        {usuarios.length} usuário{usuarios.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
