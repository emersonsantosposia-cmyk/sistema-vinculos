-- Busca global com correspondência aproximada (pg_trgm)
-- SECURITY INVOKER: respeita RLS (incl. procedimentos/casos por unidade).
-- Nota: procedimentos.assunto foi renomeado para nome; indexamos nome + resumo.
-- Acentos: ver migration 20260717201000 (unaccent).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Índices GIN de trigrama
-- ---------------------------------------------------------------------------

-- pessoas
CREATE INDEX IF NOT EXISTS pessoas_nome_trgm_idx
  ON public.pessoas USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS pessoas_cpf_trgm_idx
  ON public.pessoas USING gin (cpf gin_trgm_ops);

-- empresas
CREATE INDEX IF NOT EXISTS empresas_nome_fantasia_trgm_idx
  ON public.empresas USING gin (nome_fantasia gin_trgm_ops);
CREATE INDEX IF NOT EXISTS empresas_razao_social_trgm_idx
  ON public.empresas USING gin (razao_social gin_trgm_ops);
CREATE INDEX IF NOT EXISTS empresas_cnpj_trgm_idx
  ON public.empresas USING gin (cnpj gin_trgm_ops);

-- enderecos
CREATE INDEX IF NOT EXISTS enderecos_nome_trgm_idx
  ON public.enderecos USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS enderecos_logradouro_trgm_idx
  ON public.enderecos USING gin (logradouro gin_trgm_ops);

-- veiculos
CREATE INDEX IF NOT EXISTS veiculos_placa_trgm_idx
  ON public.veiculos USING gin (placa gin_trgm_ops);
CREATE INDEX IF NOT EXISTS veiculos_marca_trgm_idx
  ON public.veiculos USING gin (marca gin_trgm_ops);
CREATE INDEX IF NOT EXISTS veiculos_modelo_trgm_idx
  ON public.veiculos USING gin (modelo gin_trgm_ops);

-- procedimentos (nome = antigo assunto)
CREATE INDEX IF NOT EXISTS procedimentos_nome_trgm_idx
  ON public.procedimentos USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS procedimentos_resumo_trgm_idx
  ON public.procedimentos USING gin (resumo gin_trgm_ops);

-- casos
CREATE INDEX IF NOT EXISTS casos_nome_trgm_idx
  ON public.casos USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS casos_numero_trgm_idx
  ON public.casos USING gin (numero gin_trgm_ops);

-- comunicacoes
CREATE INDEX IF NOT EXISTS comunicacoes_valor_trgm_idx
  ON public.comunicacoes USING gin (valor gin_trgm_ops);

-- orcrims
CREATE INDEX IF NOT EXISTS orcrims_nome_trgm_idx
  ON public.orcrims USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS orcrims_sigla_trgm_idx
  ON public.orcrims USING gin (sigla gin_trgm_ops);
CREATE INDEX IF NOT EXISTS orcrims_descricao_trgm_idx
  ON public.orcrims USING gin (descricao gin_trgm_ops);

