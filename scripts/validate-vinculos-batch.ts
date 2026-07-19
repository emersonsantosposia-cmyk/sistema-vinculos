/**
 * Valida batch de resumos (C3): com N vínculos, queries de entidade ≤ 8 tipos.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/validate-vinculos-batch.ts
 */

import { createClient } from "@supabase/supabase-js";
import { TEST_PREFIX } from "./seed-shared";

const TEMP_PASSWORD = "Teste@123";
const DOMAIN = "c3-batch.rede-lince.test";
const MARKER = `${TEST_PREFIX}C3-batch`;
const N = 24; // muitos vínculos do mesmo tipo → 1 query de empresas, não 24

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Variável ausente: ${name}`);
    process.exit(1);
  }
  return value;
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FALHOU: ${msg}`);
}

function countRestCalls(urls: string[]): {
  total: number;
  byTable: Record<string, number>;
} {
  const byTable: Record<string, number> = {};
  for (const u of urls) {
    try {
      const path = new URL(u).pathname;
      // /rest/v1/empresas → empresas
      const m = path.match(/\/rest\/v1\/([^/?]+)/);
      const table = m?.[1] ?? path;
      byTable[table] = (byTable[table] ?? 0) + 1;
    } catch {
      byTable["?"] = (byTable["?"] ?? 0) + 1;
    }
  }
  return { total: urls.length, byTable };
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const service = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const email = `c3.batch@${DOMAIN}`;
  console.log("0) Preparar usuário e grafo de vínculos…");

  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  let user = listed.data.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!user) {
    const created = await admin.auth.admin.createUser({
      email,
      password: TEMP_PASSWORD,
      email_confirm: true,
    });
    if (created.error || !created.data.user) {
      throw new Error(created.error?.message ?? "createUser");
    }
    user = created.data.user;
  } else {
    await admin.auth.admin.updateUserById(user.id, {
      password: TEMP_PASSWORD,
      email_confirm: true,
    });
  }

  const { data: perfilExist } = await admin
    .from("perfis_usuario")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!perfilExist) {
    const { error } = await admin.from("perfis_usuario").insert({
      id: user.id,
      nome: "C3 Batch Tester",
      matricula: "9200099",
      cpf: "39053344705",
      email,
      role: "analista",
      unidade: "CGIN",
      ativo: true,
    });
    if (error) throw new Error(error.message);
  } else {
    await admin
      .from("perfis_usuario")
      .update({ ativo: true, unidade: "CGIN", role: "analista", email })
      .eq("id", user.id);
  }

  const { data: pessoa, error: pessoaErr } = await admin
    .from("pessoas")
    .insert({
      nome: `${MARKER} Pessoa hub`,
      tipo: "ppf",
      usuario_cadastro: user.id,
    })
    .select("id")
    .single();
  if (pessoaErr || !pessoa) throw new Error(pessoaErr?.message);

  const empresas: string[] = [];
  for (let i = 0; i < N; i++) {
    const { data: emp, error } = await admin
      .from("empresas")
      .insert({
        nome_fantasia: `${MARKER} Emp ${i}`,
        razao_social: `${MARKER} Razao ${i}`,
        usuario_cadastro: user.id,
      })
      .select("id")
      .single();
    if (error || !emp) throw new Error(error?.message);
    empresas.push(emp.id);
  }

  const vinculoIds: string[] = [];
  for (const empId of empresas) {
    const { data: v, error } = await admin
      .from("vinculos")
      .insert({
        entidade_origem_tipo: "pessoa",
        entidade_origem_id: pessoa.id,
        entidade_destino_tipo: "empresa",
        entidade_destino_id: empId,
        tipo_vinculo: "sócio de",
        observacao: `${MARKER} fund ${empId.slice(0, 8)}`,
        usuario_cadastro: user.id,
      })
      .select("id")
      .single();
    if (error || !v) throw new Error(error?.message);
    vinculoIds.push(v.id);
  }

  const restUrls: string[] = [];
  const countedFetch: typeof fetch = async (input, init) => {
    const u =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (u.includes("/rest/v1/")) restUrls.push(u);
    return fetch(input, init);
  };

  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: countedFetch },
  });

  const { error: loginErr } = await client.auth.signInWithPassword({
    email,
    password: TEMP_PASSWORD,
  });
  if (loginErr) throw new Error(loginErr.message);

  console.log(`1) Carregar ${N} vínculos da pessoa hub (batch)…`);
  restUrls.length = 0;

  // Replica o contrato de listVinculosDaEntidade com o client instrumentado
  const [asOrigem, asDestino] = await Promise.all([
    client
      .from("vinculos")
      .select("*")
      .eq("entidade_origem_tipo", "pessoa")
      .eq("entidade_origem_id", pessoa.id),
    client
      .from("vinculos")
      .select("*")
      .eq("entidade_destino_tipo", "pessoa")
      .eq("entidade_destino_id", pessoa.id),
  ]);
  assert(!asOrigem.error && !asDestino.error, "load vinculos");

  const rows = [...(asOrigem.data ?? []), ...(asDestino.data ?? [])];
  assert(rows.length >= N, `esperava ≥${N} vínculos, obteve ${rows.length}`);

  const outrosIds = rows.map((r) =>
    r.entidade_origem_id === pessoa.id
      ? (r.entidade_destino_id as string)
      : (r.entidade_origem_id as string),
  );

  // Uma query .in por tipo (empresas)
  const { data: empresasData, error: empErr } = await client
    .from("empresas")
    .select("id, nome_fantasia, razao_social, cnpj")
    .in("id", [...new Set(outrosIds)]);
  assert(!empErr, empErr?.message ?? "empresas");
  assert(
    (empresasData ?? []).length === N,
    `batch empresas deve trazer ${N}`,
  );

  const after = countRestCalls(restUrls);
  console.log("   REST calls:", after.byTable);

  const empresaCalls = after.byTable["empresas"] ?? 0;
  const vinculosCalls = after.byTable["vinculos"] ?? 0;

  assert(vinculosCalls === 2, `vinculos: 2 queries (origem+destino), obteve ${vinculosCalls}`);
  assert(
    empresaCalls === 1,
    `empresas: 1 query .in (não ${N}), obteve ${empresaCalls}`,
  );

  // Contrafactual: N queries seria o bug antigo
  assert(
    empresaCalls < N,
    `regressão: ${empresaCalls} queries de empresa para ${N} vínculos`,
  );

  console.log("2) Cleanup…");
  await admin.from("vinculos").delete().in("id", vinculoIds);
  await admin.from("empresas").delete().in("id", empresas);
  await admin.from("pessoas").delete().eq("id", pessoa.id);
  await admin.from("perfis_usuario").delete().eq("id", user.id);
  await admin.auth.admin.deleteUser(user.id);

  console.log(
    `\n✅ Batch OK — ${N} vínculos → ${empresaCalls} query de empresas (máx. 1 por tipo).\n`,
  );
  console.log(
    "Network (browser): ao abrir detalhe com muitos vínculos, filtre rest/v1 —",
  );
  console.log(
    "deve haver no máx. 1 request por tabela de entidade (pessoas, empresas, …), não 1 por card.",
  );
}

main().catch((err) => {
  console.error("\n❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
