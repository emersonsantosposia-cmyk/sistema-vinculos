#!/usr/bin/env node
/**
 * Aplica identidade institucional: substitui classes zinc/branco hardcoded.
 * Roda em src/ (tsx/ts/css).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "src");

/** Ordem importa: strings mais longas primeiro. */
const REPLACEMENTS = [
  // Botões primários (Links)
  [
    "inline-flex h-8 items-center rounded bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800",
    "btn-acao",
  ],
  [
    "inline-flex h-8 items-center rounded border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50",
    "btn-acao-secundario",
  ],
  // Filtros de tabela
  [
    "h-8 rounded border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50",
    "h-8 rounded border border-border bg-panel px-3 text-sm font-medium text-muted-strong hover:bg-panel-hover hover:text-gold-bright",
  ],
  // Classes comuns
  ["border-b border-border bg-zinc-50", "border-b border-border bg-panel-soft"],
  ["hover:bg-zinc-50", "hover:bg-panel-hover"],
  ["hover:bg-zinc-100", "hover:bg-panel-hover"],
  ["bg-zinc-50", "bg-panel-soft"],
  ["bg-zinc-100", "bg-panel-soft"],
  ["bg-zinc-200", "bg-panel-hover"],
  ["bg-white", "bg-panel"],
  ["border-zinc-300", "border-border"],
  ["border-zinc-100", "border-border"],
  ["border-zinc-700", "border-border"],
  ["text-zinc-900", "text-foreground"],
  ["text-zinc-800", "text-muted-strong"],
  ["text-zinc-700", "text-muted-strong"],
  ["text-zinc-600", "text-muted"],
  ["text-zinc-500", "text-muted"],
  ["text-zinc-400", "text-muted"],
  ["text-zinc-300", "text-muted-strong"],
  ["bg-zinc-900", "bg-gold"],
  ["bg-zinc-800", "bg-panel-hover"],
  ["bg-zinc-700", "bg-panel-hover"],
  ["hover:bg-zinc-800", "hover:bg-gold-bright"],
  // Erros claros
  [
    "border-red-300 bg-red-50 text-red-800",
    "border-danger-border bg-danger-bg text-danger-fg",
  ],
  [
    "border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800",
    "border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-fg",
  ],
  ["text-red-700", "text-danger-fg"],
  ["text-red-800", "text-danger-fg"],
  ["hover:bg-red-50", "hover:bg-danger-bg"],
  ["border-dashed border-zinc-300", "border-dashed border-border"],
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx|ts|css)$/.test(entry.name)) files.push(full);
  }
  return files;
}

let changedFiles = 0;
let totalHits = 0;

for (const file of walk(ROOT)) {
  let content = fs.readFileSync(file, "utf8");
  let hits = 0;
  for (const [from, to] of REPLACEMENTS) {
    if (!content.includes(from)) continue;
    const parts = content.split(from);
    hits += parts.length - 1;
    content = parts.join(to);
  }
  if (hits > 0) {
    fs.writeFileSync(file, content);
    changedFiles++;
    totalHits += hits;
    console.log(`${path.relative(ROOT, file)}: ${hits}`);
  }
}

console.log(`\nDone: ${changedFiles} files, ${totalHits} replacements`);
