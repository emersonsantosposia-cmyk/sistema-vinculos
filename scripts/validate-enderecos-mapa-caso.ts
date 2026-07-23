/**
 * Valida coleta em lote de endereços relacionados a caso/documento
 * e utilitários de proximidade (Haversine / pares / raio).
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/validate-enderecos-mapa-caso.ts
 */

import { createClient } from "@supabase/supabase-js";
import {
  formatDistancia,
  haversineMeters,
  paresProximos,
  pontosNoRaio,
} from "../src/lib/geo";
import {
  categoriaMarcador,
  descreverCaminhos,
  type EnderecoMapaItem,
} from "../src/lib/supabase/enderecos-mapa";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Ausente: ${name}`);
  return v;
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
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

  console.log("2) Buscando caso com vínculos no banco…");
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );

  // Encontra um caso que tenha pelo menos um vínculo
  const { data: vinculosCaso, error: vErr } = await supabase
    .from("vinculos")
    .select(
      "entidade_origem_tipo, entidade_origem_id, entidade_destino_tipo, entidade_destino_id",
    )
    .or("entidade_origem_tipo.eq.caso,entidade_destino_tipo.eq.caso")
    .limit(50);
  if (vErr) throw new Error(vErr.message);
  if (!vinculosCaso?.length) {
    console.log("  (nenhum vínculo de caso — pulando teste de integração)");
    console.log("\n✓ validate-enderecos-mapa-caso OK (só geo unitário)");
    return;
  }

  const casoId =
    vinculosCaso.find((r) => r.entidade_origem_tipo === "caso")
      ?.entidade_origem_id ??
    vinculosCaso.find((r) => r.entidade_destino_tipo === "caso")
      ?.entidade_destino_id;
  assert(casoId, "casoId");

  console.log(`  caso=${casoId}`);

  // Replica a lógica de coleta via service role (mesmas queries em lote)
  const { data: nivel1 } = await supabase
    .from("vinculos")
    .select("*")
    .or(
      `and(entidade_origem_tipo.eq.caso,entidade_origem_id.eq.${casoId}),and(entidade_destino_tipo.eq.caso,entidade_destino_id.eq.${casoId})`,
    );

  const pessoaIds = new Set<string>();
  const enderecoDiretoIds = new Set<string>();
  for (const row of nivel1 ?? []) {
    const outroTipo =
      row.entidade_origem_tipo === "caso" && row.entidade_origem_id === casoId
        ? row.entidade_destino_tipo
        : row.entidade_origem_tipo;
    const outroId =
      row.entidade_origem_tipo === "caso" && row.entidade_origem_id === casoId
        ? row.entidade_destino_id
        : row.entidade_origem_id;
    if (outroTipo === "endereco") enderecoDiretoIds.add(outroId);
    if (outroTipo === "pessoa") pessoaIds.add(outroId);
  }

  console.log(
    `  nível1: ${nivel1?.length ?? 0} vínculos, ${pessoaIds.size} pessoas, ${enderecoDiretoIds.size} endereços diretos`,
  );

  if (pessoaIds.size > 0) {
    const ids = [...pessoaIds];
    const [o1, o2] = await Promise.all([
      supabase
        .from("vinculos")
        .select("id")
        .eq("entidade_origem_tipo", "pessoa")
        .in("entidade_origem_id", ids),
      supabase
        .from("vinculos")
        .select("id")
        .eq("entidade_destino_tipo", "pessoa")
        .in("entidade_destino_id", ids),
    ]);
    assert(!o1.error && !o2.error, "batch .in() pessoas deve funcionar");
    console.log(
      `  batch pessoas: ${(o1.data?.length ?? 0) + (o2.data?.length ?? 0)} vínculos (2 queries .in)`,
    );
  }

  // Unitário: descrever caminho
  const fake: EnderecoMapaItem = {
    enderecoId: "e1",
    titulo: "Rua Teste",
    resumo: "Rua Teste, 100 — Centro · Campo Grande · MS",
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
    ],
  };
  const desc = descreverCaminhos(fake, "Caso");
  assert(desc[0]!.includes("João Silva"), "caminho menciona intermediário");
  assert(desc[0]!.includes("Residência de"), "caminho usa papel do endereço");
  assert(categoriaMarcador(fake) === "pessoa", "categoria via pessoa");

  console.log("\n✓ validate-enderecos-mapa-caso OK");
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
