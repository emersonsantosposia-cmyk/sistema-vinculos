/**
 * Popula o banco com dados fictícios de teste (prefixo "[TESTE] ").
 *
 * Uso (local, NUNCA no build de produção / Vercel):
 *   npm run seed
 *   npm run seed -- usuario@email.com
 *   npm run seed -- <uuid-do-usuario>
 *
 * Equivalente:
 *   npx tsx --env-file=.env.local scripts/seed.ts
 *
 * Requisitos no .env.local (nunca commitar):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Antes de rodar: precisa existir pelo menos um usuário em Authentication
 * (Auth → Users no Supabase, ou crie via tela de login do app).
 */

import { faker } from "@faker-js/faker/locale/pt_BR";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  ENTIDADE_TIPOS,
  TEST_PREFIX,
  type EntidadeTipo,
} from "./seed-shared";

const COUNT = 20;
const VINCULOS_POR_TIPO = 10;

const PESSOA_TIPOS = [
  "ppf",
  "terceirizado",
  "preso",
  "advogado",
  "visitante",
  "outros",
] as const;

const PROCEDIMENTO_TIPOS = ["RCI", "RELINT", "DADOS", "OUTROS"] as const;

const COMUNICACAO_TIPOS = [
  "imsi",
  "imei",
  "email",
  "telefone_fixo",
  "whatsapp",
  "telegram",
  "radio",
  "outros",
] as const;

const COMUNICACAO_STATUS = ["ativo", "inativo", "desconhecido"] as const;

const TIPOS_VINCULO = [
  "associado a",
  "reside em",
  "proprietário de",
  "presente em",
  "mencionado em",
  "familiar de",
] as const;

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

const MARCAS = [
  "Volkswagen", "Fiat", "Chevrolet", "Toyota", "Honda", "Hyundai",
  "Renault", "Ford", "Jeep", "Nissan",
] as const;

const CORES = [
  "Preto", "Branco", "Prata", "Cinza", "Vermelho", "Azul", "Verde",
] as const;

const OBS_MSGS = [
  "Verificado contato recente com outro interno",
  "Endereço confirmado em diligência de rotina",
  "Informação cruzada com procedimento correlato",
  "Número de comunicação ativo nos últimos 30 dias",
  "Veículo avistado nas proximidades do local monitorado",
  "Documento anexado ao dossiê no Cronos",
  "Fonte solicita reserva quanto à identidade",
  "Atualização cadastral realizada após revisão",
];

type EntityBundle = {
  pessoa: string[];
  empresa: string[];
  endereco: string[];
  veiculo: string[];
  procedimento: string[];
  caso: string[];
  comunicacao: string[];
};

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

function fakeCpf(): string {
  const base = Array.from({ length: 9 }, () => faker.number.int({ max: 9 }));
  // evita sequências inválidas comuns (000…)
  if (base.every((d) => d === base[0])) base[0] = (base[0]! + 1) % 10;
  const [d1, d2] = calcCpfDigits(base);
  const n = [...base, d1, d2].join("");
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
}

function calcCnpjDigits(base: number[]): [number, number] {
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const sum = (weights: number[]) =>
    weights.reduce((acc, w, i) => acc + w * base[i]!, 0);
  let d1 = sum(w1) % 11;
  d1 = d1 < 2 ? 0 : 11 - d1;
  const base13 = [...base, d1];
  let d2 = sum(w2) % 11;
  d2 = d2 < 2 ? 0 : 11 - d2;
  return [d1, d2];
}

