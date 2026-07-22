/**
 * Valida Louvain + casos-limite do agrupamento por comunidades.
 * Uso: npx tsx scripts/validate-community-detect.ts
 */
import {
  detectCommunitiesLouvain,
  COMMUNITY_MIN_ENTIDADE_NODES,
} from "../src/components/vinculos-diagram/community-detect";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FALHOU: ${msg}`);
}

function main() {
  console.log("1) Poucos nós → too_few…");
  const few = detectCommunitiesLouvain(
    ["a", "b", "c"],
    [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
    ],
  );
  assert(!few.ok && few.reason === "too_few", "too_few");
  assert(COMMUNITY_MIN_ENTIDADE_NODES === 6, "min nodes");
  console.log("   OK");

  console.log("2) Clique completo (uma comunidade) → single…");
  const ids = ["n1", "n2", "n3", "n4", "n5", "n6", "n7"];
  const cliqueEdges: Array<{ source: string; target: string }> = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      cliqueEdges.push({ source: ids[i]!, target: ids[j]! });
    }
  }
  const one = detectCommunitiesLouvain(ids, cliqueEdges);
  assert(!one.ok && one.reason === "single", "single community");
  console.log("   OK");

  console.log("3) Dois clusters ligados por uma ponte → ≥2 comunidades…");
  const left = ["a1", "a2", "a3", "a4", "a5", "a6"];
  const right = ["b1", "b2", "b3", "b4", "b5", "b6"];
  const edges: Array<{ source: string; target: string }> = [];
  for (let i = 0; i < left.length; i++) {
    for (let j = i + 1; j < left.length; j++) {
      edges.push({ source: left[i]!, target: left[j]! });
    }
  }
  for (let i = 0; i < right.length; i++) {
    for (let j = i + 1; j < right.length; j++) {
      edges.push({ source: right[i]!, target: right[j]! });
    }
  }
  edges.push({ source: "a1", target: "b1" });

  const two = detectCommunitiesLouvain([...left, ...right], edges);
  assert(two.ok, "detect ok");
  if (two.ok) {
    assert(two.communityCount >= 2, `count>=2 (got ${two.communityCount})`);
    const ca = two.communityByNodeId.get("a3");
    const cb = two.communityByNodeId.get("b3");
    assert(ca !== cb, "clusters em comunidades diferentes");
  }
  console.log("   OK");

  console.log("\n✅ Detecção de comunidades OK.\n");
}

main();
