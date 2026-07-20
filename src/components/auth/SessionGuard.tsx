"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Form";
import { ModalShell } from "@/components/ui/ModalShell";
import { createClient } from "@/lib/supabase/client";
import {
  SESSAO_AVISO_ANTES_MS,
  sessaoAvisoAposMs,
} from "@/lib/sessao";

type Props = {
  children: React.ReactNode;
};

/**
 * Segurança de sessão (área autenticada / DashboardShell):
 * aviso aos 4m30s + logout por inatividade aos 5 min.
 *
 * Multi-aba é permitido: a sessão Supabase (cookies) é compartilhada
 * entre abas; não há mais logout ao abrir/fechar abas.
 */
export function SessionGuard({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
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

  const forceLogout = useCallback(async () => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    clearIdleTimers();
    setWarningOpen(false);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Prossegue para o login mesmo se o signOut falhar.
    }
    router.replace("/login?motivo=inatividade");
    router.refresh();
  }, [clearIdleTimers, router]);

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
      void forceLogout();
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

  useEffect(() => {
    scheduleIdleCycle();

    const onActivity = () => {
      if (loggingOutRef.current) return;
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
  }, [scheduleIdleCycle, continueSession, clearIdleTimers, pathname]);

  return (
    <>
      {children}
      {warningOpen ? (
        <ModalShell
          title="Sua sessão vai expirar"
          onClose={continueSession}
          size="sm"
          zClass="z-[1200]"
          closeOnBackdrop={false}
          describedBy="sessao-aviso-desc"
          footer={
            <Button type="button" onClick={continueSession}>
              Continuar conectado
            </Button>
          }
        >
          <p
            id="sessao-aviso-desc"
            className="text-sm leading-relaxed text-muted"
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
          <p className="mt-3 text-[11px] text-muted">
            Qualquer movimento do mouse, tecla ou toque também mantém a
            sessão.
          </p>
        </ModalShell>
      ) : null}
    </>
  );
}
