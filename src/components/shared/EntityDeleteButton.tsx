"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Form";

type Props = {
  label?: string;
  confirmMessage: string;
  redirectTo: string;
  onDelete: () => Promise<{ error: string | null }>;
};

export function EntityDeleteButton({
  label = "Excluir",
  confirmMessage,
  redirectTo,
  onDelete,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
