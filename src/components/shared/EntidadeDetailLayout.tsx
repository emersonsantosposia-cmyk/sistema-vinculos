"use client";

import type { ReactNode } from "react";
import { Panel } from "@/components/ui/Form";
import type { EntidadeTipo } from "@/lib/types";
import {
  PessoasVinculadasPanel,
  VinculosProvider,
  VinculosSectionBody,
} from "@/components/shared/VinculosSection";

type Props = {
  entidadeTipo: EntidadeTipo;
  entidadeId: string;
  /** Bloco de dados cadastrais (coluna esquerda). */
  dados: ReactNode;
  /** Painéis extras (mapa, galeria, diagrama, etc.) na coluna esquerda. */
  extras?: ReactNode;
  observacoes: ReactNode;
};

/**
 * Layout de detalhe de entidade:
 * - Desktop (≥1024px): esquerda = dados + extras + vínculos (sem pessoas);
 *   direita = pessoas vinculadas (grade) + observações abaixo.
 * - Mobile/tablet: empilhado; pessoas na subseção de Vínculos (formato atual).
 */
export function EntidadeDetailLayout({
  entidadeTipo,
  entidadeId,
  dados,
  extras,
  observacoes,
}: Props) {
  return (
    <VinculosProvider entidadeTipo={entidadeTipo} entidadeId={entidadeId}>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div className="space-y-4">
          {dados}
          {extras ? <div className="space-y-4">{extras}</div> : null}
          <Panel title="Vínculos">
            <VinculosSectionBody />
          </Panel>
        </div>

        <div className="space-y-4">
          <div className="hidden lg:block">
            <PessoasVinculadasPanel />
          </div>
          {observacoes}
        </div>
      </div>
    </VinculosProvider>
  );
}
