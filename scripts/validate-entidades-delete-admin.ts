/**
 * Valida DELETE de entidades principais: só administrador.
 *
 * Pré-requisitos:
 *   - Migration 20260720140000_entidades_delete_admin_only aplicada
 *   - .env.local com URL, ANON_KEY e SERVICE_ROLE_KEY
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/validate-entidades-delete-admin.ts
 */

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { TEST_PREFIX } from "./seed-shared";

const TEMP_PASSWORD = "Teste@123";
const MARKER = `${TEST_PREFIX}DEL-ADMIN`;
const DOMAIN = "del-admin-validate.rede-lince.test";

type TableName =
  | "pessoas"
  | "empresas"
  | "enderecos"
  | "veiculos"
  | "documentos"
  | "casos"
  | "comunicacoes"
  | "orcrims";

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
  opts: {
    email: string;
    nome: string;
    role: "administrador" | "analista";
    unidade: "CGIN" | "PFCG" | null;
    matricula: string;
    cpf: string;
  },
): Promise<{ user: User; email: string }> {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listed.error) throw new Error(listed.error.message);
  let user = listed.data.users.find(
    (u) => u.email?.toLowerCase() === opts.email.toLowerCase(),
  );

  if (!user) {
    const created = await admin.auth.admin.createUser({
      email: opts.email,
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: { nome: opts.nome },
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

  const payload = {
    nome: opts.nome,
    email: opts.email,
    role: opts.role,
    unidade: opts.unidade,
    ativo: true,
    matricula: opts.matricula,
    cpf: opts.cpf,
  };

  const { data: existing } = await admin
    .from("perfis_usuario")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("perfis_usuario")
      .update(payload)
      .eq("id", user.id);
    if (error) throw new Error(`perfil update: ${error.message}`);
  } else {
    const { error } = await admin.from("perfis_usuario").insert({
      id: user.id,
      ...payload,
    });
    if (error) throw new Error(`perfil insert: ${error.message}`);
  }

  return { user, email: opts.email };
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

async function insertSeed(
  admin: SupabaseClient,
  userId: string,
): Promise<Record<TableName, string>> {
  const ids = {} as Record<TableName, string>;

  const { data: pessoa, error: pErr } = await admin
    .from("pessoas")
    .insert({
      nome: `${MARKER} Pessoa`,
      tipo: "ppf",
      usuario_cadastro: userId,
    })
    .select("id")
    .single();
  if (pErr || !pessoa) throw new Error(`pessoa: ${pErr?.message}`);
  ids.pessoas = pessoa.id;

  const { data: empresa, error: eErr } = await admin
    .from("empresas")
    .insert({
      nome_fantasia: `${MARKER} Empresa`,
      razao_social: `${MARKER} Empresa LTDA`,
      usuario_cadastro: userId,
    })
    .select("id")
    .single();
  if (eErr || !empresa) throw new Error(`empresa: ${eErr?.message}`);
  ids.empresas = empresa.id;

  const { data: endereco, error: enErr } = await admin
    .from("enderecos")
    .insert({
      tipo: `${MARKER} Endereco`,
      logradouro: "Rua Delete Test",
      cidade: "Campo Grande",
      estado: "MS",
      usuario_cadastro: userId,
    })
    .select("id")
    .single();
  if (enErr || !endereco) throw new Error(`endereco: ${enErr?.message}`);
  ids.enderecos = endereco.id;

  const plate = `T${Date.now().toString().slice(-6)}`;
  const { data: veiculo, error: vErr } = await admin
    .from("veiculos")
    .insert({
      placa: plate,
      marca: MARKER,
      usuario_cadastro: userId,
    })
    .select("id")
    .single();
  if (vErr || !veiculo) throw new Error(`veiculo: ${vErr?.message}`);
  ids.veiculos = veiculo.id;

  const { data: doc, error: dErr } = await admin
    .from("documentos")
    .insert({
      nome: `${MARKER} Doc`,
      tipo: "RCI",
      unidade: "PFCG",
      usuario_cadastro: userId,
    })
    .select("id")
    .single();
  if (dErr || !doc) throw new Error(`documento: ${dErr?.message}`);
  ids.documentos = doc.id;

  const { data: caso, error: cErr } = await admin
    .from("casos")
    .insert({
      nome: `${MARKER} Caso`,
      numero: `${MARKER}-1`,
      unidade: "PFCG",
      usuario_cadastro: userId,
    })
    .select("id")
    .single();
  if (cErr || !caso) throw new Error(`caso: ${cErr?.message}`);
  ids.casos = caso.id;

  const { data: com, error: coErr } = await admin
    .from("comunicacoes")
    .insert({
      valor: `${MARKER}-tel`,
      tipo: "whatsapp",
      usuario_cadastro: userId,
    })
    .select("id")
    .single();
  if (coErr || !com) throw new Error(`comunicacao: ${coErr?.message}`);
  ids.comunicacoes = com.id;

  const { data: orc, error: oErr } = await admin
    .from("orcrims")
    .insert({
      nome: `${MARKER} Orcrim`,
      usuario_cadastro: userId,
    })
    .select("id")
    .single();
  if (oErr || !orc) throw new Error(`orcrim: ${oErr?.message}`);
  ids.orcrims = orc.id;

  return ids;
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("0) Garantir admin + analista PFCG…");
  const adminAcc = await ensureUser(admin, {
    email: `del.admin@${DOMAIN}`,
    nome: `${MARKER} Admin`,
    role: "administrador",
    unidade: null,
    matricula: "870001",
    cpf: "52998224725",
  });
  const analistaAcc = await ensureUser(admin, {
    email: `del.analista@${DOMAIN}`,
    nome: `${MARKER} Analista PFCG`,
    role: "analista",
    unidade: "PFCG",
    matricula: "870002",
    cpf: "11144477735",
  });

  const seedIds = await insertSeed(admin, adminAcc.user.id);
  const tables = Object.keys(seedIds) as TableName[];

  // IDs extras para o analista criar/editar/obs/vínculo
  let analistaPessoaId: string | undefined;
  let analistaObsId: string | undefined;
  let analistaVinculoId: string | undefined;
  let adminCopyIds: Partial<Record<TableName, string>> = {};

  try {
    console.log("1) Login…");
    const asAdmin = await signIn(url, anonKey, adminAcc.email);
    const asAnalista = await signIn(url, anonKey, analistaAcc.email);

    console.log("2) Analista NÃO consegue DELETE nas 8 entidades…");
    for (const table of tables) {
      const id = seedIds[table];
      const { error, count } = await asAnalista
        .from(table)
        .delete({ count: "exact" })
        .eq("id", id);
      // RLS: 0 rows deleted, sem necessariamente erro explícito
      const { data: stillThere } = await admin
        .from(table)
        .select("id")
        .eq("id", id)
        .maybeSingle();
      assert(stillThere, `analista não deveria apagar ${table}`);
      if (error) {
        console.log(`   ${table}: rejeitado (${error.message})`);
      } else {
        console.log(`   ${table}: 0 linhas afetadas (count=${count ?? "n/a"})`);
      }
    }

    console.log("3) Analista AINDA cria e edita…");
    const { data: novaPessoa, error: createErr } = await asAnalista
      .from("pessoas")
      .insert({
        nome: `${MARKER} Criada pelo analista`,
        tipo: "ppf",
        usuario_cadastro: analistaAcc.user.id,
      })
      .select("id")
      .single();
    assert(!createErr && novaPessoa, `create pessoa: ${createErr?.message}`);
    analistaPessoaId = novaPessoa!.id;

    const { error: updateErr } = await asAnalista
      .from("pessoas")
      .update({ nome: `${MARKER} Editada pelo analista` })
      .eq("id", analistaPessoaId);
    assert(!updateErr, `update pessoa: ${updateErr?.message}`);
    console.log("   OK create+update pessoa");

    console.log("4) Analista ainda remove observação e vínculo…");
    const { data: obs, error: obsErr } = await asAnalista
      .from("observacoes")
      .insert({
        entidade_tipo: "pessoa",
        entidade_id: analistaPessoaId,
        usuario: analistaAcc.user.id,
        mensagem: `${MARKER} obs temporária`,
      })
      .select("id")
      .single();
    assert(!obsErr && obs, `insert obs: ${obsErr?.message}`);
    analistaObsId = obs!.id;

    const { error: obsDelErr } = await asAnalista
      .from("observacoes")
      .delete()
      .eq("id", analistaObsId);
    assert(!obsDelErr, `delete obs: ${obsDelErr?.message}`);
    const { data: obsGone } = await admin
      .from("observacoes")
      .select("id")
      .eq("id", analistaObsId)
      .maybeSingle();
    assert(!obsGone, "obs deveria ter sido apagada");
    analistaObsId = undefined;
    console.log("   OK delete observação");

    const { data: vinculo, error: vinErr } = await asAnalista
      .from("vinculos")
      .insert({
        entidade_origem_tipo: "pessoa",
        entidade_origem_id: analistaPessoaId,
        entidade_destino_tipo: "empresa",
        entidade_destino_id: seedIds.empresas,
        tipo_a_para_b: "associado a",
        tipo_b_para_a: "associado a",
        tipo_vinculo: "associado a",
        usuario_cadastro: analistaAcc.user.id,
      })
      .select("id")
      .single();
    assert(!vinErr && vinculo, `insert vinculo: ${vinErr?.message}`);
    analistaVinculoId = vinculo!.id;

    const { error: vinDelErr } = await asAnalista
      .from("vinculos")
      .delete()
      .eq("id", analistaVinculoId);
    assert(!vinDelErr, `delete vinculo: ${vinDelErr?.message}`);
    const { data: vinGone } = await admin
      .from("vinculos")
      .select("id")
      .eq("id", analistaVinculoId)
      .maybeSingle();
    assert(!vinGone, "vínculo deveria ter sido apagado");
    analistaVinculoId = undefined;
    console.log("   OK delete vínculo");

    console.log("5) Administrador consegue DELETE nas 8 entidades…");
    // Cópias frescas para o admin apagar (as seedIds ainda existem)
    adminCopyIds = await insertSeed(admin, adminAcc.user.id);
    for (const table of tables) {
      const id = adminCopyIds[table]!;
      const { error } = await asAdmin.from(table).delete().eq("id", id);
      assert(!error, `admin delete ${table}: ${error?.message}`);
      const { data: gone } = await admin
        .from(table)
        .select("id")
        .eq("id", id)
        .maybeSingle();
      assert(!gone, `admin deveria apagar ${table}`);
      console.log(`   OK ${table}`);
      delete adminCopyIds[table];
    }

    console.log("\nRESULTADO: validação DELETE-admin OK.");
  } finally {
    console.log("6) Limpeza…");
    if (analistaObsId) {
      await admin.from("observacoes").delete().eq("id", analistaObsId);
    }
    if (analistaVinculoId) {
      await admin.from("vinculos").delete().eq("id", analistaVinculoId);
    }
    if (analistaPessoaId) {
      await admin.from("pessoas").delete().eq("id", analistaPessoaId);
    }
    for (const id of Object.values(adminCopyIds)) {
      if (!id) continue;
      // best-effort
    }
    for (const [table, id] of Object.entries(seedIds) as [TableName, string][]) {
      await admin.from(table).delete().eq("id", id);
    }
    for (const [table, id] of Object.entries(adminCopyIds) as [
      TableName,
      string,
    ][]) {
      await admin.from(table).delete().eq("id", id);
    }
    // Usuários efêmeros: manter (podem servir a re-runs). Remover perfis se quiser:
    // não apagamos Auth aqui para não interferir em outros testes.
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
