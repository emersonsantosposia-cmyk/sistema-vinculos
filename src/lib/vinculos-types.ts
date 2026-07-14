import type { EntidadeTipo } from "@/lib/types";

export const ENTIDADE_LABELS: Record<EntidadeTipo, string> = {
  pessoa: "Pessoa",
  empresa: "Empresa",
  endereco: "Endereço",
  veiculo: "Veículo",
  procedimento: "Procedimento",
  caso: "Caso",
};

/** Títulos das subseções de vínculos (ex.: "Pessoas vinculadas"). */
export const ENTIDADE_VINCULOS_TITULOS: Record<EntidadeTipo, string> = {
  pessoa: "Pessoas vinculadas",
  empresa: "Empresas vinculadas",
  endereco: "Endereços vinculados",
  veiculo: "Veículos vinculados",
  procedimento: "Procedimentos vinculados",
  caso: "Casos vinculados",
};

/** Texto do botão "+ Adicionar vínculo com …". */
export const ENTIDADE_VINCULOS_ADD: Record<EntidadeTipo, string> = {
  pessoa: "pessoa",
  empresa: "empresa",
  endereco: "endereço",
  veiculo: "veículo",
  procedimento: "procedimento",
  caso: "caso",
};

export const ENTIDADE_HREFS: Record<EntidadeTipo, string> = {
  pessoa: "/pessoas",
  empresa: "/empresas",
  endereco: "/enderecos",
  veiculo: "/veiculos",
  procedimento: "/procedimentos",
  caso: "/casos",
};

export const TIPOS_VINCULO_COMUNS = [
  "proprietário de",
  "reside em",
  "associado a",
  "familiar de",
  "testemunha de",
  "trabalha em",
  "frequentador de",
  "sócio de",
  "outros",
] as const;

export type EntidadeOpcao = {
  id: string;
  titulo: string;
  subtitulo?: string | null;
  /** Path no bucket fotos-pessoas (apenas para tipo pessoa). */
  foto_perfil_path?: string | null;
};

export type VinculoRow = {
  id: string;
  entidade_origem_tipo: EntidadeTipo;
  entidade_origem_id: string;
  entidade_destino_tipo: EntidadeTipo;
  entidade_destino_id: string;
  tipo_vinculo: string | null;
  observacao: string | null;
  usuario_cadastro: string | null;
  data_cadastro: string;
};

export type VinculoCard = {
  id: string;
  tipo_vinculo: string | null;
  observacao: string | null;
  outroTipo: EntidadeTipo;
  outroId: string;
  titulo: string;
  subtitulo?: string | null;
  /** Path no bucket fotos-pessoas (apenas quando outroTipo === "pessoa"). */
  foto_perfil_path?: string | null;
};
