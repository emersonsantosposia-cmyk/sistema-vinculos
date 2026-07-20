"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Form";
import { useIsAdmin } from "@/hooks/useIsAdmin";

type Props = {
  label?: string;
  confirmMessage: string;
  redirectTo: string;
  onDelete: () => Promise<{ error: string | null }>;
};

/**
 * Exclusão de entidade principal — só administradores veem o botão.
 * A proteção real é RLS; isto evita UX de erro de permissão.
 */
export function EntityDeleteButton({
  label = "Excluir",
  confirmMessage,
  redirectTo,
  onDelete,
}: Props) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (isAdmin !== true) {
    return null;
  }

  function handleDelete() {
    if (!window.confirm(confirmMessage)) return;
    startTransition(async () => {
      setError(null);
      const { error: deleteError } = await onDelete();
      if (deleteError) {
        setError(deleteError);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="danger"
        onClick={handleDelete}
        disabled={pending}
      >
        {pending ? "Excluindo…" : label}
      </Button>
      {error ? <p className="text-xs text-danger-fg">{error}</p> : null}
    </div>
  );
}
