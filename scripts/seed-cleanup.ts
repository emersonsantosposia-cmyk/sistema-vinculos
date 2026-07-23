/**
 * APAGA TODOS os registros das tabelas de entidades, vínculos e observações.
 *
 * Operação DESTRUTIVA TOTAL da base de cadastro — destinada a zerar o ambiente
 * antes da implantação real (não apenas registros marcados com "[TESTE]").
 *
 * Escopo apagado:
 *   - vinculos
 *   - observacoes
 *   - pessoas (CASCADE: pessoas_fotos, pessoas_redes_sociais)
 *   - empresas, enderecos, veiculos, documentos, casos, comunicacoes, orcrims
 *
 * NÃO apaga:
 *   - perfis_usuario
 *   - auditoria
 *   - usuários em auth.users
 *
 * A trigger de auditoria permanece ativa e registra os DELETEs.
 *
 * Uso (local, NUNCA no build de produção / Vercel):
 *   npm run seed:cleanup -- --yes --wipe-all
 *
 * Equivalente:
 *   npx tsx --env-file=.env.local scripts/seed-cleanup.ts --yes --wipe-all
 *
 * Requisitos no .env.local (nunca commitar):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const PAGE = 1000;

/** Tabelas de entidades (ordem de apagamento após vinculos/observacoes). */
const ENTITY_TABLES = [
  "pessoas",
  "empresas",
  "enderecos",
  "veiculos",
  "documentos",
  "casos",
  "comunicacoes",
  "orcrims",
] as const;

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

async function countTable(
  supabase: SupabaseClient,
  table: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(`contar ${table}: ${error.message}`);
  return count ?? 0;
}

/** Apaga todos os registros (PostgREST exige filtro). */
async function deleteAllRows(
  supabase: SupabaseClient,
  table: string,
): Promise<number> {
  let total = 0;
  for (;;) {
    const { data, error, count } = await supabase
      .from(table)
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select("id")
      .limit(PAGE);

    if (error) throw new Error(`delete ${table}: ${error.message}`);
    const n = count ?? data?.length ?? 0;
    total += n;
    if (n < PAGE) break;
  }
  return total;
}

async function main() {
  const yes = process.argv.includes("--yes");
  const wipeAll = process.argv.includes("--wipe-all");

  if (!yes || !wipeAll) {
    console.error(`
════════════════════════════════════════════════════════════════
ATENÇÃO: este script APAGA TODOS os registros de entidades,
vínculos e observações — não apenas os marcados com "[TESTE]".
════════════════════════════════════════════════════════════════

Escopo:
  - vinculos, observacoes
  - pessoas (+ fotos/redes via CASCADE)
  - empresas, enderecos, veiculos, documentos, casos,
    comunicacoes, orcrims

Preservado:
  - perfis_usuario
  - auditoria
  - auth.users

A trigger de auditoria permanece ativa.

Para confirmar a limpeza TOTAL, passe AMBAS as flags:
  npm run seed:cleanup -- --yes --wipe-all
`);
    process.exit(1);
  }

  const supabase = createAdminClient();
  const tables = ["vinculos", "observacoes", ...ENTITY_TABLES] as const;

  console.log("Contagens antes:");
  for (const table of tables) {
    console.log(`  ${table}: ${await countTable(supabase, table)}`);
  }
  console.log(`  perfis_usuario: ${await countTable(supabase, "perfis_usuario")} (preservada)`);
  console.log(`  auditoria: ${await countTable(supabase, "auditoria")} (preservada)`);

  console.log("\nApagando vínculos...");
  const vinculos = await deleteAllRows(supabase, "vinculos");
  console.log(`  vinculos: ${vinculos}`);

  console.log("Apagando observações...");
  const observacoes = await deleteAllRows(supabase, "observacoes");
  console.log(`  observacoes: ${observacoes}`);

  console.log("\nApagando entidades...");
  const summary: Record<string, number> = { vinculos, observacoes };
  for (const table of ENTITY_TABLES) {
    const n = await deleteAllRows(supabase, table);
    summary[table] = n;
    console.log(`  ${table}: ${n}`);
  }

  console.log("\nContagens depois:");
  for (const table of tables) {
    console.log(`  ${table}: ${await countTable(supabase, table)}`);
  }
  console.log(`  perfis_usuario: ${await countTable(supabase, "perfis_usuario")} (preservada)`);
  console.log(`  auditoria: ${await countTable(supabase, "auditoria")} (preservada)`);

  console.log(`
────────────────────────────────────────
Resumo do seed-cleanup (wipe total)
────────────────────────────────────────
${Object.entries(summary)
  .map(([k, v]) => `  ${k}:`.padEnd(18) + v)
  .join("\n")}
`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
