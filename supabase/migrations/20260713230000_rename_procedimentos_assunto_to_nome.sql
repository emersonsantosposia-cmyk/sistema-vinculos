-- Renomeia procedimentos.assunto → nome

ALTER TABLE public.procedimentos
  RENAME COLUMN assunto TO nome;

COMMENT ON COLUMN public.procedimentos.nome IS
  'Nome ou título do procedimento.';
