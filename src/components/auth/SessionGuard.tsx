"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Form";
import { createClient } from "@/lib/supabase/client";
import {
  limparSessaoAtiva,
  marcarSessaoAtiva,
  SESSAO_AVISO_ANTES_MS,
  sessaoAvisoAposMs,
  temSessaoAtivaMarcador,
} from "@/lib/sessao";

type Props = {
  children: React.ReactNode;
};

/**
 * Segurança de sessão (apenas área autenticada / DashboardShell):
 * - Aviso aos 4m30s + logout por inatividade aos 5 min
 * - Forçar novo login após fechar aba (marcador sessionStorage)
 *
 * Importante: NÃO ler sessionStorage/window na renderização inicial —
 * isso causaria hydration mismatch. Toda verificação roda em useEffect.
 */
export function SessionGuard({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  /** Só fica true após o bootstrap no cliente (pós-hidratação). */
  const [sessionChecked, setSessionChecked] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(
    Math.ceil(SESSAO_AVISO_ANTES_MS / 1000),
  );

  const warnTimerRef = useRef<number | null>(null);
  const logoutTimerRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const loggingOutRef = useRef(false);

  const clearCountdown = useCallback(() => {
    if (countdownIntervalRef.current != null) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const clearIdleTimers = useCallback(() => {
    if (warnTimerRef.current != null) {
      window.clearTimeout(warnTimerRef.current);
      warnTimerRef.current = null;
    }
    if (logoutTimerRef.current != null) {
      window.clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    clearCountdown();
  }, [clearCountdown]);

  const forceLogout = useCallback(
    async (motivo: "inatividade" | "aba") => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      clearIdleTimers();
      setWarningOpen(false);
      limparSessaoAtiva();
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // Prossegue para o login mesmo se o signOut falhar.
      }
      router.replace(`/login?motivo=${motivo}`);
      router.refresh();
    },
    [clearIdleTimers, router],
  );

  const openWarning = useCallback(() => {
    if (loggingOutRef.current) return;

    const leadMs = SESSAO_AVISO_ANTES_MS;
    const deadline = Date.now() + leadMs;
    setSecondsLeft(Math.max(1, Math.ceil(leadMs / 1000)));
    setWarningOpen(true);

    clearCountdown();
    countdownIntervalRef.current = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(left);
    }, 250);

    if (logoutTimerRef.current != null) {
      window.clearTimeout(logoutTimerRef.current);
    }
    logoutTimerRef.current = window.setTimeout(() => {
      void forceLogout("inatividade");
    }, leadMs);
  }, [clearCountdown, forceLogout]);

  const scheduleIdleCycle = useCallback(() => {
    if (loggingOutRef.current) return;
    clearIdleTimers();
    setWarningOpen(false);

    warnTimerRef.current = window.setTimeout(() => {
      openWarning();
    }, sessaoAvisoAposMs());
  }, [clearIdleTimers, openWarning]);

  const continueSession = useCallback(() => {
    if (loggingOutRef.current) return;
    scheduleIdleCycle();
  }, [scheduleIdleCycle]);

  // Parte 2.2 — só no navegador, depois da hidratação.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (temSessaoAtivaMarcador()) {
        marcarSessaoAtiva();
        if (!cancelled) setSessionChecked(true);
        return;
      }

      // Sem marcador: nova aba após fechar a anterior.
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (user) {
        await forceLogout("aba");
        return;
      }

      marcarSessaoAtiva();
      setSessionChecked(true);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [forceLogout]);

  // Parte 1 — inatividade + aviso + reset em navegação interna (pathname).
  useEffect(() => {
    if (!sessionChecked) return;

    scheduleIdleCycle();

    const onActivity = () => {
      if (loggingOutRef.current) return;
      // Qualquer interação (inclusive com o aviso aberto) reinicia a sessão.
      continueSession();
    };
    const opts: AddEventListenerOptions = { capture: true, passive: true };
    window.addEventListener("mousemove", onActivity, opts);
    window.addEventListener("mousedown", onActivity, opts);
    window.addEventListener("keydown", onActivity, opts);
    window.addEventListener("scroll", onActivity, opts);
    window.addEventListener("touchstart", onActivity, opts);
    window.addEventListener("click", onActivity, opts);

    return () => {
      window.removeEventListener("mousemove", onActivity, opts);
      window.removeEventListener("mousedown", onActivity, opts);
      window.removeEventListener("keydown", onActivity, opts);
      window.removeEventListener("scroll", onActivity, opts);
      window.removeEventListener("touchstart", onActivity, opts);
      window.removeEventListener("click", onActivity, opts);
      clearIdleTimers();
    };
  }, [sessionChecked, scheduleIdleCycle, continueSession, clearIdleTimers, pathname]);

  // Parte 2.3 — reforço best-effort no fechamento da aba.
  useEffect(() => {
    if (!sessionChecked) return;

    function onPageHide(event: PageTransitionEvent) {
      // Best-effort. O mecanismo CONFIÁVEL é a Parte 2.2 (sessionStorage).
      // NÃO chamamos signOut aqui: pagehide também dispara em F5.
      if (event.persisted) return;
      try {
        if (typeof navigator.sendBeacon === "function") {
          navigator.sendBeacon("/api/auth/sessao-abandono");
        }
      } catch {
        // ignore
      }
    }

    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [sessionChecked]);

  // Servidor e 1ª renderização do cliente: sempre os mesmos children
  // (sem ler sessionStorage). Logout/redirect só após useEffect.
  return (
    <>
      {children}
      {warningOpen ? (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-[color:var(--cor-fundo-overlay)] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sessao-aviso-titulo"
          aria-describedby="sessao-aviso-desc"
        >
          <div className="w-full max-w-sm rounded-md border border-border bg-panel p-4 shadow-[var(--cor-sombra-modal)]">
            <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">
              Sessão
            </p>
            <h2
              id="sessao-aviso-titulo"
              className="mt-2 text-base font-semibold text-foreground"
            >
              Sua sessão vai expirar
            </h2>
            <p
              id="sessao-aviso-desc"
              className="mt-2 text-sm leading-relaxed text-muted"
            >
              Sua sessão vai expirar em{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {secondsLeft}s
              </span>{" "}
              por inatividade. Deseja continuar conectado?
            </p>
            <p
              className="mt-3 text-center text-3xl font-semibold tracking-tight text-gold tabular-nums"
              aria-live="polite"
              aria-atomic="true"
            >
              {secondsLeft}
            </p>
            <p className="mt-1 text-center text-[11px] text-muted uppercase tracking-wide">
              segundos restantes
            </p>
            <div className="mt-4 flex justify-end">
              <Button type="button" onClick={continueSession}>
                Continuar conectado
              </Button>
            </div>
            <p className="mt-3 text-[11px] text-muted">
              Qualquer movimento do mouse, tecla ou toque também mantém a
              sessão.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
