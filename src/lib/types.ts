export const PESSOA_TIPOS = [
  { value: "ppf", label: "PPF" },
  { value: "terceirizado", label: "Terceirizado" },
  { value: "preso", label: "Preso" },
  { value: "advogado", label: "Advogado" },
  { value: "visitante", label: "Visitante" },
  { value: "outros", label: "Outros" },
] as const;

export type PessoaTipo = (typeof PESSOA_TIPOS)[number]["value"];

export const ENTIDADE_TIPOS = [
  "pessoa",
  "empresa",
  "endereco",
  "veiculo",
  "procedimento",
  "caso",
] as const;

export type EntidadeTipo = (typeof ENTIDADE_TIPOS)[number];

export type Pessoa = {
  id: string;
  tipo: PessoaTipo;
  nome: string;
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

export const PROCEDIMENTO_TIPOS = [
  { value: "RCI", label: "RCI" },
  { value: "RELINT", label: "RELINT" },
  { value: "DADOS", label: "DADOS" },
  { value: "OUTROS", label: "OUTROS" },
] as const;

export type ProcedimentoTipo = (typeof PROCEDIMENTO_TIPOS)[number]["value"];

export type Procedimento = {
  id: string;
  tipo: ProcedimentoTipo | null;
  nome: string | null;
  resumo: string | null;
  data: string | null;
  link_cronos: string | null;
  usuario_cadastro: string | null;
  data_cadastro: string;
};

export type Caso = {
  id: string;
  numero: string | null;
  nome: string | null;
  data_abertura: string | null;
  link_cronos: string | null;
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
