import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/supabase/errors";
import type { PerfilUsuario, Unidade } from "@/lib/perfis";
import { isPerfilRole, isUnidade } from "@/lib/perfis";

export async function getCurrentPerfil(): Promise<{
  perfil: PerfilUsuario | null;
  error: string | null;
  userId: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { perfil: null, error: null, userId: null };
  }

  const { data, error } = await supabase
    .from("perfis_usuario")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return {
      perfil: null,
      error: friendlyError(error.message, "Erro ao carregar perfil."),
      userId: user.id,
    };
  }

  return {
    perfil: data as PerfilUsuario | null,
    error: null,
    userId: user.id,
  };
}

export async function requireAdmin(): Promise<
  | {
      ok: true;
      userId: string;
      perfil: PerfilUsuario;
    }
  | { ok: false; status: number; error: string }
> {
  const { perfil, error, userId } = await getCurrentPerfil();

  if (!userId) {
    return { ok: false, status: 401, error: "Não autenticado." };
  }
  if (error) {
    return { ok: false, status: 500, error };
  }
  if (!perfil) {
    return {
      ok: false,
      status: 403,
      error: "Perfil de acesso não encontrado. Contate um administrador.",
    };
  }
  if (!perfil.ativo) {
    return {
      ok: false,
      status: 403,
      error: "Usuário descredenciado. Sem permissão de acesso.",
    };
  }
  if (perfil.role !== "administrador") {
    return {
      ok: false,
      status: 403,
      error: "Acesso restrito a administradores.",
    };
  }

  return { ok: true, userId, perfil };
}

export async function listPerfis(filters: {
  q?: string;
  unidade?: string;
  status?: "ativo" | "inativo" | "todos";
}): Promise<{ data: PerfilUsuario[]; error: string | null }> {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return { data: [], error: admin.error };
  }

  const supabase = await createClient();
  let query = supabase
    .from("perfis_usuario")
    .select("*")
    .order("nome", { ascending: true });

  if (filters.q?.trim()) {
    const term = filters.q.trim().replace(/[%_,]/g, "");
    if (term) {
      query = query.or(
        `nome.ilike.%${term}%,matricula.ilike.%${term}%,email.ilike.%${term}%`,
      );
    }
  }

  if (filters.unidade && isUnidade(filters.unidade)) {
    query = query.eq("unidade", filters.unidade);
  }

  if (filters.status === "ativo") {
    query = query.eq("ativo", true);
  } else if (filters.status === "inativo") {
    query = query.eq("ativo", false);
  }

  const { data, error } = await query;
  if (error) {
    return {
      data: [],
      error: friendlyError(error.message, "Erro ao listar usuários."),
    };
  }

  return { data: (data ?? []) as PerfilUsuario[], error: null };
}

export async function getPerfilById(
  id: string,
): Promise<{ data: PerfilUsuario | null; error: string | null }> {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return { data: null, error: admin.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("perfis_usuario")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao buscar usuário."),
    };
  }

  return { data: (data as PerfilUsuario | null) ?? null, error: null };
}

export function validatePerfilPayload(input: {
  nome?: string;
  matricula?: string;
  cpf?: string;
  email?: string;
  role?: string;
  unidade?: string | null;
  senha?: string;
  requireSenha?: boolean;
}): { error: string } | { ok: true; data: {
  nome: string;
  matricula: string;
  cpf: string;
  email: string;
  role: "administrador" | "analista";
  unidade: Unidade | null;
  senha?: string;
}} {
  const nome = input.nome?.trim() ?? "";
  const matricula = input.matricula?.trim() ?? "";
  const cpfDigits = (input.cpf ?? "").replace(/\D/g, "");
  const email = input.email?.trim().toLowerCase() ?? "";
  const role = input.role?.trim() ?? "";
  const unidadeRaw = input.unidade?.trim() || null;
  const senha = input.senha ?? "";

  if (!nome) return { error: "Informe o nome completo." };
  if (!matricula) return { error: "Informe a matrícula." };
  if (cpfDigits.length !== 11) return { error: "CPF inválido." };
  if (!email || !email.includes("@")) return { error: "E-mail inválido." };
  if (!isPerfilRole(role)) {
    return { error: "Selecione o perfil de acesso." };
  }

  let unidade: Unidade | null = null;
  if (role === "administrador") {
    unidade = null;
  } else {
    if (!unidadeRaw || !isUnidade(unidadeRaw)) {
      return { error: "Selecione a unidade de lotação do analista." };
    }
    unidade = unidadeRaw;
  }

  if (input.requireSenha) {
    if (senha.length < 8) {
      return { error: "A senha temporária deve ter pelo menos 8 caracteres." };
    }
  }

  return {
    ok: true,
    data: {
      nome,
      matricula,
      cpf: cpfDigits,
      email,
      role,
      unidade,
      ...(input.requireSenha ? { senha } : {}),
    },
  };
}

export function generateTempPassword(length = 12): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

/** Ban longo (~100 anos) para descredenciamento efetivo no Auth. */
export const BAN_DURATION_DESCREDENCIADO = "876000h";
