/** Prefixo que marca todos os dados fictícios gerados pelo seed. */
export const TEST_PREFIX = "[TESTE] ";

export const ENTIDADE_TIPOS = [
  "pessoa",
  "empresa",
  "endereco",
  "veiculo",
  "documento",
  "caso",
  "comunicacao",
] as const;

export type EntidadeTipo = (typeof ENTIDADE_TIPOS)[number];

/** Campo principal usado para localizar registros [TESTE] no cleanup. */
export const IDENTIFIER_BY_TABLE = {
  pessoas: "nome",
  empresas: "nome_fantasia",
  enderecos: "nome",
  veiculos: "placa",
  documentos: "nome",
  casos: "nome",
  comunicacoes: "valor",
} as const;

export type EntityTable = keyof typeof IDENTIFIER_BY_TABLE;