function fakeCnpj(): string {
  const base = Array.from({ length: 12 }, () => faker.number.int({ max: 9 }));
  const [d1, d2] = calcCnpjDigits(base);
  const n = [...base, d1, d2].join("");
  return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12)}`;
}

/** Placa Mercosul: ABC1D23 */
function fakePlacaMercosul(): string {
  const letters = () =>
    String.fromCharCode(65 + faker.number.int({ max: 25 }));
  const digit = () => String(faker.number.int({ max: 9 }));
  return `${letters()}${letters()}${letters()}${digit()}${letters()}${digit()}${digit()}`;
}

function brazilLatLng(): { latitude: number; longitude: number } {
  return {
    latitude: Number(faker.number.float({ min: -33.7, max: 5.2, fractionDigits: 6 })),
    longitude: Number(
      faker.number.float({ min: -73.9, max: -34.8, fractionDigits: 6 }),
    ),
  };
}

function withPrefix(value: string): string {
  return `${TEST_PREFIX}${value}`;
}

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function resolveUsuarioCadastro(
  supabase: SupabaseClient,
  arg?: string,
): Promise<{ id: string; email: string | undefined }> {
  if (arg) {
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRe.test(arg)) {
      const { data, error } = await supabase.auth.admin.getUserById(arg);
      if (error || !data.user) {
        console.error(`Usuário não encontrado para id=${arg}`);
        process.exit(1);
      }
      return { id: data.user.id, email: data.user.email };
    }

    // e-mail: percorre páginas de listUsers
    let page = 1;
    for (;;) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) {
        console.error(`Falha ao listar usuários: ${error.message}`);
        process.exit(1);
      }
      const hit = data.users.find(
        (u) => u.email?.toLowerCase() === arg.toLowerCase(),
      );
      if (hit) return { id: hit.id, email: hit.email };
      if (data.users.length < 200) break;
      page += 1;
    }
    console.error(`Usuário não encontrado para e-mail=${arg}`);
    process.exit(1);
  }

  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });
  if (error) {
    console.error(`Falha ao listar usuários: ${error.message}`);
    process.exit(1);
  }
  const user = data.users[0];
  if (!user) {
    console.error(`
Nenhum usuário encontrado em auth.users.

Crie um usuário de teste antes de rodar o seed:
  1. Supabase Dashboard → Authentication → Users → Add user
  2. Ou cadastre/faça login pelo app (tela /login)

Depois rode novamente: npm run seed
`);
    process.exit(1);
  }
  return { id: user.id, email: user.email };
}

async function insertRows<T extends { id: string }>(
  supabase: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
): Promise<T[]> {
  const { data, error } = await supabase.from(table).insert(rows).select("id");
  if (error) {
    throw new Error(`Falha ao inserir em ${table}: ${error.message}`);
  }
  return (data ?? []) as T[];
}

function comunicacaoValor(
  tipo: (typeof COMUNICACAO_TIPOS)[number],
): { valor: string; operadora: string | null } {
  switch (tipo) {
    case "email":
      return {
        valor: withPrefix(faker.internet.email().toLowerCase()),
        operadora: faker.helpers.arrayElement(["Gmail", "Outlook", "Yahoo"]),
      };
    case "telefone_fixo":
      return {
        valor: withPrefix(
          `(${faker.number.int({ min: 11, max: 99 })}) ${faker.number.int({ min: 2000, max: 5999 })}-${faker.number.int({ min: 1000, max: 9999 })}`,
        ),
        operadora: faker.helpers.arrayElement(["Oi Fixo", "Vivo Fixo", "Claro Fixo"]),
      };
    case "whatsapp":
    case "imsi":
      return {
        valor: withPrefix(
          `+55${faker.number.int({ min: 11, max: 99 })}${faker.number.int({ min: 900000000, max: 999999999 })}`,
        ),
        operadora: faker.helpers.arrayElement(["Vivo", "Claro", "Tim", "Oi"]),
      };
    case "telegram":
      return {
        valor: withPrefix(`@${faker.internet.username().toLowerCase()}`),
        operadora: "Telegram",
      };
    case "imei":
      return {
        valor: withPrefix(
          Array.from({ length: 15 }, () => faker.number.int({ max: 9 })).join(""),
        ),
        operadora: faker.helpers.arrayElement(["Vivo", "Claro", "Tim"]),
      };
    case "radio":
      return {
        valor: withPrefix(`CH-${faker.number.int({ min: 1, max: 99 })}`),
        operadora: "Rádio tática",
      };
    default:
      return {
        valor: withPrefix(faker.string.alphanumeric(10)),
        operadora: null,
      };
  }
}

async function seedPessoas(
  supabase: SupabaseClient,
  usuarioId: string,
): Promise<{ ids: string[]; redes: number; fotos: number }> {
  const rows = Array.from({ length: COUNT }, (_, i) => {
    const tipo = PESSOA_TIPOS[i % PESSOA_TIPOS.length]!;
    return {
      tipo,
      nome: withPrefix(faker.person.fullName()),
      cpf: fakeCpf(),
      data_nascimento: dateOnly(
        faker.date.birthdate({ min: 18, max: 75, mode: "age" }),
      ),
      nome_mae: faker.person.fullName({ sex: "female" }),
      nome_pai: faker.person.fullName({ sex: "male" }),
      profissao: faker.person.jobTitle(),
      usuario_cadastro: usuarioId,
    };
  });

  const inserted = await insertRows<{ id: string }>(supabase, "pessoas", rows);
  const ids = inserted.map((r) => r.id);

  let redes = 0;
  let fotos = 0;
  const redesRows: Record<string, unknown>[] = [];
  const fotosRows: Record<string, unknown>[] = [];

  for (let i = 0; i < ids.length; i++) {
    const pessoaId = ids[i]!;
    fotosRows.push({
      pessoa_id: pessoaId,
      url_arquivo: `https://i.pravatar.cc/300?u=${pessoaId}`,
      tipo: "perfil",
    });
    fotos += 1;

    if (i % 3 === 0) {
      fotosRows.push({
        pessoa_id: pessoaId,
        url_arquivo: `https://i.pravatar.cc/400?u=${pessoaId}-outra`,
        tipo: "outra",
      });
      fotos += 1;
    }

    // metade das pessoas: 1–2 redes sociais
    if (i < COUNT / 2) {
      const qtd = faker.number.int({ min: 1, max: 2 });
      for (let j = 0; j < qtd; j++) {
        const rede = faker.helpers.arrayElement([
          "Instagram",
          "Facebook",
          "X",
          "LinkedIn",
        ]);
        redesRows.push({
          pessoa_id: pessoaId,
          rede,
          link: `https://exemplo.social/${rede.toLowerCase()}/${faker.internet.username()}`,
        });
        redes += 1;
      }
    }
  }

  if (redesRows.length) {
    const { error } = await supabase.from("pessoas_redes_sociais").insert(redesRows);
    if (error) throw new Error(`pessoas_redes_sociais: ${error.message}`);
  }
  if (fotosRows.length) {
    const { error } = await supabase.from("pessoas_fotos").insert(fotosRows);
    if (error) throw new Error(`pessoas_fotos: ${error.message}`);
  }

  return { ids, redes, fotos };
}

