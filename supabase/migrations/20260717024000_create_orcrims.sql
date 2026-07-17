-- Migration: entidade Orcrims (organizações criminosas)
-- Cria a tabela orcrims, amplia CHECKs de observacoes/vinculos (e quadro_nos
-- se a Fase 7 já existir), habilita RLS com regra geral (ativo) e registra
-- auditoria no mesmo padrão das demais entidades sem restrição por unidade.
--
-- Depende de:
--   20260717020000_perfis_usuario_e_unidade.sql  (auth_usuario_ativo)
--   20260717021000_rls_por_unidade_e_ativo.sql
--   20260717022000_auditoria_completa.sql        (fn_registrar_auditoria)

-- ---------------------------------------------------------------------------
-- 1. Tabela orcrims
-- ---------------------------------------------------------------------------
CREATE TABLE public.orcrims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  sigla text,
  estado_origem text CHECK (
    estado_origem IS NULL
    OR estado_origem IN (
      'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
      'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
      'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    )
  ),
  descricao text,
  usuario_cadastro uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  data_cadastro timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.orcrims IS
  'Cadastro de organizações criminosas (Orcrims) relacionadas às investigações.';
COMMENT ON COLUMN public.orcrims.id IS
  'Identificador único da organização criminosa.';
COMMENT ON COLUMN public.orcrims.nome IS
  'Nome da organização criminosa (obrigatório).';
COMMENT ON COLUMN public.orcrims.sigla IS
  'Sigla ou abreviação da organização (opcional).';
COMMENT ON COLUMN public.orcrims.estado_origem IS
  'UF de origem da organização (uma das 27 unidades federativas; opcional).';
COMMENT ON COLUMN public.orcrims.descricao IS
  'Descrição livre / texto longo sobre a organização (opcional).';
COMMENT ON COLUMN public.orcrims.usuario_cadastro IS
  'Usuário autenticado que registrou o cadastro.';
COMMENT ON COLUMN public.orcrims.data_cadastro IS
  'Data e hora em que o registro foi criado.';

CREATE INDEX orcrims_nome_idx ON public.orcrims (nome);
CREATE INDEX orcrims_estado_origem_idx ON public.orcrims (estado_origem)
  WHERE estado_origem IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Ampliar CHECKs de entidade_tipo (observacoes, vinculos e quadro_nos)
-- ---------------------------------------------------------------------------
ALTER TABLE public.observacoes DROP CONSTRAINT IF EXISTS observacoes_entidade_tipo_check;
ALTER TABLE public.vinculos DROP CONSTRAINT IF EXISTS vinculos_entidade_origem_tipo_check;
ALTER TABLE public.vinculos DROP CONSTRAINT IF EXISTS vinculos_entidade_destino_tipo_check;

ALTER TABLE public.observacoes
  ADD CONSTRAINT observacoes_entidade_tipo_check
  CHECK (
    entidade_tipo IN (
      'pessoa',
      'empresa',
      'endereco',
      'veiculo',
      'procedimento',
      'caso',
      'comunicacao',
      'orcrim'
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
      'caso',
      'comunicacao',
      'orcrim'
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
      'caso',
      'comunicacao',
      'orcrim'
    )
  );

COMMENT ON COLUMN public.observacoes.entidade_tipo IS
  'Tipo da entidade alvo: pessoa, empresa, endereco, veiculo, procedimento, caso, comunicacao ou orcrim.';
COMMENT ON COLUMN public.vinculos.entidade_origem_tipo IS
  'Tipo da entidade de origem do vínculo: pessoa, empresa, endereco, veiculo, procedimento, caso, comunicacao ou orcrim.';
COMMENT ON COLUMN public.vinculos.entidade_destino_tipo IS
  'Tipo da entidade de destino do vínculo: pessoa, empresa, endereco, veiculo, procedimento, caso, comunicacao ou orcrim.';

-- Quadro de Evidências / nós (Fase 7) — só se a tabela já existir
DO $$
DECLARE
  cname text;
BEGIN
  IF to_regclass('public.quadro_nos') IS NULL THEN
    RETURN;
  END IF;

  SELECT con.conname
  INTO cname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'quadro_nos'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%entidade_tipo%'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.quadro_nos DROP CONSTRAINT %I', cname);
  END IF;

  ALTER TABLE public.quadro_nos
    ADD CONSTRAINT quadro_nos_entidade_tipo_check
    CHECK (
      entidade_tipo IN (
        'pessoa',
        'empresa',
        'endereco',
        'veiculo',
        'procedimento',
        'caso',
        'comunicacao',
        'orcrim'
      )
    );

  COMMENT ON COLUMN public.quadro_nos.entidade_tipo IS
    'Tipo da entidade representada no nó: pessoa, empresa, endereco, veiculo, procedimento, caso, comunicacao ou orcrim.';
EXCEPTION
  WHEN undefined_column THEN
    -- Tabela existe sem coluna entidade_tipo: nada a fazer nesta migration.
    NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 3. RLS — regra geral (sem restrição por unidade)
--    Autenticado + auth_usuario_ativo() → SELECT/INSERT/UPDATE/DELETE
-- ---------------------------------------------------------------------------
ALTER TABLE public.orcrims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orcrims_ativo_all" ON public.orcrims;

CREATE POLICY "orcrims_ativo_all"
  ON public.orcrims
  FOR ALL
  TO authenticated
  USING (public.auth_usuario_ativo())
  WITH CHECK (public.auth_usuario_ativo());

-- ---------------------------------------------------------------------------
-- 4. Trigger de auditoria (Fase 5.9)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_auditoria_orcrims ON public.orcrims;

CREATE TRIGGER trg_auditoria_orcrims
  AFTER INSERT OR UPDATE OR DELETE ON public.orcrims
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_registrar_auditoria();
