"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Form";
import { createClient } from "@/lib/supabase/client";

type AuthUserInfo = {
  email: string | null;
  name: string | null;
};

export function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserInfo | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        setUser(null);
        return;
      }
      setUser({
        email: authUser.email ?? null,
        name:
          (authUser.user_metadata?.full_name as string | undefined) ||
          (authUser.user_metadata?.name as string | undefined) ||
          null,
      });
    }

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user;
      if (!authUser) {
        setUser(null);
        return;
      }
      setUser({
        email: authUser.email ?? null,
        name:
          (authUser.user_metadata?.full_name as string | undefined) ||
          (authUser.user_metadata?.name as string | undefined) ||
          null,
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  function handleLogout() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    });
  }

  const label = user?.name || user?.email || "Carregando…";

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="max-w-[200px] truncate text-xs font-medium text-muted-strong">
          {label}
        </p>
        {user?.name && user.email ? (
          <p className="max-w-[200px] truncate text-[11px] text-muted">
            {user.email}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        variant="secondary"
        onClick={handleLogout}
        disabled={pending || !user}
      >
        {pending ? "Saindo…" : "Sair"}
      </Button>
    </div>
  );
}
