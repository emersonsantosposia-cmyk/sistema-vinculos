"use client";

import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export async function requireAuthUser(): Promise<
  { user: User; error: null } | { user: null; error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return {
      user: null,
      error: "Não foi possível verificar a sessão. Faça login novamente.",
    };
  }
  if (!user) {
    return {
      user: null,
      error: "É necessário estar autenticado para esta operação.",
    };
  }
  return { user, error: null };
}
