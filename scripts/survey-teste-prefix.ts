/**
 * Levantamento read-only: onde o texto "[TESTE]" aparece no banco.
 * Não altera nenhum registro.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/survey-teste-prefix.ts
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const PAGE = 1000;
const MARKER = "[TESTE]";
const PREFIX = "[TESTE] ";

type FieldSpec = { table: string; column: string };

/** Campos textuais relevantes por entidade / satélite. */
const FIELDS: FieldSpec[] = [
  // pessoas
  { table: "pessoas", column: "nome" },
  { table: "pessoas", column: "alcunha" },
  { table: "pessoas", column: "nome_mae" },
  { table: "pessoas", column: "nome_pai" },
  { table: "pessoas", column: "profissao" },
  // empresas
  { table: "empresas", column: "nome_fantasia" },
  { table: "empresas", column: "razao_social" },
  { table: "empresas", column: "website" },
  // enderecos
  { table: "enderecos", column: "tipo" },
  { table: "enderecos", column: "logradouro" },
  { table: "enderecos", column: "complemento" },
  { table: "enderecos", column: "bairro" },
  { table: "enderecos", column: "cidade" },
  // veiculos
  { table: "veiculos", column: "placa" },
  { table: "veiculos", column: "marca" },
  { table: "veiculos", column: "modelo" },
  { table: "veiculos", column: "cor" },
  // documentos
  { table: "documentos", column: "nome" },
  { table: "documentos", column: "resumo" },
  // casos
  { table: "casos", column: "numero" },
  { table: "casos", column: "nome" },
  { table: "casos", column: "descricao" },
  // comunicacoes
  { table: "comunicacoes", column: "valor" },
  { table: "comunicacoes", column: "fonte" },
  { table: "comunicacoes", column: "observacao_geral" },
  { table: "comunicacoes", column: "operadora_provedor" },
  // orcrims
  { table: "orcrims", column: "nome" },
  { table: "orcrims", column: "sigla" },
  { table: "orcrims", column: "descricao" },
  // observacoes / vinculos
  { table: "observacoes", column: "mensagem" },
  { table: "vinculos", column: "observacao" },
  { table: "vinculos", column: "tipo_vinculo" },
  { table: "vinculos", column: "tipo_a_para_b" },
  { table: "vinculos", column: "tipo_b_para_a" },
  // diagramas salvos
  { table: "diagrama_visualizacoes_salvas", column: "nome" },
];

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Variável de ambiente ausente: ${name}`);
    process.exit(1);
  }
  return value;
}

function createAdminClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

type FieldStats = {
  table: string;
  column: string;
  prefixExact: number; // começa com "[TESTE] "
  prefixTrim: number; // começa com "[TESTE]" (com ou sem espaço/variação)
  anywhere: number; // contém "[TESTE]" em qualquer posição
  midOnly: number; // contém no meio/fim mas NÃO no início
  sampleMid: string[];
};

async function countLike(
  supabase: SupabaseClient,
  table: string,
  column: string,
  pattern: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .like(column, pattern);
  if (error) {
    throw new Error(`${table}.${column} (${pattern}): ${error.message}`);
  }
  return count ?? 0;
}

async function sampleMidOccurrences(
  supabase: SupabaseClient,
  table: string,
  column: string,
  limit = 5,
): Promise<string[]> {
  // Contém [TESTE] mas NÃO começa com [TESTE]
  const { data, error } = await supabase
    .from(table)
    .select(`id, ${column}`)
    .like(column, `%${MARKER}%`)
    .not(column, "like", `${MARKER}%`)
    .limit(limit);
  if (error) {
    throw new Error(`sample ${table}.${column}: ${error.message}`);
  }
  return (data ?? []).map((r) => {
    const record = r as unknown as Record<string, unknown>;
    const val = String(record[column] ?? "");
    const idx = val.indexOf(MARKER);
    const start = Math.max(0, idx - 20);
    const end = Math.min(val.length, idx + MARKER.length + 20);
    return `id=${record.id} …${val.slice(start, end)}…`;
  });
}

async function surveyField(
  supabase: SupabaseClient,
  spec: FieldSpec,
): Promise<FieldStats> {
  const [prefixExact, prefixTrim, anywhere] = await Promise.all([
    countLike(supabase, spec.table, spec.column, `${PREFIX}%`),
    countLike(supabase, spec.table, spec.column, `${MARKER}%`),
    countLike(supabase, spec.table, spec.column, `%${MARKER}%`),
  ]);
  const midOnly = anywhere - prefixTrim;
  const sampleMid =
    midOnly > 0
      ? await sampleMidOccurrences(supabase, spec.table, spec.column)
      : [];
  return {
    table: spec.table,
    column: spec.column,
    prefixExact,
    prefixTrim,
    anywhere,
    midOnly,
    sampleMid,
  };
}

async function main() {
  const supabase = createAdminClient();
  console.log(`Levantamento read-only de "${MARKER}" (sem alterações)\n`);

  const results: FieldStats[] = [];
  for (const field of FIELDS) {
    process.stdout.write(`  ${field.table}.${field.column}...`);
    try {
      const stats = await surveyField(supabase, field);
      results.push(stats);
      if (stats.anywhere > 0) {
        console.log(
          ` prefixo="${PREFIX.trim()}"→${stats.prefixExact}, startsWith→${stats.prefixTrim}, anywhere→${stats.anywhere}, mid→${stats.midOnly}`,
        );
      } else {
        console.log(" (nenhum)");
      }
    } catch (err) {
      console.log(` ERRO: ${err instanceof Error ? err.message : err}`);
    }
  }

  const affected = results.filter((r) => r.anywhere > 0);
  const midHits = results.filter((r) => r.midOnly > 0);

  console.log(`
