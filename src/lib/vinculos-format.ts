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
 * Rótulo da aresta no diagrama.
 * - Um só sentido / simétrico: só o termo na direção visual.
 * - Dois sentidos distintos: "Chefe ↔ Empregado" (direção da aresta primeiro).
 */
export function formatTipoVinculoEdgeLabel(
  tipoDirecaoAresta: string | null | undefined,
  tipoInverso: string | null | undefined,
): string {
  const diretoRaw = tipoDirecaoAresta?.trim() || null;
  const inversoRaw = tipoInverso?.trim() || null;
  if (!diretoRaw && !inversoRaw) return "Sem tipo";

  const direto = formatTipoVinculoLabel(diretoRaw);
  const inverso = formatTipoVinculoLabel(inversoRaw);

  if (!diretoRaw) return inverso;
  if (!inversoRaw) return direto;

  if (
    direto.toLocaleLowerCase("pt-BR") === inverso.toLocaleLowerCase("pt-BR")
  ) {
    return direto;
  }
  return `${direto} ↔ ${inverso}`;
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
