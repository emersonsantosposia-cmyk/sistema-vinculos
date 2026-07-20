"use client";

import { EntityDeleteButton } from "@/components/shared/EntityDeleteButton";
import { deletePessoa } from "@/lib/supabase/pessoas";

export function PessoaDeleteButton({ pessoaId }: { pessoaId: string }) {
  return (
    <EntityDeleteButton
      confirmMessage="Excluir esta pessoa? Redes e fotos vinculadas também serão removidas."
      redirectTo="/pessoas"
      onDelete={() => deletePessoa(pessoaId)}
    />
  );
}
