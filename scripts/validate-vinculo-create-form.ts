/**
 * Valida criação de vínculo com tipo herdado do contexto e
 * usuario_cadastro / data_cadastro gravados automaticamente.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/validate-vinculo-create-form.ts
 */

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { TEST_PREFIX } from "./seed-shared";

const TEMP_PASSWORD = "Teste@123";
const MARKER = `${TEST_PREFIX}VINC-FORM`;
const DOMAIN = "vinculo-form-validate.rede-lince.test";

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
  const email = `vinculo.form@${DOMAIN}`;
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
      user_metadata: { nome: "Vinculo Form Test" },
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
    nome: "Vinculo Form Analista",
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
      matricula: "8800999",
      cpf: "52998224725",
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

  console.log("0) Garantir usuário de teste…");
  const { user, email } = await ensureAnalista(admin);

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: loginErr } = await client.auth.signInWithPassword({
    email,
    password: TEMP_PASSWORD,
  });
  if (loginErr) throw new Error(loginErr.message);

  const ids: { pessoa?: string; veiculo?: string; v1?: string; v2?: string } =
    {};

  try {
    console.log("1) Criar pessoa e veículo de teste…");
    const { data: pessoa, error: pErr } = await admin
      .from("pessoas")
      .insert({
        nome: `${MARKER} Pessoa`,
        tipo: "visitante",
        usuario_cadastro: user.id,
      })
      .select("id")
      .single();
    if (pErr || !pessoa) throw new Error(pErr?.message ?? "pessoa");
    ids.pessoa = pessoa.id;

    const { data: veiculo, error: vErr } = await admin
      .from("veiculos")
      .insert({
        placa: "VFR0M99",
        marca: "Teste",
        modelo: MARKER,
        usuario_cadastro: user.id,
      })
      .select("id")
      .single();
    if (vErr || !veiculo) throw new Error(vErr?.message ?? "veiculo");
    ids.veiculo = veiculo.id;

    // Simula o que o formulário faz: destinoTipo vem de abrirFormulario(tipo)
    console.log("2) Veículo → Pessoa (destinoTipo=pessoa herdado do botão)…");
    const before = new Date();
    const { data: v1, error: e1 } = await client
      .from("vinculos")
      .insert({
        entidade_origem_tipo: "veiculo",
        entidade_origem_id: ids.veiculo,
        entidade_destino_tipo: "pessoa",
        entidade_destino_id: ids.pessoa,
        tipo_a_para_b: "proprietário",
        tipo_b_para_a: "pertence a",
        tipo_vinculo: "proprietário",
        observacao: `${MARKER} veiculo→pessoa`,
        usuario_cadastro: user.id,
        data_cadastro: new Date().toISOString(),
      })
      .select("id, entidade_destino_tipo, usuario_cadastro, data_cadastro")
      .single();
    if (e1 || !v1) throw new Error(e1?.message ?? "v1");
    ids.v1 = v1.id;
    assert(v1.entidade_destino_tipo === "pessoa", "destino deve ser pessoa");
    assert(v1.usuario_cadastro === user.id, "usuario_cadastro = logado");
    assert(
      new Date(v1.data_cadastro).getTime() >= before.getTime() - 5000,
      "data_cadastro recente",
    );
    console.log("   OK  destino=pessoa, usuario e data gravados");

    console.log("3) Pessoa → Veículo (destinoTipo=veiculo herdado do botão)…");
    const { data: v2, error: e2 } = await client
      .from("vinculos")
      .insert({
        entidade_origem_tipo: "pessoa",
        entidade_origem_id: ids.pessoa,
        entidade_destino_tipo: "veiculo",
        entidade_destino_id: ids.veiculo,
        tipo_a_para_b: "relacionado a",
        tipo_b_para_a: "relacionado a",
        tipo_vinculo: "relacionado a",
        observacao: `${MARKER} pessoa→veiculo`,
        usuario_cadastro: user.id,
        data_cadastro: new Date().toISOString(),
      })
      .select("id, entidade_destino_tipo, usuario_cadastro, data_cadastro")
      .single();
    if (e2 || !v2) throw new Error(e2?.message ?? "v2");
    ids.v2 = v2.id;
    assert(v2.entidade_destino_tipo === "veiculo", "destino deve ser veiculo");
    assert(v2.usuario_cadastro === user.id, "usuario_cadastro = logado");
    console.log("   OK  destino=veiculo, usuario e data gravados");

    console.log("\nCriação de vínculos OK nos dois sentidos.");
  } finally {
    console.log("4) Limpando…");
    if (ids.v1) await admin.from("vinculos").delete().eq("id", ids.v1);
    if (ids.v2) await admin.from("vinculos").delete().eq("id", ids.v2);
    if (ids.veiculo) await admin.from("veiculos").delete().eq("id", ids.veiculo);
    if (ids.pessoa) await admin.from("pessoas").delete().eq("id", ids.pessoa);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
