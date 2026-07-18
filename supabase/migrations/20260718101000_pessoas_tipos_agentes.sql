-- Tipos de pessoa: outros → agente_publico_outros_orgaos; inclui agente_privado
-- Ordem: soltar CHECK → atualizar valores → recriar CHECK

ALTER TABLE public.pessoas
  DROP CONSTRAINT IF EXISTS pessoas_tipo_check;

UPDATE public.pessoas
SET tipo = 'agente_publico_outros_orgaos'
WHERE tipo = 'outros';

ALTER TABLE public.pessoas
  ADD CONSTRAINT pessoas_tipo_check
  CHECK (
    tipo IN (
      'ppf',
      'terceirizado',
      'preso',
      'advogado',
      'visitante',
      'agente_publico_outros_orgaos',
      'agente_privado'
    )
  );

COMMENT ON COLUMN public.pessoas.tipo IS
  'Categoria da pessoa: ppf, terceirizado, preso, advogado, visitante, agente_publico_outros_orgaos ou agente_privado.';

COMMENT ON TABLE public.pessoas IS
  'Cadastro de pessoas envolvidas em investigações (PPF, terceirizados, presos, advogados, visitantes, agentes públicos de outros órgãos e agentes privados).';
