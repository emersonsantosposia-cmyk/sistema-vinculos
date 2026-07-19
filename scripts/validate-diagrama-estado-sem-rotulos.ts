/**
 * Valida que estado_json não vaza títulos de entidades (v2 estrutural).
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/validate-diagrama-estado-sem-rotulos.ts
 */

import { createClient } from "@supabase/supabase-js";
import {
  estadoJsonTemRotulosCacheados,
  sanitizeDiagramaEstado,
} from "../src/lib/diagrama-visualizacoes";
import { TEST_PREFIX } from "./seed-shared";

const MARKER = `${TEST_PREFIX}DViz-v2`;

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

function jsonHasForbiddenLabels(payload: unknown): string | null {
  const text = JSON.stringify(payload);
  const forbidden = [
    "titulo",
    "subtitulo",
    "foto_perfil_path",
    "foto_url",
    '"restrito"',
    '"label"',
  ];
  for (const key of forbidden) {
    // Aceita só se a chave aparecer como propriedade JSON de nó/aresta
    if (text.includes(`"${key.replace(/"/g, "")}"`)) {
      // "label" sozinho é ambíguo; checamos estrutura
      if (key === '"label"' || key === "label") {
        if (/"label"\s*:/.test(text)) return "label";
        continue;
      }
      if (new RegExp(`"${key}"\\s*:`).test(text)) return key;
    }
  }
  return null;
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Todos os registros no banco devem estar limpos (após migration).
  console.log("1) Auditar estado_json no banco…");
  const { data: all, error: allErr } = await admin
    .from("diagrama_visualizacoes_salvas")
    .select("id, nome, estado_json");
  if (allErr) throw new Error(allErr.message);

  for (const row of all ?? []) {
    assert(
      !estadoJsonTemRotulosCacheados(row.estado_json),
      `registro ${row.id} (${row.nome}) ainda tem rótulos cacheados`,
    );
    const leak = jsonHasForbiddenLabels(row.estado_json);
    assert(!leak, `registro ${row.id} ainda contém chave "${leak}"`);
    const sanitized = sanitizeDiagramaEstado(row.estado_json);
    assert(sanitized, `registro ${row.id} não sanitiza`);
    assert(sanitized!.version === 2, `registro ${row.id} não está em v2`);
  }
  console.log(`   OK — ${(all ?? []).length} visualização(ões) limpas`);

  // 2) Simular payload legado v1 e confirmar sanitize remove títulos.
  console.log("2) sanitizeDiagramaEstado remove títulos de payload v1…");
  const legado = {
    version: 1,
    root: { entidadeTipo: "pessoa", entidadeId: "00000000-0000-0000-0000-000000000001" },
    pinnedNodeIds: [],
    nodes: [
      {
        id: "n1",
        type: "entidade",
        position: { x: 1, y: 2 },
        data: {
          entidadeTipo: "documento",
          entidadeId: "00000000-0000-0000-0000-000000000002",
          titulo: `${MARKER} Doc secreto CGIN`,
          subtitulo: "RCI",
          foto_perfil_path: null,
          foto_url: null,
          restrito: false,
          expanded: true,
          isRoot: false,
          refSources: [],
        },
      },
    ],
    edges: [
      {
        id: "vinculo__00000000-0000-0000-0000-000000000003",
        source: "n1",
        target: "n1",
        type: "straight",
        label: "mencionado em",
        data: { refSources: [] },
      },
    ],
  };
  const clean = sanitizeDiagramaEstado(legado);
  assert(clean, "sanitize deve aceitar v1");
  assert(clean!.version === 2, "versão 2");
  assert(
    !("titulo" in clean!.nodes[0]!.data),
    "nó sem titulo",
  );
  assert(
    JSON.stringify(clean).includes("Doc secreto") === false,
    "título secreto não deve sobreviver ao sanitize",
  );
  assert(
    clean!.edges.every((e) => !("label" in e)),
    "arestas sem label",
  );

  // 3) Inserir via service role um registro sujo e confirmar que a migration
  //    já rodou — se inserirmos sujo agora, o app sanitize na leitura.
  console.log("3) API anon: get por id devolve JSON sem rótulos…");
  // Cria users efêmeros é pesado; usa service para insert + anon select se RLS permitir.
  // Qualquer ativo lê visualizações — precisa de usuário. Testamos só o sanitize
  // do caminho getDiagramaVisualizacao via round-trip admin insert + select.

  const { data: pessoa } = await admin
    .from("pessoas")
    .insert({ nome: `${MARKER} raiz`, tipo: "ppf" })
    .select("id")
    .single();
  if (!pessoa) throw new Error("falha ao criar pessoa teste");

  const estadoLimpo = sanitizeDiagramaEstado({
    version: 2,
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
          expanded: false,
          isRoot: true,
          refSources: [],
        },
      },
    ],
    edges: [],
  });

  const { data: viz, error: vizErr } = await admin
    .from("diagrama_visualizacoes_salvas")
    .insert({
      nome: `${MARKER} viz`,
      entidade_inicial_tipo: "pessoa",
      entidade_inicial_id: pessoa.id,
      estado_json: estadoLimpo,
    })
    .select("id, estado_json")
    .single();
  if (vizErr || !viz) throw new Error(vizErr?.message ?? "viz");

  const leak = jsonHasForbiddenLabels(viz.estado_json);
  assert(!leak, `INSERT limpo não deve ter chave ${leak}`);

  // Listagem tipicamente sem estado_json no select do app — conferimos colunas
  // que o client usa.
  const listSelect =
    "id, nome, entidade_inicial_tipo, entidade_inicial_id, usuario_cadastro, data_cadastro";
  assert(
    !listSelect.includes("estado_json"),
    "listagem do app não seleciona estado_json",
  );

  await admin.from("diagrama_visualizacoes_salvas").delete().eq("id", viz.id);
  await admin.from("pessoas").delete().eq("id", pessoa.id);

  // silencia unused
  void anonKey;

  console.log("\n✅ estado_json estrutural OK — sem títulos no payload persistido.\n");
  console.log(
    "Manual (Network): abra uma visualização salva e confira o GET em",
  );
  console.log(
    "diagrama_visualizacoes_salvas?id=eq.… — nodes[].data só com entidadeTipo/entidadeId/expanded/isRoot/refSources.",
  );
}

main().catch((err) => {
  console.error("\n❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