async function seedEmpresas(
  supabase: SupabaseClient,
  usuarioId: string,
): Promise<string[]> {
  const rows = Array.from({ length: COUNT }, () => {
    const base = faker.company.name();
    return {
      nome_fantasia: withPrefix(base),
      razao_social: withPrefix(`${base} LTDA`),
      cnpj: fakeCnpj(),
      cnae_principal: `${faker.number.int({ min: 1000, max: 9699 })}-${faker.number.int({ min: 0, max: 9 })}/${faker.number.int({ min: 0, max: 99 }).toString().padStart(2, "0")}`,
      usuario_cadastro: usuarioId,
    };
  });
  return (await insertRows(supabase, "empresas", rows)).map((r) => r.id);
}

async function seedEnderecos(
  supabase: SupabaseClient,
  usuarioId: string,
): Promise<string[]> {
  const rows = Array.from({ length: COUNT }, () => {
    const { latitude, longitude } = brazilLatLng();
    return {
      nome: withPrefix(faker.helpers.arrayElement([
        "Residência",
        "Sede",
        "Galpão",
        "Escritório",
        "Ponto de encontro",
      ])),
      logradouro: faker.location.street(),
      numero: String(faker.number.int({ min: 1, max: 9999 })),
      bairro: faker.location.county(),
      complemento: faker.helpers.maybe(() => `Apto ${faker.number.int({ min: 1, max: 200 })}`, {
        probability: 0.5,
      }) ?? null,
      cidade: faker.location.city(),
      estado: faker.helpers.arrayElement([...UFS]),
      cep: faker.location.zipCode("#####-###"),
      latitude,
      longitude,
      usuario_cadastro: usuarioId,
    };
  });
  return (await insertRows(supabase, "enderecos", rows)).map((r) => r.id);
}

