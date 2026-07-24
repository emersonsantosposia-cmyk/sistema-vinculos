/**
 * Valida mapa de endereços do caso: órbita via documentos + salvaguarda RLS.
 *
 * Cenário:
 *   - Caso PFCG vinculado a doc PFCG e doc CGIN
 *   - Pessoa com endereço exclusivo ligada só ao doc CGIN
 *   - Analista CGIN vê o endereço; analista PFCG não (nem menção ao doc CGIN)
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/validate-enderecos-mapa-caso.ts
 */

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { TEST_PREFIX } from "./seed-shared";
import {
  categoriaMarcador,
  coletarEnderecosRelacionados,
  descreverCaminhos,
  linksDoCaminho,
  type EnderecoMapaItem,
} from "../src/lib/supabase/enderecos-mapa";
import {
  formatDistancia,
  haversineMeters,
  paresProximos,
  pontosNoRaio,
} from "../src/lib/geo";

const TEMP_PASSWORD = "Teste@123";
const MARKER = `${TEST_PREFIX}MapaCaso-RLS`;
const DOMAIN = "mapa-caso-rls-validate.rede-lince.test";
const ENDERECO_SECRETO_NOME = `${MARKER} Endereço só via doc CGIN`;

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
  unidade: "CGIN" | "PFCG",
): Promise<{ user: User; email: string }> {
  const email = `mapa.${unidade.toLowerCase()}@${DOMAIN}`;
  const suffix = unidade === "CGIN" ? "91" : "92";

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
      user_metadata: { nome: `Mapa ${unidade}` },
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
    nome: `Mapa Analista ${unidade}`,
    email,
    role: "analista" as const,
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
      matricula: `9${suffix}0002`,
      cpf: unidade === "CGIN" ? "88641577953" : "07584464670",
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

function mencionaDocCgin(item: EnderecoMapaItem, docCginId: string, docCginNome: string): boolean {
  const blob = [
    ...descreverCaminhos(item, "Caso"),
    ...linksDoCaminho(item).map((l) => `${l.href} ${l.label}`),
    ...item.caminhos.flatMap((c) => [
      c.viaDocumento?.id ?? "",
      c.viaDocumento?.titulo ?? "",
      c.intermediario?.id ?? "",
      c.intermediario?.titulo ?? "",
    ]),
  ].join("\n");
  return blob.includes(docCginId) || blob.includes(docCginNome);
}

async function main() {
  console.log("1) Haversine / pares / raio…");
  const d = haversineMeters(-20.4697, -54.6201, -20.4702, -54.621);
  assert(d > 50 && d < 500, `distância esperada ~100–200m, got ${d}`);
  assert(formatDistancia(250) === "250 m", "format m");
  assert(formatDistancia(1500).includes("km"), "format km");

  const pts = [
    { id: "a", latitude: -20.47, longitude: -54.62 },
    { id: "b", latitude: -20.4705, longitude: -54.6205 },
    { id: "c", latitude: -20.5, longitude: -54.7 },
  ];
  const pares = paresProximos(pts, 500);
  assert(pares.length >= 1, "deve achar par próximo a–b");
  assert(pares[0]!.metros <= 500, "par dentro do limite");
  const noRaio = pontosNoRaio(pts[0]!, pts, 500);
  assert(
    noRaio.some((x) => x.ponto.id === "b"),
    "b no raio de a",
  );
  assert(
    !noRaio.some((x) => x.ponto.id === "c"),
    "c fora do raio",
  );

  console.log("2) Unitário: múltiplos caminhos + via documento…");
  const fakeMulti: EnderecoMapaItem = {
    enderecoId: "e1",
    titulo: "Rua Teste, 100",
    resumo: "Rua Teste, 100 — Centro · Campo Grande · MS",
    tipo: "Casa",
    href: "/enderecos/e1",
    latitude: -20.47,
    longitude: -54.62,
    caminhos: [
      {
        modo: "via",
        tipoVinculoRaiz: "investigado",
        intermediario: {
          tipo: "pessoa",
          id: "p1",
          titulo: "João Silva",
          href: "/pessoas/p1",
          tipoParaEndereco: "Reside em",
          tipoDoEndereco: "Residência de",
        },
      },
      {
        modo: "via",
        tipoVinculoRaiz: "anexo",
        viaDocumento: {
          id: "d1",
          titulo: "RCI 001",
          href: "/documentos/d1",
          tipoVinculoDocEntidade: "menciona",
        },
        intermediario: {
          tipo: "pessoa",
          id: "p2",
          titulo: "Maria Souza",
          href: "/pessoas/p2",
          tipoParaEndereco: "Reside em",
          tipoDoEndereco: "Residência de",
        },
      },
    ],
  };
  const desc = descreverCaminhos(fakeMulti, "Caso");
  assert(desc.length === 2, "deve listar os dois caminhos");
  assert(desc[0]!.includes("João Silva"), "caminho 1 menciona intermediário");
  assert(desc[1]!.includes("Maria Souza"), "caminho 2 menciona pessoa");
  assert(desc[1]!.includes("RCI 001"), "caminho 2 menciona documento");
  assert(categoriaMarcador(fakeMulti) === "pessoa", "categoria via pessoa");
  const links = linksDoCaminho(fakeMulti);
  assert(
    links.some((l) => l.href.includes("/documentos/d1")),
    "popup deve linkar o documento",
  );
  assert(
    links.some((l) => l.href.includes("/pessoas/p1")),
    "popup deve linkar a pessoa do 1º caminho",
  );

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("3) Garantir analistas CGIN / PFCG…");
  const cginAcc = await ensureAnalista(admin, "CGIN");
  const pfcgAcc = await ensureAnalista(admin, "PFCG");

  const ids: {
    caso?: string;
    docPfcg?: string;
    docCgin?: string;
    pessoa?: string;
    endereco?: string;
    vinculos: string[];
  } = { vinculos: [] };

  try {
    console.log("4) Montar cenário caso PFCG + docs PFCG/CGIN + endereço exclusivo…");

    const { data: caso, error: casoErr } = await admin
      .from("casos")
      .insert({
        unidade: "PFCG",
        numero: "MAPA-RLS-001",
        nome: `${MARKER} Caso PFCG`,
        status: "em_andamento",
        usuario_cadastro: pfcgAcc.user.id,
      })
      .select("id")
      .single();
    if (casoErr || !caso) throw new Error(`caso: ${casoErr?.message}`);
    ids.caso = caso.id;

    const { data: docPfcg, error: docPfcgErr } = await admin
      .from("documentos")
      .insert({
        nome: `${MARKER} Doc PFCG`,
        tipo: "RCI",
        unidade: "PFCG",
        usuario_cadastro: pfcgAcc.user.id,
      })
      .select("id, nome")
      .single();
    if (docPfcgErr || !docPfcg) {
      throw new Error(`doc PFCG: ${docPfcgErr?.message}`);
    }
    ids.docPfcg = docPfcg.id;

    const { data: docCgin, error: docCginErr } = await admin
      .from("documentos")
      .insert({
        nome: `${MARKER} Doc secreto CGIN`,
        tipo: "INFO",
        unidade: "CGIN",
        usuario_cadastro: cginAcc.user.id,
      })
      .select("id, nome")
      .single();
    if (docCginErr || !docCgin) {
      throw new Error(`doc CGIN: ${docCginErr?.message}`);
    }
    ids.docCgin = docCgin.id;

    const { data: pessoa, error: pessoaErr } = await admin
      .from("pessoas")
      .insert({
        nome: `${MARKER} Pessoa só no doc CGIN`,
        tipo: "ppf",
        usuario_cadastro: cginAcc.user.id,
      })
      .select("id")
      .single();
    if (pessoaErr || !pessoa) throw new Error(`pessoa: ${pessoaErr?.message}`);
    ids.pessoa = pessoa.id;

    const { data: endereco, error: endErr } = await admin
      .from("enderecos")
      .insert({
        tipo: ENDERECO_SECRETO_NOME,
        logradouro: "Rua Exclusiva CGIN",
        numero: "999",
        bairro: "Centro",
        cidade: "Campo Grande",
        estado: "MS",
        latitude: -20.46971,
        longitude: -54.62011,
        usuario_cadastro: cginAcc.user.id,
      })
      .select("id")
      .single();
    if (endErr || !endereco) throw new Error(`endereco: ${endErr?.message}`);
    ids.endereco = endereco.id;

    async function vincular(
      origemTipo: string,
      origemId: string,
      destinoTipo: string,
      destinoId: string,
      aParaB: string,
      bParaA: string,
      userId: string,
    ) {
      const { data, error } = await admin
        .from("vinculos")
        .insert({
          entidade_origem_tipo: origemTipo,
          entidade_origem_id: origemId,
          entidade_destino_tipo: destinoTipo,
          entidade_destino_id: destinoId,
          tipo_a_para_b: aParaB,
          tipo_b_para_a: bParaA,
          tipo_vinculo: aParaB,
          usuario_cadastro: userId,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(`vinculo: ${error?.message}`);
      ids.vinculos.push(data.id);
    }

    await vincular(
      "caso",
      caso.id,
      "documento",
      docPfcg.id,
      "anexa",
      "anexo de",
      pfcgAcc.user.id,
    );
    await vincular(
      "caso",
      caso.id,
      "documento",
      docCgin.id,
      "anexa",
      "anexo de",
      pfcgAcc.user.id,
    );
    await vincular(
      "documento",
      docCgin.id,
      "pessoa",
      pessoa.id,
      "menciona",
      "mencionado em",
      cginAcc.user.id,
    );
    await vincular(
      "pessoa",
      pessoa.id,
      "endereco",
      endereco.id,
      "Reside em",
      "Residência de",
      cginAcc.user.id,
    );

    console.log("5) Login analistas…");
    const cgin = await signIn(url, anonKey, cginAcc.email);
    const pfcg = await signIn(url, anonKey, pfcgAcc.email);

    console.log("6) CGIN: endereço exclusivo deve aparecer (órbita via documento)…");
    const { data: mapaCgin, error: errCgin } = await coletarEnderecosRelacionados(
      "caso",
      caso.id,
      cgin,
    );
    assert(!errCgin && mapaCgin, `coleta CGIN: ${errCgin}`);
    const hitCgin = [...mapaCgin!.comCoords, ...mapaCgin!.semCoords].find(
      (i) => i.enderecoId === endereco.id,
    );
    assert(hitCgin, "CGIN deve ver o endereço exclusivo do doc CGIN");
    assert(
      hitCgin!.caminhos.some(
        (c) =>
          c.viaDocumento?.id === docCgin.id ||
          c.intermediario?.id === pessoa.id,
      ),
      "caminho CGIN deve passar pelo doc/pessoa",
    );
    const textosCgin = descreverCaminhos(hitCgin!, "Caso");
    assert(
      textosCgin.some((t) => t.includes(docCgin.nome!)),
      "popup CGIN deve mencionar o documento",
    );
    console.log("   OK  CGIN vê endereço + caminho via documento");

    console.log("7) PFCG: endereço exclusivo NÃO aparece; sem menção ao doc CGIN…");
    const { data: mapaPfcg, error: errPfcg } = await coletarEnderecosRelacionados(
      "caso",
      caso.id,
      pfcg,
    );
    assert(!errPfcg && mapaPfcg, `coleta PFCG: ${errPfcg}`);
    const todosPfcg = [...mapaPfcg!.comCoords, ...mapaPfcg!.semCoords];
    assert(
      !todosPfcg.some((i) => i.enderecoId === endereco.id),
      "PFCG NÃO deve ver o endereço exclusivo",
    );
    assert(
      !todosPfcg.some((i) => i.titulo.includes("Exclusiva CGIN")),
      "PFCG NÃO deve listar o endereço por título",
    );
    for (const item of todosPfcg) {
      assert(
        !mencionaDocCgin(item, docCgin.id, docCgin.nome!),
        "PFCG NÃO deve mencionar o documento CGIN em caminho/popup",
      );
    }

    // Contagem: vínculo do doc CGIN ainda é legível, mas o mapa não o expande.
    const { data: vincDoc } = await pfcg
      .from("vinculos")
      .select("id")
      .or(
        `and(entidade_origem_tipo.eq.caso,entidade_origem_id.eq.${caso.id},entidade_destino_tipo.eq.documento,entidade_destino_id.eq.${docCgin.id}),and(entidade_destino_tipo.eq.caso,entidade_destino_id.eq.${caso.id},entidade_origem_tipo.eq.documento,entidade_origem_id.eq.${docCgin.id})`,
      )
      .maybeSingle();
    assert(vincDoc, "PFCG ainda lê a linha do vínculo (card restrito)");

    const { data: docBloqueado } = await pfcg
      .from("documentos")
      .select("id")
      .eq("id", docCgin.id)
      .maybeSingle();
    assert(!docBloqueado, "PFCG não lê o documento CGIN (RLS)");

    console.log("   OK  salvaguarda: endereço e doc CGIN omitidos no mapa PFCG");

    console.log("\n✓ validate-enderecos-mapa-caso OK");
  } finally {
    console.log("8) Limpeza…");
    if (ids.vinculos.length) {
      await admin.from("vinculos").delete().in("id", ids.vinculos);
    }
    if (ids.endereco) {
      await admin.from("enderecos").delete().eq("id", ids.endereco);
    }
    if (ids.pessoa) {
      await admin.from("pessoas").delete().eq("id", ids.pessoa);
    }
    if (ids.docCgin) {
      await admin.from("documentos").delete().eq("id", ids.docCgin);
    }
    if (ids.docPfcg) {
      await admin.from("documentos").delete().eq("id", ids.docPfcg);
    }
    if (ids.caso) {
      await admin.from("casos").delete().eq("id", ids.caso);
    }
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
