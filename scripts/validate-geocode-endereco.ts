/**
 * Valida geocodificação estruturada + classificação de precisão.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/validate-geocode-endereco.ts
 */

import {
  buildStructuredGeocodeFallbacks,
  buildStructuredStreet,
  classifyGeocodePrecisao,
  geocodeViaNominatim,
  labelGeocodePrecisao,
} from "../src/lib/geocode";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log("1) street estruturado…");
  assert(
    buildStructuredStreet("Rua Bahia", "1234") === "1234 Rua Bahia",
    "street com número",
  );
  assert(
    buildStructuredStreet("Rua Bahia", "") === "Rua Bahia",
    "street sem número",
  );

  console.log("2) fallbacks estruturados (sem parâmetro q)…");
  const fb = buildStructuredGeocodeFallbacks({
    logradouro: "Avenida Afonso Pena",
    numero: "1000",
    cidade: "Campo Grande",
    estado: "MS",
    cep: "79002-070",
  });
  assert(fb.length >= 3, "deve haver vários fallbacks");
  assert(fb[0]!.street === "1000 Avenida Afonso Pena", "primeiro com número");
  assert(fb[0]!.city === "Campo Grande", "city");
  assert(fb[0]!.state === "MS", "state");
  assert(fb[0]!.postalcode === "79002-070", "postalcode");
  assert(fb[0]!.country === "Brasil", "country");

  console.log("3) classificação de precisão…");
  assert(
    classifyGeocodePrecisao({
      class: "place",
      type: "house",
      address: { house_number: "1000" },
    }) === "exata",
    "house_number → exata",
  );
  assert(
    classifyGeocodePrecisao({ class: "highway", type: "residential" }) ===
      "rua",
    "highway → rua",
  );
  assert(
    classifyGeocodePrecisao({ class: "place", type: "city" }) ===
      "bairro_cidade",
    "city → bairro_cidade",
  );
  assert(
    labelGeocodePrecisao("rua", false) ===
      "Localização aproximada (nível de rua)",
    "label rua",
  );
  assert(
    labelGeocodePrecisao("exata", true) ===
      "Localização ajustada manualmente",
    "manual sobrescreve label",
  );

  console.log("4) consulta Nominatim estruturada (endereço conhecido)…");
  // Av. Afonso Pena, Campo Grande/MS — via bem mapeada no OSM.
  const { data, error } = await geocodeViaNominatim({
    logradouro: "Avenida Afonso Pena",
    numero: "2374",
    cidade: "Campo Grande",
    estado: "MS",
    cep: "79002-073",
  });

  if (error || !data) {
    throw new Error(`geocode falhou: ${error}`);
  }

  console.log(
    `   → ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`,
  );
  console.log(`   → precisao=${data.precisao}`);
  console.log(`   → ${data.displayName}`);

  // Campo Grande fica aproximadamente em lat ~-20.4, lng ~-54.6
  assert(
    data.latitude < -19 && data.latitude > -22,
    "latitude deve estar na região de Campo Grande (não SP)",
  );
  assert(
    data.longitude < -53 && data.longitude > -56,
    "longitude deve estar na região de Campo Grande (não SP)",
  );
  assert(
    data.precisao === "exata" ||
      data.precisao === "rua" ||
      data.precisao === "bairro_cidade",
    "precisao válida",
  );

  console.log("\n✓ validate-geocode-endereco OK");
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
