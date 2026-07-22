"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Form";
import { ModalShell } from "@/components/ui/ModalShell";
import { createClient } from "@/lib/supabase/client";
import {
  SESSAO_AVISO_ANTES_MS,
  SESSAO_IDLE_MS,
  SESSAO_LAST_ACTIVITY_KEY,
  clearLastActivityAt,
  readLastActivityAt,
  sessaoAvisoRestanteMs,
  sessaoIdleRestanteMs,
  writeLastActivityAt,
} from "@/lib/sessao";

type Props = {
  children: React.ReactNode;
};

/**
 * Segurança de sessão (área autenticada / DashboardShell):
 * aviso aos 4m30s + logout por inatividade aos 5 min.
 *
 * Multi-aba é permitido (cookies compartilhados). A inatividade é medida
 * por relógio de parede em localStorage — fecha a aba ou deixa em segundo
 * plano não pausa a contagem; ao voltar (ou reabrir), a sessão é
 * reavaliada e encerrada se o prazo já passou.
 */
export function SessionGuard({ children }: Props) {
  const router = useRouter();
  const [warningOpen, setWarningOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(
    Math.ceil(SESSAO_AVISO_ANTES_MS / 1000),
  );

  const warnTimerRef = useRef<number | null>(null);
  const logoutTimerRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const loggingOutRef = useRef(false);
  const warningOpenRef = useRef(false);
  const lastActivityRef = useRef<number>(Date.now());
  const lastPersistRef = useRef<number>(0);
  const lastRescheduleRef = useRef<number>(0);

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
    warningOpenRef.current = false;
    setWarningOpen(false);
    clearLastActivityAt();
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Prossegue para o login mesmo se o signOut falhar.
    }
    router.replace("/login?motivo=inatividade");
    router.refresh();
  }, [clearIdleTimers, router]);

  const openWarning = useCallback(
    (idleRestanteMs: number) => {
      if (loggingOutRef.current) return;

      const leadMs = Math.max(
        0,
        Math.min(SESSAO_AVISO_ANTES_MS, idleRestanteMs),
      );
      if (leadMs <= 0) {
        void forceLogout();
        return;
      }

      const deadline = Date.now() + leadMs;
      warningOpenRef.current = true;
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
        const restante = sessaoIdleRestanteMs(lastActivityRef.current);
        if (restante > 0) {
          // Atividade recente (esta ou outra aba) — não desloga.
          syncFromWallClockRef.current?.();
          return;
        }
        void forceLogout();
      }, leadMs);
    },
    [clearCountdown, forceLogout],
  );

  /**
   * Alinha timers ao timestamp de última atividade (relógio de parede).
   * Seguro chamar após foco, visibilitychange, storage ou timers atrasados.
   */
  const syncFromWallClock = useCallback(() => {
    if (loggingOutRef.current) return;

    const stored = readLastActivityAt();
    if (stored != null && stored > lastActivityRef.current) {
      lastActivityRef.current = stored;
    }

    const last = lastActivityRef.current;
    const idleRestante = sessaoIdleRestanteMs(last);
    if (idleRestante <= 0) {
      void forceLogout();
      return;
    }

    const avisoRestante = sessaoAvisoRestanteMs(last);

    // Já no modal de aviso: não reinicia o countdown (watchdog/foco).
    if (avisoRestante <= 0 && warningOpenRef.current) {
      return;
    }

    clearIdleTimers();

    if (avisoRestante <= 0) {
      openWarning(idleRestante);
      return;
    }

    warningOpenRef.current = false;
    setWarningOpen(false);

    warnTimerRef.current = window.setTimeout(() => {
      const againIdle = sessaoIdleRestanteMs(lastActivityRef.current);
      if (againIdle <= 0) {
        void forceLogout();
        return;
      }
      const againAviso = sessaoAvisoRestanteMs(lastActivityRef.current);
      if (againAviso > 0) {
        // Timer atrasado (aba em background) mas ainda não é hora do aviso.
        syncFromWallClockRef.current?.();
        return;
      }
      openWarning(againIdle);
    }, avisoRestante);
  }, [clearIdleTimers, forceLogout, openWarning]);

  const syncFromWallClockRef = useRef(syncFromWallClock);
  syncFromWallClockRef.current = syncFromWallClock;

  const markActivity = useCallback(
    (opts?: { forceReschedule?: boolean }) => {
      if (loggingOutRef.current) return;

      const now = Date.now();
      lastActivityRef.current = now;

      // Persiste com throttle (storage é compartilhado entre abas).
      if (now - lastPersistRef.current >= 1000) {
        lastPersistRef.current = now;
        writeLastActivityAt(now);
      }

      const force = opts?.forceReschedule || warningOpenRef.current;
      if (!force && now - lastRescheduleRef.current < 1000) {
        return;
      }
      lastRescheduleRef.current = now;
      writeLastActivityAt(now);
      lastPersistRef.current = now;
      syncFromWallClock();
    },
    [syncFromWallClock],
  );

  const continueSession = useCallback(() => {
    markActivity({ forceReschedule: true });
  }, [markActivity]);

  useEffect(() => {
    const existing = readLastActivityAt();
    const now = Date.now();
    if (existing != null && now - existing >= SESSAO_IDLE_MS) {
      // Aba ficou fechada/ociosa além do limite — encerra na reabertura.
      void forceLogout();
      return;
    }

    lastActivityRef.current = existing ?? now;
    writeLastActivityAt(lastActivityRef.current);
    lastPersistRef.current = now;
    lastRescheduleRef.current = now;
    syncFromWallClock();

    const onActivity = () => {
      markActivity();
    };
    const opts: AddEventListenerOptions = { capture: true, passive: true };
    window.addEventListener("mousemove", onActivity, opts);
    window.addEventListener("mousedown", onActivity, opts);
    window.addEventListener("keydown", onActivity, opts);
    window.addEventListener("scroll", onActivity, opts);
    window.addEventListener("touchstart", onActivity, opts);
    window.addEventListener("click", onActivity, opts);

    const onVisibilityOrFocus = () => {
      if (document.visibilityState === "hidden") return;
      // Reavalia com o relógio real (aba fechada/segundo plano não pausa).
      syncFromWallClockRef.current?.();
    };
    document.addEventListener("visibilitychange", onVisibilityOrFocus);
    window.addEventListener("focus", onVisibilityOrFocus);
    window.addEventListener("pageshow", onVisibilityOrFocus);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== SESSAO_LAST_ACTIVITY_KEY) return;
      if (event.newValue == null) {
        // Outra aba encerrou a sessão.
        void forceLogout();
        return;
      }
      const ts = Number(event.newValue);
      if (!Number.isFinite(ts)) return;
      if (ts > lastActivityRef.current) {
        lastActivityRef.current = ts;
        syncFromWallClockRef.current?.();
      }
    };
    window.addEventListener("storage", onStorage);

    // Rede de segurança: a cada 15s confere o relógio (timers throttled).
    const watchdog = window.setInterval(() => {
      syncFromWallClockRef.current?.();
    }, 15_000);

    return () => {
      window.removeEventListener("mousemove", onActivity, opts);
      window.removeEventListener("mousedown", onActivity, opts);
      window.removeEventListener("keydown", onActivity, opts);
      window.removeEventListener("scroll", onActivity, opts);
      window.removeEventListener("touchstart", onActivity, opts);
      window.removeEventListener("click", onActivity, opts);
      document.removeEventListener("visibilitychange", onVisibilityOrFocus);
      window.removeEventListener("focus", onVisibilityOrFocus);
      window.removeEventListener("pageshow", onVisibilityOrFocus);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(watchdog);
      clearIdleTimers();
    };
    // Montagem única: pathname não deve reiniciar o ciclo (causava ruído).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only session lifecycle
  }, []);

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
