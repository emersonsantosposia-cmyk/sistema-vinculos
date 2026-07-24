/** Primeira letra maiúscula; restante em minúsculas. */
export function formatTipoVinculoLabel(
  tipo: string | null | undefined,
): string {
  const raw = tipo?.trim();
  if (!raw) return "Sem tipo";
  const lower = raw.toLocaleLowerCase("pt-BR");
  return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
}

/**
 * Pares canônicos entidade-da-página ↔ pessoa.
 * `entidadeParaPessoa` = rótulo exibido sobre a foto na página da entidade.
 * `pessoaParaEntidade` = verbo gravado pelo lado da pessoa (inverte se preciso).
 */
const PARES_ENTIDADE_PESSOA: ReadonlyArray<{
  paginaTipo: "endereco" | "empresa";
  entidadeParaPessoa: string;
  pessoaParaEntidade: string;
}> = [
  // endereço ↔ pessoa
  {
    paginaTipo: "endereco",
    entidadeParaPessoa: "Residência de",
    pessoaParaEntidade: "Reside em",
  },
  {
    paginaTipo: "endereco",
    entidadeParaPessoa: "Pertence a",
    pessoaParaEntidade: "Proprietário(a)",
  },
  {
    paginaTipo: "endereco",
    entidadeParaPessoa: "Pertence a",
    pessoaParaEntidade: "Proprietário",
  },
  {
    paginaTipo: "endereco",
    entidadeParaPessoa: "Alugado para",
    pessoaParaEntidade: "Inquilino(a)",
  },
  {
    paginaTipo: "endereco",
    entidadeParaPessoa: "Alugado para",
    pessoaParaEntidade: "Inquilino",
  },
  {
    paginaTipo: "endereco",
    entidadeParaPessoa: "Local de trabalho de",
    pessoaParaEntidade: "Trabalha em",
  },
  // empresa ↔ pessoa
  {
    paginaTipo: "empresa",
    entidadeParaPessoa: "Local de trabalho de",
    pessoaParaEntidade: "Trabalha em",
  },
  {
    paginaTipo: "empresa",
    entidadeParaPessoa: "Pertence a",
    pessoaParaEntidade: "Proprietário(a)",
  },
  {
    paginaTipo: "empresa",
    entidadeParaPessoa: "Pertence a",
    pessoaParaEntidade: "Proprietário",
  },
  {
    paginaTipo: "empresa",
    entidadeParaPessoa: "Sócio(a)",
    pessoaParaEntidade: "Sócio(a)",
  },
  {
    paginaTipo: "empresa",
    entidadeParaPessoa: "Sócio",
    pessoaParaEntidade: "Sócio",
  },
  {
    paginaTipo: "empresa",
    entidadeParaPessoa: "Representada por",
    pessoaParaEntidade: "Representante",
  },
];

