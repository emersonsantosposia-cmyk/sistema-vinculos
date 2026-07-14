-- Migration: renomeia Locais → Endereços
-- Ordem crítica: dropar CHECKs → atualizar dados → recriar CHECKs → rename tabela.
-- Dados existentes: há registros em locais e vínculos com tipo 'local'.

-- ---------------------------------------------------------------------------
-- 1. Remover constraints ANTES do UPDATE (senão 'endereco' é rejeitado)
-- ---------------------------------------------------------------------------
ALTER TABLE public.observacoes DROP CONSTRAINT IF EXISTS observacoes_entidade_tipo_check;
ALTER TABLE public.vinculos DROP CONSTRAINT IF EXISTS vinculos_entidade_origem_tipo_check;
ALTER TABLE public.vinculos DROP CONSTRAINT IF EXISTS vinculos_entidade_destino_tipo_check;

-- ---------------------------------------------------------------------------
-- 2. Migrar valores 'local' → 'endereco'
-- ---------------------------------------------------------------------------
UPDATE public.observacoes
SET entidade_tipo = 'endereco'
WHERE entidade_tipo = 'local';

UPDATE public.vinculos
SET entidade_origem_tipo = 'endereco'
WHERE entidade_origem_tipo = 'local';

UPDATE public.vinculos
SET entidade_destino_tipo = 'endereco'
WHERE entidade_destino_tipo = 'local';

DO $$
BEGIN
  IF to_regclass('public.auditoria') IS NOT NULL THEN
    UPDATE public.auditoria
    SET tabela = 'enderecos'
    WHERE tabela = 'locais';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Recriar CHECKs com 'endereco'
-- ---------------------------------------------------------------------------
ALTER TABLE public.observacoes
  ADD CONSTRAINT observacoes_entidade_tipo_check
  CHECK (
    entidade_tipo IN (
      'pessoa',
      'empresa',
      'endereco',
      'veiculo',
      'procedimento',
      'caso'
    )
  );

ALTER TABLE public.vinculos
  ADD CONSTRAINT vinculos_entidade_origem_tipo_check
  CHECK (
    entidade_origem_tipo IN (
      'pessoa',
      'empresa',
      'endereco',
      'veiculo',
      'procedimento',
      'caso'
    )
  );

ALTER TABLE public.vinculos
  ADD CONSTRAINT vinculos_entidade_destino_tipo_check
  CHECK (
    entidade_destino_tipo IN (
      'pessoa',
      'empresa',
      'endereco',
      'veiculo',
      'procedimento',
      'caso'
    )
  );

COMMENT ON COLUMN public.observacoes.entidade_tipo IS
  'Tipo da entidade alvo: pessoa, empresa, endereco, veiculo, procedimento ou caso.';

-- ---------------------------------------------------------------------------
-- 4. Renomear tabela, RLS e trigger de auditoria
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.locais RENAME TO enderecos;

COMMENT ON TABLE public.enderecos IS
  'Endereços e pontos geográficos de interesse investigativo.';
COMMENT ON COLUMN public.enderecos.id IS 'Identificador único do endereço.';
COMMENT ON COLUMN public.enderecos.nome IS
  'Nome ou apelido do endereço (ex.: sede, galpão).';

DROP POLICY IF EXISTS "locais_authenticated_all" ON public.enderecos;
CREATE POLICY "enderecos_authenticated_all"
  ON public.enderecos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_auditoria_locais ON public.enderecos;
CREATE TRIGGER trg_auditoria_enderecos
  AFTER INSERT OR UPDATE OR DELETE ON public.enderecos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auditoria_entidade();
