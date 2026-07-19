/**
 * Simula o ciclo de aviso/logout de sessão com os tempos atuais de sessao.ts.
 *
 * Uso:
 *   npx tsx scripts/validate-sessao-idle-aviso.ts
 */

import {
  SESSAO_AVISO_ANTES_MS,
  SESSAO_IDLE_MS,
  sessaoAvisoAposMs,
} from "../src/lib/sessao";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FALHOU: ${msg}`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type Phase = "idle" | "warning" | "logged_out";

async function runCycle(opts: {
  label: string;
  activityAtMs?: number;
}): Promise<Phase> {
  let phase: Phase = "idle";
  let warnTimer: ReturnType<typeof setTimeout> | null = null;
  let logoutTimer: ReturnType<typeof setTimeout> | null = null;

  const clear = () => {
    if (warnTimer) clearTimeout(warnTimer);
    if (logoutTimer) clearTimeout(logoutTimer);
    warnTimer = null;
    logoutTimer = null;
  };

  const schedule = () => {
    clear();
    phase = "idle";
    warnTimer = setTimeout(() => {
      phase = "warning";
      logoutTimer = setTimeout(() => {
        phase = "logged_out";
      }, SESSAO_AVISO_ANTES_MS);
    }, sessaoAvisoAposMs());
  };

  schedule();

  if (opts.activityAtMs != null) {
    await sleep(opts.activityAtMs);
    // Interação durante aviso (ou antes) = continuar conectado
    schedule();
    await sleep(SESSAO_AVISO_ANTES_MS + 200);
    clear();
    return phase;
  }

  await sleep(SESSAO_IDLE_MS + 200);
  clear();
  return phase;
}

async function main() {
  const avisoApos = sessaoAvisoAposMs();
  console.log(
    `Tempos: IDLE=${SESSAO_IDLE_MS}ms, AVISO_ANTES=${SESSAO_AVISO_ANTES_MS}ms, aviso_apos=${avisoApos}ms`,
  );

  assert(SESSAO_IDLE_MS > SESSAO_AVISO_ANTES_MS, "idle > aviso");
  assert(avisoApos === SESSAO_IDLE_MS - SESSAO_AVISO_ANTES_MS, "aviso_apos");

  console.log("1) Sem interação → logout após idle total…");
  const t0 = Date.now();
  const noActivity = await runCycle({ label: "no-activity" });
  const elapsed = Date.now() - t0;
  assert(noActivity === "logged_out", `esperado logged_out, obteve ${noActivity}`);
  assert(
    elapsed >= SESSAO_IDLE_MS && elapsed < SESSAO_IDLE_MS + 1500,
    `elapsed ~idle (${elapsed})`,
  );
  console.log(`   OK em ${elapsed}ms`);

  console.log("2) Interação no meio do aviso → sessão reinicia (não desloga)…");
  // Aviso abre em avisoApos; atividade 1s depois
  const withActivity = await runCycle({
    label: "activity-during-warning",
    activityAtMs: avisoApos + 1000,
  });
  assert(
    withActivity === "idle",
    `após continuar, fase deve ser idle (obtido ${withActivity})`,
  );
  console.log("   OK");

  console.log("\n✅ Ciclo de aviso de sessão OK com tempos atuais.\n");
}

main().catch((err) => {
  console.error("\n❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
