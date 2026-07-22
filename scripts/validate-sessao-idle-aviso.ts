/**
 * Valida tempos e a lógica de relógio de parede da sessão ociosa.
 *
 * Uso:
 *   npx tsx scripts/validate-sessao-idle-aviso.ts
 */

import {
  SESSAO_AVISO_ANTES_MS,
  SESSAO_IDLE_MS,
  sessaoAvisoAposMs,
  sessaoAvisoRestanteMs,
  sessaoIdleRestanteMs,
} from "../src/lib/sessao";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FALHOU: ${msg}`);
}

function main() {
  const avisoApos = sessaoAvisoAposMs();
  console.log(
    `Tempos: IDLE=${SESSAO_IDLE_MS}ms, AVISO_ANTES=${SESSAO_AVISO_ANTES_MS}ms, aviso_apos=${avisoApos}ms`,
  );

  assert(SESSAO_IDLE_MS > SESSAO_AVISO_ANTES_MS, "idle > aviso");
  assert(avisoApos === SESSAO_IDLE_MS - SESSAO_AVISO_ANTES_MS, "aviso_apos");

  const t0 = 1_000_000;

  console.log("1) Logo após atividade → idle e aviso no futuro…");
  assert(sessaoIdleRestanteMs(t0, t0) === SESSAO_IDLE_MS, "idle cheio");
  assert(sessaoAvisoRestanteMs(t0, t0) === avisoApos, "aviso cheio");
  console.log("   OK");

  console.log("2) Aos 4m30s → aviso vencido, idle ainda com 30s…");
  const atAviso = t0 + avisoApos;
  assert(sessaoAvisoRestanteMs(t0, atAviso) === 0, "aviso restante 0");
  assert(
    sessaoIdleRestanteMs(t0, atAviso) === SESSAO_AVISO_ANTES_MS,
    "idle restante = aviso_antes",
  );
  console.log("   OK");

  console.log("3) Após 5 min → idle expirado (aba fechada conta igual)…");
  const afterIdle = t0 + SESSAO_IDLE_MS;
  assert(sessaoIdleRestanteMs(t0, afterIdle) === 0, "idle 0");
  assert(sessaoIdleRestanteMs(t0, afterIdle + 60_000) < 0, "idle negativo");
  console.log("   OK");

  console.log("4) Atividade no meio do aviso reinicia a janela…");
  const midWarning = t0 + avisoApos + 10_000;
  const resumed = midWarning; // nova lastActivity
  assert(
    sessaoIdleRestanteMs(resumed, midWarning) === SESSAO_IDLE_MS,
    "após atividade, idle cheio de novo",
  );
  assert(sessaoAvisoRestanteMs(resumed, midWarning) === avisoApos, "aviso cheio");
  console.log("   OK");

  console.log("\n✅ Ciclo de aviso de sessão (relógio de parede) OK.\n");
}

main();
