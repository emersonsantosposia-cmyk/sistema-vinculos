import type { SupabaseClient } from "@supabase/supabase-js";
import { friendlyError } from "@/lib/supabase/errors";
import {
  formatCnpj,
  formatCpf,
  formatPlaca,
  labelComunicacaoTipo,
  normalizePlaca,
} from "@/lib/format";

export type BuscaEntidadeTipo =
  | "pessoa"
  | "empresa"
  | "endereco"
  | "veiculo"
  | "caso"
  | "comunicacao";

export type BuscaResultado = {
  tipo: BuscaEntidadeTipo;
  id: string;
  titulo: string;
  subtitulo: string | null;
  href: string;
};

export const BUSCA_TIPO_LABEL: Record<BuscaEntidadeTipo, string> = {
  pessoa: "Pessoa",
  empresa: "Empresa",
  endereco: "Endereço",
  veiculo: "Veículo",
  caso: "Caso",
  comunicacao: "Comunicação",
};

function sanitizeTerm(q: string): string {
  return q.trim().replace(/[%_,]/g, "");
}

function digitsOnly(q: string): string {
  return q.replace(/\D/g, "");
}

function pickTitle(...parts: Array<string | null | undefined>): string {
  const found = parts.map((p) => p?.trim()).find((p) => p);
  return found || "Sem identificação";
}

/**
 * Busca global em pessoas, empresas, endereços, veículos, casos e comunicações.
 * Aceita cliente browser ou server do Supabase.
 */
export async function buscaGlobalWithClient(
  supabase: SupabaseClient,
  q: string,
  limitPerType = 5,
): Promise<{ data: BuscaResultado[]; error: string | null }> {
  const term = sanitizeTerm(q);
  if (term.length < 2) {
    return { data: [], error: null };
  }

  const digits = digitsOnly(term);
  const placa = normalizePlaca(term);

  const [pessoas, empresas, enderecos, veiculos, casos, comunicacoes] =
    await Promise.all([
    supabase
      .from("pessoas")
      .select("id, nome, cpf")
      .or(
        digits.length >= 3
          ? `nome.ilike.%${term}%,cpf.ilike.%${digits}%`
          : `nome.ilike.%${term}%,cpf.ilike.%${term}%`,
      )
      .order("nome", { ascending: true })
      .limit(limitPerType),
    supabase
      .from("empresas")
      .select("id, nome_fantasia, razao_social, cnpj")
      .or(
        digits.length >= 3
          ? `nome_fantasia.ilike.%${term}%,razao_social.ilike.%${term}%,cnpj.ilike.%${digits}%`
          : `nome_fantasia.ilike.%${term}%,razao_social.ilike.%${term}%,cnpj.ilike.%${term}%`,
      )
      .order("razao_social", { ascending: true })
      .limit(limitPerType),
    supabase
      .from("enderecos")
      .select("id, nome, logradouro, cidade, estado")
      .ilike("nome", `%${term}%`)
      .order("nome", { ascending: true })
      .limit(limitPerType),
    placa.length >= 2
      ? supabase
          .from("veiculos")
          .select("id, placa, marca, modelo")
          .ilike("placa", `%${placa}%`)
          .order("placa", { ascending: true })
          .limit(limitPerType)
      : Promise.resolve({ data: [] as never[], error: null }),
    supabase
      .from("casos")
      .select("id, numero, nome")
      .ilike("numero", `%${term}%`)
      .order("numero", { ascending: true })
      .limit(limitPerType),
    supabase
      .from("comunicacoes")
      .select("id, tipo, valor, operadora_provedor")
      .or(`valor.ilike.%${term}%,operadora_provedor.ilike.%${term}%`)
      .order("data_cadastro", { ascending: false })
      .limit(limitPerType),
  ]);

  const firstError =
    pessoas.error ||
    empresas.error ||
    enderecos.error ||
    ("error" in veiculos ? veiculos.error : null) ||
    casos.error ||
    comunicacoes.error;

  if (firstError) {
    return {
      data: [],
      error: friendlyError(firstError.message, "Erro ao buscar."),
    };
  }

  const results: BuscaResultado[] = [];

  for (const row of pessoas.data ?? []) {
    results.push({
      tipo: "pessoa",
      id: row.id,
      titulo: pickTitle(row.nome),
      subtitulo: row.cpf ? formatCpf(row.cpf) : null,
      href: `/pessoas/${row.id}`,
    });
  }

  for (const row of empresas.data ?? []) {
    results.push({
      tipo: "empresa",
      id: row.id,
      titulo: pickTitle(row.nome_fantasia, row.razao_social),
      subtitulo: row.cnpj
        ? formatCnpj(row.cnpj)
        : row.razao_social && row.nome_fantasia
          ? row.razao_social
          : null,
      href: `/empresas/${row.id}`,
    });
  }

  for (const row of enderecos.data ?? []) {
    results.push({
      tipo: "endereco",
      id: row.id,
      titulo: pickTitle(row.nome),
      subtitulo:
        [row.logradouro, row.cidade, row.estado].filter(Boolean).join(" · ") ||
        null,
      href: `/enderecos/${row.id}`,
    });
  }

  for (const row of veiculos.data ?? []) {
    const placaFmt = formatPlaca(row.placa);
    results.push({
      tipo: "veiculo",
      id: row.id,
      titulo: placaFmt !== "—" ? placaFmt : "Sem placa",
      subtitulo: [row.marca, row.modelo].filter(Boolean).join(" ") || null,
      href: `/veiculos/${row.id}`,
    });
  }

  for (const row of casos.data ?? []) {
    results.push({
      tipo: "caso",
      id: row.id,
      titulo: pickTitle(row.numero, row.nome),
      subtitulo: row.numero && row.nome ? row.nome : null,
      href: `/casos/${row.id}`,
    });
  }

  for (const row of comunicacoes.data ?? []) {
    results.push({
      tipo: "comunicacao",
      id: row.id,
      titulo: pickTitle(row.valor),
      subtitulo: [
        labelComunicacaoTipo(row.tipo),
        row.operadora_provedor,
      ]
        .filter(Boolean)
        .join(" · ") || null,
      href: `/comunicacoes/${row.id}`,
    });
  }

  return { data: results, error: null };
}
