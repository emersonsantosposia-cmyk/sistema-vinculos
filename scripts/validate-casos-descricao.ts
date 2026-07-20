/**
 * Valida casos.descricao: create, update e busca_global (ILIKE).
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/validate-casos-descricao.ts
 */

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { TEST_PREFIX } from "./seed-shared";

const TEMP_PASSWORD = "Teste@123";
const MARKER = `${TEST_PREFIX}CASO-DESC`;
const TOKEN = `${MARKER}-TOKEN-UNICO-ZX9Q`;
const DOMAIN = "caso-desc-validate.rede-lince.test";

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

async function ensureAnalista(
  admin: SupabaseClient,
): Promise<{ user: User; email: string }> {
  const email = `caso.desc@${DOMAIN}`;
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
      user_metadata: { nome: "Caso Desc Test" },
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

  const { data: existing } = await admin
    .from("perfis_usuario")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  const perfil = {
    nome: "Caso Desc Analista",
    email,
    role: "analista",
    unidade: "CGIN",
    ativo: true,
  };

  if (existing) {
    const { error } = await admin
      .from("perfis_usuario")
      .update(perfil)
      .eq("id", user.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin.from("perfis_usuario").insert({
      id: user.id,
      matricula: "8800888",
      cpf: "39053344705",
      ...perfil,
    });
    if (error) throw new Error(error.message);
  }

  return { user, email };
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("0) Garantir usuário CGIN…");
  const { user, email } = await ensureAnalista(admin);

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: loginErr } = await client.auth.signInWithPassword({
    email,
    password: TEMP_PASSWORD,
  });
  if (loginErr) throw new Error(loginErr.message);

  let casoId: string | undefined;

  try {
    console.log("1) Criar caso com descrição…");
    const { data: created, error: cErr } = await client
      .from("casos")
      .insert({
        unidade: "CGIN",
        numero: "DESC-001",
        nome: `${MARKER} Nome comum`,
        descricao: `Parágrafo um.\n\nToken secreto: ${TOKEN}\nParágrafo três.`,
        status: "em_andamento",
        usuario_cadastro: user.id,
      })
      .select("id, descricao")
      .single();
    if (cErr || !created) throw new Error(cErr?.message ?? "create");
    casoId = created.id;
    assert(
      created.descricao?.includes(TOKEN),
      "descrição deve ter sido salva",
    );
    console.log("   OK  create");

    console.log("2) Atualizar descrição…");
    const updatedText = `Atualizado.\n${TOKEN}-EDIT`;
    const { data: updated, error: uErr } = await client
      .from("casos")
      .update({ descricao: updatedText })
      .eq("id", casoId)
      .select("descricao")
      .single();
    if (uErr || !updated) throw new Error(uErr?.message ?? "update");
    assert(updated.descricao === updatedText, "descrição atualizada");
    console.log("   OK  update");

    console.log("3) Busca global pelo token só na descrição…");
    const { data: hits, error: bErr } = await client.rpc("busca_global", {
      termo: `${TOKEN}-EDIT`,
      limiar: 0.5,
      limite: 50,
    });
    if (bErr) throw new Error(bErr.message);
    const hit = (hits ?? []).find(
      (r: { entidade_tipo: string; entidade_id: string; campo_correspondente: string }) =>
        r.entidade_tipo === "caso" &&
        r.entidade_id === casoId &&
        r.campo_correspondente === "descricao",
    );
    assert(hit, "busca deve achar o caso pela descrição");
    console.log("   OK  busca_global (campo=descricao)");

    console.log("\nCasos.descricao OK.");
  } finally {
    if (casoId) {
      console.log("4) Limpando…");
      await admin.from("casos").delete().eq("id", casoId);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
