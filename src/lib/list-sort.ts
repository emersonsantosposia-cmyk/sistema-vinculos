/**
 * Ordenação de listagens via URL (`sort` + `dir`) e ORDER BY no Supabase.
 */

export type SortDir = "asc" | "desc";

export type SortColumnDef = {
  /** Nome da coluna no banco (e valor de `?sort=`). */
  key: string;
  /** Rótulo na UI (cabeçalho / seletor mobile). */
  label: string;
};

export type NormalizedListSort = {
  column: string;
  ascending: boolean;
  /** Valor canônico para a URL (omitir se for o padrão). */
  sort: string;
  dir: SortDir;
};

export const DEFAULT_SORT_KEY = "data_cadastro";
export const DEFAULT_SORT_DIR: SortDir = "desc";

export const ENTITY_SORT_COLUMNS = {
  pessoas: [
    { key: "nome", label: "Nome" },
    { key: "tipo", label: "Tipo" },
    { key: "cpf", label: "CPF" },
    { key: "alcunha", label: "Alcunha" },
    { key: "data_cadastro", label: "Cadastro" },
  ],
  empresas: [
    { key: "nome_fantasia", label: "Nome fantasia" },
    { key: "razao_social", label: "Razão social" },
    { key: "cnpj", label: "CNPJ" },
    { key: "cnae_principal", label: "CNAE" },
    { key: "data_cadastro", label: "Cadastro" },
  ],
  enderecos: [
    { key: "nome", label: "Nome" },
    { key: "logradouro", label: "Endereço" },
    { key: "cep", label: "CEP" },
    { key: "estado", label: "UF" },
    { key: "data_cadastro", label: "Cadastro" },
  ],
  veiculos: [
    { key: "placa", label: "Placa" },
    { key: "marca", label: "Marca" },
    { key: "modelo", label: "Modelo" },
    { key: "cor", label: "Cor" },
    { key: "ano_fabricacao", label: "Ano" },
    { key: "data_cadastro", label: "Cadastro" },
  ],
  documentos: [
    { key: "nome", label: "Nome" },
    { key: "unidade", label: "Unidade" },
    { key: "tipo", label: "Tipo" },
    { key: "data", label: "Data" },
    { key: "data_cadastro", label: "Cadastro" },
  ],
  casos: [
    { key: "numero", label: "Número" },
    { key: "nome", label: "Nome" },
    { key: "unidade", label: "Unidade" },
    { key: "status", label: "Status" },
    { key: "data_abertura", label: "Abertura" },
    { key: "data_cadastro", label: "Cadastro" },
  ],
  comunicacoes: [
    { key: "tipo", label: "Tipo" },
    { key: "valor", label: "Valor" },
    { key: "operadora_provedor", label: "Operadora" },
    { key: "status", label: "Status" },
    { key: "data_cadastro", label: "Cadastro" },
  ],
  orcrims: [
    { key: "nome", label: "Nome" },
    { key: "sigla", label: "Sigla" },
    { key: "estado_origem", label: "Estado de origem" },
    { key: "data_cadastro", label: "Cadastro" },
  ],
} as const satisfies Record<string, readonly SortColumnDef[]>;

export type EntitySortKey = keyof typeof ENTITY_SORT_COLUMNS;

export function allowedSortKeys(
  entity: EntitySortKey,
): readonly string[] {
  return ENTITY_SORT_COLUMNS[entity].map((c) => c.key);
}

/**
 * Valida sort/dir da URL contra o allowlist da entidade.
 * Padrão: data_cadastro DESC (mais recentes primeiro).
 */
export function normalizeListSort(
  entity: EntitySortKey,
  sort?: string | null,
  dir?: string | null,
): NormalizedListSort {
  const allowed = allowedSortKeys(entity);
  const column =
    sort && allowed.includes(sort) ? sort : DEFAULT_SORT_KEY;
  const ascending =
    dir === "asc" ? true : dir === "desc" ? false : DEFAULT_SORT_DIR === "asc";
  // Se coluna default e dir default, ainda reportamos valores canônicos.
  const normalizedDir: SortDir = ascending ? "asc" : "desc";
  return {
    column,
    ascending,
    sort: column,
    dir: normalizedDir,
  };
}

/** Próximo sentido ao clicar no mesmo cabeçalho. */
export function toggleSortDir(current: SortDir): SortDir {
  return current === "asc" ? "desc" : "asc";
}

/**
 * Monta query string preservando sort/dir atuais e aplicando filtros.
 * Sempre remove `page` (volta à página 1).
 */
export function buildListFilterParams(
  searchParams: URLSearchParams | { get: (key: string) => string | null },
  updates: Record<string, string | null | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  const sort = searchParams.get("sort");
  const dir = searchParams.get("dir");
  if (sort) params.set("sort", sort);
  if (dir === "asc" || dir === "desc") params.set("dir", dir);

  for (const [key, value] of Object.entries(updates)) {
    const trimmed = value?.trim();
    if (trimmed) params.set(key, trimmed);
  }
  return params;
}

/** Aplica sort/dir na URL (e zera page). */
export function applySortToParams(
  searchParams: URLSearchParams,
  sortKey: string,
  dir: SortDir,
  defaults: { sort: string; dir: SortDir } = {
    sort: DEFAULT_SORT_KEY,
    dir: DEFAULT_SORT_DIR,
  },
): URLSearchParams {
  const params = new URLSearchParams(searchParams.toString());
  params.delete("page");
  if (sortKey === defaults.sort && dir === defaults.dir) {
    params.delete("sort");
    params.delete("dir");
  } else {
    params.set("sort", sortKey);
    params.set("dir", dir);
  }
  return params;
}
