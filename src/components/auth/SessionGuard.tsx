"use client";

import { usePathname, useRouter } from "next/navigation";
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

const PUBLIC_PREFIXES = ["/login", "/indisponivel"];

function isPublicPath(pathname: string | null): boolean {
  if (!pathname) return true;
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Segurança de sessão na área autenticada:
 * aviso antes do limite + logout por inatividade.
 *
 * Fica no layout raiz para NÃO remontar a cada troca de página
 * (DashboardShell remonta e isso causava logout “no clique”).
 *
 * Multi-aba é permitido. A inatividade usa relógio de parede em
 * localStorage — segundo plano / aba fechada não pausam a contagem.
 */
export function SessionGuard({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const publicRoute = isPublicPath(pathname);

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
          syncFromWallClockRef.current?.();
          return;
        }
        void forceLogout();
      }, leadMs);
    },
    [clearCountdown, forceLogout],
  );

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
        syncFromWallClockRef.current?.();
        return;
      }
      openWarning(againIdle);
    }, avisoRestante);
  }, [clearIdleTimers, forceLogout, openWarning]);

  const syncFromWallClockRef = useRef(syncFromWallClock);
  syncFromWallClockRef.current = syncFromWallClock;

  const markActivity = useCallback(
    (opts?: { forcePersist?: boolean; forceReschedule?: boolean }) => {
      if (loggingOutRef.current) return;

      const now = Date.now();
      lastActivityRef.current = now;

      const forcePersist = opts?.forcePersist === true;
      const forceReschedule =
        opts?.forceReschedule === true || warningOpenRef.current;

      // Cliques/teclas: sempre persistem (navegação entre páginas).
      // mousemove/scroll: throttle de 1s.
      if (forcePersist || now - lastPersistRef.current >= 1000) {
        lastPersistRef.current = now;
        writeLastActivityAt(now);
      }

      if (!forceReschedule && now - lastRescheduleRef.current < 1000) {
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
    markActivity({ forcePersist: true, forceReschedule: true });
  }, [markActivity]);

  useEffect(() => {
    if (publicRoute) {
      clearIdleTimers();
      warningOpenRef.current = false;
      setWarningOpen(false);
      loggingOutRef.current = false;
      return;
    }

    loggingOutRef.current = false;

    const existing = readLastActivityAt();
    const now = Date.now();
    if (existing != null && now - existing >= SESSAO_IDLE_MS) {
      void forceLogout();
      return;
    }

    lastActivityRef.current = existing ?? now;
    writeLastActivityAt(lastActivityRef.current);
    lastPersistRef.current = now;
    lastRescheduleRef.current = now;
    syncFromWallClock();

    const onSoftActivity = () => {
      markActivity();
    };
    const onHardActivity = () => {
      markActivity({ forcePersist: true, forceReschedule: true });
    };

    const opts: AddEventListenerOptions = { capture: true, passive: true };
    window.addEventListener("mousemove", onSoftActivity, opts);
    window.addEventListener("scroll", onSoftActivity, opts);
    window.addEventListener("mousedown", onHardActivity, opts);
    window.addEventListener("keydown", onHardActivity, opts);
    window.addEventListener("touchstart", onHardActivity, opts);
    window.addEventListener("click", onHardActivity, opts);

    const onVisibilityOrFocus = () => {
      if (document.visibilityState === "hidden") return;
      syncFromWallClockRef.current?.();
    };
    document.addEventListener("visibilitychange", onVisibilityOrFocus);
    window.addEventListener("focus", onVisibilityOrFocus);
    window.addEventListener("pageshow", onVisibilityOrFocus);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== SESSAO_LAST_ACTIVITY_KEY) return;
      if (event.newValue == null) {
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

    const watchdog = window.setInterval(() => {
      syncFromWallClockRef.current?.();
    }, 15_000);

    return () => {
      window.removeEventListener("mousemove", onSoftActivity, opts);
      window.removeEventListener("scroll", onSoftActivity, opts);
      window.removeEventListener("mousedown", onHardActivity, opts);
      window.removeEventListener("keydown", onHardActivity, opts);
      window.removeEventListener("touchstart", onHardActivity, opts);
      window.removeEventListener("click", onHardActivity, opts);
      document.removeEventListener("visibilitychange", onVisibilityOrFocus);
      window.removeEventListener("focus", onVisibilityOrFocus);
      window.removeEventListener("pageshow", onVisibilityOrFocus);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(watchdog);
      clearIdleTimers();
    };
  }, [publicRoute, clearIdleTimers, forceLogout, markActivity, syncFromWallClock]);

  return (
    <>
      {children}
      {!publicRoute && warningOpen ? (
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
