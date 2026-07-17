"use client";

import { EntityDeleteButton } from "@/components/shared/EntityDeleteButton";
import { deleteComunicacao } from "@/lib/supabase/comunicacoes";
import { deleteEmpresa } from "@/lib/supabase/empresas";
import { deleteEndereco } from "@/lib/supabase/enderecos";
import { deleteOrcrim } from "@/lib/supabase/orcrims";
import { deleteVeiculo } from "@/lib/supabase/veiculos";
import { deleteProcedimento } from "@/lib/supabase/procedimentos";
import { deleteCaso } from "@/lib/supabase/casos";

export function EmpresaDeleteButton({ id }: { id: string }) {
  return (
    <EntityDeleteButton
      confirmMessage="Excluir esta empresa?"
      redirectTo="/empresas"
      onDelete={() => deleteEmpresa(id)}
    />
  );
}

export function EnderecoDeleteButton({ id }: { id: string }) {
  return (
    <EntityDeleteButton
      confirmMessage="Excluir este endereço?"
      redirectTo="/enderecos"
      onDelete={() => deleteEndereco(id)}
    />
  );
}

export function VeiculoDeleteButton({ id }: { id: string }) {
  return (
    <EntityDeleteButton
      confirmMessage="Excluir este veículo?"
      redirectTo="/veiculos"
      onDelete={() => deleteVeiculo(id)}
    />
  );
}

export function ProcedimentoDeleteButton({ id }: { id: string }) {
  return (
    <EntityDeleteButton
      confirmMessage="Excluir este procedimento?"
      redirectTo="/procedimentos"
      onDelete={() => deleteProcedimento(id)}
    />
  );
}

export function CasoDeleteButton({ id }: { id: string }) {
  return (
    <EntityDeleteButton
      confirmMessage="Excluir este caso?"
      redirectTo="/casos"
      onDelete={() => deleteCaso(id)}
    />
  );
}

export function ComunicacaoDeleteButton({ id }: { id: string }) {
  return (
    <EntityDeleteButton
      confirmMessage="Excluir esta comunicação?"
      redirectTo="/comunicacoes"
      onDelete={() => deleteComunicacao(id)}
    />
  );
}

export function OrcrimDeleteButton({ id }: { id: string }) {
  return (
    <EntityDeleteButton
      confirmMessage="Excluir esta orcrim?"
      redirectTo="/orcrims"
      onDelete={() => deleteOrcrim(id)}
    />
  );
}
