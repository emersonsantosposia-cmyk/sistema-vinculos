-- Vínculos direcionais: dois rótulos (A→B e B→A) + tabela de pares sugeridos.
-- Mantém tipo_vinculo (legado) para compatibilidade até remoção futura.

-- ---------------------------------------------------------------------------
-- 1. Novos campos na tabela vinculos
-- ---------------------------------------------------------------------------
ALTER TABLE public.vinculos
  ADD COLUMN IF NOT EXISTS tipo_a_para_b text,
  ADD COLUMN IF NOT EXISTS tipo_b_para_a text;

COMMENT ON COLUMN public.vinculos.tipo_a_para_b IS
  'Rótulo do vínculo na direção origem → destino (A → B).';
COMMENT ON COLUMN public.vinculos.tipo_b_para_a IS
  'Rótulo do vínculo na direção destino → origem (B → A).';

-- Migração dos existentes: copia o rótulo único para ambos os lados.
-- Assim, ao abrir qualquer ponta, o vínculo antigo ainda exibe um tipo
-- (o usuário pode ajustar o inverso depois). Mais seguro do que deixar
-- tipo_b_para_a vazio (que geraria "Sem tipo" no lado B).
UPDATE public.vinculos
SET
  tipo_a_para_b = COALESCE(tipo_a_para_b, tipo_vinculo),
  tipo_b_para_a = COALESCE(tipo_b_para_a, tipo_vinculo)
WHERE tipo_vinculo IS NOT NULL
  AND (tipo_a_para_b IS NULL OR tipo_b_para_a IS NULL);

-- ---------------------------------------------------------------------------
-- 2. Tabela de pares sugeridos (híbrido: sugere, não limita)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tipos_vinculo_sugeridos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  termo_direto text NOT NULL,
  termo_inverso text NOT NULL,
  data_cadastro timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tipos_vinculo_sugeridos IS
  'Pares comuns de rótulos direcionais para autocomplete; o usuário pode digitar valores livres.';

CREATE UNIQUE INDEX IF NOT EXISTS tipos_vinculo_sugeridos_direto_lower_idx
  ON public.tipos_vinculo_sugeridos (lower(termo_direto));

INSERT INTO public.tipos_vinculo_sugeridos (termo_direto, termo_inverso)
SELECT v.termo_direto, v.termo_inverso
FROM (
  VALUES
    ('chefe', 'empregado'),
    ('pai', 'filho'),
    ('mãe', 'filho'),
    ('sócio', 'sócio'),
    ('cônjuge', 'cônjuge'),
    ('proprietário', 'pertence a'),
    ('credor', 'devedor'),
    ('advogado', 'cliente'),
    ('comparsa', 'comparsa'),
    ('superior', 'subordinado')
) AS v(termo_direto, termo_inverso)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.tipos_vinculo_sugeridos t
  WHERE lower(t.termo_direto) = lower(v.termo_direto)
);

-- ---------------------------------------------------------------------------
-- 3. RLS — leitura para autenticados ativos
-- ---------------------------------------------------------------------------
ALTER TABLE public.tipos_vinculo_sugeridos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tipos_vinculo_sugeridos_ativo_select"
  ON public.tipos_vinculo_sugeridos;

CREATE POLICY "tipos_vinculo_sugeridos_ativo_select"
  ON public.tipos_vinculo_sugeridos
  FOR SELECT
  TO authenticated
  USING (public.auth_usuario_ativo());
