/**
 * Apaga dados de cadastro para deixar o sistema limpo.
 *
 * Remove: pessoas, endereços, veículos, casos, documentos
 * e vínculos/observações ligados a essas entidades.
 * Também remove fotos nos buckets fotos-pessoas e fotos-veiculos.
 *
 * Não apaga: empresas, comunicações, usuários (auth), auditoria.
 *
 * Uso:
 *   npm run cleanup:data -- --yes
 *
 * Requer no .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const TARGET_TYPES = [
  "pessoa",
  "endereco",
  "veiculo",
  "caso",
  "documento",
] as const;

const ENTITY_TABLES = [
  "pessoas",
  "enderecos",
  "veiculos",
  "casos",
  "documentos",
] as const;

const PAGE = 1000;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Variável de ambiente ausente: ${name}`);
    process.exit(1);
  }
  return value;
}

function createAdminClient(): SupabaseClient {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function deleteByFilter(
  supabase: SupabaseClient,
  table: string,
  applyFilter: (q: ReturnType<SupabaseClient["from"]>) => unknown,
): Promise<number> {
  let total = 0;

  for (;;) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase.from(table).delete({ count: "exact" });
    query = applyFilter(query);
    const { data, error, count } = await query.select("id").limit(PAGE);

    if (error) {
      throw new Error(`Falha ao apagar ${table}: ${error.message}`);
    }

    const removed = count ?? data?.length ?? 0;
    total += removed;
    if (removed < PAGE) break;
  }

  return total;
}

async function deleteAllRows(
  supabase: SupabaseClient,
  table: string,
): Promise<number> {
  return deleteByFilter(supabase, table, (q) =>
    // filtro obrigatório na API do PostgREST
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (q as any).neq("id", "00000000-0000-0000-0000-000000000000"),
  );
}

async function listStoragePaths(
  supabase: SupabaseClient,
  bucket: string,
  prefix = "",
): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: PAGE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      throw new Error(`Falha ao listar ${bucket}/${prefix}: ${error.message}`);
    }
    if (!data?.length) break;

    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      // pasta: tem id nulo em alguns casos; arquivos têm metadata
      if (item.id === null) {
        paths.push(...(await listStoragePaths(supabase, bucket, full)));
      } else {
        paths.push(full);
      }
    }

    if (data.length < PAGE) break;
    offset += data.length;
  }

  return paths;
}

async function clearBucket(
  supabase: SupabaseClient,
  bucket: string,
): Promise<number> {
  const paths = await listStoragePaths(supabase, bucket);
  if (!paths.length) return 0;

  let removed = 0;
  for (let i = 0; i < paths.length; i += 100) {
    const chunk = paths.slice(i, i + 100);
    const { error } = await supabase.storage.from(bucket).remove(chunk);
    if (error) {
      throw new Error(`Falha ao limpar bucket ${bucket}: ${error.message}`);
    }
    removed += chunk.length;
  }
  return removed;
}

async function countTable(
  supabase: SupabaseClient,
  table: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  if (error) {
    throw new Error(`Falha ao contar ${table}: ${error.message}`);
  }
  return count ?? 0;
}

async function main() {
  if (!process.argv.includes("--yes")) {
    console.error(`
Este script APAGA dados permanentes.

Escopo:
  - pessoas (+ fotos e redes sociais via CASCADE)
  - endereços, veículos, casos, documentos
  - vínculos e observações ligados a esses tipos
  - arquivos em fotos-pessoas e fotos-veiculos

Não apaga empresas, comunicações, usuários nem auditoria.

Para confirmar, rode:
  npm run cleanup:data -- --yes
`);
    process.exit(1);
  }

  const supabase = createAdminClient();

  console.log("Contagens antes:");
  for (const table of [
    "vinculos",
    "observacoes",
    ...ENTITY_TABLES,
  ] as const) {
    console.log(`  ${table}: ${await countTable(supabase, table)}`);
  }

  console.log("\nLimpando storage...");
  const fotosPessoas = await clearBucket(supabase, "fotos-pessoas");
  const fotosVeiculos = await clearBucket(supabase, "fotos-veiculos");
  console.log(`  fotos-pessoas: ${fotosPessoas} arquivo(s)`);
  console.log(`  fotos-veiculos: ${fotosVeiculos} arquivo(s)`);

  const typesList = TARGET_TYPES.join(",");

  console.log("\nApagando vínculos e observações relacionados...");
  const vinculos = await deleteByFilter(supabase, "vinculos", (q) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (q as any).or(
      `entidade_origem_tipo.in.(${typesList}),entidade_destino_tipo.in.(${typesList})`,
    ),
  );
  console.log(`  vinculos: ${vinculos}`);

  const observacoes = await deleteByFilter(supabase, "observacoes", (q) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (q as any).in("entidade_tipo", [...TARGET_TYPES]),
  );
  console.log(`  observacoes: ${observacoes}`);

  console.log("\nApagando entidades...");
  for (const table of ENTITY_TABLES) {
    const n = await deleteAllRows(supabase, table);
    console.log(`  ${table}: ${n}`);
  }

  console.log("\nContagens depois:");
  for (const table of ENTITY_TABLES) {
    console.log(`  ${table}: ${await countTable(supabase, table)}`);
  }

  console.log("\nCleanup concluído.");
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
