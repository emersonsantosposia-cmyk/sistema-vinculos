export const PESSOA_TIPOS = [
  { value: "ppf", label: "PPF" },
  { value: "terceirizado", label: "Terceirizado" },
  { value: "preso", label: "Preso" },
  { value: "advogado", label: "Advogado" },
  { value: "visitante", label: "Visitante" },
  {
    value: "agente_publico_outros_orgaos",
    label: "Agente público de outros órgãos",
  },
  { value: "agente_privado", label: "Agente privado" },
] as const;

export type PessoaTipo = (typeof PESSOA_TIPOS)[number]["value"];

export const ENTIDADE_TIPOS = [
  "pessoa",
  "endereco",
  "comunicacao",
  "veiculo",
  "empresa",
  "documento",
  "caso",
  "orcrim",
] as const;

export type EntidadeTipo = (typeof ENTIDADE_TIPOS)[number];

export type Pessoa = {
  id: string;
  tipo: PessoaTipo;
  nome: string;
  alcunha: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  nome_mae: string | null;
  nome_pai: string | null;
  profissao: string | null;
  usuario_cadastro: string | null;
  data_cadastro: string;
};

/** Pessoa na listagem, com path da foto de perfil (bucket privado). */
export type PessoaListItem = Pessoa & {
  foto_perfil_path: string | null;
};

export type PessoaRedeSocial = {
  id: string;
  pessoa_id: string;
  rede: string | null;
  link: string | null;
};

export type PessoaFoto = {
  id: string;
  pessoa_id: string;
  url_arquivo: string | null;
  tipo: "perfil" | "outra" | null;
  data_upload: string;
};

export type Empresa = {
  id: string;
  nome_fantasia: string | null;
  razao_social: string;
  cnpj: string | null;
  cnae_principal: string | null;
  usuario_cadastro: string | null;
  data_cadastro: string;
};

export type Endereco = {
  id: string;
  nome: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  complemento: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  latitude: number | null;
  longitude: number | null;
  usuario_cadastro: string | null;
  data_cadastro: string;
};

export type Veiculo = {
  id: string;
  placa: string | null;
  marca: string | null;
  modelo: string | null;
  cor: string | null;
  ano_fabricacao: number | null;
  ano_modelo: number | null;
  foto_url: string | null;
  usuario_cadastro: string | null;
  data_cadastro: string;
};

export const DOCUMENTO_TIPOS = [
  { value: "RCI", label: "RCI" },
  { value: "INFO", label: "INFO" },
  { value: "RDCI", label: "RDCI" },
  { value: "OUTROS", label: "OUTROS" },
] as const;

export type DocumentoTipo = (typeof DOCUMENTO_TIPOS)[number]["value"];

export type Documento = {
  id: string;
  tipo: DocumentoTipo | null;
  nome: string | null;
  resumo: string | null;
  data: string | null;
  link_cronos: string | null;
  unidade: string;
  usuario_cadastro: string | null;
  data_cadastro: string;
};

export const CASO_STATUS = [
  { value: "em_andamento", label: "Em andamento" },
  { value: "encerrado", label: "Encerrado" },
] as const;

export type CasoStatus = (typeof CASO_STATUS)[number]["value"];

export type Caso = {
  id: string;
  numero: string | null;
  nome: string | null;
  descricao: string | null;
  data_abertura: string | null;
  status: CasoStatus;
  data_encerramento: string | null;
  link_cronos: string | null;
  unidade: string;
  usuario_cadastro: string | null;
  data_cadastro: string;
};

export const COMUNICACAO_TIPOS = [
  { value: "imsi", label: "Número de celular (IMSI)" },
  { value: "imei", label: "Aparelho de celular (IMEI)" },
  { value: "email", label: "Endereço de e-mail" },
  { value: "telefone_fixo", label: "Telefone fixo" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telegram", label: "Telegram" },
  { value: "radio", label: "Rádio" },
  { value: "outros", label: "Outros" },
] as const;

export type ComunicacaoTipo = (typeof COMUNICACAO_TIPOS)[number]["value"];

export const COMUNICACAO_STATUS = [
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
  { value: "desconhecido", label: "Desconhecido" },
] as const;

export type ComunicacaoStatus = (typeof COMUNICACAO_STATUS)[number]["value"];

/** Tipos em que o campo Operadora/Provedor faz sentido na UI. */
export const COMUNICACAO_TIPOS_COM_OPERADORA = [
  "imsi",
  "imei",
  "whatsapp",
  "telegram",
] as const satisfies readonly ComunicacaoTipo[];

export type Comunicacao = {
  id: string;
  tipo: ComunicacaoTipo;
  valor: string;
  operadora_provedor: string | null;
  status: ComunicacaoStatus;
  fonte: string | null;
  observacao_geral: string | null;
  usuario_cadastro: string | null;
  data_cadastro: string;
};

export type Orcrim = {
  id: string;
  nome: string;
  sigla: string | null;
  estado_origem: string | null;
  descricao: string | null;
  usuario_cadastro: string | null;
  data_cadastro: string;
};

export type Observacao = {
  id: string;
  entidade_tipo: EntidadeTipo;
  entidade_id: string;
  usuario: string | null;
  mensagem: string;
  data_hora: string;
};

export type VinculoResumo = {
  id: string;
  tipo_vinculo: string | null;
  entidade_tipo: EntidadeTipo;
  entidade_id: string;
  titulo: string;
  subtitulo?: string | null;
};
