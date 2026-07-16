-- Dashboard: agregação de cadastros por período (mês ou ano)
-- Evita trazer todos os registros para o app.

CREATE OR REPLACE FUNCTION public.contagem_por_periodo(p_agrupamento text)
RETURNS TABLE (
  periodo text,
  pessoas bigint,
  empresas bigint,
  enderecos bigint,
  veiculos bigint,
  procedimentos bigint,
  casos bigint,
  comunicacoes bigint
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
      END AS trunc_unit,
      CASE
        WHEN lower(coalesce(p_agrupamento, 'mes')) IN ('ano', 'year', 'y')
          THEN 'YYYY'
        ELSE 'YYYY-MM'
      END AS periodo_fmt
  ),
  labeled AS (
    SELECT
      to_char(
        date_trunc((SELECT trunc_unit FROM params), data_cadastro),
        (SELECT periodo_fmt FROM params)
      ) AS periodo,
      'pessoas'::text AS entidade
    FROM public.pessoas
    UNION ALL
    SELECT
      to_char(
        date_trunc((SELECT trunc_unit FROM params), data_cadastro),
        (SELECT periodo_fmt FROM params)
      ),
      'empresas'
    FROM public.empresas
    UNION ALL
    SELECT
      to_char(
        date_trunc((SELECT trunc_unit FROM params), data_cadastro),
        (SELECT periodo_fmt FROM params)
      ),
      'enderecos'
    FROM public.enderecos
    UNION ALL
    SELECT
      to_char(
        date_trunc((SELECT trunc_unit FROM params), data_cadastro),
        (SELECT periodo_fmt FROM params)
      ),
      'veiculos'
    FROM public.veiculos
    UNION ALL
    SELECT
      to_char(
        date_trunc((SELECT trunc_unit FROM params), data_cadastro),
        (SELECT periodo_fmt FROM params)
      ),
      'procedimentos'
    FROM public.procedimentos
    UNION ALL
    SELECT
      to_char(
        date_trunc((SELECT trunc_unit FROM params), data_cadastro),
        (SELECT periodo_fmt FROM params)
      ),
      'casos'
    FROM public.casos
    UNION ALL
    SELECT
      to_char(
        date_trunc((SELECT trunc_unit FROM params), data_cadastro),
        (SELECT periodo_fmt FROM params)
      ),
      'comunicacoes'
    FROM public.comunicacoes
  )
  SELECT
    periodo,
    coalesce(sum(total) FILTER (WHERE entidade = 'pessoas'), 0)::bigint AS pessoas,
    coalesce(sum(total) FILTER (WHERE entidade = 'empresas'), 0)::bigint AS empresas,
    coalesce(sum(total) FILTER (WHERE entidade = 'enderecos'), 0)::bigint AS enderecos,
    coalesce(sum(total) FILTER (WHERE entidade = 'veiculos'), 0)::bigint AS veiculos,
    coalesce(sum(total) FILTER (WHERE entidade = 'procedimentos'), 0)::bigint AS procedimentos,
    coalesce(sum(total) FILTER (WHERE entidade = 'casos'), 0)::bigint AS casos,
    coalesce(sum(total) FILTER (WHERE entidade = 'comunicacoes'), 0)::bigint AS comunicacoes
  FROM (
    SELECT periodo, entidade, count(*)::bigint AS total
    FROM labeled
    GROUP BY periodo, entidade
  ) agg
  GROUP BY periodo
  ORDER BY periodo;
$$;

COMMENT ON FUNCTION public.contagem_por_periodo(text) IS
  'Contagem de cadastros por entidade agrupados por mês (YYYY-MM) ou ano (YYYY), com base em data_cadastro.';

GRANT EXECUTE ON FUNCTION public.contagem_por_periodo(text) TO authenticated;

-- Totais rápidos das entidades + vínculos (uma round-trip)
CREATE OR REPLACE FUNCTION public.contagem_entidades_dashboard()
RETURNS TABLE (
  pessoas bigint,
  empresas bigint,
  enderecos bigint,
  veiculos bigint,
  procedimentos bigint,
  casos bigint,
  comunicacoes bigint,
  vinculos bigint,
  pessoas_presas bigint,
  comunicacoes_ativas bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.pessoas)::bigint,
    (SELECT count(*) FROM public.empresas)::bigint,
    (SELECT count(*) FROM public.enderecos)::bigint,
    (SELECT count(*) FROM public.veiculos)::bigint,
    (SELECT count(*) FROM public.procedimentos)::bigint,
    (SELECT count(*) FROM public.casos)::bigint,
    (SELECT count(*) FROM public.comunicacoes)::bigint,
    (SELECT count(*) FROM public.vinculos)::bigint,
    (SELECT count(*) FROM public.pessoas WHERE tipo = 'preso')::bigint,
    (SELECT count(*) FROM public.comunicacoes WHERE status = 'ativo')::bigint;
$$;

COMMENT ON FUNCTION public.contagem_entidades_dashboard() IS
  'Totais do dashboard Rede Lince (entidades, vínculos e métricas de proporção).';

GRANT EXECUTE ON FUNCTION public.contagem_entidades_dashboard() TO authenticated;
