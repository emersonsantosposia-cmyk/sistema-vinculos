-- Website da empresa (URL do site institucional).

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS website text;

COMMENT ON COLUMN public.empresas.website IS
  'URL do site da empresa (quando disponível).';
