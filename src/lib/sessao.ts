/**
 * Tempo de inatividade máximo antes do logout automático.
 * Aviso aparece SESSAO_AVISO_ANTES_MS antes deste limite.
 */
export const SESSAO_IDLE_MS = 5 * 60 * 1000;

/** Antecedência do aviso de expiração (30s antes dos 5 min → aviso aos 4m30s). */
export const SESSAO_AVISO_ANTES_MS = 30 * 1000;

/** Momento em que o aviso é exibido, a partir da última atividade. */
export function sessaoAvisoAposMs(): number {
  return Math.max(0, SESSAO_IDLE_MS - SESSAO_AVISO_ANTES_MS);
}

export function mensagemMotivoSessao(motivo: string | null): string | null {
  if (motivo === "inatividade") {
    return "Sua sessão foi encerrada por inatividade. Faça login novamente.";
  }
  return null;
}
