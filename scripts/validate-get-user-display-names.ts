/**
 * Valida get_user_display_names (I2): só nome, sem e-mail; exige ativo.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/validate-get-user-display-names.ts
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const TEMP_PASSWORD = "Teste@123";
const DOMAIN = "i2-display-names.rede-lince.test";

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

async function ensureUser(
  admin: SupabaseClient,
  email: string,
  nome: string,
  unidade: "CGIN" | "PFCG",
  matricula: string,
  cpf: string,
): Promise<{ id: string; email: string }> {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listed.error) throw new Error(listed.error.message);
  let user = listed.data.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );

  if (!user) {
    const created = await admin.auth.admin.createUser({
      email,
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: "NAO_DEVE_APARECER_METADATA",
        name: "NAO_DEVE_APARECER_NAME",
      },
    });
    if (created.error || !created.data.user) {
      throw new Error(created.error?.message ?? "createUser");
    }
    user = created.data.user;
  } else {
    await admin.auth.admin.updateUserById(user.id, {
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: "NAO_DEVE_APARECER_METADATA",
        name: "NAO_DEVE_APARECER_NAME",
      },
    });
  }

  const { data: existing } = await admin
    .from("perfis_usuario")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("perfis_usuario")
      .update({ nome, email, role: "analista", unidade, ativo: true })
      .eq("id", user.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin.from("perfis_usuario").insert({
      id: user.id,
      nome,
      matricula,
      cpf,
      email,
      role: "analista",
      unidade,
      ativo: true,
    });
    if (error) throw new Error(error.message);
  }

  return { id: user.id, email };
}

async function signIn(
  url: string,
  anon: string,
  email: string,
): Promise<SupabaseClient> {
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email,
    password: TEMP_PASSWORD,
  });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return client;
}

function payloadLooksLikeEmailLeak(rows: unknown): boolean {
  const text = JSON.stringify(rows).toLowerCase();
  return (
    text.includes("@") ||
    text.includes("raw_user_meta") ||
    text.includes("full_name") ||
    text.includes("nao_deve_aparecer")
  );
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const service = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const callerEmail = `i2.caller@${DOMAIN}`;
  const targetEmail = `i2.target@${DOMAIN}`;
  const expectedNome = "I2 Nome Oficial Perfil";

  console.log("0) Criar caller + target…");
  const caller = await ensureUser(
    admin,
    callerEmail,
    "I2 Caller Ativo",
    "CGIN",
    "9100001",
    "11144477735",
  );
  const target = await ensureUser(
    admin,
    targetEmail,
    expectedNome,
    "PFCG",
    "9100002",
    "12345678909",
  );

  const fakeUuid = "00000000-0000-4000-8000-000000000099";

  try {
    console.log("1) Caller ativo: RPC deve devolver só nome do perfil…");
    const client = await signIn(url, anon, callerEmail);
    const { data, error } = await client.rpc("get_user_display_names", {
      ids: [target.id, fakeUuid, caller.id],
    });
    assert(!error, `rpc: ${error?.message}`);
    assert(Array.isArray(data), "data array");

    const rows = data as { id: string; display_name: string }[];
    assert(
      rows.every((r) => Object.keys(r).sort().join(",") === "display_name,id"),
      "só colunas id e display_name",
    );
    assert(!payloadLooksLikeEmailLeak(rows), "payload não deve vazar e-mail/meta");

    const targetRow = rows.find((r) => r.id === target.id);
    assert(targetRow, "target encontrado");
    assert(
      targetRow!.display_name === expectedNome,
      `nome esperado "${expectedNome}", obtido "${targetRow!.display_name}"`,
    );
    assert(
      !rows.some((r) => r.id === fakeUuid),
      "UUID inventado não deve retornar linha",
    );
    assert(
      !JSON.stringify(rows).includes(targetEmail),
      "e-mail do target não deve aparecer",
    );

    console.log("2) Caller inativo: RPC deve retornar vazio…");
    await admin
      .from("perfis_usuario")
      .update({ ativo: false })
      .eq("id", caller.id);

    // Nova sessão ainda tem JWT; a função checa auth_usuario_ativo() no banco.
    const { data: inactiveData, error: inactiveErr } = await client.rpc(
      "get_user_display_names",
      { ids: [target.id] },
    );
    assert(!inactiveErr, `rpc inativo: ${inactiveErr?.message}`);
    assert(
      Array.isArray(inactiveData) && inactiveData.length === 0,
      "inativo → array vazio",
    );

    console.log("\n✅ get_user_display_names OK — só nome de perfis_usuario.\n");
  } finally {
    console.log("Cleanup…");
    for (const u of [caller, target]) {
      await admin.from("perfis_usuario").delete().eq("id", u.id);
      await admin.auth.admin.deleteUser(u.id);
    }
  }
}

main().catch((err) => {
  console.error("\n❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
