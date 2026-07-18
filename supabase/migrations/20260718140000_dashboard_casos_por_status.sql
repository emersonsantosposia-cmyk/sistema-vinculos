-- Dashboard: casos por status (em_andamento / encerrado) e unidade, com filtro de tempo.

CREATE OR REPLACE FUNCTION public.dashboard_casos_por_status(
  p_ano integer DEFAULT NULL,
  p_mes integer DEFAULT NULL
)
RETURNS TABLE (
  unidade text,
  em_andamento bigint,
  encerrado bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT
      CASE
        WHEN p_ano IS NULL THEN NULL
        WHEN p_mes IS NULL THEN make_timestamptz(p_ano, 1, 1, 0, 0, 0, 'UTC')
        ELSE make_timestamptz(p_ano, p_mes, 1, 0, 0, 0, 'UTC')
      END AS d_from,
      CASE
        WHEN p_ano IS NULL THEN NULL
        WHEN p_mes IS NULL THEN make_timestamptz(p_ano + 1, 1, 1, 0, 0, 0, 'UTC')
        WHEN p_mes = 12 THEN make_timestamptz(p_ano + 1, 1, 1, 0, 0, 0, 'UTC')
        ELSE make_timestamptz(p_ano, p_mes + 1, 1, 0, 0, 0, 'UTC')
      END AS d_to
  ),
  unidades AS (
    SELECT unnest(ARRAY[
      'CGIN', 'PFCAT', 'PFCG', 'PFMOS', 'PFPV', 'PFBRA'
    ]) AS unidade
  ),
  agreg AS (
    SELECT
      c.unidade,
      count(*) FILTER (WHERE c.status = 'em_andamento')::bigint AS em_andamento,
      count(*) FILTER (WHERE c.status = 'encerrado')::bigint AS encerrado
    FROM public.casos c, bounds b
    WHERE (b.d_from IS NULL OR c.data_cadastro >= b.d_from)
      AND (b.d_to IS NULL OR c.data_cadastro < b.d_to)
    GROUP BY c.unidade
  )
  SELECT
    u.unidade,
    coalesce(a.em_andamento, 0)::bigint AS em_andamento,
    coalesce(a.encerrado, 0)::bigint AS encerrado
  FROM unidades u
  LEFT JOIN agreg a ON a.unidade = u.unidade
  ORDER BY u.unidade;
$$;

COMMENT ON FUNCTION public.dashboard_casos_por_status(integer, integer) IS
  'Casos por status (em andamento / encerrado) e unidade, com filtro opcional de ano/mês.';

GRANT EXECUTE ON FUNCTION public.dashboard_casos_por_status(integer, integer) TO authenticated;
