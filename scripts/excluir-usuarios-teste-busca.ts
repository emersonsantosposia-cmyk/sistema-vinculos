/**
 * USO PONTUAL — NÃO rodar em produção automaticamente / CI / deploy.
 *
 * Exclui definitivamente do Auth e de perfis_usuario os dois usuários
 * efêmeros criados pelo script validate-busca-observacoes.ts
 * ("BuscaObs Analista CGIN" e "BuscaObs Analista PFCG").
 *
 * Não apaga registros de auditoria: a FK auditoria.usuario_id é
 * ON DELETE SET NULL — as linhas permanecem com usuario_id = null.
 * Demais FKs (usuario_cadastro, observacoes.usuario, etc.) também
 * são SET NULL; só perfis_usuario.id faz CASCADE (o próprio perfil).
 *
 * Uso (local, com .env.local):
 *   npx tsx --env-file=.env.local scripts/excluir-usuarios-teste-busca.ts
 *
 * Confirme digitando EXCLUIR quando o script listar os alvos.
 * Atalho (após revisar a lista em outra execução):
 *   npx tsx --env-file=.env.local scripts/excluir-usuarios-teste-busca.ts --yes
 *
 * Requisitos no .env.local (nunca commitar):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Nomes exatos gravados em perfis_usuario pelo validate-busca-observacoes. */
const NOMES_ALVO = [
  "BuscaObs Analista CGIN",
  "BuscaObs Analista PFCG",
] as const;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Variável ausente: ${name}`);
    process.exit(1);
  }
  return value;
}

type Perfil = {
  id: string;
  nome: string;
  email: string | null;
  role: string | null;
  unidade: string | null;
  ativo: boolean | null;
};

async function countAuditoria(
  admin: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await admin
    .from("auditoria")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", userId);
  if (error) throw new Error(`Contagem auditoria: ${error.message}`);
  return count ?? 0;
}

async function main() {
  const autoYes = process.argv.includes("--yes");
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Localizando perfis pelo nome exato…\n");

  const alvos: Array<Perfil & { auditoriaRows: number }> = [];

  for (const nome of NOMES_ALVO) {
    const { data, error } = await admin
      .from("perfis_usuario")
      .select("id, nome, email, role, unidade, ativo")
      .eq("nome", nome);

    if (error) throw new Error(`Busca perfil "${nome}": ${error.message}`);

    if (!data || data.length === 0) {
      console.warn(`  (não encontrado) nome="${nome}"`);
      continue;
    }
    if (data.length > 1) {
      throw new Error(
        `Ambíguo: ${data.length} perfis com nome="${nome}". Abortando.`,
      );
    }

    const perfil = data[0] as Perfil;
    const auditoriaRows = await countAuditoria(admin, perfil.id);
    alvos.push({ ...perfil, auditoriaRows });
  }

  if (alvos.length === 0) {
    console.log("Nenhum dos dois usuários foi encontrado. Nada a fazer.");
    return;
  }

  console.log("=== Alvos da exclusão definitiva ===\n");
  for (const u of alvos) {
    console.log(`  nome:      ${u.nome}`);
    console.log(`  email:     ${u.email ?? "(sem e-mail)"}`);
    console.log(`  id:        ${u.id}`);
    console.log(`  role:      ${u.role ?? "?"} / unidade: ${u.unidade ?? "?"}`);
    console.log(`  ativo:     ${u.ativo}`);
    console.log(
      `  auditoria: ${u.auditoriaRows} registro(s) serão PRESERVADOS` +
        ` (usuario_id → null via ON DELETE SET NULL)`,
    );
    console.log("");
  }

  console.log(
    "Referências em outras tabelas (usuario_cadastro / observacoes.usuario):",
  );
  console.log(
    "  também ON DELETE SET NULL — histórico de entidades permanece.",
  );
  console.log(
    "  perfis_usuario: CASCADE (o perfil some junto com o Auth user).\n",
  );

  if (!autoYes) {
    const rl = readline.createInterface({ input, output });
    const answer = (
      await rl.question(
        `Digite EXCLUIR para remover ${alvos.length} usuário(s) de vez: `,
      )
    ).trim();
    rl.close();
    if (answer !== "EXCLUIR") {
      console.log("Cancelado — nenhuma exclusão feita.");
      process.exit(0);
    }
  } else {
    console.log("--yes: confirmação automática.\n");
  }

  for (const u of alvos) {
    console.log(`Excluindo ${u.nome} (${u.id})…`);

    const { error: perfilErr } = await admin
      .from("perfis_usuario")
      .delete()
      .eq("id", u.id);
    if (perfilErr) {
      throw new Error(`Falha ao apagar perfil ${u.id}: ${perfilErr.message}`);
    }

    const { error: authErr } = await admin.auth.admin.deleteUser(u.id);
    if (authErr) {
      throw new Error(`Falha ao apagar Auth ${u.id}: ${authErr.message}`);
    }

    console.log(`  OK — Auth + perfil removidos.`);
  }

  console.log("\nConcluído.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
