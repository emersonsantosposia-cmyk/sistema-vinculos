-- Melhora busca aproximada com unaccent (Joao ≈ João).
-- Recria busca_global aplicando unaccent nas comparações ILIKE e similarity.

CREATE EXTENSION IF NOT EXISTS unaccent;

-- Wrapper imutável para uso em índices de expressão
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT public.unaccent('public.unaccent', $1);
$$;

-- Índices adicionais sobre texto sem acento (complementam os gin_trgm existentes)
CREATE INDEX IF NOT EXISTS pessoas_nome_unaccent_trgm_idx
  ON public.pessoas USING gin (public.immutable_unaccent(nome) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS empresas_nome_fantasia_unaccent_trgm_idx
  ON public.empresas USING gin (public.immutable_unaccent(nome_fantasia) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS empresas_razao_social_unaccent_trgm_idx
  ON public.empresas USING gin (public.immutable_unaccent(razao_social) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS enderecos_nome_unaccent_trgm_idx
  ON public.enderecos USING gin (public.immutable_unaccent(nome) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS enderecos_logradouro_unaccent_trgm_idx
  ON public.enderecos USING gin (public.immutable_unaccent(logradouro) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS veiculos_marca_unaccent_trgm_idx
  ON public.veiculos USING gin (public.immutable_unaccent(marca) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS veiculos_modelo_unaccent_trgm_idx
  ON public.veiculos USING gin (public.immutable_unaccent(modelo) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS procedimentos_nome_unaccent_trgm_idx
  ON public.procedimentos USING gin (public.immutable_unaccent(nome) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS procedimentos_resumo_unaccent_trgm_idx
  ON public.procedimentos USING gin (public.immutable_unaccent(resumo) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS casos_nome_unaccent_trgm_idx
  ON public.casos USING gin (public.immutable_unaccent(nome) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS orcrims_nome_unaccent_trgm_idx
  ON public.orcrims USING gin (public.immutable_unaccent(nome) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS orcrims_descricao_unaccent_trgm_idx
  ON public.orcrims USING gin (public.immutable_unaccent(descricao) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS perfis_usuario_nome_unaccent_trgm_idx
  ON public.perfis_usuario USING gin (public.immutable_unaccent(nome) gin_trgm_ops);

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
      public.immutable_unaccent(nullif(btrim(termo), '')) AS t_ua,
      greatest(coalesce(limiar, 0.5), 0.0) AS thr,
      greatest(coalesce(limite, 50), 1) AS lim
  ),
  candidatos AS (
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
            WHEN public.immutable_unaccent(coalesce(p.nome, '')) ILIKE '%' || par.t_ua || '%' THEN 'exata'
            WHEN similarity(public.immutable_unaccent(coalesce(p.nome, '')), par.t_ua) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN public.immutable_unaccent(coalesce(p.nome, '')) ILIKE '%' || par.t_ua || '%' THEN 1.0
            ELSE similarity(public.immutable_unaccent(coalesce(p.nome, '')), par.t_ua)::double precision
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
    WHERE par.t IS NOT NULL AND length(par.t) >= 2 AND m.tipo_corr IS NOT NULL

    UNION ALL

    SELECT
      'empresa', e.id,
      coalesce(nullif(btrim(e.nome_fantasia), ''), nullif(btrim(e.razao_social), ''), 'Sem identificação'),
      m.campo, m.tipo_corr, m.score
    FROM public.empresas e
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      VALUES
        (
          'nome_fantasia',
          CASE
            WHEN public.immutable_unaccent(coalesce(e.nome_fantasia, '')) ILIKE '%' || par.t_ua || '%' THEN 'exata'
            WHEN similarity(public.immutable_unaccent(coalesce(e.nome_fantasia, '')), par.t_ua) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN public.immutable_unaccent(coalesce(e.nome_fantasia, '')) ILIKE '%' || par.t_ua || '%' THEN 1.0
            ELSE similarity(public.immutable_unaccent(coalesce(e.nome_fantasia, '')), par.t_ua)::double precision
          END
        ),
        (
          'razao_social',
          CASE
            WHEN public.immutable_unaccent(coalesce(e.razao_social, '')) ILIKE '%' || par.t_ua || '%' THEN 'exata'
            WHEN similarity(public.immutable_unaccent(coalesce(e.razao_social, '')), par.t_ua) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN public.immutable_unaccent(coalesce(e.razao_social, '')) ILIKE '%' || par.t_ua || '%' THEN 1.0
            ELSE similarity(public.immutable_unaccent(coalesce(e.razao_social, '')), par.t_ua)::double precision
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
    WHERE par.t IS NOT NULL AND length(par.t) >= 2 AND m.tipo_corr IS NOT NULL

    UNION ALL

    SELECT
      'endereco', en.id,
      coalesce(nullif(btrim(en.nome), ''), nullif(btrim(en.logradouro), ''), 'Sem identificação'),
      m.campo, m.tipo_corr, m.score
    FROM public.enderecos en
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      VALUES
        (
          'nome',
          CASE
            WHEN public.immutable_unaccent(coalesce(en.nome, '')) ILIKE '%' || par.t_ua || '%' THEN 'exata'
            WHEN similarity(public.immutable_unaccent(coalesce(en.nome, '')), par.t_ua) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN public.immutable_unaccent(coalesce(en.nome, '')) ILIKE '%' || par.t_ua || '%' THEN 1.0
            ELSE similarity(public.immutable_unaccent(coalesce(en.nome, '')), par.t_ua)::double precision
          END
        ),
        (
          'logradouro',
          CASE
            WHEN public.immutable_unaccent(coalesce(en.logradouro, '')) ILIKE '%' || par.t_ua || '%' THEN 'exata'
            WHEN similarity(public.immutable_unaccent(coalesce(en.logradouro, '')), par.t_ua) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN public.immutable_unaccent(coalesce(en.logradouro, '')) ILIKE '%' || par.t_ua || '%' THEN 1.0
            ELSE similarity(public.immutable_unaccent(coalesce(en.logradouro, '')), par.t_ua)::double precision
          END
        )
    ) AS m(campo, tipo_corr, score)
    WHERE par.t IS NOT NULL AND length(par.t) >= 2 AND m.tipo_corr IS NOT NULL

    UNION ALL

    SELECT
      'veiculo', v.id,
      coalesce(nullif(btrim(v.placa), ''), nullif(btrim(concat_ws(' ', v.marca, v.modelo)), ''), 'Sem identificação'),
      m.campo, m.tipo_corr, m.score
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
            WHEN public.immutable_unaccent(coalesce(v.marca, '')) ILIKE '%' || par.t_ua || '%' THEN 'exata'
            WHEN similarity(public.immutable_unaccent(coalesce(v.marca, '')), par.t_ua) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN public.immutable_unaccent(coalesce(v.marca, '')) ILIKE '%' || par.t_ua || '%' THEN 1.0
            ELSE similarity(public.immutable_unaccent(coalesce(v.marca, '')), par.t_ua)::double precision
          END
        ),
        (
          'modelo',
          CASE
            WHEN public.immutable_unaccent(coalesce(v.modelo, '')) ILIKE '%' || par.t_ua || '%' THEN 'exata'
            WHEN similarity(public.immutable_unaccent(coalesce(v.modelo, '')), par.t_ua) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN public.immutable_unaccent(coalesce(v.modelo, '')) ILIKE '%' || par.t_ua || '%' THEN 1.0
            ELSE similarity(public.immutable_unaccent(coalesce(v.modelo, '')), par.t_ua)::double precision
          END
        )
    ) AS m(campo, tipo_corr, score)
    WHERE par.t IS NOT NULL AND length(par.t) >= 2 AND m.tipo_corr IS NOT NULL

    UNION ALL

    SELECT
      'procedimento', pr.id,
      coalesce(nullif(btrim(pr.nome), ''), 'Sem identificação'),
      m.campo, m.tipo_corr, m.score
    FROM public.procedimentos pr
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      VALUES
        (
          'nome',
          CASE
            WHEN public.immutable_unaccent(coalesce(pr.nome, '')) ILIKE '%' || par.t_ua || '%' THEN 'exata'
            WHEN similarity(public.immutable_unaccent(coalesce(pr.nome, '')), par.t_ua) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN public.immutable_unaccent(coalesce(pr.nome, '')) ILIKE '%' || par.t_ua || '%' THEN 1.0
            ELSE similarity(public.immutable_unaccent(coalesce(pr.nome, '')), par.t_ua)::double precision
          END
        ),
        (
          'resumo',
          CASE
            WHEN public.immutable_unaccent(coalesce(pr.resumo, '')) ILIKE '%' || par.t_ua || '%' THEN 'exata'
            WHEN similarity(public.immutable_unaccent(coalesce(pr.resumo, '')), par.t_ua) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN public.immutable_unaccent(coalesce(pr.resumo, '')) ILIKE '%' || par.t_ua || '%' THEN 1.0
            ELSE similarity(public.immutable_unaccent(coalesce(pr.resumo, '')), par.t_ua)::double precision
          END
        )
    ) AS m(campo, tipo_corr, score)
    WHERE par.t IS NOT NULL AND length(par.t) >= 2 AND m.tipo_corr IS NOT NULL

    UNION ALL

    SELECT
      'caso', c.id,
      coalesce(nullif(btrim(c.numero), ''), nullif(btrim(c.nome), ''), 'Sem identificação'),
      m.campo, m.tipo_corr, m.score
    FROM public.casos c
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      VALUES
        (
          'nome',
          CASE
            WHEN public.immutable_unaccent(coalesce(c.nome, '')) ILIKE '%' || par.t_ua || '%' THEN 'exata'
            WHEN similarity(public.immutable_unaccent(coalesce(c.nome, '')), par.t_ua) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN public.immutable_unaccent(coalesce(c.nome, '')) ILIKE '%' || par.t_ua || '%' THEN 1.0
            ELSE similarity(public.immutable_unaccent(coalesce(c.nome, '')), par.t_ua)::double precision
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
    WHERE par.t IS NOT NULL AND length(par.t) >= 2 AND m.tipo_corr IS NOT NULL

    UNION ALL

    SELECT
      'comunicacao', co.id,
      coalesce(nullif(btrim(co.valor), ''), 'Sem identificação'),
      m.campo, m.tipo_corr, m.score
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
    WHERE par.t IS NOT NULL AND length(par.t) >= 2 AND m.tipo_corr IS NOT NULL

    UNION ALL

    SELECT
      'orcrim', o.id,
      coalesce(nullif(btrim(o.nome), ''), 'Sem identificação'),
      m.campo, m.tipo_corr, m.score
    FROM public.orcrims o
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      VALUES
        (
          'nome',
          CASE
            WHEN public.immutable_unaccent(coalesce(o.nome, '')) ILIKE '%' || par.t_ua || '%' THEN 'exata'
            WHEN similarity(public.immutable_unaccent(coalesce(o.nome, '')), par.t_ua) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN public.immutable_unaccent(coalesce(o.nome, '')) ILIKE '%' || par.t_ua || '%' THEN 1.0
            ELSE similarity(public.immutable_unaccent(coalesce(o.nome, '')), par.t_ua)::double precision
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
            WHEN public.immutable_unaccent(coalesce(o.descricao, '')) ILIKE '%' || par.t_ua || '%' THEN 'exata'
            WHEN similarity(public.immutable_unaccent(coalesce(o.descricao, '')), par.t_ua) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN public.immutable_unaccent(coalesce(o.descricao, '')) ILIKE '%' || par.t_ua || '%' THEN 1.0
            ELSE similarity(public.immutable_unaccent(coalesce(o.descricao, '')), par.t_ua)::double precision
          END
        )
    ) AS m(campo, tipo_corr, score)
    WHERE par.t IS NOT NULL AND length(par.t) >= 2 AND m.tipo_corr IS NOT NULL

    UNION ALL

    SELECT
      'usuario', u.id,
      coalesce(nullif(btrim(u.nome), ''), 'Sem identificação'),
      m.campo, m.tipo_corr, m.score
    FROM public.perfis_usuario u
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      VALUES
        (
          'nome',
          CASE
            WHEN public.immutable_unaccent(coalesce(u.nome, '')) ILIKE '%' || par.t_ua || '%' THEN 'exata'
            WHEN similarity(public.immutable_unaccent(coalesce(u.nome, '')), par.t_ua) >= par.thr THEN 'aproximada'
            ELSE NULL
          END,
          CASE
            WHEN public.immutable_unaccent(coalesce(u.nome, '')) ILIKE '%' || par.t_ua || '%' THEN 1.0
            ELSE similarity(public.immutable_unaccent(coalesce(u.nome, '')), par.t_ua)::double precision
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
    WHERE par.t IS NOT NULL AND length(par.t) >= 2 AND m.tipo_corr IS NOT NULL
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
  ORDER BY
    CASE WHEN m.tipo_correspondencia = 'exata' THEN 0 ELSE 1 END,
    m.score_similaridade DESC,
    m.rotulo_principal ASC
  LIMIT (SELECT lim FROM params);
$$;

COMMENT ON FUNCTION public.busca_global(text, double precision, integer) IS
  'Busca global exata/aproximada com unaccent + pg_trgm. SECURITY INVOKER — respeita RLS.';

GRANT EXECUTE ON FUNCTION public.busca_global(text, double precision, integer)
  TO authenticated;
