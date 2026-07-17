#!/usr/bin/env node
/**
 * Atualiza a versão semântica (MAJOR.MINOR.PATCH) em package.json.
 *
 * Uso:
 *   npm run version:bump
 *   npm run version:bump -- patch
 *   npm run version:bump -- minor
 *   npm run version:bump -- major
 *
 * Se o tipo não for passado na linha de comando, o script pergunta interativamente.
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const ROOT = path.resolve(__dirname, "..");
const PACKAGE_JSON = path.join(ROOT, "package.json");
const CHANGELOG = path.join(ROOT, "CHANGELOG.md");

const KINDS = ["major", "minor", "patch"];

function readPackage() {
  const raw = fs.readFileSync(PACKAGE_JSON, "utf8");
  return { raw, pkg: JSON.parse(raw) };
}

function parseSemver(version) {
  const m = String(version)
    .trim()
    .match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!m) {
    throw new Error(
      `Versão inválida em package.json: "${version}". Use MAJOR.MINOR.PATCH.`,
    );
  }
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
  };
}

function bump(version, kind) {
  const v = parseSemver(version);
  if (kind === "major") {
    return `${v.major + 1}.0.0`;
  }
  if (kind === "minor") {
    return `${v.major}.${v.minor + 1}.0`;
  }
  return `${v.major}.${v.minor}.${v.patch + 1}`;
}

function askKind() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log("");
    console.log("Tipo de mudança (semver):");
    console.log("  1) major  — quebra de compatibilidade / mudança grande");
    console.log("  2) minor  — nova funcionalidade compatível");
    console.log("  3) patch  — correção / ajuste pequeno");
    console.log("");
    rl.question("Escolha (major/minor/patch ou 1/2/3): ", (answer) => {
      rl.close();
      const normalized = String(answer || "")
        .trim()
        .toLowerCase();
      if (normalized === "1" || normalized === "major") return resolve("major");
      if (normalized === "2" || normalized === "minor") return resolve("minor");
      if (normalized === "3" || normalized === "patch") return resolve("patch");
      console.error(`Opção inválida: "${answer}". Use major, minor ou patch.`);
      process.exit(1);
    });
  });
}

async function main() {
  const arg = process.argv[2]?.trim().toLowerCase();
  let kind = KINDS.includes(arg) ? arg : null;
  if (!kind) {
    kind = await askKind();
  }

  const { pkg } = readPackage();
  const previous = pkg.version;
  const next = bump(previous, kind);

  pkg.version = next;
  fs.writeFileSync(PACKAGE_JSON, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

  const today = new Date().toISOString().slice(0, 10);
  const changelogExists = fs.existsSync(CHANGELOG);

  console.log("");
  console.log(`Versão atualizada: ${previous} → ${next} (${kind})`);
  console.log(`Arquivo: ${path.relative(ROOT, PACKAGE_JSON)}`);
  console.log("");
  console.log("────────────────────────────────────────────────────────");
  console.log("LEMBRETE — atualize o CHANGELOG.md ANTES do commit:");
  console.log("");
  if (changelogExists) {
    console.log(`  1. Abra ${path.relative(ROOT, CHANGELOG)}`);
  } else {
    console.log("  1. Crie CHANGELOG.md na raiz (formato Keep a Changelog)");
  }
  console.log(`  2. Adicione a seção ## [${next}] - ${today}`);
  console.log('  3. Preencha "Adicionado" / "Alterado" / "Corrigido"');
  console.log("  4. Commit: package.json + CHANGELOG.md");
  console.log(`  5. Tag:    git tag v${next} && git push && git push --tags`);
  console.log("────────────────────────────────────────────────────────");
  console.log("");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
