"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Form";
import { deletePessoa } from "@/lib/supabase/pessoas";

export function PessoaDeleteButton({ pessoaId }: { pessoaId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    const ok = window.confirm(
      "Excluir esta pessoa? Redes e fotos vinculadas também serão removidas.",
    );
    if (!ok) return;

    startTransition(async () => {
      setError(null);
      const { error: deleteError } = await deletePessoa(pessoaId);
      if (deleteError) {
        setError(deleteError);
        return;
      }
      router.push("/pessoas");
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
        {pending ? "Excluindo…" : "Excluir"}
      </Button>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