async function seedVeiculos(
  supabase: SupabaseClient,
  usuarioId: string,
): Promise<string[]> {
  const rows = Array.from({ length: COUNT }, () => {
    const anoFab = faker.number.int({ min: 2005, max: 2025 });
    const idSeed = faker.string.alphanumeric(8);
    return {
      placa: withPrefix(fakePlacaMercosul()),
      marca: faker.helpers.arrayElement([...MARCAS]),
      modelo: faker.vehicle.model(),
      cor: faker.helpers.arrayElement([...CORES]),
      ano_fabricacao: anoFab,
      ano_modelo: Math.min(anoFab + faker.number.int({ min: 0, max: 1 }), 2026),
      foto_url: `https://picsum.photos/seed/${idSeed}/640/480`,
      usuario_cadastro: usuarioId,
    };
  });
  return (await insertRows(supabase, "veiculos", rows)).map((r) => r.id);
}

async function seedProcedimentos(
  supabase: SupabaseClient,
  usuarioId: string,
): Promise<string[]> {
  const rows = Array.from({ length: COUNT }, (_, i) => ({
    tipo: PROCEDIMENTO_TIPOS[i % PROCEDIMENTO_TIPOS.length]!,
    nome: withPrefix(`${PROCEDIMENTO_TIPOS[i % PROCEDIMENTO_TIPOS.length]} ${faker.lorem.words(3)}`),
    resumo: faker.lorem.paragraph(),
    data: dateOnly(faker.date.past({ years: 3 })),
    link_cronos: `https://cronos.exemplo.local/proc/${faker.string.uuid()}`,
    usuario_cadastro: usuarioId,
  }));
  return (await insertRows(supabase, "procedimentos", rows)).map((r) => r.id);
}

async function seedCasos(
  supabase: SupabaseClient,
  usuarioId: string,
): Promise<string[]> {
  const rows = Array.from({ length: COUNT }, (_, i) => ({
    numero: withPrefix(
      `${faker.number.int({ min: 1000, max: 9999 })}/${faker.number.int({ min: 2020, max: 2026 })}`,
    ),
    nome: withPrefix(`Caso ${faker.lorem.words(2)} #${i + 1}`),
    data_abertura: dateOnly(faker.date.past({ years: 4 })),
    link_cronos: `https://cronos.exemplo.local/caso/${faker.string.uuid()}`,
    usuario_cadastro: usuarioId,
  }));
  return (await insertRows(supabase, "casos", rows)).map((r) => r.id);
}

async function seedComunicacoes(
  supabase: SupabaseClient,
  usuarioId: string,
): Promise<string[]> {
  const rows = Array.from({ length: COUNT }, (_, i) => {
    const tipo = COMUNICACAO_TIPOS[i % COMUNICACAO_TIPOS.length]!;
    const { valor, operadora } = comunicacaoValor(tipo);
    return {
      tipo,
      valor,
      operadora_provedor: operadora,
      status: faker.helpers.arrayElement([...COMUNICACAO_STATUS]),
      fonte: faker.helpers.arrayElement([
        "Diligência",
        "Fonte aberta",
        "Cooperação",
        "Interceptação",
      ]),
      observacao_geral: faker.lorem.sentence(),
      usuario_cadastro: usuarioId,
    };
  });
  return (await insertRows(supabase, "comunicacoes", rows)).map((r) => r.id);
}

function pickId(ids: string[]): string {
  return faker.helpers.arrayElement(ids);
}

async function seedVinculos(
  supabase: SupabaseClient,
  usuarioId: string,
  bundle: EntityBundle,
): Promise<{ total: number; porTipo: Record<EntidadeTipo, number> }> {
  const porTipo = Object.fromEntries(
    ENTIDADE_TIPOS.map((t) => [t, 0]),
  ) as Record<EntidadeTipo, number>;

  const rows: Record<string, unknown>[] = [];

  // Garante ≥10 participações por tipo: 10 vínculos com o tipo como origem.
  // Total: 7 × 10 = 70 vínculos (cada um também conta para o destino).
  for (const origemTipo of ENTIDADE_TIPOS) {
    for (let i = 0; i < VINCULOS_POR_TIPO; i++) {
      const destinoTipo = faker.helpers.arrayElement(
        ENTIDADE_TIPOS.filter((t) => t !== origemTipo),
      );
      const origemId = pickId(bundle[origemTipo]);
      const destinoId = pickId(bundle[destinoTipo]);
      rows.push({
        entidade_origem_tipo: origemTipo,
        entidade_origem_id: origemId,
        entidade_destino_tipo: destinoTipo,
        entidade_destino_id: destinoId,
        tipo_vinculo: faker.helpers.arrayElement([...TIPOS_VINCULO]),
        observacao: faker.helpers.maybe(() => faker.lorem.sentence(), {
          probability: 0.4,
        }) ?? null,
        usuario_cadastro: usuarioId,
      });
      porTipo[origemTipo] += 1;
      porTipo[destinoTipo] += 1;
    }
  }

  const { error } = await supabase.from("vinculos").insert(rows);
  if (error) throw new Error(`vinculos: ${error.message}`);

  return { total: rows.length, porTipo };
}

