-- Sugestões de tipo de vínculo contextuais por par de entidades.
-- Cada linha: (origem, destino, termo_direto A→B, termo_inverso B→A, simetrico).
-- Linhas espelhadas são geradas automaticamente a partir dos pares canônicos.

-- ---------------------------------------------------------------------------
-- 1. Estrutura
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS public.tipos_vinculo_sugeridos_direto_lower_idx;

ALTER TABLE public.tipos_vinculo_sugeridos
  ADD COLUMN IF NOT EXISTS entidade_origem_tipo text,
  ADD COLUMN IF NOT EXISTS entidade_destino_tipo text,
  ADD COLUMN IF NOT EXISTS simetrico boolean NOT NULL DEFAULT false;

-- Remove seed antigo (sem contexto de entidade).
TRUNCATE public.tipos_vinculo_sugeridos;

ALTER TABLE public.tipos_vinculo_sugeridos
  ALTER COLUMN entidade_origem_tipo SET NOT NULL,
  ALTER COLUMN entidade_destino_tipo SET NOT NULL;

ALTER TABLE public.tipos_vinculo_sugeridos
  DROP CONSTRAINT IF EXISTS tipos_vinculo_sugeridos_origem_tipo_check;
ALTER TABLE public.tipos_vinculo_sugeridos
  DROP CONSTRAINT IF EXISTS tipos_vinculo_sugeridos_destino_tipo_check;

ALTER TABLE public.tipos_vinculo_sugeridos
  ADD CONSTRAINT tipos_vinculo_sugeridos_origem_tipo_check
  CHECK (
    entidade_origem_tipo = ANY (
      ARRAY[
        'pessoa'::text, 'empresa'::text, 'endereco'::text, 'veiculo'::text,
        'documento'::text, 'caso'::text, 'comunicacao'::text, 'orcrim'::text
      ]
    )
  );

ALTER TABLE public.tipos_vinculo_sugeridos
  ADD CONSTRAINT tipos_vinculo_sugeridos_destino_tipo_check
  CHECK (
    entidade_destino_tipo = ANY (
      ARRAY[
        'pessoa'::text, 'empresa'::text, 'endereco'::text, 'veiculo'::text,
        'documento'::text, 'caso'::text, 'comunicacao'::text, 'orcrim'::text
      ]
    )
  );

CREATE UNIQUE INDEX tipos_vinculo_sugeridos_par_direto_lower_idx
  ON public.tipos_vinculo_sugeridos (
    entidade_origem_tipo,
    entidade_destino_tipo,
    lower(termo_direto),
    lower(termo_inverso)
  );

CREATE INDEX tipos_vinculo_sugeridos_par_idx
  ON public.tipos_vinculo_sugeridos (
    entidade_origem_tipo,
    entidade_destino_tipo
  );

COMMENT ON TABLE public.tipos_vinculo_sugeridos IS
  'Pares de rótulos direcionais por combinação de tipos de entidade; autocomplete híbrido (não limita digitação livre).';
COMMENT ON COLUMN public.tipos_vinculo_sugeridos.simetrico IS
  'True quando termo_direto e termo_inverso descrevem a mesma relação nos dois sentidos.';

