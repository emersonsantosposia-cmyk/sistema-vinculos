/**
 * Valida enderecos.nome → tipo + hierarquia de exibição + busca.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/validate-enderecos-tipo.ts
 */

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { TEST_PREFIX } from "./seed-shared";
import { formatEnderecoTitulo } from "../src/lib/format";
import { ENDERECO_TIPOS_SUGERIDOS } from "../src/lib/types";

const TEMP_PASSWORD = "Teste@123";
const MARKER = `${TEST_PREFIX}EnderecoTipo`;
const DOMAIN = "endereco-tipo-validate.rede-lince.test";
const LOGRADOURO_TOKEN = `Rua Validacao Tipo ${Date.now().toString().slice(-6)}`;

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Ausente: ${name}`);
  return v;
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FALHOU: ${msg}`);
}

async function ensureAnalista(
  admin: SupabaseClient,
): Promise<{ user: User; email: string }> {
  const email = `tipo.cgin@${DOMAIN}`;
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
      user_metadata: { nome: "Endereco Tipo" },
    });
    if (created.error || !created.data.user) {
      throw new Error(`createUser: ${created.error?.message}`);
    }
    user = created.data.user;
  } else {
    await admin.auth.admin.updateUserById(user.id, {
      password: TEMP_PASSWORD,
      email_confirm: true,
    });
  }

  const { data: perfil } = await admin
    .from("perfis_usuario")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  const payload = {
    nome: "Endereco Tipo Analista",
    email,
    role: "analista" as const,
    unidade: "CGIN" as const,
    ativo: true,
  };

  if (perfil) {
    const { error } = await admin
      .from("perfis_usuario")
      .update(payload)
      .eq("id", user.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin.from("perfis_usuario").insert({
      id: user.id,
      matricula: "9930003",
      cpf: "52998224725",
      ...payload,
    });
    if (error) throw new Error(error.message);
  }

  return { user, email };
}

async function signIn(
  url: string,
  anonKey: string,
  email: string,
): Promise<SupabaseClient> {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email,
    password: TEMP_PASSWORD,
  });
  if (error) throw new Error(`login: ${error.message}`);
  return client;
}

