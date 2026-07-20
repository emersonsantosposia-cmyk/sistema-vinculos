/**
 * Testes unitários leves de resolveLoginEmail (sem rede).
 * Uso: npx tsx scripts/validate-login-email.ts
 */

import {
  resolveLoginEmail,
} from "../src/lib/auth/login-email";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FALHOU: ${msg}`);
}

const domain = "mj.gov.br";

assert(
  resolveLoginEmail("emerson.santos", domain) === "emerson.santos@mj.gov.br",
  "abreviado → completa domínio",
);
assert(
  resolveLoginEmail("emerson.santos@mj.gov.br", domain) ===
    "emerson.santos@mj.gov.br",
  "completo → mantém",
);
assert(
  resolveLoginEmail("  emerson.santos  ", domain) ===
    "emerson.santos@mj.gov.br",
  "trim + completa",
);
assert(
  resolveLoginEmail("outro@empresa.com", domain) === "outro@empresa.com",
  "outro domínio com @ → mantém",
);

console.log("OK  resolveLoginEmail (abreviado, completo, trim, outro @)");