-- ---------------------------------------------------------------------------
-- 2. Seed canônico + espelhos automáticos
-- ---------------------------------------------------------------------------
WITH base (
  entidade_origem_tipo,
  entidade_destino_tipo,
  termo_direto,
  termo_inverso,
  simetrico
) AS (
  VALUES
    -- PESSOA → PESSOA
    ('pessoa', 'pessoa', 'Chefe', 'Empregado(a)', false),
    ('pessoa', 'pessoa', 'Pai ou Mãe', 'Filho(a)', false),
    ('pessoa', 'pessoa', 'Avô(ó)', 'Neto(a)', false),
    ('pessoa', 'pessoa', 'Irmão(ã)', 'Irmão(ã)', true),
    ('pessoa', 'pessoa', 'Cônjuge', 'Cônjuge', true),
    ('pessoa', 'pessoa', 'Namorado(a)', 'Namorado(a)', true),
    ('pessoa', 'pessoa', 'Sócio(a)', 'Sócio(a)', true),
    ('pessoa', 'pessoa', 'Familiar', 'Familiar', true),
    ('pessoa', 'pessoa', 'Comparsa', 'Comparsa', true),
    ('pessoa', 'pessoa', 'Advogado(a)', 'Cliente', false),
    ('pessoa', 'pessoa', 'Conhecido(a)', 'Conhecido(a)', true),

    -- PESSOA → ENDEREÇO
    ('pessoa', 'endereco', 'Reside em', 'Residência de', false),
    ('pessoa', 'endereco', 'Proprietário(a)', 'Pertence a', false),
    ('pessoa', 'endereco', 'Inquilino(a)', 'Alugado para', false),
    ('pessoa', 'endereco', 'Trabalha em', 'Local de trabalho de', false),

    -- PESSOA → VEÍCULO
    ('pessoa', 'veiculo', 'Proprietário(a)', 'Pertence a', false),
    ('pessoa', 'veiculo', 'Condutor(a)', 'Conduzido por', false),
    ('pessoa', 'veiculo', 'Locatário(a)', 'Locado para', false),
    ('pessoa', 'veiculo', 'Passageiro(a)', 'Transportou', false),

    -- PESSOA → EMPRESA
    ('pessoa', 'empresa', 'Sócio(a)', 'Pertence a', false),
    ('pessoa', 'empresa', 'Proprietário(a)', 'Pertence a', false),
    ('pessoa', 'empresa', 'Trabalha em', 'Local de trabalho de', false),
    ('pessoa', 'empresa', 'Representante', 'Representada por', false),

    -- PESSOA → COMUNICAÇÃO
    ('pessoa', 'comunicacao', 'Proprietário(a)', 'Pertence a', false),
    ('pessoa', 'comunicacao', 'Usuário(a)', 'Utilizado por', false),

    -- PESSOA → ORCRIM
    ('pessoa', 'orcrim', 'Líder', 'Liderada por', false),
    ('pessoa', 'orcrim', 'Integrante', 'Integrada por', false),
    ('pessoa', 'orcrim', 'Simpatizante', 'Conta com simpatia de', false),
    ('pessoa', 'orcrim', 'Colaborador(a)', 'Recebe colaboração de', false),

    -- PESSOA → DOCUMENTO
    ('pessoa', 'documento', 'Citado(a)', 'Contém citação de', false),

    -- PESSOA → CASO
    ('pessoa', 'caso', 'Envolvido(a)', 'Envolvido(a)', true),
    ('pessoa', 'caso', 'Investigado(a)', 'Investigado(a)', true),
    ('pessoa', 'caso', 'Vítima', 'Vítima', true),

    -- EMPRESA → ENDEREÇO
    ('empresa', 'endereco', 'Sediada em', 'Sede de', false),
    ('empresa', 'endereco', 'Filial em', 'Filial de', false),
    ('empresa', 'endereco', 'Proprietária', 'Pertence a', false),

    -- EMPRESA → VEÍCULO
    ('empresa', 'veiculo', 'Proprietária', 'Pertence a', false),

    -- EMPRESA → COMUNICAÇÃO
    ('empresa', 'comunicacao', 'Proprietária', 'Pertence a', false),

    -- EMPRESA → EMPRESA
    ('empresa', 'empresa', 'Controladora', 'Controlada por', false),
    ('empresa', 'empresa', 'Parceira', 'Parceira', true),

    -- EMPRESA → ORCRIM
    ('empresa', 'orcrim', 'Ligada a', 'Utiliza', false),
    ('empresa', 'orcrim', 'Fachada de', 'Usa como fachada', false),

    -- ORCRIM → ORCRIM
    ('orcrim', 'orcrim', 'Aliada', 'Aliada', true),
    ('orcrim', 'orcrim', 'Rival', 'Rival', true),
    ('orcrim', 'orcrim', 'Facção-mãe', 'Dissidência de', false),

    -- Qualquer entidade (exceto pessoa, já coberta) → DOCUMENTO
    ('empresa', 'documento', 'Citado(a)', 'Contém citação de', false),
    ('endereco', 'documento', 'Citado(a)', 'Contém citação de', false),
    ('veiculo', 'documento', 'Citado(a)', 'Contém citação de', false),
    ('documento', 'documento', 'Citado(a)', 'Contém citação de', false),
    ('caso', 'documento', 'Citado(a)', 'Contém citação de', false),
    ('comunicacao', 'documento', 'Citado(a)', 'Contém citação de', false),
    ('orcrim', 'documento', 'Citado(a)', 'Contém citação de', false),

    -- Qualquer entidade (exceto pessoa, já coberta) → CASO
    ('empresa', 'caso', 'Relacionado(a)', 'Contém', false),
    ('endereco', 'caso', 'Relacionado(a)', 'Contém', false),
    ('veiculo', 'caso', 'Relacionado(a)', 'Contém', false),
    ('documento', 'caso', 'Relacionado(a)', 'Contém', false),
    ('caso', 'caso', 'Relacionado(a)', 'Contém', false),
    ('comunicacao', 'caso', 'Relacionado(a)', 'Contém', false),
    ('orcrim', 'caso', 'Relacionado(a)', 'Contém', false)
),
direcoes AS (
  -- Direção canônica
  SELECT
    entidade_origem_tipo,
    entidade_destino_tipo,
    termo_direto,
    termo_inverso,
    simetrico
  FROM base
  UNION ALL
  -- Espelho: troca tipos e termos (pula quando o espelho seria idêntico)
  SELECT
    entidade_destino_tipo,
    entidade_origem_tipo,
    termo_inverso,
    termo_direto,
    simetrico
  FROM base
  WHERE NOT (
    entidade_origem_tipo = entidade_destino_tipo
    AND lower(termo_direto) = lower(termo_inverso)
  )
)
INSERT INTO public.tipos_vinculo_sugeridos (
  entidade_origem_tipo,
  entidade_destino_tipo,
  termo_direto,
  termo_inverso,
  simetrico
)
SELECT DISTINCT ON (
  entidade_origem_tipo,
  entidade_destino_tipo,
  lower(termo_direto),
  lower(termo_inverso)
)
  entidade_origem_tipo,
  entidade_destino_tipo,
  termo_direto,
  termo_inverso,
  simetrico
FROM direcoes
ORDER BY
  entidade_origem_tipo,
  entidade_destino_tipo,
  lower(termo_direto),
  lower(termo_inverso);
