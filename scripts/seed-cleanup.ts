/**
 * Remove todos os dados fictícios criados por scripts/seed.ts
 * (registros com prefixo "[TESTE]" no campo identificador principal),
 * incluindo vínculos e observações relacionados.
 *
 * Uso (local, NUNCA no build de produção / Vercel):
 *   npm run seed:cleanup -- --yes
 *
 * Equivalente:
 *   npx tsx --env-file=.env.local scripts/seed-cleanup.ts --yes
 *
 * Requisitos no .env.local (nunca commitar):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  ENTIDADE_TIPOS,
  IDENTIFIER_BY_TABLE,
  TEST_PREFIX,
  type EntidadeTipo,
  type EntityTable,
} from "./seed-shared";

const PAGE = 1000;

const TABLE_BY_TIPO: Record<EntidadeTipo, EntityTable> = {
  pessoa: "pessoas",
  empresa: "empresas",
  endereco: "enderecos",
  veiculo: "veiculos",
  documento: "documentos",
  caso: "casos",
  comunicacao: "comunicacoes",
};

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

async function fetchIdsByLike(
  supabase: SupabaseClient,
  table: EntityTable,
  column: string,
): Promise<string[]> {
  const ids: string[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select("id")
      .like(column, `${TEST_PREFIX}%`)
      .range(from, from + PAGE - 1);

    if (error) {
      throw new Error(`Falha ao buscar ${table}.${column}: ${error.message}`);
    }
    if (!data?.length) break;
    ids.push(...data.map((r) => r.id as string));
    if (data.length < PAGE) break;
    from += data.length;
  }
  return ids;
}

async function fetchTestIds(
  supabase: SupabaseClient,
  table: EntityTable,
): Promise<string[]> {
  const column = IDENTIFIER_BY_TABLE[table];
  const ids = await fetchIdsByLike(supabase, table, column);

  if (table === "empresas") {
    const razaoIds = await fetchIdsByLike(supabase, "empresas", "razao_social");
    return [...new Set([...ids, ...razaoIds])];
  }

  return ids;
}

async function deleteByIds(
  supabase: SupabaseClient,
  table: string,
  ids: string[],
): Promise<number> {
  if (!ids.length) return 0;
  let total = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { data, error, count } = await supabase
      .from(table)
      .delete({ count: "exact" })
      .in("id", chunk)
      .select("id");
    if (error) throw new Error(`delete ${table}: ${error.message}`);
    total += count ?? data?.length ?? 0;
  }
  return total;
}

async function deleteRelatedPolymorphic(
  supabase: SupabaseClient,
  table: "vinculos" | "observacoes",
  byTipo: Record<EntidadeTipo, string[]>,
): Promise<number> {
  let total = 0;

  for (const tipo of ENTIDADE_TIPOS) {
    const ids = byTipo[tipo];
    if (!ids.length) continue;

    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);

      if (table === "observacoes") {
        const { data, error, count } = await supabase
          .from("observacoes")
          .delete({ count: "exact" })
          .eq("entidade_tipo", tipo)
          .in("entidade_id", chunk)
          .select("id");
        if (error) throw new Error(`observacoes: ${error.message}`);
        total += count ?? data?.length ?? 0;
      } else {
        const { data: d1, error: e1, count: c1 } = await supabase
          .from("vinculos")
          .delete({ count: "exact" })
          .eq("entidade_origem_tipo", tipo)
          .in("entidade_origem_id", chunk)
          .select("id");
        if (e1) throw new Error(`vinculos origem: ${e1.message}`);
        total += c1 ?? d1?.length ?? 0;

        const { data: d2, error: e2, count: c2 } = await supabase
          .from("vinculos")
          .delete({ count: "exact" })
          .eq("entidade_destino_tipo", tipo)
          .in("entidade_destino_id", chunk)
          .select("id");
        if (e2) throw new Error(`vinculos destino: ${e2.message}`);
        total += c2 ?? d2?.length ?? 0;
      }
    }
  }

  // Observações [TESTE] órfãs (mensagem com prefixo)
  if (table === "observacoes") {
    for (;;) {
      const { data, error, count } = await supabase
        .from("observacoes")
        .delete({ count: "exact" })
        .like("mensagem", `${TEST_PREFIX}%`)
        .select("id")
        .limit(PAGE);
      if (error) throw new Error(`observacoes prefix: ${error.message}`);
      const n = count ?? data?.length ?? 0;
      total += n;
      if (n < PAGE) break;
    }
  }

  return total;
}

async function main() {
  if (!process.argv.includes("--yes")) {
    console.error(`
Este script apaga TODOS os registros com prefixo "${TEST_PREFIX.trim()}"
e vínculos/observações relacionados.

Para confirmar:
  npm run seed:cleanup -- --yes
`);
    process.exit(1);
  }

  const supabase = createAdminClient();
  const byTipo = {} as Record<EntidadeTipo, string[]>;

  console.log("Buscando registros [TESTE]...");
  for (const tipo of ENTIDADE_TIPOS) {
    const table = TABLE_BY_TIPO[tipo];
    const ids = await fetchTestIds(supabase, table);
    byTipo[tipo] = ids;
    console.log(`  ${table}: ${ids.length}`);
  }

  console.log("\nRemovendo vínculos relacionados...");
  const vinculos = await deleteRelatedPolymorphic(supabase, "vinculos", byTipo);
  console.log(`  vinculos: ${vinculos}`);

  console.log("Removendo observações relacionadas...");
  const observacoes = await deleteRelatedPolymorphic(
    supabase,
    "observacoes",
    byTipo,
  );
  console.log(`  observacoes: ${observacoes}`);

  console.log("\nRemovendo entidades...");
  // ordem: satélites CASCADE com pessoas; entidades sem FK entre si
  const order: EntidadeTipo[] = [
    "pessoa",
    "empresa",
    "endereco",
    "veiculo",
    "documento",
    "caso",
    "comunicacao",
  ];

  const summary: Record<string, number> = {};
  for (const tipo of order) {
    const table = TABLE_BY_TIPO[tipo];
    const n = await deleteByIds(supabase, table, byTipo[tipo]);
    summary[table] = n;
    console.log(`  ${table}: ${n}`);
  }

  console.log(`
────────────────────────────────────────
Resumo do seed-cleanup
────────────────────────────────────────
  vinculos:      ${vinculos}
  observacoes:   ${observacoes}
${Object.entries(summary)
  .map(([k, v]) => `  ${k}:`.padEnd(18) + v)
  .join("\n")}
`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
