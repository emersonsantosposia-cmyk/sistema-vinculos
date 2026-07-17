/**
 * ============================================================================
 * USUÁRIOS DE TESTE — SOMENTE DESENVOLVIMENTO LOCAL
 * ============================================================================
 *
 * Cria 1 administrador e 6 analistas (um por unidade) para validar controle
 * de acesso por perfil/unidade.
 *
 * ⚠️  NUNCA execute em produção, staging ou pipeline de deploy.
 *     Este script usa SUPABASE_SERVICE_ROLE_KEY e senhas fixas óbvias.
 *     Não está ligado a `npm run build`, `npm start` nem a nenhum hook de CI.
 *
 * Uso manual (máquina local, com .env.local preenchido):
 *   npx tsx --env-file=.env.local scripts/seed-usuarios-teste.ts
 *
 * Variáveis obrigatórias em .env.local (nunca commitar):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Opcional: SEED_TEST_EMAIL_DOMAIN=rede-lince.test (padrão abaixo)
 *
 * Reexecução: se o e-mail já existir no Auth, a senha é redefinida e o
 * perfil em perfis_usuario é atualizado para os valores de teste.
 */

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { TEST_PREFIX } from "./seed-shared";

/** Domínio fictício — apenas para ambiente de desenvolvimento. */
const DEFAULT_EMAIL_DOMAIN = "rede-lince.test";

/** Senha temporária fixa — aceitável só em dev local. */
const TEMP_PASSWORD = "Teste@123";

const UNIDADES = [
  "CGIN",
  "PFCAT",
  "PFCG",
  "PFMOS",
  "PFPV",
  "PFBRA",
] as const;

type Unidade = (typeof UNIDADES)[number];

type TestUserSpec = {
  email: string;
  nome: string;
  matricula: string;
  cpf: string;
  role: "administrador" | "analista";
  unidade: Unidade | null;
};

