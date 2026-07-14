-- Migration: data de nascimento em pessoas
-- Idade NÃO é persistida — calcula-se a partir de data_nascimento.

ALTER TABLE public.pessoas
  ADD COLUMN IF NOT EXISTS data_nascimento date;

COMMENT ON COLUMN public.pessoas.data_nascimento IS
  'Data de nascimento (opcional). A idade deve ser calculada na leitura, nunca armazenada.';

-- Função auxiliar opcional para calcular idade no Postgres.
-- Uso: SELECT public.calcular_idade(data_nascimento) FROM pessoas;
CREATE OR REPLACE FUNCTION public.calcular_idade(data_nascimento date)
RETURNS integer
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN data_nascimento IS NULL THEN NULL
    ELSE EXTRACT(
      YEAR FROM age(CURRENT_DATE, data_nascimento)
    )::integer
  END;
$$;

COMMENT ON FUNCTION public.calcular_idade(date) IS
  'Retorna a idade em anos completos a partir da data de nascimento, ou NULL se a data for nula.';
