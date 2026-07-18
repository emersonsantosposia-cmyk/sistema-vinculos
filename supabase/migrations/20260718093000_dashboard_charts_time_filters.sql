-- Dashboard: agregações com filtro de tempo (tudo / ano / mês).
-- p_ano e p_mes nulos = histórico completo.
-- p_ano preenchido e p_mes nulo = ano civil.
-- ambos preenchidos = mês civil do ano.

CREATE OR REPLACE FUNCTION public.dashboard_totais_entidades(
  p_ano integer DEFAULT NULL,
  p_mes integer DEFAULT NULL
)
RETURNS TABLE (
  pessoas bigint,
  empresas bigint,
  enderecos bigint,
  veiculos bigint,
  procedimentos bigint,
  casos bigint,
  comunicacoes bigint,
  orcrims bigint
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
  )
  SELECT
    (SELECT count(*)::bigint FROM public.pessoas p, bounds b
      WHERE (b.d_from IS NULL OR p.data_cadastro >= b.d_from)
        AND (b.d_to IS NULL OR p.data_cadastro < b.d_to)),
    (SELECT count(*)::bigint FROM public.empresas e, bounds b
      WHERE (b.d_from IS NULL OR e.data_cadastro >= b.d_from)
        AND (b.d_to IS NULL OR e.data_cadastro < b.d_to)),
    (SELECT count(*)::bigint FROM public.enderecos en, bounds b
      WHERE (b.d_from IS NULL OR en.data_cadastro >= b.d_from)
        AND (b.d_to IS NULL OR en.data_cadastro < b.d_to)),
    (SELECT count(*)::bigint FROM public.veiculos v, bounds b
      WHERE (b.d_from IS NULL OR v.data_cadastro >= b.d_from)
        AND (b.d_to IS NULL OR v.data_cadastro < b.d_to)),
    (SELECT count(*)::bigint FROM public.procedimentos pr, bounds b
      WHERE (b.d_from IS NULL OR pr.data_cadastro >= b.d_from)
        AND (b.d_to IS NULL OR pr.data_cadastro < b.d_to)),
    (SELECT count(*)::bigint FROM public.casos c, bounds b
      WHERE (b.d_from IS NULL OR c.data_cadastro >= b.d_from)
        AND (b.d_to IS NULL OR c.data_cadastro < b.d_to)),
    (SELECT count(*)::bigint FROM public.comunicacoes co, bounds b
      WHERE (b.d_from IS NULL OR co.data_cadastro >= b.d_from)
        AND (b.d_to IS NULL OR co.data_cadastro < b.d_to)),
    (SELECT count(*)::bigint FROM public.orcrims o, bounds b
      WHERE (b.d_from IS NULL OR o.data_cadastro >= b.d_from)
        AND (b.d_to IS NULL OR o.data_cadastro < b.d_to));
$$;

COMMENT ON FUNCTION public.dashboard_totais_entidades(integer, integer) IS
  'Totais acumulados por entidade com filtro opcional de ano/mês (RLS via SECURITY INVOKER).';

GRANT EXECUTE ON FUNCTION public.dashboard_totais_entidades(integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_proc_casos_por_unidade(
  p_ano integer DEFAULT NULL,
  p_mes integer DEFAULT NULL
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
  proc AS (
    SELECT p.unidade, count(*)::bigint AS total
    FROM public.procedimentos p, bounds b
    WHERE (b.d_from IS NULL OR p.data_cadastro >= b.d_from)
      AND (b.d_to IS NULL OR p.data_cadastro < b.d_to)
    GROUP BY p.unidade
  ),
  cas AS (
    SELECT c.unidade, count(*)::bigint AS total
    FROM public.casos c, bounds b
    WHERE (b.d_from IS NULL OR c.data_cadastro >= b.d_from)
      AND (b.d_to IS NULL OR c.data_cadastro < b.d_to)
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

COMMENT ON FUNCTION public.dashboard_proc_casos_por_unidade(integer, integer) IS
  'Procedimentos e casos por unidade com filtro opcional de ano/mês.';

GRANT EXECUTE ON FUNCTION public.dashboard_proc_casos_por_unidade(integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_proc_por_tipo_unidade(
  p_ano integer DEFAULT NULL,
  p_mes integer DEFAULT NULL
)
RETURNS TABLE (
  unidade text,
  rci bigint,
  info bigint,
  rdci bigint,
  outros bigint
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
  typed AS (
    SELECT
      p.unidade,
      CASE
        WHEN upper(coalesce(p.tipo, 'OUTROS')) IN ('RCI', 'INFO', 'RDCI', 'OUTROS')
          THEN upper(coalesce(p.tipo, 'OUTROS'))
        WHEN upper(coalesce(p.tipo, '')) = 'RELINT' THEN 'INFO'
        WHEN upper(coalesce(p.tipo, '')) = 'DADOS' THEN 'RDCI'
        ELSE 'OUTROS'
      END AS tipo_norm
    FROM public.procedimentos p, bounds b
    WHERE (b.d_from IS NULL OR p.data_cadastro >= b.d_from)
      AND (b.d_to IS NULL OR p.data_cadastro < b.d_to)
  ),
  agg AS (
    SELECT
      unidade,
      count(*) FILTER (WHERE tipo_norm = 'RCI')::bigint AS rci,
      count(*) FILTER (WHERE tipo_norm = 'INFO')::bigint AS info,
      count(*) FILTER (WHERE tipo_norm = 'RDCI')::bigint AS rdci,
      count(*) FILTER (WHERE tipo_norm = 'OUTROS')::bigint AS outros
    FROM typed
    GROUP BY unidade
  )
  SELECT
    u.unidade,
    coalesce(a.rci, 0)::bigint AS rci,
    coalesce(a.info, 0)::bigint AS info,
    coalesce(a.rdci, 0)::bigint AS rdci,
    coalesce(a.outros, 0)::bigint AS outros
  FROM unidades u
  LEFT JOIN agg a ON a.unidade = u.unidade
  ORDER BY array_position(
    ARRAY['CGIN', 'PFCAT', 'PFCG', 'PFMOS', 'PFPV', 'PFBRA'],
    u.unidade
  );
$$;

COMMENT ON FUNCTION public.dashboard_proc_por_tipo_unidade(integer, integer) IS
  'Procedimentos por tipo (RCI/INFO/RDCI/OUTROS) e unidade, com filtro opcional de ano/mês.';

GRANT EXECUTE ON FUNCTION public.dashboard_proc_por_tipo_unidade(integer, integer) TO authenticated;
