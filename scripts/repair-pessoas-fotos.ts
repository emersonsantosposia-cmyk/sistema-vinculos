/**
 * Substitui fotos de pessoas com URL externa (pravatar etc.) por arquivos
 * no bucket privado fotos-pessoas, e atualiza pessoas_fotos.url_arquivo.
 *
 * Uso:
 *   npm run repair:fotos
 *
 * Requer:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildAvatarPng } from "./lib/avatar-png";

const BUCKET = "fotos-pessoas";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Variável de ambiente ausente: ${name}`);
    process.exit(1);
  }
  return value;
}

function createAdminClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function isExternalUrl(value: string | null | undefined): boolean {
  return Boolean(value && /^https?:\/\//i.test(value));
}

function storagePathFor(
  pessoaId: string,
  tipo: string,
  fotoId: string,
): string {
  if (tipo === "perfil") return `${pessoaId}/perfil.png`;
  return `${pessoaId}/galeria-${fotoId.slice(0, 8)}.png`;
}

async function main() {
  const supabase = createAdminClient();

  const { data: rows, error } = await supabase
    .from("pessoas_fotos")
    .select("id, pessoa_id, url_arquivo, tipo, pessoas(nome)")
    .order("data_upload", { ascending: true });

  if (error) throw new Error(error.message);

  const externas = (rows ?? []).filter((r) => isExternalUrl(r.url_arquivo));
  console.log(`Fotos totais: ${rows?.length ?? 0}`);
  console.log(`URLs externas a repor: ${externas.length}`);

  let ok = 0;
  let fail = 0;

  for (const row of externas) {
    const pessoaId = row.pessoa_id as string;
    const fotoId = row.id as string;
    const tipo = (row.tipo as string) || "outra";
    const pessoa = row.pessoas as { nome?: string } | { nome?: string }[] | null;
    const nome = Array.isArray(pessoa) ? pessoa[0]?.nome : pessoa?.nome;
    const path = storagePathFor(pessoaId, tipo, fotoId);
    const body = await buildAvatarPng(`${pessoaId}-${fotoId}`, nome);

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, body, {
      upsert: true,
      contentType: "image/png",
      cacheControl: "3600",
    });

    if (upErr) {
      console.error(`  FAIL upload ${fotoId}: ${upErr.message}`);
      fail += 1;
      continue;
    }

    const { error: updErr } = await supabase
      .from("pessoas_fotos")
      .update({ url_arquivo: path })
      .eq("id", fotoId);

    if (updErr) {
      console.error(`  FAIL update ${fotoId}: ${updErr.message}`);
      fail += 1;
      continue;
    }

    ok += 1;
    console.log(`  OK ${tipo} ${pessoaId.slice(0, 8)}… → ${path}`);
  }

  const { data: check } = await supabase
    .from("pessoas_fotos")
    .select("url_arquivo");
  const stillExternal = (check ?? []).filter((r) =>
    isExternalUrl(r.url_arquivo as string),
  ).length;

  console.log(`\nConcluído: ${ok} repostas, ${fail} falhas.`);
  console.log(`URLs externas restantes: ${stillExternal}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
