"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * null = ainda carregando; true/false = perfil resolvido.
 * Usado para ocultar ações exclusivas de administrador sem flash indevido.
 */
export function useIsAdmin(): boolean | null {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setIsAdmin(false);
        return;
      }

      const { data } = await supabase
        .from("perfis_usuario")
        .select("role, ativo")
        .eq("id", user.id)
        .maybeSingle();

      if (!cancelled) {
        setIsAdmin(data?.role === "administrador" && data?.ativo === true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return isAdmin;
}