-- perfis_usuario (visível via RLS: próprio perfil ou admin)
CREATE INDEX IF NOT EXISTS perfis_usuario_nome_trgm_idx
  ON public.perfis_usuario USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS perfis_usuario_matricula_trgm_idx
  ON public.perfis_usuario USING gin (matricula gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Função busca_global
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.busca_global(
  termo text,
  limiar double precision DEFAULT 0.5,
  limite integer DEFAULT 50
)
RETURNS TABLE (
  entidade_tipo text,
  entidade_id uuid,
  rotulo_principal text,
  campo_correspondente text,
  tipo_correspondencia text,
  score_similaridade double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH
  params AS (
    SELECT
      nullif(btrim(termo), '') AS t,
      greatest(coalesce(limiar, 0.5), 0.0) AS thr,
      greatest(coalesce(limite, 50), 1) AS lim
  ),
  candidatos AS (
    -- pessoas
    SELECT
      'pessoa'::text AS entidade_tipo,
      p.id AS entidade_id,
      coalesce(nullif(btrim(p.nome), ''), 'Sem identificação') AS rotulo_principal,
      m.campo AS campo_correspondente,
      m.tipo_corr AS tipo_correspondencia,
      m.score AS score_similaridade
    FROM public.pessoas p
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      VALUES
        (
          'nome',
          CASE
            WHEN coalesce(p.nome, '') ILIKE '%' || par.t || '%' THEN 'exata'
            WHEN similarity(coalesce(p.nome, ''), par.t) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN coalesce(p.nome, '') ILIKE '%' || par.t || '%' THEN 1.0
            ELSE similarity(coalesce(p.nome, ''), par.t)::double precision
          END
        ),
        (
          'cpf',
          CASE
            WHEN coalesce(p.cpf, '') ILIKE '%' || par.t || '%' THEN 'exata'
            WHEN similarity(coalesce(p.cpf, ''), par.t) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN coalesce(p.cpf, '') ILIKE '%' || par.t || '%' THEN 1.0
            ELSE similarity(coalesce(p.cpf, ''), par.t)::double precision
          END
        )
    ) AS m(campo, tipo_corr, score)
    WHERE par.t IS NOT NULL
      AND length(par.t) >= 2
      AND m.tipo_corr IS NOT NULL

    UNION ALL

    -- empresas
    SELECT
      'empresa',
      e.id,
      coalesce(
        nullif(btrim(e.nome_fantasia), ''),
        nullif(btrim(e.razao_social), ''),
        'Sem identificação'
      ),
      m.campo,
      m.tipo_corr,
      m.score
    FROM public.empresas e
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      VALUES
        (
          'nome_fantasia',
          CASE
            WHEN coalesce(e.nome_fantasia, '') ILIKE '%' || par.t || '%' THEN 'exata'
            WHEN similarity(coalesce(e.nome_fantasia, ''), par.t) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN coalesce(e.nome_fantasia, '') ILIKE '%' || par.t || '%' THEN 1.0
            ELSE similarity(coalesce(e.nome_fantasia, ''), par.t)::double precision
          END
        ),
        (
          'razao_social',
          CASE
            WHEN coalesce(e.razao_social, '') ILIKE '%' || par.t || '%' THEN 'exata'
            WHEN similarity(coalesce(e.razao_social, ''), par.t) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN coalesce(e.razao_social, '') ILIKE '%' || par.t || '%' THEN 1.0
            ELSE similarity(coalesce(e.razao_social, ''), par.t)::double precision
          END
        ),
        (
          'cnpj',
          CASE
            WHEN coalesce(e.cnpj, '') ILIKE '%' || par.t || '%' THEN 'exata'
            WHEN similarity(coalesce(e.cnpj, ''), par.t) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN coalesce(e.cnpj, '') ILIKE '%' || par.t || '%' THEN 1.0
            ELSE similarity(coalesce(e.cnpj, ''), par.t)::double precision
          END
        )
    ) AS m(campo, tipo_corr, score)
    WHERE par.t IS NOT NULL
      AND length(par.t) >= 2
      AND m.tipo_corr IS NOT NULL

    UNION ALL

    -- enderecos
    SELECT
      'endereco',
      en.id,
      coalesce(
        nullif(btrim(en.nome), ''),
        nullif(btrim(en.logradouro), ''),
        'Sem identificação'
      ),
      m.campo,
      m.tipo_corr,
      m.score
    FROM public.enderecos en
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      VALUES
        (
          'nome',
          CASE
            WHEN coalesce(en.nome, '') ILIKE '%' || par.t || '%' THEN 'exata'
            WHEN similarity(coalesce(en.nome, ''), par.t) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN coalesce(en.nome, '') ILIKE '%' || par.t || '%' THEN 1.0
            ELSE similarity(coalesce(en.nome, ''), par.t)::double precision
          END
        ),
        (
          'logradouro',
          CASE
            WHEN coalesce(en.logradouro, '') ILIKE '%' || par.t || '%' THEN 'exata'
            WHEN similarity(coalesce(en.logradouro, ''), par.t) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN coalesce(en.logradouro, '') ILIKE '%' || par.t || '%' THEN 1.0
            ELSE similarity(coalesce(en.logradouro, ''), par.t)::double precision
          END
        )
    ) AS m(campo, tipo_corr, score)
    WHERE par.t IS NOT NULL
      AND length(par.t) >= 2
      AND m.tipo_corr IS NOT NULL

    UNION ALL

    -- veiculos
    SELECT
      'veiculo',
      v.id,
      coalesce(
        nullif(btrim(v.placa), ''),
        nullif(btrim(concat_ws(' ', v.marca, v.modelo)), ''),
        'Sem identificação'
      ),
      m.campo,
      m.tipo_corr,
      m.score
    FROM public.veiculos v
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      VALUES
        (
          'placa',
          CASE
            WHEN coalesce(v.placa, '') ILIKE '%' || par.t || '%' THEN 'exata'
            WHEN similarity(coalesce(v.placa, ''), par.t) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN coalesce(v.placa, '') ILIKE '%' || par.t || '%' THEN 1.0
            ELSE similarity(coalesce(v.placa, ''), par.t)::double precision
          END
        ),
        (
          'marca',
          CASE
            WHEN coalesce(v.marca, '') ILIKE '%' || par.t || '%' THEN 'exata'
            WHEN similarity(coalesce(v.marca, ''), par.t) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN coalesce(v.marca, '') ILIKE '%' || par.t || '%' THEN 1.0
            ELSE similarity(coalesce(v.marca, ''), par.t)::double precision
          END
        ),
        (
          'modelo',
          CASE
            WHEN coalesce(v.modelo, '') ILIKE '%' || par.t || '%' THEN 'exata'
            WHEN similarity(coalesce(v.modelo, ''), par.t) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN coalesce(v.modelo, '') ILIKE '%' || par.t || '%' THEN 1.0
            ELSE similarity(coalesce(v.modelo, ''), par.t)::double precision
          END
        )
    ) AS m(campo, tipo_corr, score)
    WHERE par.t IS NOT NULL
      AND length(par.t) >= 2
      AND m.tipo_corr IS NOT NULL

    UNION ALL

    -- procedimentos (RLS por unidade)
    SELECT
      'procedimento',
      pr.id,
      coalesce(nullif(btrim(pr.nome), ''), 'Sem identificação'),
      m.campo,
      m.tipo_corr,
      m.score
    FROM public.procedimentos pr
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      VALUES
        (
          'nome',
          CASE
            WHEN coalesce(pr.nome, '') ILIKE '%' || par.t || '%' THEN 'exata'
            WHEN similarity(coalesce(pr.nome, ''), par.t) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN coalesce(pr.nome, '') ILIKE '%' || par.t || '%' THEN 1.0
            ELSE similarity(coalesce(pr.nome, ''), par.t)::double precision
          END
        ),
        (
          'resumo',
          CASE
            WHEN coalesce(pr.resumo, '') ILIKE '%' || par.t || '%' THEN 'exata'
            WHEN similarity(coalesce(pr.resumo, ''), par.t) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN coalesce(pr.resumo, '') ILIKE '%' || par.t || '%' THEN 1.0
            ELSE similarity(coalesce(pr.resumo, ''), par.t)::double precision
          END
        )
    ) AS m(campo, tipo_corr, score)
    WHERE par.t IS NOT NULL
      AND length(par.t) >= 2
      AND m.tipo_corr IS NOT NULL

    UNION ALL

    -- casos (RLS por unidade)
    SELECT
      'caso',
      c.id,
      coalesce(
        nullif(btrim(c.numero), ''),
        nullif(btrim(c.nome), ''),
        'Sem identificação'
      ),
      m.campo,
      m.tipo_corr,
      m.score
    FROM public.casos c
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      VALUES
        (
          'nome',
          CASE
            WHEN coalesce(c.nome, '') ILIKE '%' || par.t || '%' THEN 'exata'
            WHEN similarity(coalesce(c.nome, ''), par.t) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN coalesce(c.nome, '') ILIKE '%' || par.t || '%' THEN 1.0
            ELSE similarity(coalesce(c.nome, ''), par.t)::double precision
          END
        ),
        (
          'numero',
          CASE
            WHEN coalesce(c.numero, '') ILIKE '%' || par.t || '%' THEN 'exata'
            WHEN similarity(coalesce(c.numero, ''), par.t) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN coalesce(c.numero, '') ILIKE '%' || par.t || '%' THEN 1.0
            ELSE similarity(coalesce(c.numero, ''), par.t)::double precision
          END
        )
    ) AS m(campo, tipo_corr, score)
    WHERE par.t IS NOT NULL
      AND length(par.t) >= 2
      AND m.tipo_corr IS NOT NULL

    UNION ALL

    -- comunicacoes
    SELECT
      'comunicacao',
      co.id,
      coalesce(nullif(btrim(co.valor), ''), 'Sem identificação'),
      m.campo,
      m.tipo_corr,
      m.score
    FROM public.comunicacoes co
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      VALUES
        (
          'valor',
          CASE
            WHEN coalesce(co.valor, '') ILIKE '%' || par.t || '%' THEN 'exata'
            WHEN similarity(coalesce(co.valor, ''), par.t) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN coalesce(co.valor, '') ILIKE '%' || par.t || '%' THEN 1.0
            ELSE similarity(coalesce(co.valor, ''), par.t)::double precision
          END
        )
    ) AS m(campo, tipo_corr, score)
    WHERE par.t IS NOT NULL
      AND length(par.t) >= 2
      AND m.tipo_corr IS NOT NULL

    UNION ALL

    -- orcrims
    SELECT
      'orcrim',
      o.id,
      coalesce(nullif(btrim(o.nome), ''), 'Sem identificação'),
      m.campo,
      m.tipo_corr,
      m.score
    FROM public.orcrims o
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      VALUES
        (
          'nome',
          CASE
            WHEN coalesce(o.nome, '') ILIKE '%' || par.t || '%' THEN 'exata'
            WHEN similarity(coalesce(o.nome, ''), par.t) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN coalesce(o.nome, '') ILIKE '%' || par.t || '%' THEN 1.0
            ELSE similarity(coalesce(o.nome, ''), par.t)::double precision
          END
        ),
        (
          'sigla',
          CASE
            WHEN coalesce(o.sigla, '') ILIKE '%' || par.t || '%' THEN 'exata'
            WHEN similarity(coalesce(o.sigla, ''), par.t) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN coalesce(o.sigla, '') ILIKE '%' || par.t || '%' THEN 1.0
            ELSE similarity(coalesce(o.sigla, ''), par.t)::double precision
          END
        ),
        (
          'descricao',
          CASE
            WHEN coalesce(o.descricao, '') ILIKE '%' || par.t || '%' THEN 'exata'
            WHEN similarity(coalesce(o.descricao, ''), par.t) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN coalesce(o.descricao, '') ILIKE '%' || par.t || '%' THEN 1.0
            ELSE similarity(coalesce(o.descricao, ''), par.t)::double precision
          END
        )
    ) AS m(campo, tipo_corr, score)
    WHERE par.t IS NOT NULL
      AND length(par.t) >= 2
      AND m.tipo_corr IS NOT NULL

    UNION ALL

    -- perfis_usuario (RLS: próprio ou admin)
    SELECT
      'usuario',
      u.id,
      coalesce(nullif(btrim(u.nome), ''), 'Sem identificação'),
      m.campo,
      m.tipo_corr,
      m.score
    FROM public.perfis_usuario u
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      VALUES
        (
          'nome',
          CASE
            WHEN coalesce(u.nome, '') ILIKE '%' || par.t || '%' THEN 'exata'
            WHEN similarity(coalesce(u.nome, ''), par.t) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN coalesce(u.nome, '') ILIKE '%' || par.t || '%' THEN 1.0
            ELSE similarity(coalesce(u.nome, ''), par.t)::double precision
          END
        ),
        (
          'matricula',
          CASE
            WHEN coalesce(u.matricula, '') ILIKE '%' || par.t || '%' THEN 'exata'
            WHEN similarity(coalesce(u.matricula, ''), par.t) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN coalesce(u.matricula, '') ILIKE '%' || par.t || '%' THEN 1.0
            ELSE similarity(coalesce(u.matricula, ''), par.t)::double precision
          END
        )
    ) AS m(campo, tipo_corr, score)
    WHERE par.t IS NOT NULL
      AND length(par.t) >= 2
      AND m.tipo_corr IS NOT NULL
  ),
  melhores AS (
    SELECT DISTINCT ON (c.entidade_tipo, c.entidade_id)
      c.entidade_tipo,
      c.entidade_id,
      c.rotulo_principal,
      c.campo_correspondente,
      c.tipo_correspondencia,
      c.score_similaridade
    FROM candidatos c
    ORDER BY
      c.entidade_tipo,
      c.entidade_id,
      CASE WHEN c.tipo_correspondencia = 'exata' THEN 0 ELSE 1 END,
      c.score_similaridade DESC
  )
  SELECT
    m.entidade_tipo,
    m.entidade_id,
    m.rotulo_principal,
    m.campo_correspondente,
    m.tipo_correspondencia,
    m.score_similaridade
  FROM melhores m
  CROSS JOIN params par
  ORDER BY
    CASE WHEN m.tipo_correspondencia = 'exata' THEN 0 ELSE 1 END,
    m.score_similaridade DESC,
    m.rotulo_principal ASC
  LIMIT (SELECT lim FROM params);
$$;

COMMENT ON FUNCTION public.busca_global(text, double precision, integer) IS
  'Busca global exata (ILIKE) e aproximada (pg_trgm). SECURITY INVOKER — respeita RLS.';

GRANT EXECUTE ON FUNCTION public.busca_global(text, double precision, integer)
  TO authenticated;
