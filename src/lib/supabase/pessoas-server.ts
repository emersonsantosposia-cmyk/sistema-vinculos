import { isPessoaTipo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type {
  Pessoa,
  PessoaFoto,
  PessoaListItem,
  PessoaRedeSocial,
} from "@/lib/types";

export type PessoaComRelacoes = {
  pessoa: Pessoa;
  redes: PessoaRedeSocial[];
  fotos: PessoaFoto[];
  foto_perfil_path: string | null;
};

function friendlyError(message: string, fallback: string): string {
  if (message.includes("row-level security") || message.includes("JWT")) {
    return "Sem permissão. Faça login com um usuário autenticado.";
  }
  return message || fallback;
}

function pickPerfilPath(
  fotos: Array<{ url_arquivo: string | null; tipo: string | null }> | null,
): string | null {
  if (!fotos?.length) return null;
  const perfil = fotos.find((f) => f.tipo === "perfil" && f.url_arquivo);
  return perfil?.url_arquivo ?? null;
}

export async function listPessoas(filters: {
  q?: string;
  tipo?: string;
}): Promise<{ data: PessoaListItem[]; error: string | null }> {
  const supabase = await createClient();
  let query = supabase
    .from("pessoas")
    .select("*, pessoas_fotos(url_arquivo, tipo)")
    .order("data_cadastro", { ascending: false });

  if (filters.tipo && isPessoaTipo(filters.tipo)) {
    query = query.eq("tipo", filters.tipo);
  }

  if (filters.q?.trim()) {
    const term = filters.q.trim().replace(/[%_,]/g, "");
    if (term) {
      query = query.or(`nome.ilike.%${term}%,cpf.ilike.%${term}%`);
    }
  }

  const { data, error } = await query;
  if (error) {
    return {
      data: [],
      error: friendlyError(error.message, "Erro ao listar pessoas."),
    };
  }

  const rows = (data ?? []) as Array<
    Pessoa & {
      pessoas_fotos: Array<{
        url_arquivo: string | null;
        tipo: string | null;
      }> | null;
    }
  >;

  return {
    data: rows.map(({ pessoas_fotos, ...pessoa }) => ({
      ...(pessoa as Pessoa),
      foto_perfil_path: pickPerfilPath(pessoas_fotos),
    })),
    error: null,
  };
}

export async function getPessoaById(
  id: string,
): Promise<{ data: PessoaComRelacoes | null; error: string | null }> {
  const supabase = await createClient();

  const { data: pessoa, error } = await supabase
    .from("pessoas")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: friendlyError(error.message, "Erro ao buscar pessoa."),
    };
  }

  if (!pessoa) {
    return { data: null, error: null };
  }

  const [redesRes, fotosRes] = await Promise.all([
    supabase
      .from("pessoas_redes_sociais")
      .select("*")
      .eq("pessoa_id", id)
      .order("rede"),
    supabase
      .from("pessoas_fotos")
      .select("*")
      .eq("pessoa_id", id)
      .order("data_upload", { ascending: false }),
  ]);

  if (redesRes.error) {
    return {
      data: null,
      error: friendlyError(redesRes.error.message, "Erro ao carregar redes."),
    };
  }
  if (fotosRes.error) {
    return {
      data: null,
      error: friendlyError(fotosRes.error.message, "Erro ao carregar fotos."),
    };
  }

  const fotos = (fotosRes.data ?? []) as PessoaFoto[];

  return {
    data: {
      pessoa: pessoa as Pessoa,
      redes: (redesRes.data ?? []) as PessoaRedeSocial[],
      fotos,
      foto_perfil_path: pickPerfilPath(fotos),
    },
    error: null,
  };
}
