/**
 * Remove o prefixo "[TESTE] " do INÍCIO de campos textuais de dados fictícios.
 * Idempotente: rodar de novo não altera valores que já não têm o prefixo.
 *
 * - Só remove no começo do texto (com o espaço que segue).
 * - Ocorrências no meio/fim são reportadas e NÃO alteradas.
 * - Não desativa a trigger de auditoria.
 *
 * Uso (local):
 *   npx tsx --env-file=.env.local scripts/strip-teste-prefix.ts --yes
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const PAGE = 500;
const PREFIX = "[TESTE] ";
const MARKER = "[TESTE]";

type FieldSpec = { table: string; column: string };

/** Campos onde o levantamento encontrou (ou pode encontrar) o prefixo. */
const FIELDS: FieldSpec[] = [
  { table: "pessoas", column: "nome" },
  { table: "pessoas", column: "alcunha" },
  { table: "pessoas", column: "nome_mae" },
  { table: "pessoas", column: "nome_pai" },
  { table: "empresas", column: "nome_fantasia" },
  { table: "empresas", column: "razao_social" },
  { table: "enderecos", column: "tipo" },
  { table: "veiculos", column: "placa" },
  { table: "documentos", column: "nome" },
  { table: "casos", column: "numero" },
  { table: "casos", column: "nome" },
  { table: "casos", column: "descricao" },
  { table: "comunicacoes", column: "valor" },
  { table: "orcrims", column: "nome" },
  { table: "orcrims", column: "sigla" },
  { table: "orcrims", column: "descricao" },
  { table: "observacoes", column: "mensagem" },
  { table: "vinculos", column: "observacao" },
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

/** Remove só o prefixo no início; idempotente; trim do início do resultado. */
function stripPrefix(value: string): string | null {
  if (!value.startsWith(PREFIX)) return null;
  return value.slice(PREFIX.length).trimStart();
}

async function reportMidOccurrences(
  supabase: SupabaseClient,
  table: string,
  column: string,
): Promise<number> {
  const { data, error, count } = await supabase
    .from(table)
    .select(`id, ${column}`, { count: "exact" })
    .like(column, `%${MARKER}%`)
    .not(column, "like", `${MARKER}%`)
    .limit(10);

  if (error) {
    throw new Error(`mid-check ${table}.${column}: ${error.message}`);
  }

  const n = count ?? data?.length ?? 0;
  if (n > 0) {
    console.warn(
      `  ⚠ ${table}.${column}: ${n} ocorrência(s) de "${MARKER}" no meio/fim (NÃO alteradas)`,
    );
    for (const row of data ?? []) {
      const record = row as unknown as Record<string, unknown>;
      const val = String(record[column] ?? "");
      console.warn(`    id=${record.id} valor=${JSON.stringify(val)}`);
    }
  }
  return n;
}

async function stripField(
  supabase: SupabaseClient,
  table: string,
  column: string,
): Promise<number> {
  let updated = 0;

  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(`id, ${column}`)
      .like(column, `${PREFIX}%`)
      .limit(PAGE);

    if (error) {
      throw new Error(`fetch ${table}.${column}: ${error.message}`);
    }
    if (!data?.length) break;

    for (const row of data) {
      const record = row as unknown as Record<string, unknown>;
      const current = record[column];
      if (typeof current !== "string") continue;
      const next = stripPrefix(current);
      if (next === null) continue;

      const { error: upErr } = await supabase
        .from(table)
        .update({ [column]: next })
        .eq("id", record.id)
        .like(column, `${PREFIX}%`); // condição idempotente

      if (upErr) {
        throw new Error(
          `update ${table}.${column} id=${record.id}: ${upErr.message}`,
        );
      }
      updated += 1;
    }

    if (data.length < PAGE) break;
  }

  return updated;
}

async function main() {
  if (!process.argv.includes("--yes")) {
    console.error(`
Remove o prefixo "${PREFIX.trim()}" do início dos campos textuais.

Para confirmar:
  npx tsx --env-file=.env.local scripts/strip-teste-prefix.ts --yes
`);
    process.exit(1);
  }

  const supabase = createAdminClient();
  console.log(`Removendo prefixo "${PREFIX}" (auditoria permanece ativa)\n`);

  const byTable = new Map<string, number>();
  let midTotal = 0;

  for (const { table, column } of FIELDS) {
    midTotal += await reportMidOccurrences(supabase, table, column);
    const n = await stripField(supabase, table, column);
    if (n > 0) {
      console.log(`  ${table}.${column}: ${n}`);
      byTable.set(table, (byTable.get(table) ?? 0) + n);
    } else {
      console.log(`  ${table}.${column}: 0`);
    }
  }

  console.log(`
────────────────────────────────────────
Resumo strip-teste-prefix
────────────────────────────────────────`);
  let grand = 0;
  for (const [table, n] of byTable) {
    console.log(`  ${table}: ${n} campo(s) atualizado(s)`);
    grand += n;
  }
  console.log(`  TOTAL: ${grand}`);
  if (midTotal > 0) {
    console.log(
      `\n⚠ ${midTotal} ocorrência(s) de "${MARKER}" no meio/fim foram ignoradas.`,
    );
  } else {
    console.log(`\n✓ Nenhuma ocorrência de "${MARKER}" no meio/fim.`);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
