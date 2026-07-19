"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  limparSessaoAtiva,
  marcarSessaoAtiva,
  SESSAO_IDLE_MS,
  temSessaoAtivaMarcador,
} from "@/lib/sessao";

type Props = {
  children: React.ReactNode;
};

/**
 * Segurança de sessão (apenas área autenticada / DashboardShell):
 * - Logout por inatividade (5 min)
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
  const idleTimerRef = useRef<number | null>(null);
  const loggingOutRef = useRef(false);

  const forceLogout = useCallback(
    async (motivo: "inatividade" | "aba") => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      if (idleTimerRef.current != null) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
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
    [router],
  );

  const resetIdleTimer = useCallback(() => {
    if (loggingOutRef.current) return;
    if (idleTimerRef.current != null) {
      window.clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = window.setTimeout(() => {
      void forceLogout("inatividade");
    }, SESSAO_IDLE_MS);
  }, [forceLogout]);

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

  // Parte 1 — inatividade + reset em navegação interna (pathname).
  useEffect(() => {
    if (!sessionChecked) return;

    resetIdleTimer();

    const onActivity = () => resetIdleTimer();
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
      if (idleTimerRef.current != null) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [sessionChecked, resetIdleTimer, pathname]);

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
  return <>{children}</>;
}
