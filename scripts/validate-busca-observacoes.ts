/**
 * Valida busca_global sobre observacoes.mensagem (3 cenários).
 *
 * Pré-requisitos:
 *   - Migration 20260720120000_busca_global_observacoes aplicada
 *   - Migration 20260719120000_observacoes_rls_unidade aplicada
 *   - .env.local com URL, ANON_KEY e SERVICE_ROLE_KEY
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/validate-busca-observacoes.ts
 */

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { TEST_PREFIX } from "./seed-shared";

const TEMP_PASSWORD = "Teste@123";
const MARKER = `${TEST_PREFIX}BUSCA-OBS`;
const DOMAIN = "busca-obs-validate.rede-lince.test";

const TOKEN_PESSOA = `${MARKER}-PESSOA-UNICA-XYZ99`;
const TOKEN_DOC_PFCG = `${MARKER}-DOC-PFCG-UNICA-ABC11`;
const TOKEN_DOC_CGIN = `${MARKER}-DOC-CGIN-UNICA-DEF22`;

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
  unidade: "CGIN" | "PFCG",
): Promise<{ user: User; email: string }> {
  const email = `busca.obs.${unidade.toLowerCase()}@${DOMAIN}`;
  const suffix = unidade === "CGIN" ? "71" : "72";

  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listed.error) throw new Error(listed.error.message);
  let user = listed.data.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );

  if (!user) {
    const createdUser = await admin.auth.admin.createUser({
      email,
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: { nome: `BuscaObs ${unidade}` },
    });
    if (createdUser.error || !createdUser.data.user) {
      throw new Error(`createUser ${unidade}: ${createdUser.error?.message}`);
    }
    user = createdUser.data.user;
  } else {
    await admin.auth.admin.updateUserById(user.id, {
      password: TEMP_PASSWORD,
      email_confirm: true,
    });
  }

  const { data: existingPerfil } = await admin
    .from("perfis_usuario")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  const perfilPayload = {
    nome: `BuscaObs Analista ${unidade}`,
    email,
    role: "analista",
    unidade,
    ativo: true,
  };

  if (existingPerfil) {
    const { error } = await admin
      .from("perfis_usuario")
      .update(perfilPayload)
      .eq("id", user.id);
    if (error) throw new Error(`perfil update ${unidade}: ${error.message}`);
  } else {
    const { error } = await admin.from("perfis_usuario").insert({
      id: user.id,
      matricula: `8${suffix}0001`,
      cpf: unidade === "CGIN" ? "39053344705" : "15350946056",
      ...perfilPayload,
    });
    if (error) throw new Error(`perfil insert ${unidade}: ${error.message}`);
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
  if (error) throw new Error(`Login falhou (${email}): ${error.message}`);
  return client;
}

type BuscaRow = {
  entidade_tipo: string;
  entidade_id: string;
  campo_correspondente: string;
  rotulo_principal: string;
};

async function busca(
  client: SupabaseClient,
  termo: string,
): Promise<BuscaRow[]> {
  const { data, error } = await client.rpc("busca_global", {
    termo,
    limiar: 0.5,
    limite: 50,
  });
  if (error) throw new Error(`busca_global(${termo}): ${error.message}`);
  return (data ?? []) as BuscaRow[];
}