async function main() {
  assert(
    ENDERECO_TIPOS_SUGERIDOS.includes("Casa"),
    "sugestão Casa presente",
  );
  assert(
    formatEnderecoTitulo({ logradouro: "Rua A", numero: "10" }) === "Rua A, 10",
    "título = logradouro + número",
  );

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("0) Schema: coluna tipo existe; nome sumiu…");
  const { data: probe, error: probeErr } = await admin
    .from("enderecos")
    .select("id, tipo, logradouro")
    .limit(1);
  assert(!probeErr, `select tipo: ${probeErr?.message}`);
  const { error: nomeErr } = await admin
    .from("enderecos")
    .select("nome")
    .limit(1);
  assert(nomeErr, "coluna nome deve ter sido removida");
  console.log(`   OK  amostra=${probe?.length ?? 0}`);

  console.log("1) Migração: valores antigos preservados em tipo…");
  const { count: comTipo } = await admin
    .from("enderecos")
    .select("id", { count: "exact", head: true })
    .not("tipo", "is", null);
  console.log(`   endereços com tipo preenchido: ${comTipo ?? 0}`);

  const acc = await ensureAnalista(admin);
  const client = await signIn(url, anonKey, acc.email);

  const ids: string[] = [];
  let pessoaId: string | undefined;
  let vinculoId: string | undefined;

  try {
    console.log("2) Cadastro com sugestão (Casa)…");
    const { data: e1, error: e1Err } = await client
      .from("enderecos")
      .insert({
        tipo: "Casa",
        logradouro: LOGRADOURO_TOKEN,
        numero: "100",
        cidade: "Campo Grande",
        estado: "MS",
        usuario_cadastro: acc.user.id,
      })
      .select("id, tipo, logradouro, numero")
      .single();
    assert(!e1Err && e1, `insert sugestão: ${e1Err?.message}`);
    ids.push(e1!.id);
    assert(e1!.tipo === "Casa", "tipo Casa salvo");
    console.log("   OK  Casa");

    console.log("3) Cadastro com tipo próprio…");
    const proprio = `${MARKER} galpão improvisado`;
    const { data: e2, error: e2Err } = await client
      .from("enderecos")
      .insert({
        tipo: proprio,
        logradouro: "Avenida Teste Próprio",
        numero: "50",
        cidade: "Campo Grande",
        estado: "MS",
        usuario_cadastro: acc.user.id,
      })
      .select("id, tipo")
      .single();
    assert(!e2Err && e2, `insert próprio: ${e2Err?.message}`);
    ids.push(e2!.id);
    assert(e2!.tipo === proprio, "tipo próprio salvo");
    console.log("   OK  valor próprio");

    console.log("4) Resumo (diagrama/vínculos): logradouro em destaque…");
    const { data: pessoa, error: pErr } = await admin
      .from("pessoas")
      .insert({
        nome: `${MARKER} Pessoa`,
        tipo: "ppf",
        usuario_cadastro: acc.user.id,
      })
      .select("id")
      .single();
    assert(!pErr && pessoa, `pessoa: ${pErr?.message}`);
    pessoaId = pessoa!.id;

    const { data: vinc, error: vErr } = await admin
      .from("vinculos")
      .insert({
        entidade_origem_tipo: "pessoa",
        entidade_origem_id: pessoaId,
        entidade_destino_tipo: "endereco",
        entidade_destino_id: e1!.id,
        tipo_a_para_b: "Reside em",
        tipo_b_para_a: "Residência de",
        tipo_vinculo: "Reside em",
        usuario_cadastro: acc.user.id,
      })
      .select("id")
      .single();
    assert(!vErr && vinc, `vinculo: ${vErr?.message}`);
    vinculoId = vinc!.id;

    const { data: endRow } = await client
      .from("enderecos")
      .select("id, tipo, logradouro, numero, cidade, estado")
      .eq("id", e1!.id)
      .single();
    assert(endRow, "releitura do endereço");
    const titulo = formatEnderecoTitulo(endRow!);
    assert(
      titulo.includes(LOGRADOURO_TOKEN) && titulo.includes("100"),
      "título do nó = logradouro + número",
    );
    assert(
      !titulo.toLowerCase().includes("casa") ||
        titulo.startsWith(LOGRADOURO_TOKEN),
      "tipo não domina o título",
    );
    console.log(`   OK  título="${titulo}" / tipo="${endRow!.tipo}"`);

    console.log("5) Busca global por trecho de logradouro…");
    const termo = LOGRADOURO_TOKEN.slice(0, 18);
    const { data: hits, error: bErr } = await client.rpc("busca_global", {
      termo,
    });
    assert(!bErr, `busca_global: ${bErr?.message}`);
    const hit = (hits ?? []).find(
      (h: { entidade_tipo: string; entidade_id: string }) =>
        h.entidade_tipo === "endereco" && h.entidade_id === e1!.id,
    );
    assert(hit, "resultado deve incluir o endereço pelo logradouro");
    assert(
      String(hit.rotulo_principal).includes(LOGRADOURO_TOKEN) ||
        String(hit.rotulo_principal).includes("100"),
      "rótulo principal deve priorizar logradouro/número",
    );
    console.log(
      `   OK  campo=${hit.campo_correspondente} rótulo="${hit.rotulo_principal}"`,
    );

    console.log("\n✓ validate-enderecos-tipo OK");
  } finally {
    console.log("6) Limpeza…");
    if (vinculoId) await admin.from("vinculos").delete().eq("id", vinculoId);
    if (pessoaId) await admin.from("pessoas").delete().eq("id", pessoaId);
    if (ids.length) await admin.from("enderecos").delete().in("id", ids);
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
