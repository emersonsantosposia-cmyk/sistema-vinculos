/**
 * Tempo de inatividade máximo antes do logout automático.
 * Aviso aparece SESSAO_AVISO_ANTES_MS antes deste limite.
 *
 * A contagem usa relógio de parede (timestamp em localStorage), para que
 * abas em segundo plano ou fechadas não “pausem” o prazo.
 */
export const SESSAO_IDLE_MS = 15 * 60 * 1000;

/** Antecedência do aviso de expiração (60s antes do limite). */
export const SESSAO_AVISO_ANTES_MS = 60 * 1000;

/** Chave compartilhada entre abas (última interação do usuário). */
export const SESSAO_LAST_ACTIVITY_KEY = "rede-lince:sessao:last-activity";

/** Momento em que o aviso é exibido, a partir da última atividade. */
export function sessaoAvisoAposMs(): number {
  return Math.max(0, SESSAO_IDLE_MS - SESSAO_AVISO_ANTES_MS);
}

/** Ms restantes até o logout; ≤0 = já expirou. */
export function sessaoIdleRestanteMs(
  lastActivityAt: number,
  now = Date.now(),
): number {
  return SESSAO_IDLE_MS - (now - lastActivityAt);
}

/** Ms restantes até abrir o aviso; ≤0 = já deveria estar em aviso (ou logout). */
export function sessaoAvisoRestanteMs(
  lastActivityAt: number,
  now = Date.now(),
): number {
  return sessaoAvisoAposMs() - (now - lastActivityAt);
}

export function readLastActivityAt(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSAO_LAST_ACTIVITY_KEY);
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function writeLastActivityAt(ts = Date.now()): number {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(SESSAO_LAST_ACTIVITY_KEY, String(ts));
    } catch {
      // private mode / quota — segue só com memória
    }
  }
  return ts;
}

export function clearLastActivityAt(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSAO_LAST_ACTIVITY_KEY);
  } catch {
    // ignore
  }
}

export function mensagemMotivoSessao(motivo: string | null): string | null {
  if (motivo === "inatividade") {
    return "Sua sessão foi encerrada por inatividade. Faça login novamente.";
  }
  return null;
}
