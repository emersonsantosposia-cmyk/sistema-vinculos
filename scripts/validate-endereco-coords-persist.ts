/**
 * Testa persistência de coordenadas_ajustadas_manualmente + geocode_precisao.
 * Cria, atualiza, relê e apaga um endereço de teste.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/validate-endereco-coords-persist.ts
 */

import { createClient } from "@supabase/supabase-js";
import { geocodeViaNominatim } from "../src/lib/geocode";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Ausente: ${name}`);
  return v;
}

async function main() {
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );

  console.log("Geocodificando endereço de teste…");
  const { data: geo, error: geoErr } = await geocodeViaNominatim({
    logradouro: "Avenida Afonso Pena",
    numero: "2374",
    cidade: "Campo Grande",
    estado: "MS",
    cep: "79002-073",
  });
  if (geoErr || !geo) throw new Error(geoErr ?? "geocode falhou");

  console.log(`  precisao=${geo.precisao} @ ${geo.latitude}, ${geo.longitude}`);

  const { data: created, error: insErr } = await supabase
    .from("enderecos")
    .insert({
      nome: "[TMP] validação coords",
      logradouro: "Avenida Afonso Pena",
      numero: "2374",
      cidade: "Campo Grande",
      estado: "MS",
      cep: "79002073",
      latitude: geo.latitude,
      longitude: geo.longitude,
      coordenadas_ajustadas_manualmente: false,
      geocode_precisao: geo.precisao,
    })
    .select("*")
    .single();
  if (insErr || !created) throw new Error(insErr?.message ?? "insert falhou");
  console.log(`Criado id=${created.id}`);

  const manualLat = geo.latitude + 0.001;
  const manualLng = geo.longitude + 0.001;

  const { error: upErr } = await supabase
    .from("enderecos")
    .update({
      latitude: manualLat,
      longitude: manualLng,
      coordenadas_ajustadas_manualmente: true,
      geocode_precisao: null,
    })
    .eq("id", created.id);
  if (upErr) throw new Error(upErr.message);

  const { data: reloaded, error: getErr } = await supabase
    .from("enderecos")
    .select("*")
    .eq("id", created.id)
    .single();
  if (getErr || !reloaded) throw new Error(getErr?.message ?? "reload falhou");

  if (!reloaded.coordenadas_ajustadas_manualmente) {
    throw new Error("flag manual não persistiu");
  }
  if (Number(reloaded.latitude) !== manualLat) {
    throw new Error("latitude manual não persistiu");
  }
  if (Number(reloaded.longitude) !== manualLng) {
    throw new Error("longitude manual não persistiu");
  }
  if (reloaded.geocode_precisao != null) {
    throw new Error("geocode_precisao deveria ser null após ajuste manual");
  }
  console.log("  ajuste manual preservado após reload ✓");

  await supabase.from("enderecos").delete().eq("id", created.id);
  console.log("\n✓ validate-endereco-coords-persist OK (registro apagado)");
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