async function seedObservacoes(
  supabase: SupabaseClient,
  usuarioId: string,
  bundle: EntityBundle,
): Promise<number> {
  const rows: Record<string, unknown>[] = [];

  for (const tipo of ENTIDADE_TIPOS) {
    for (const entidadeId of bundle[tipo]) {
      const qtd = faker.number.int({ min: 1, max: 3 });
      for (let i = 0; i < qtd; i++) {
        rows.push({
          entidade_tipo: tipo,
          entidade_id: entidadeId,
          usuario: usuarioId,
          mensagem: withPrefix(faker.helpers.arrayElement(OBS_MSGS)),
          data_hora: faker.date.recent({ days: 90 }).toISOString(),
        });
      }
    }
  }

  // lote único (máx. 7×20×3 = 420)
  const { error } = await supabase.from("observacoes").insert(rows);
  if (error) throw new Error(`observacoes: ${error.message}`);
  return rows.length;
}

async function main() {
  const arg = process.argv.slice(2).find((a) => !a.startsWith("-"));
  const supabase = createAdminClient();
  const usuario = await resolveUsuarioCadastro(supabase, arg);

  console.log(
    `Seed com usuario_cadastro=${usuario.id}${usuario.email ? ` (${usuario.email})` : ""}`,
  );
  console.log(`Prefixo: "${TEST_PREFIX.trim()}"\n`);

  const pessoas = await seedPessoas(supabase, usuario.id);
  console.log(`pessoas: ${pessoas.ids.length} (+${pessoas.redes} redes, +${pessoas.fotos} fotos)`);

  const empresas = await seedEmpresas(supabase, usuario.id);
  console.log(`empresas: ${empresas.length}`);

  const enderecos = await seedEnderecos(supabase, usuario.id);
  console.log(`enderecos: ${enderecos.length}`);

  const veiculos = await seedVeiculos(supabase, usuario.id);
  console.log(`veiculos: ${veiculos.length}`);

  const procedimentos = await seedProcedimentos(supabase, usuario.id);
  console.log(`procedimentos: ${procedimentos.length}`);

  const casos = await seedCasos(supabase, usuario.id);
  console.log(`casos: ${casos.length}`);

  const comunicacoes = await seedComunicacoes(supabase, usuario.id);
  console.log(`comunicacoes: ${comunicacoes.length}`);

  const bundle: EntityBundle = {
    pessoa: pessoas.ids,
    empresa: empresas,
    endereco: enderecos,
    veiculo: veiculos,
    procedimento: procedimentos,
    caso: casos,
    comunicacao: comunicacoes,
  };

  const vinculos = await seedVinculos(supabase, usuario.id, bundle);
  console.log(`\nvinculos: ${vinculos.total}`);
  for (const tipo of ENTIDADE_TIPOS) {
    console.log(`  participação ${tipo}: ${vinculos.porTipo[tipo]}`);
  }

  const observacoes = await seedObservacoes(supabase, usuario.id, bundle);
  console.log(`\nobservacoes: ${observacoes}`);

  console.log(`
────────────────────────────────────────
Resumo do seed
────────────────────────────────────────
  pessoas:        ${pessoas.ids.length}
  empresas:       ${empresas.length}
  enderecos:      ${enderecos.length}
  veiculos:       ${veiculos.length}
  procedimentos:  ${procedimentos.length}
  casos:          ${casos.length}
  comunicacoes:   ${comunicacoes.length}
  redes sociais:  ${pessoas.redes}
  fotos pessoas:  ${pessoas.fotos}
  vinculos:       ${vinculos.total}
  observacoes:    ${observacoes}

Para limpar depois:
  npm run seed:cleanup -- --yes
`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