function normalizeTipoKey(tipo: string | null | undefined): string {
  return (tipo ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/**
 * Na página de endereço/empresa, o card da pessoa mostra o papel da
 * entidade ("Residência de", "Local de trabalho de", …). Se o vínculo
 * foi gravado pelo lado da pessoa ("Reside em", "Trabalha em"), inverte.
 */
export function rotuloEntidadeEmRelacaoAPessoa(
  paginaTipo: "endereco" | "empresa",
  tipoAParaB: string | null | undefined,
  tipoBParaA: string | null | undefined,
  tipoPerspectiva: string | null | undefined,
): string | null {
  const pares = PARES_ENTIDADE_PESSOA.filter((p) => p.paginaTipo === paginaTipo);
  const candidatos = [tipoPerspectiva, tipoAParaB, tipoBParaA];

  for (const t of candidatos) {
    const key = normalizeTipoKey(t);
    if (!key) continue;
    if (pares.some((p) => normalizeTipoKey(p.entidadeParaPessoa) === key)) {
      return t?.trim() || null;
    }
  }

  for (const t of candidatos) {
    const key = normalizeTipoKey(t);
    if (!key) continue;
    const par = pares.find(
      (p) => normalizeTipoKey(p.pessoaParaEntidade) === key,
    );
    if (par) return par.entidadeParaPessoa;
  }

  return (
    tipoPerspectiva?.trim() ||
    tipoAParaB?.trim() ||
    tipoBParaA?.trim() ||
    null
  );
}

/** @deprecated Preferir rotuloEntidadeEmRelacaoAPessoa("endereco", …). */
export function rotuloEnderecoEmRelacaoAPessoa(
  tipoAParaB: string | null | undefined,
  tipoBParaA: string | null | undefined,
  tipoPerspectiva: string | null | undefined,
): string | null {
  return rotuloEntidadeEmRelacaoAPessoa(
    "endereco",
    tipoAParaB,
    tipoBParaA,
    tipoPerspectiva,
  );
}

/**
 * Rótulo do card de vínculo na listagem/grade.
 *
 * - Card de **pessoa** em **endereço** / **empresa**: papel da entidade
 *   da página (ex.: "Residência de", "Local de trabalho de", "Pertence a",
 *   "Representada por"), invertendo o par se gravado pelo lado da pessoa.
 * - Card de **pessoa** nas demais páginas: papel DA pessoa.
 * - Demais tipos: `tipo_perspectiva`.
 */
export function rotuloTipoVinculoDoCard(
  card: {
    outroTipo: string;
    is_origem: boolean;
    tipo_a_para_b: string | null;
    tipo_b_para_a: string | null;
    tipo_perspectiva: string | null;
  },
  paginaTipo?: string | null,
): string | null {
  if (card.outroTipo === "pessoa") {
    if (paginaTipo === "endereco" || paginaTipo === "empresa") {
      return rotuloEntidadeEmRelacaoAPessoa(
        paginaTipo,
        card.tipo_a_para_b,
        card.tipo_b_para_a,
        card.tipo_perspectiva,
      );
    }
    return card.is_origem ? card.tipo_b_para_a : card.tipo_a_para_b;
  }
  return card.tipo_perspectiva;
}

/**
 * Rótulo perspectival na listagem: "Chefe de João".
 * Sem tipo: apenas "Sem tipo".
 */
export function formatTipoVinculoPerspectiva(
  tipo: string | null | undefined,
  outroTitulo: string,
): string {
  const raw = tipo?.trim();
  if (!raw) return "Sem tipo";
  const nome = outroTitulo.trim() || "entidade";
  return `${formatTipoVinculoLabel(raw)} de ${nome}`;
}

/**
 * Rótulo da aresta no diagrama: apenas o tipo na direção visual (source → target).
 * O inverso é usado só como fallback se o termo direto estiver vazio.
 */
export function formatTipoVinculoEdgeLabel(
  tipoDirecaoAresta: string | null | undefined,
  tipoInverso?: string | null | undefined,
): string {
  const diretoRaw = tipoDirecaoAresta?.trim() || null;
  const inversoRaw = tipoInverso?.trim() || null;
  if (!diretoRaw && !inversoRaw) return "Sem tipo";
  return formatTipoVinculoLabel(diretoRaw ?? inversoRaw);
}

/** Normaliza para comparação de sugestões. */
export function normalizeTipoVinculoTerm(termo: string): string {
  return termo.trim().toLocaleLowerCase("pt-BR");
}

/**
 * Se o termo bate exatamente com um termo_direto único no conjunto filtrado,
 * devolve o termo_inverso. Ambíguo (mesmo direto, vários inversos) → null.
 * Com linhas espelhadas no banco, não é necessário casar pelo inverso.
 */
export function inversoSugeridoDeTermo(
  termo: string,
  pares: Array<{ termo_direto: string; termo_inverso: string }>,
): string | null {
  const key = normalizeTipoVinculoTerm(termo);
  if (!key) return null;

  const matches = pares.filter(
    (p) => normalizeTipoVinculoTerm(p.termo_direto) === key,
  );
  if (matches.length === 0) return null;

  const inversos = new Set(
    matches.map((p) => normalizeTipoVinculoTerm(p.termo_inverso)),
  );
  if (inversos.size !== 1) return null;

  return matches[0]!.termo_inverso;
}

/** Termos únicos para o datalist do campo A→B. */
export function termosDiretosUnicos(
  pares: Array<{ termo_direto: string }>,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of pares) {
    const key = normalizeTipoVinculoTerm(p.termo_direto);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(p.termo_direto);
  }
  return out;
}

/** Termos únicos para o datalist do campo B→A. */
export function termosInversosUnicos(
  pares: Array<{ termo_inverso: string }>,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of pares) {
    const key = normalizeTipoVinculoTerm(p.termo_inverso);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(p.termo_inverso);
  }
  return out;
}