════════════════════════════════════════════════════════
RESUMO — campos com ocorrência de "${MARKER}"
════════════════════════════════════════════════════════`);

  if (!affected.length) {
    console.log("Nenhuma ocorrência encontrada.");
    return;
  }

  console.log(
    "\nTabela.campo".padEnd(42) +
      "prefixo [TESTE] ".padStart(16) +
      "startsWith".padStart(12) +
      "anywhere".padStart(10) +
      "meio/fim".padStart(10),
  );
  console.log("-".repeat(90));

  let totalPrefixExact = 0;
  let totalStartsWith = 0;
  for (const r of affected) {
    totalPrefixExact += r.prefixExact;
    totalStartsWith += r.prefixTrim;
    console.log(
      `${`${r.table}.${r.column}`.padEnd(42)}${String(r.prefixExact).padStart(16)}${String(r.prefixTrim).padStart(12)}${String(r.anywhere).padStart(10)}${String(r.midOnly).padStart(10)}`,
    );
  }

  console.log("-".repeat(90));
  console.log(
    `${"TOTAL (soma por campo)".padEnd(42)}${String(totalPrefixExact).padStart(16)}${String(totalStartsWith).padStart(12)}`,
  );
  console.log(`
Notas:
  - "prefixo [TESTE] " = começa exatamente com "[TESTE] " (com espaço) — alvo da remoção
  - "startsWith" = começa com "[TESTE]" (qualquer caractere depois)
  - "anywhere" = contém "[TESTE]" em qualquer posição
  - "meio/fim" = contém, mas NÃO no início (não seria alterado pela remoção de prefixo)
`);

  if (midHits.length) {
    console.log("⚠ Ocorrências no MEIO/FIM do texto (não serão alteradas):");
    for (const r of midHits) {
      console.log(`  ${r.table}.${r.column}: ${r.midOnly}`);
      for (const s of r.sampleMid) console.log(`    ${s}`);
    }
  } else {
    console.log("✓ Nenhuma ocorrência de [TESTE] no meio/fim dos textos.");
  }

  // Totais de registros distintos por tabela (prefixo exato)
  console.log("\nRegistros afetados por tabela (prefixo exato \"[TESTE] \" em ao menos 1 campo):");
  const byTable = new Map<string, number>();
  for (const r of affected) {
    if (r.prefixExact === 0) continue;
    byTable.set(r.table, (byTable.get(r.table) ?? 0) + r.prefixExact);
  }
  // Nota: se um registro tiver prefixo em 2 campos, a soma conta 2 — reportamos por campo acima.
  for (const [table, n] of byTable) {
    console.log(`  ${table}: ${n} ocorrência(s) em campo(s) com prefixo`);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
