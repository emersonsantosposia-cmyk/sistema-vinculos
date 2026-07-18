-- Renomeia tipos de procedimento: RELINT → INFO, DADOS → RDCI
-- Ordem: soltar CHECK → atualizar valores → recriar CHECK

ALTER TABLE public.procedimentos
  DROP CONSTRAINT IF EXISTS procedimentos_tipo_check;

UPDATE public.procedimentos
SET tipo = 'INFO'
WHERE tipo = 'RELINT';

UPDATE public.procedimentos
SET tipo = 'RDCI'
WHERE tipo = 'DADOS';

ALTER TABLE public.procedimentos
  ADD CONSTRAINT procedimentos_tipo_check
  CHECK (tipo IS NULL OR tipo IN ('RCI', 'INFO', 'RDCI', 'OUTROS'));

COMMENT ON TABLE public.procedimentos IS
  'Procedimentos de inteligência/investigação (RCI, INFO, RDCI e outros).';

COMMENT ON COLUMN public.procedimentos.tipo IS
  'Tipo do procedimento: RCI, INFO, RDCI ou OUTROS.';