function hitFor(
  rows: BuscaRow[],
  tipo: string,
  id: string,
  campo = "mensagem",
): BuscaRow | undefined {
  return rows.find(
    (r) =>
      r.entidade_tipo === tipo &&
      r.entidade_id === id &&
      r.campo_correspondente === campo,
  );
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("0) Garantir analistas CGIN / PFCG…");
  const cginAcc = await ensureAnalista(admin, "CGIN");
  const pfcgAcc = await ensureAnalista(admin, "PFCG");

  const ids: {
    pessoa?: string;
    docPfcg?: string;
    docCgin?: string;
    obsPessoa?: string;
    obsPfcg?: string;
    obsCgin?: string;
  } = {};

  try {
    console.log("1) Criar pessoa + docs + observações com tokens únicos…");

    const { data: pessoa, error: pessoaErr } = await admin
      .from("pessoas")
      .insert({
        nome: `${MARKER} Pessoa alvo`,
        tipo: "ppf",
        usuario_cadastro: cginAcc.user.id,
      })
      .select("id")
      .single();
    if (pessoaErr || !pessoa) throw new Error(`pessoa: ${pessoaErr?.message}`);
    ids.pessoa = pessoa.id;

    const { data: obsPessoa, error: obsPessoaErr } = await admin
      .from("observacoes")
      .insert({
        entidade_tipo: "pessoa",
        entidade_id: pessoa.id,
        usuario: cginAcc.user.id,
        mensagem: `Nota confidencial ${TOKEN_PESSOA}`,
      })
      .select("id")
      .single();
    if (obsPessoaErr || !obsPessoa) {
      throw new Error(`obs pessoa: ${obsPessoaErr?.message}`);
    }
    ids.obsPessoa = obsPessoa.id;

    const { data: docPfcg, error: docPfcgErr } = await admin
      .from("documentos")
      .insert({
        nome: `${MARKER} Doc PFCG`,
        tipo: "RCI",
        unidade: "PFCG",
        usuario_cadastro: pfcgAcc.user.id,
      })
      .select("id")
      .single();
    if (docPfcgErr || !docPfcg) {
      throw new Error(`doc PFCG: ${docPfcgErr?.message}`);
    }
    ids.docPfcg = docPfcg.id;

    const { data: obsPfcg, error: obsPfcgErr } = await admin
      .from("observacoes")
      .insert({
        entidade_tipo: "documento",
        entidade_id: docPfcg.id,
        usuario: pfcgAcc.user.id,
        mensagem: `Nota unidade própria ${TOKEN_DOC_PFCG}`,
      })
      .select("id")
      .single();
    if (obsPfcgErr || !obsPfcg) {
      throw new Error(`obs PFCG: ${obsPfcgErr?.message}`);
    }
    ids.obsPfcg = obsPfcg.id;

    const { data: docCgin, error: docCginErr } = await admin
      .from("documentos")
      .insert({
        nome: `${MARKER} Doc CGIN`,
        tipo: "RCI",
        unidade: "CGIN",
        usuario_cadastro: cginAcc.user.id,
      })
      .select("id")
      .single();
    if (docCginErr || !docCgin) {
      throw new Error(`doc CGIN: ${docCginErr?.message}`);
    }
    ids.docCgin = docCgin.id;

    const { data: obsCgin, error: obsCginErr } = await admin
      .from("observacoes")
      .insert({
        entidade_tipo: "documento",
        entidade_id: docCgin.id,
        usuario: cginAcc.user.id,
        mensagem: `Nota outra unidade ${TOKEN_DOC_CGIN}`,
      })
      .select("id")
      .single();
    if (obsCginErr || !obsCgin) {
      throw new Error(`obs CGIN: ${obsCginErr?.message}`);
    }
    ids.obsCgin = obsCgin.id;

    console.log("2) Login analistas…");
    const cgin = await signIn(url, anonKey, cginAcc.email);
    const pfcg = await signIn(url, anonKey, pfcgAcc.email);

    console.log("3) Cenário A — Analista CGIN busca token só em observação de Pessoa…");
    const rowsA = await busca(cgin, TOKEN_PESSOA);
    const hitA = hitFor(rowsA, "pessoa", pessoa.id);
    assert(hitA, "deve retornar a Pessoa dona da observação");
    assert(
      hitA!.campo_correspondente === "mensagem",
      `campo_correspondente esperado 'mensagem', veio '${hitA!.campo_correspondente}'`,
    );
    console.log(`   OK: pessoa=${hitA!.entidade_id} campo=${hitA!.campo_correspondente}`);

    console.log("4) Cenário B — Analista PFCG busca token em observação de Doc da própria unidade…");
    const rowsB = await busca(pfcg, TOKEN_DOC_PFCG);
    const hitB = hitFor(rowsB, "documento", docPfcg.id);
    assert(hitB, "deve retornar o Documento PFCG dono da observação");
    console.log(`   OK: documento=${hitB!.entidade_id} campo=${hitB!.campo_correspondente}`);

    console.log("5) Cenário C — Analista PFCG busca token em observação de Doc CGIN (outra unidade)…");
    const rowsC = await busca(pfcg, TOKEN_DOC_CGIN);
    const hitC = hitFor(rowsC, "documento", docCgin.id);
    const anyDocCgin = rowsC.filter((r) => r.entidade_id === docCgin.id);
    if (anyDocCgin.length > 0 || hitC) {
      console.error("   vazamento:", JSON.stringify(anyDocCgin.length ? anyDocCgin : rowsC, null, 2));
    }
    assert(!hitC, "NÃO deve retornar documento via campo mensagem de outra unidade");
    assert(
      anyDocCgin.length === 0,
      "NÃO deve retornar o documento CGIN (qualquer campo) para analista PFCG",
    );
    console.log(`   OK: ${rowsC.length} resultado(s), nenhum do doc CGIN restrito`);

    console.log("\nRESULTADO: 3/3 cenários passaram.");
  } finally {
    console.log("6) Limpeza…");
    if (ids.obsPessoa) await admin.from("observacoes").delete().eq("id", ids.obsPessoa);
    if (ids.obsPfcg) await admin.from("observacoes").delete().eq("id", ids.obsPfcg);
    if (ids.obsCgin) await admin.from("observacoes").delete().eq("id", ids.obsCgin);
    if (ids.docPfcg) await admin.from("documentos").delete().eq("id", ids.docPfcg);
    if (ids.docCgin) await admin.from("documentos").delete().eq("id", ids.docCgin);
    if (ids.pessoa) await admin.from("pessoas").delete().eq("id", ids.pessoa);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
