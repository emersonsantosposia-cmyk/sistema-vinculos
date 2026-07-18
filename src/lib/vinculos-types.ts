import type { EntidadeTipo } from "@/lib/types";

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

export const TIPOS_VINCULO_COMUNS = [
  "proprietário de",
  "reside em",
  "associado a",
  "familiar de",
  "citado(a)",
  "trabalha em",
  "sócio de",
  "integrante",
  "simpatizante",
  "alvo",
] as const;

export type EntidadeOpcao = {
  id: string;
  titulo: string;
  subtitulo?: string | null;
  /** Path no bucket fotos-pessoas (apenas para tipo pessoa). */
  foto_perfil_path?: string | null;
  /** Path no bucket fotos-veiculos (apenas para tipo veiculo). */
  foto_url?: string | null;
};

export type VinculoRow = {
  id: string;
  entidade_origem_tipo: EntidadeTipo;
  entidade_origem_id: string;
  entidade_destino_tipo: EntidadeTipo;
  entidade_destino_id: string;
  tipo_vinculo: string | null;
  /** Coluna no banco: observacao (exibida como Fundamentação). */
  observacao: string | null;
  usuario_cadastro: string | null;
  data_cadastro: string;
};

export type VinculoCard = {
  id: string;
  tipo_vinculo: string | null;
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
  /** Path no bucket fotos-veiculos (apenas quando outroTipo === "veiculo"). */
  foto_url?: string | null;
};

/** Resultado de buscarVinculosDaEntidade para o diagrama interativo. */
export type VinculoDiagramItem = {
  vinculoId: string;
  outroTipo: EntidadeTipo;
  outroId: string;
  tipo_vinculo: string | null;
  titulo: string;
  subtitulo?: string | null;
  restrito: boolean;
  foto_perfil_path?: string | null;
  foto_url?: string | null;
};
