import type { SupabaseClient } from "@supabase/supabase-js";
import { friendlyError } from "@/lib/supabase/errors";

export type BuscaEntidadeTipo =
  | "pessoa"
  | "empresa"
  | "endereco"
  | "veiculo"
  | "documento"
  | "caso"
  | "comunicacao"
  | "orcrim"
  | "usuario";

export type BuscaResultado = {
  tipo: BuscaEntidadeTipo;
  id: string;
  titulo: string;
  subtitulo: string | null;
  href: string;
  campoCorrespondente?: string | null;
  tipoCorrespondencia?: "exata" | "aproximada" | null;
  scoreSimilaridade?: number | null;
};

export const BUSCA_TIPO_LABEL: Record<BuscaEntidadeTipo, string> = {
  pessoa: "Pessoa",
  empresa: "Empresa",
  endereco: "Endereço",
  veiculo: "Veículo",
  documento: "Documento",
  caso: "Caso",
  comunicacao: "Comunicação",
  orcrim: "Orcrim",
  usuario: "Usuário",
};

const HREF_BY_TIPO: Record<BuscaEntidadeTipo, (id: string) => string> = {
  pessoa: (id) => `/pessoas/${id}`,
  empresa: (id) => `/empresas/${id}`,
  endereco: (id) => `/enderecos/${id}`,
  veiculo: (id) => `/veiculos/${id}`,
  documento: (id) => `/documentos/${id}`,
  caso: (id) => `/casos/${id}`,
  comunicacao: (id) => `/comunicacoes/${id}`,
  orcrim: (id) => `/orcrims/${id}`,
  usuario: (id) => `/usuarios/${id}/editar`,
};

type RpcRow = {
  entidade_tipo: string;
  entidade_id: string;
  rotulo_principal: string;
  campo_correspondente: string;
  tipo_correspondencia: string;
  score_similaridade: number;
};

function isBuscaTipo(value: string): value is BuscaEntidadeTipo {
  return value in BUSCA_TIPO_LABEL;
}

function sanitizeTerm(q: string): string {
  return q.trim();
}

function campoLabel(campo: string): string {
  const map: Record<string, string> = {
    nome: "nome",
    alcunha: "alcunha",
    cpf: "CPF",
    nome_mae: "nome da mãe",
    nome_pai: "nome do pai",
    profissao: "profissão",
    tipo: "tipo",
    data_nascimento: "data de nascimento",
    rede_social: "rede social",
    link_rede: "link da rede",
    nome_fantasia: "nome fantasia",
    razao_social: "razão social",
    cnpj: "CNPJ",
    cnae_principal: "CNAE",
    logradouro: "logradouro",
    numero: "número",
    bairro: "bairro",
    complemento: "complemento",
    cidade: "cidade",
    estado: "estado",
    cep: "CEP",
    placa: "placa",
    marca: "marca",
    modelo: "modelo",
    cor: "cor",
    ano_fabricacao: "ano de fabricação",
    ano_modelo: "ano do modelo",
    resumo: "resumo",
    unidade: "unidade",
    data: "data",
    data_abertura: "data de abertura",
    valor: "valor",
    operadora_provedor: "operadora/provedor",
    status: "status",
    fonte: "fonte",
    observacao_geral: "observação",
    mensagem: "mensagem",
    sigla: "sigla",
    estado_origem: "estado de origem",
    descricao: "descrição",
    matricula: "matrícula",
    email: "e-mail",
    role: "perfil",
  };
  return map[campo] ?? campo;
}

/**
 * Busca global exata + aproximada via RPC busca_global (pg_trgm).
 * Respeita RLS do usuário autenticado (SECURITY INVOKER).
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

  // Limite total: cobre várias entidades sem estourar o dropdown/página.
  const limite = Math.min(Math.max(limitPerType * 9, 20), 100);

  const { data, error } = await supabase.rpc("busca_global", {
    termo: term,
    limiar: 0.5,
    limite,
  });

  if (error) {
    return {
      data: [],
      error: friendlyError(error.message, "Erro ao buscar."),
    };
  }

  const results: BuscaResultado[] = [];
  for (const row of (data ?? []) as RpcRow[]) {
    if (!isBuscaTipo(row.entidade_tipo)) continue;
    const tipo = row.entidade_tipo;
    const tipoCorr =
      row.tipo_correspondencia === "exata" ||
      row.tipo_correspondencia === "aproximada"
        ? row.tipo_correspondencia
        : null;

    const matchHint =
      tipoCorr === "aproximada"
        ? `≈ ${campoLabel(row.campo_correspondente)}`
        : campoLabel(row.campo_correspondente);

    results.push({
      tipo,
      id: row.entidade_id,
      titulo: row.rotulo_principal || "Sem identificação",
      subtitulo: matchHint
        ? `${BUSCA_TIPO_LABEL[tipo]} · ${matchHint}`
        : BUSCA_TIPO_LABEL[tipo],
      href: HREF_BY_TIPO[tipo](row.entidade_id),
      campoCorrespondente: row.campo_correspondente,
      tipoCorrespondencia: tipoCorr,
      scoreSimilaridade: row.score_similaridade,
    });
  }

  return { data: results, error: null };
}
