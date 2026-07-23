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