type CreatedCredential = {
  email: string;
  senha: string;
  nome: string;
  role: string;
  unidade: string;
  status: "criado" | "atualizado";
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Variável de ambiente ausente: ${name}`);
    process.exit(1);
  }
  return value;
}

function assertSafeEnvironment(): void {
  if (process.env.NODE_ENV === "production") {
    console.error(
      "\n❌ ABORTADO: NODE_ENV=production. Este script é apenas para desenvolvimento local.\n",
    );
    process.exit(1);
  }

  if (process.env.VERCEL === "1" || process.env.CI === "true") {
    console.error(
      "\n❌ ABORTADO: ambiente de CI/deploy detectado (VERCEL ou CI). Rode apenas na sua máquina local.\n",
    );
    process.exit(1);
  }
}

function createAdminClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function calcCpfDigits(base: number[]): [number, number] {
  let s1 = 0;
  for (let i = 0; i < 9; i++) s1 += base[i]! * (10 - i);
  let d1 = (s1 * 10) % 11;
  if (d1 === 10) d1 = 0;
  let s2 = 0;
  for (let i = 0; i < 9; i++) s2 += base[i]! * (11 - i);
  s2 += d1 * 2;
  let d2 = (s2 * 10) % 11;
  if (d2 === 10) d2 = 0;
  return [d1, d2];
}

/** CPF fictício com dígitos verificadores válidos (11 dígitos, sem máscara). */
function fakeCpfFromIndex(index: number): string {
  const seed = String(index).padStart(9, "0").slice(-9);
  const base = seed.split("").map((c) => Number(c));
  if (base.every((d) => d === base[0])) base[0] = (base[0]! + 1) % 10;
  const [d1, d2] = calcCpfDigits(base);
  return [...base, d1, d2].join("");
}

function matriculaForIndex(index: number): string {
  return String(index).padStart(7, "0");
}

function emailDomain(): string {
  return (process.env.SEED_TEST_EMAIL_DOMAIN ?? DEFAULT_EMAIL_DOMAIN).trim();
}

function buildTestUsers(domain: string): TestUserSpec[] {
  const users: TestUserSpec[] = [
    {
      email: `admin.teste@${domain}`,
      nome: `${TEST_PREFIX}Administrador`,
      matricula: matriculaForIndex(1),
      cpf: fakeCpfFromIndex(1),
      role: "administrador",
      unidade: null,
    },
  ];

  UNIDADES.forEach((unidade, idx) => {
    const index = idx + 2;
    users.push({
      email: `analista.${unidade.toLowerCase()}@${domain}`,
      nome: `${TEST_PREFIX}Analista ${unidade}`,
      matricula: matriculaForIndex(index),
      cpf: fakeCpfFromIndex(index),
      role: "analista",
      unidade,
    });
  });

  return users;
}

async function findUserByEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<User | null> {
  const normalized = email.toLowerCase();
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) {
      throw new Error(`Falha ao listar usuários Auth: ${error.message}`);
    }
    const hit = data.users.find(
      (u) => u.email?.toLowerCase() === normalized,
    );
    if (hit) return hit;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

async function ensureTestUser(
  supabase: SupabaseClient,
  spec: TestUserSpec,
  usuarioCadastro: string | null,
): Promise<"criado" | "atualizado"> {
  const existing = await findUserByEmail(supabase, spec.email);
  let userId: string;
  let status: "criado" | "atualizado";

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: spec.nome,
        name: spec.nome,
      },
    });
    if (error) {
      throw new Error(
        `Falha ao atualizar Auth (${spec.email}): ${error.message}`,
      );
    }
    userId = existing.id;
    status = "atualizado";
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: spec.email,
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: spec.nome,
        name: spec.nome,
      },
    });
    if (error || !data.user) {
      throw new Error(
        `Falha ao criar Auth (${spec.email}): ${error?.message ?? "sem usuário"}`,
      );
    }
    userId = data.user.id;
    status = "criado";
  }

  const perfilRow = {
    id: userId,
    nome: spec.nome,
    matricula: spec.matricula,
    cpf: spec.cpf,
    email: spec.email,
    role: spec.role,
    unidade: spec.unidade,
    ativo: true,
    usuario_cadastro: usuarioCadastro,
  };

  const { data: perfilExistente, error: loadError } = await supabase
    .from("perfis_usuario")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (loadError) {
    await supabase.auth.admin.deleteUser(userId);
    throw new Error(
      `Falha ao consultar perfil (${spec.email}): ${loadError.message}`,
    );
  }

  if (perfilExistente) {
    const { error: updateError } = await supabase
      .from("perfis_usuario")
      .update({
        nome: perfilRow.nome,
        matricula: perfilRow.matricula,
        cpf: perfilRow.cpf,
        email: perfilRow.email,
        role: perfilRow.role,
        unidade: perfilRow.unidade,
        ativo: true,
      })
      .eq("id", userId);

    if (updateError) {
      throw new Error(
        `Falha ao atualizar perfil (${spec.email}): ${updateError.message}`,
      );
    }
  } else {
    const { error: insertError } = await supabase
      .from("perfis_usuario")
      .insert(perfilRow);

    if (insertError) {
      if (!existing) {
        await supabase.auth.admin.deleteUser(userId);
      }
      throw new Error(
        `Falha ao inserir perfil (${spec.email}): ${insertError.message}`,
      );
    }
  }

  return status;
}

function printCredentials(
  domain: string,
  credentials: CreatedCredential[],
): void {
  const line = "─".repeat(72);
  console.log(`\n${line}`);
  console.log("  Usuários de teste — credenciais para login manual");
  console.log(`  Domínio: ${domain}  |  Senha (todos): ${TEMP_PASSWORD}`);
  console.log(line);
  console.log(
    `${"E-mail".padEnd(36)} ${"Perfil".padEnd(16)} ${"Unidade".padEnd(8)} Status`,
  );
  console.log(line);
  for (const row of credentials) {
    console.log(
      `${row.email.padEnd(36)} ${row.role.padEnd(16)} ${row.unidade.padEnd(8)} ${row.status}`,
    );
  }
  console.log(line);
  console.log("\nDetalhes por usuário:\n");
  for (const row of credentials) {
    console.log(`  • ${row.nome}`);
    console.log(`    E-mail: ${row.email}`);
    console.log(`    Senha:  ${row.senha}`);
    console.log(`    Perfil: ${row.role}${row.unidade !== "—" ? ` · ${row.unidade}` : ""}`);
    console.log("");
  }
  console.log(
    "Acesse /login e teste cada perfil. Analistas devem ver apenas dados da própria unidade (+ CGIN conforme RLS).\n",
  );
}

async function main(): Promise<void> {
  assertSafeEnvironment();

  const domain = emailDomain();
  const specs = buildTestUsers(domain);
  const supabase = createAdminClient();
  const credentials: CreatedCredential[] = [];

  console.log(`\nCriando/atualizando ${specs.length} usuários de teste…\n`);

  let adminUserId: string | null = null;

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i]!;
    const usuarioCadastro = i === 0 ? null : adminUserId;
    const status = await ensureTestUser(supabase, spec, usuarioCadastro);

    if (i === 0) {
      const admin = await findUserByEmail(supabase, spec.email);
      adminUserId = admin?.id ?? null;
    }

    credentials.push({
      email: spec.email,
      senha: TEMP_PASSWORD,
      nome: spec.nome,
      role: spec.role,
      unidade: spec.unidade ?? "—",
      status,
    });

    console.log(
      `  ${status === "criado" ? "✓ criado" : "↻ atualizado"}  ${spec.email}`,
    );
  }

  printCredentials(domain, credentials);
}

main().catch((err) => {
  console.error("\nErro:", err instanceof Error ? err.message : err);
  process.exit(1);
});
