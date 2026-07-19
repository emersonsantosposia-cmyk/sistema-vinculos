/** Chave em sessionStorage: sobrevive a F5, some ao fechar a aba/janela. */
export const SESSAO_ATIVA_KEY = "sessao_ativa";

/** Inatividade máxima antes do logout automático. */
export const SESSAO_IDLE_MS = 5 * 60 * 1000;

export type MotivoSessao = "inatividade" | "aba";

export function mensagemMotivoSessao(motivo: string | null): string | null {
  if (motivo === "inatividade") {
    return "Sua sessão foi encerrada por inatividade. Faça login novamente.";
  }
  if (motivo === "aba") {
    return "Sua sessão foi encerrada ao fechar o navegador. Faça login novamente.";
  }
  return null;
}

export function marcarSessaoAtiva(): void {
  try {
    sessionStorage.setItem(SESSAO_ATIVA_KEY, "true");
  } catch {
    // sessionStorage indisponível (modo restrito) — ignora.
  }
}

export function limparSessaoAtiva(): void {
  try {
    sessionStorage.removeItem(SESSAO_ATIVA_KEY);
  } catch {
    // ignore
  }
}

export function temSessaoAtivaMarcador(): boolean {
  try {
    return sessionStorage.getItem(SESSAO_ATIVA_KEY) === "true";
  } catch {
    return false;
  }
}
