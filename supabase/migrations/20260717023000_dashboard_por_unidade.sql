-- Dashboard: totais de procedimentos e casos por unidade no período corrente
-- (mês ou ano civil). SECURITY INVOKER → RLS filtra o que cada usuário vê.

CREATE OR REPLACE FUNCTION public.contagem_proc_casos_por_unidade(
  p_agrupamento text
)
RETURNS TABLE (
  unidade text,
  procedimentos bigint,
  casos bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH params AS (
    SELECT
      CASE
        WHEN lower(coalesce(p_agrupamento, 'mes')) IN ('ano', 'year', 'y')
          THEN 'year'
        ELSE 'month'
      END AS trunc_unit
  ),
  unidades AS (
    SELECT unnest(ARRAY[
      'CGIN', 'PFCAT', 'PFCG', 'PFMOS', 'PFPV', 'PFBRA'
    ]) AS unidade
  ),
  proc AS (
    SELECT p.unidade, count(*)::bigint AS total
    FROM public.procedimentos p
    WHERE date_trunc((SELECT trunc_unit FROM params), p.data_cadastro)
      = date_trunc((SELECT trunc_unit FROM params), now())
    GROUP BY p.unidade
  ),
  cas AS (
    SELECT c.unidade, count(*)::bigint AS total
    FROM public.casos c
    WHERE date_trunc((SELECT trunc_unit FROM params), c.data_cadastro)
      = date_trunc((SELECT trunc_unit FROM params), now())
    GROUP BY c.unidade
  )
  SELECT
    u.unidade,
    coalesce(proc.total, 0)::bigint AS procedimentos,
    coalesce(cas.total, 0)::bigint AS casos
  FROM unidades u
  LEFT JOIN proc ON proc.unidade = u.unidade
  LEFT JOIN cas ON cas.unidade = u.unidade
  ORDER BY array_position(
    ARRAY['CGIN', 'PFCAT', 'PFCG', 'PFMOS', 'PFPV', 'PFBRA'],
    u.unidade
  );
$$;

COMMENT ON FUNCTION public.contagem_proc_casos_por_unidade(text) IS
  'Totais de procedimentos e casos por unidade no mês ou ano civil corrente (RLS via SECURITY INVOKER).';

GRANT EXECUTE ON FUNCTION public.contagem_proc_casos_por_unidade(text) TO authenticated;
