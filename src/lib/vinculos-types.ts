import type { EntidadeTipo } from "@/lib/types";
import { ENTIDADE_TIPOS } from "@/lib/types";

export const ENTIDADE_LABELS: Record<EntidadeTipo, string> = {
  pessoa: "Pessoa",
  empresa: "Empresa",
  endereco: "Endereço",
  veiculo: "Veículo",
  documento: "Documento",
  caso: "Caso",
  comunicacao: "Comunicação",
  orcrim: "Orcrim",
};

/** Títulos das subseções de vínculos (ex.: "Pessoas"). */
export const ENTIDADE_VINCULOS_TITULOS: Record<EntidadeTipo, string> = {
  pessoa: "Pessoas",
  empresa: "Empresas",
  endereco: "Endereços",
  veiculo: "Veículos",
  documento: "Documentos",
  caso: "Casos",
  comunicacao: "Comunicações",
  orcrim: "Orcrims",
};

/** Texto do botão "+ Adicionar vínculo com …". */
export const ENTIDADE_VINCULOS_ADD: Record<EntidadeTipo, string> = {
  pessoa: "pessoa",
  empresa: "empresa",
  endereco: "endereço",
  veiculo: "veículo",
  documento: "documento",
  caso: "caso",
  comunicacao: "comunicação",
  orcrim: "orcrim",
};

export const ENTIDADE_HREFS: Record<EntidadeTipo, string> = {
  pessoa: "/pessoas",
  empresa: "/empresas",
  endereco: "/enderecos",
  veiculo: "/veiculos",
  documento: "/documentos",
  caso: "/casos",
  comunicacao: "/comunicacoes",
  orcrim: "/orcrims",
};

/** @deprecated Preferir tipos_vinculo_sugeridos filtrados por par de entidades. */
export const TIPOS_VINCULO_COMUNS = [
  "Chefe",
  "Funcionário(a)",
  "Proprietário(a)",
  "Pertence a",
  "Sócio(a)",
  "Cônjuge",
] as const;

/** Sem fallback global: pares raros ficam com campo 100% livre. */
export const PARES_VINCULO_FALLBACK: TipoVinculoSugerido[] = [];

export type TipoVinculoSugerido = {
  entidade_origem_tipo?: EntidadeTipo;
  entidade_destino_tipo?: EntidadeTipo;
  termo_direto: string;
  termo_inverso: string;
  simetrico?: boolean;
};

export type EntidadeOpcao = {
  id: string;
  titulo: string;
  subtitulo?: string | null;
  /** Path no bucket fotos-pessoas (apenas para tipo pessoa). */
  foto_perfil_path?: string | null;
  /** Path no bucket de foto ilustrativa (veículo, empresa, endereço, orcrim). */
  foto_url?: string | null;
};

export type VinculoRow = {
  id: string;
  entidade_origem_tipo: EntidadeTipo;
  entidade_origem_id: string;
  entidade_destino_tipo: EntidadeTipo;
  entidade_destino_id: string;
  /** Legado — preferir tipo_a_para_b / tipo_b_para_a. */
  tipo_vinculo: string | null;
  tipo_a_para_b: string | null;
  tipo_b_para_a: string | null;
  /** Coluna no banco: observacao (exibida como Fundamentação). */
  observacao: string | null;
  usuario_cadastro: string | null;
  data_cadastro: string;
};

export type VinculoCard = {
  id: string;
  /** Rótulo do ponto de vista da entidade da tela atual. */
  tipo_perspectiva: string | null;
  tipo_a_para_b: string | null;
  tipo_b_para_a: string | null;
  /** True se a entidade da tela é a origem (A) do registro. */
  is_origem: boolean;
  fundamentacao: string | null;
  usuario_cadastro: string | null;
  data_cadastro: string;
  usuario_nome: string | null;
  outroTipo: EntidadeTipo;
  outroId: string;
  titulo: string;
  subtitulo?: string | null;
  /** Sem permissão de ver o documento/caso (RLS). */
  restrito?: boolean;
  /** Path no bucket fotos-pessoas (apenas quando outroTipo === "pessoa"). */
  foto_perfil_path?: string | null;
  /** Path no bucket de foto ilustrativa (veículo, empresa, endereço, orcrim). */
  foto_url?: string | null;
};

/** Resultado de buscarVinculosDaEntidade para o diagrama interativo. */
export type VinculoDiagramItem = {
  vinculoId: string;
  outroTipo: EntidadeTipo;
  outroId: string;
  /** Rótulo na direção da entidade expandida → outro. */
  tipo_perspectiva: string | null;
  /** Rótulo na direção inversa. */
  tipo_inverso: string | null;
  titulo: string;
  subtitulo?: string | null;
  restrito: boolean;
  foto_perfil_path?: string | null;
  foto_url?: string | null;
};

/** True quando a seleção cobre todos os tipos (sem filtro efetivo). */
export function isFiltroTiposCompleto(
  tipos: readonly EntidadeTipo[],
): boolean {
  if (tipos.length < ENTIDADE_TIPOS.length) return false;
  const set = new Set(tipos);
  return ENTIDADE_TIPOS.every((t) => set.has(t));
}

/** Filtra vínculos pelo tipo da outra ponta (mantém ordem). */
export function filterVinculosByTipos(
  items: VinculoDiagramItem[],
  allowed: readonly EntidadeTipo[],
): VinculoDiagramItem[] {
  if (isFiltroTiposCompleto(allowed)) return items;
  const set = new Set(allowed);
  return items.filter((v) => set.has(v.outroTipo));
}
