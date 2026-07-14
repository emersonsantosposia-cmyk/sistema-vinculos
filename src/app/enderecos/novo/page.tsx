import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { EnderecoForm } from "@/components/enderecos/EnderecoForm";

export default function NovoEnderecoPage() {
  return (
    <DashboardShell
      title="Novo endereço"
      actions={
        <Link
          href="/enderecos"
          className="inline-flex h-8 items-center rounded border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Voltar
        </Link>
      }
    >
      <EnderecoForm />
    </DashboardShell>
  );
}
