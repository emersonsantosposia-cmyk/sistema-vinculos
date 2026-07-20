/**
 * Valida busca fonética / trigrama reduzido em nomes de pessoa.
 *
 * Pré-requisitos:
 *   - Migration 20260720150000_busca_pessoa_fonetica aplicada
 *   - .env.local com URL, ANON_KEY e SERVICE_ROLE_KEY
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/validate-busca-pessoa-fonetica.ts
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TEST_PREFIX } from "./seed-shared";

const MARKER = `${TEST_PREFIX}BUSCA-FON`;

/** Pares: cadastrar com `stored`, buscar com cada `queries`. */
const CASES: { stored: string; queries: string[] }[] = [
  { stored: "Beatriz", queries: ["beatris"] },
  { stored: "Souza", queries: ["sousa"] },
  { stored: "Lucca", queries: ["luca"] },
  { stored: "Giovanna", queries: ["giovana"] },
  { stored: "Kelly", queries: ["kely", "kelli", "keli"] },
  { stored: "Matheus", queries: ["mateus"] },
  { stored: "Luis", queries: ["luiz"] },
  { stored: "Luisa", queries: ["luiza"] },
  { stored: "Elisangela", queries: ["elizangela"] },
  { stored: "Cesar", queries: ["cezar"] },
  { stored: "Chico", queries: ["xico"] },
  { stored: "Alessandra", queries: ["alexandra"] },
];

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Variável ausente: ${name}`);
    process.exit(1);
  }
  return value;
}

type BuscaRow = {
  entidade_tipo: string;
  entidade_id: string;
  campo_correspondente: string;
  tipo_correspondencia: string;
  rotulo_principal: string;
};

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Sanity: chave fonética
  console.log("0) Checando chave_fonetica_pt…");
  const { data: chaveProbe, error: chaveErr } = await admin.rpc(
    "chave_fonetica_pt",
    { valor: "Beatriz" },
  );
  if (chaveErr) {
    throw new Error(`chave_fonetica_pt: ${chaveErr.message}`);
  }
  console.log(`   Beatriz → ${chaveProbe}`);

  const createdIds: string[] = [];
  const passed: string[] = [];
  const failed: string[] = [];

  try {
    console.log("1) Inserindo pessoas de teste…");
    for (const c of CASES) {
      const nome = `${MARKER} ${c.stored} Silva`;
      const { data, error } = await admin
        .from("pessoas")
        .insert({
          nome,
          tipo: "visitante",
          nome_mae: null,
          nome_pai: null,
        })
        .select("id")
        .single();
      if (error || !data) {
        throw new Error(`insert ${c.stored}: ${error?.message}`);
      }
      createdIds.push(data.id);
    }

    console.log("2) Buscando grafias alternativas…");
    for (let i = 0; i < CASES.length; i++) {
      const c = CASES[i]!;
      const id = createdIds[i]!;
      for (const q of c.queries) {
        const label = `${c.stored} ← ${q}`;
        const { data, error } = await admin.rpc("busca_global", {
          termo: q,
          limiar: 0.5,
          limite: 50,
        });
        if (error) throw new Error(`busca(${q}): ${error.message}`);
        const rows = (data ?? []) as BuscaRow[];
        const hit = rows.find(
          (r) => r.entidade_tipo === "pessoa" && r.entidade_id === id,
        );
        if (hit) {
          passed.push(
            `${label} [${hit.tipo_correspondencia}/${hit.campo_correspondente}]`,
          );
          console.log(`   OK  ${label} (${hit.tipo_correspondencia})`);
        } else {
          failed.push(label);
          console.log(`   FAIL ${label}`);
        }
      }
    }

    // Controle negativo: fonética PT NÃO se aplica a alcunha.
    // Busca "xico" não deve achar alcunha "Francisco…" (trgm curto vs longo falha;
    // só a chave fonética de *nome* uniria xico/chico).
    console.log("3) Controle: alcunha NÃO usa chave fonética de nome…");
    const { data: alcunhaPessoa, error: alcErr } = await admin
      .from("pessoas")
      .insert({
        nome: `${MARKER} Controle Alcunha Sem Xico`,
        alcunha: "FranciscoControleFonZZ99",
        tipo: "visitante",
      })
      .select("id")
      .single();
    if (alcErr || !alcunhaPessoa) {
      throw new Error(`insert alcunha: ${alcErr?.message}`);
    }
    createdIds.push(alcunhaPessoa.id);

    const { data: alcHits, error: alcBuscaErr } = await admin.rpc(
      "busca_global",
      {
        termo: "xico",
        limiar: 0.5,
        limite: 50,
      },
    );
    if (alcBuscaErr) throw new Error(alcBuscaErr.message);
    const alcHit = ((alcHits ?? []) as BuscaRow[]).find(
      (r) =>
        r.entidade_id === alcunhaPessoa.id &&
        r.campo_correspondente === "alcunha",
    );
    if (alcHit) {
      failed.push("controle alcunha (xico não deveria bater em Francisco…)");
      console.log(`   FAIL alcunha retornou via ${alcHit.tipo_correspondencia}`);
    } else {
      console.log(
        "   OK  alcunha 'Francisco…' não retorna para busca 'xico' (sem fonética)",
      );
    }
  } finally {
    if (createdIds.length > 0) {
      console.log("4) Limpando pessoas de teste…");
      await admin.from("pessoas").delete().in("id", createdIds);
    }
  }

  console.log("\n=== Resumo ===");
  console.log(`Passou: ${passed.length}`);
  for (const p of passed) console.log(`  ✓ ${p}`);
  console.log(`Falhou: ${failed.length}`);
  for (const f of failed) console.log(`  ✗ ${f}`);

  if (failed.length > 0) process.exit(1);
  console.log("\nTodos os pares de grafia passaram.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
