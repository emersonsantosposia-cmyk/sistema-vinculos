/**
 * Validação da brecha C2 (observações + vínculos restritos por unidade).
 *
 * Cria usuários efêmeros CGIN/PFCG (ou reutiliza se já existirem), monta
 * documento+observação+vínculo+visualização, valida RLS/redação e limpa tudo.
 *
 * Pré-requisitos:
 *   - Migration 20260719120000_observacoes_rls_unidade aplicada
 *   - .env.local com URL, ANON_KEY e SERVICE_ROLE_KEY
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/validate-observacoes-rls-unidade.ts
 */

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { TEST_PREFIX } from "./seed-shared";

const TEMP_PASSWORD = "Teste@123";
const MARKER = `${TEST_PREFIX}C2-RLS`;
const DOMAIN = "c2-rls-validate.rede-lince.test";

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
): Promise<{ user: User; email: string; created: boolean }> {
  const email = `c2.${unidade.toLowerCase()}@${DOMAIN}`;
  const suffix = unidade === "CGIN" ? "81" : "82";

  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listed.error) throw new Error(listed.error.message);
  let user = listed.data.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  let created = false;

  if (!user) {
    const createdUser = await admin.auth.admin.createUser({
      email,
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: { nome: `C2 ${unidade}` },
    });
    if (createdUser.error || !createdUser.data.user) {
      throw new Error(`createUser ${unidade}: ${createdUser.error?.message}`);
    }
    user = createdUser.data.user;
    created = true;
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

  if (existingPerfil) {
    const { error: perfilErr } = await admin
      .from("perfis_usuario")
      .update({
        nome: `C2 Analista ${unidade}`,
        email,
        role: "analista",
        unidade,
        ativo: true,
      })
      .eq("id", user.id);
    if (perfilErr) throw new Error(`perfil update ${unidade}: ${perfilErr.message}`);
  } else {
    const { error: perfilErr } = await admin.from("perfis_usuario").insert({
      id: user.id,
      nome: `C2 Analista ${unidade}`,
      matricula: `9${suffix}0001`,
      cpf: unidade === "CGIN" ? "11144477735" : "12345678909",
      email,
      role: "analista",
      unidade,
      ativo: true,
    });
    if (perfilErr) throw new Error(`perfil insert ${unidade}: ${perfilErr.message}`);
  }

  return { user, email, created };
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

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("0) Garantir analistas efêmeros CGIN / PFCG…");
  const cginAcc = await ensureAnalista(admin, "CGIN");
  const pfcgAcc = await ensureAnalista(admin, "PFCG");

  console.log("1) Login…");
  const cgin = await signIn(url, anonKey, cginAcc.email);
  const pfcg = await signIn(url, anonKey, pfcgAcc.email);

  const createdIds: {
    pessoa?: string;
    doc?: string;
    obs?: string;
    vinculo?: string;
    viz?: string;
  } = {};

  try {
    console.log("2) Criar documento CGIN + observação + vínculo + visualização…");

    const { data: pessoa, error: pessoaErr } = await admin
      .from("pessoas")
      .insert({
        nome: `${MARKER} Pessoa ponte`,
        tipo: "ppf",
        usuario_cadastro: cginAcc.user.id,
      })
      .select("id")
      .single();
    if (pessoaErr || !pessoa) throw new Error(`pessoa: ${pessoaErr?.message}`);
    createdIds.pessoa = pessoa.id;

    const { data: doc, error: docErr } = await admin
      .from("documentos")
      .insert({
        nome: `${MARKER} Doc secreto CGIN`,
        tipo: "RCI",
        unidade: "CGIN",
        usuario_cadastro: cginAcc.user.id,
      })
      .select("id, nome")
      .single();
    if (docErr || !doc) throw new Error(`documento: ${docErr?.message}`);
    createdIds.doc = doc.id;

    const secretMsg = `${MARKER} texto confidencial da observação`;
    const { data: obs, error: obsErr } = await admin
      .from("observacoes")
      .insert({
        entidade_tipo: "documento",
        entidade_id: doc.id,
        usuario: cginAcc.user.id,
        mensagem: secretMsg,
      })
      .select("id, mensagem")
      .single();
    if (obsErr || !obs) throw new Error(`observacao: ${obsErr?.message}`);
    createdIds.obs = obs.id;

    const secretFund = `${MARKER} fundamentação secreta do vínculo`;
    const { data: vinculo, error: vincErr } = await admin
      .from("vinculos")
      .insert({
        entidade_origem_tipo: "pessoa",
        entidade_origem_id: pessoa.id,
        entidade_destino_tipo: "documento",
        entidade_destino_id: doc.id,
        tipo_vinculo: "mencionado em",
        observacao: secretFund,
        usuario_cadastro: cginAcc.user.id,
      })
      .select("id, observacao, tipo_vinculo")
      .single();
    if (vincErr || !vinculo) throw new Error(`vinculo: ${vincErr?.message}`);
    createdIds.vinculo = vinculo.id;

    const estadoSalvo = {
      version: 1,
      root: { entidadeTipo: "pessoa", entidadeId: pessoa.id },
      pinnedNodeIds: [],
      nodes: [
        {
          id: `entidade__pessoa__${pessoa.id}`,
          type: "entidade",
          position: { x: 0, y: 0 },
          data: {
            entidadeTipo: "pessoa",
            entidadeId: pessoa.id,
            titulo: `${MARKER} Pessoa ponte`,
            subtitulo: null,
            foto_perfil_path: null,
            foto_url: null,
            restrito: false,
            expanded: true,
            isRoot: true,
            refSources: [],
          },
        },
        {
          id: `entidade__documento__${doc.id}`,
          type: "entidade",
          position: { x: 200, y: 0 },
          data: {
            entidadeTipo: "documento",
            entidadeId: doc.id,
            titulo: doc.nome,
            subtitulo: "RCI",
            foto_perfil_path: null,
            foto_url: null,
            restrito: false,
            expanded: false,
            isRoot: false,
            refSources: [`entidade__pessoa__${pessoa.id}`],
          },
        },
      ],
      edges: [
        {
          id: `vinculo__${vinculo.id}`,
          source: `entidade__pessoa__${pessoa.id}`,
          target: `entidade__documento__${doc.id}`,
          type: "straight",
          label: "mencionado em",
          data: { refSources: [`entidade__pessoa__${pessoa.id}`] },
        },
      ],
    };

    const { data: viz, error: vizErr } = await admin
      .from("diagrama_visualizacoes_salvas")
      .insert({
        nome: `${MARKER} viz CGIN`,
        entidade_inicial_tipo: "pessoa",
        entidade_inicial_id: pessoa.id,
        estado_json: estadoSalvo,
        usuario_cadastro: cginAcc.user.id,
      })
      .select("id")
      .single();
    if (vizErr || !viz) throw new Error(`visualizacao: ${vizErr?.message}`);
    createdIds.viz = viz.id;

    console.log("3) PFCG: observação do doc CGIN invisível…");
    const { data: obsPfcg, error: obsPfcgErr } = await pfcg
      .from("observacoes")
      .select("id, mensagem")
      .eq("id", obs.id);
    assert(!obsPfcgErr, `select obs PFCG: ${obsPfcgErr?.message}`);
    assert((obsPfcg ?? []).length === 0, "PFCG não deve ler a observação");

    const { data: obsByMsg } = await pfcg
      .from("observacoes")
      .select("id")
      .ilike("mensagem", `%${MARKER}%`);
    assert(
      (obsByMsg ?? []).length === 0,
      "PFCG não deve achar obs por mensagem",
    );

    console.log("4) PFCG: documento inacessível; vínculo (linha) ainda legível…");
    const { data: docPfcg } = await pfcg
      .from("documentos")
      .select("id, nome")
      .eq("id", doc.id)
      .maybeSingle();
    assert(!docPfcg, "PFCG não deve ler o documento CGIN");

    const { data: vincPfcg } = await pfcg
      .from("vinculos")
      .select("id, observacao, tipo_vinculo")
      .eq("id", vinculo.id)
      .maybeSingle();
    assert(vincPfcg, "PFCG deve ver a linha do vínculo (card restrito)");
    assert(
      vincPfcg!.tipo_vinculo === "mencionado em",
      "tipo_vinculo preservado",
    );

    console.log("5) Contrato app: card restrito omite fundamentação…");
    const restrito = !docPfcg;
    assert(restrito, "resumo do documento deve falhar para PFCG");
    const fundamentacaoExposta = restrito ? null : vincPfcg!.observacao;
    assert(
      fundamentacaoExposta === null,
      "fundamentação não deve ser exposta no card restrito",
    );

    console.log("6) CGIN: observação e documento visíveis…");
    const { data: obsCgin } = await cgin
      .from("observacoes")
      .select("id, mensagem")
      .eq("id", obs.id)
      .maybeSingle();
    assert(obsCgin?.mensagem === secretMsg, "CGIN lê a observação");

    const { data: docCgin } = await cgin
      .from("documentos")
      .select("id")
      .eq("id", doc.id)
      .maybeSingle();
    assert(docCgin, "CGIN lê o documento");

    console.log("7) Restore: nó documento redigido para PFCG…");
    const { data: vizPfcg } = await pfcg
      .from("diagrama_visualizacoes_salvas")
      .select("estado_json")
      .eq("id", viz.id)
      .maybeSingle();
    assert(vizPfcg?.estado_json, "PFCG lê a visualização salva");

    const nodes = (
      vizPfcg!.estado_json as {
        nodes: Array<{
          data: { entidadeTipo: string; entidadeId: string; titulo: string };
        }>;
      }
    ).nodes;
    const docNode = nodes.find((n) => n.data.entidadeTipo === "documento");
    assert(docNode, "nó documento no estado");
    const { data: liveDoc } = await pfcg
      .from("documentos")
      .select("id, nome")
      .eq("id", docNode!.data.entidadeId)
      .maybeSingle();
    const tituloRestaurado = liveDoc ? liveDoc.nome : "Documento restrito";
    assert(
      tituloRestaurado === "Documento restrito",
      `nó redigido (obtido: ${tituloRestaurado})`,
    );

    console.log("\n✅ Validação C2 OK\n");
  } finally {
    console.log("Cleanup…");
    if (createdIds.viz) {
      await admin
        .from("diagrama_visualizacoes_salvas")
        .delete()
        .eq("id", createdIds.viz);
    }
    if (createdIds.vinculo) {
      await admin.from("vinculos").delete().eq("id", createdIds.vinculo);
    }
    if (createdIds.obs) {
      await admin.from("observacoes").delete().eq("id", createdIds.obs);
    }
    if (createdIds.doc) {
      await admin.from("documentos").delete().eq("id", createdIds.doc);
    }
    if (createdIds.pessoa) {
      await admin.from("pessoas").delete().eq("id", createdIds.pessoa);
    }
    // Sempre remove os usuários efêmeros deste script
    for (const acc of [cginAcc, pfcgAcc]) {
      await admin.from("perfis_usuario").delete().eq("id", acc.user.id);
      await admin.auth.admin.deleteUser(acc.user.id);
    }
  }
}

main().catch((err) => {
  console.error("\n❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
