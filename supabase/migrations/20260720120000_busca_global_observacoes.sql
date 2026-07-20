-- Restaura busca em observacoes.mensagem na busca_global (Prompt 5.13.3).
-- Aponta o resultado para a entidade dona (entidade_tipo / entidade_id).
-- Sem lógica extra de unidade: SECURITY INVOKER + RLS de observacoes (C2).

CREATE INDEX IF NOT EXISTS observacoes_mensagem_trgm_idx
  ON public.observacoes USING gin (mensagem gin_trgm_ops);

CREATE INDEX IF NOT EXISTS observacoes_mensagem_unaccent_trgm_idx
  ON public.observacoes USING gin (public.immutable_unaccent(mensagem) gin_trgm_ops);
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
      SELECT * FROM (
        SELECT 'nome'::text, x.* FROM public.busca_match_ua(p.nome, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'alcunha', x.* FROM public.busca_match_ua(p.alcunha, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'cpf', x.* FROM public.busca_match_raw(p.cpf, par.t, par.thr) x
        UNION ALL
        SELECT 'nome_mae', x.* FROM public.busca_match_ua(p.nome_mae, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'nome_pai', x.* FROM public.busca_match_ua(p.nome_pai, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'profissao', x.* FROM public.busca_match_ua(p.profissao, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'tipo', x.* FROM public.busca_match_raw(p.tipo, par.t, par.thr) x
        UNION ALL
        SELECT 'data_nascimento', x.*
        FROM public.busca_match_raw(
          CASE
            WHEN p.data_nascimento IS NULL THEN NULL
            ELSE to_char(p.data_nascimento, 'YYYY-MM-DD')
              || ' ' || to_char(p.data_nascimento, 'DD/MM/YYYY')
          END,
          par.t,
          par.thr
        ) x
      ) AS hits(campo, tipo_corr, score)
    ) AS m
    WHERE par.t IS NOT NULL AND length(par.t) >= 2

    UNION ALL

    SELECT
      'pessoa',
      p.id,
      coalesce(nullif(btrim(p.nome), ''), 'Sem identificação'),
      m.campo,
      m.tipo_corr,
      m.score
    FROM public.pessoas_redes_sociais rs
    JOIN public.pessoas p ON p.id = rs.pessoa_id
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      SELECT * FROM (
        SELECT 'rede_social'::text, x.*
        FROM public.busca_match_ua(rs.rede, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'link_rede', x.*
        FROM public.busca_match_raw(rs.link, par.t, par.thr) x
      ) AS hits(campo, tipo_corr, score)
    ) AS m
    WHERE par.t IS NOT NULL AND length(par.t) >= 2

    UNION ALL

    SELECT
      'empresa', e.id,
      coalesce(nullif(btrim(e.nome_fantasia), ''), nullif(btrim(e.razao_social), ''), 'Sem identificação'),
      m.campo, m.tipo_corr, m.score
    FROM public.empresas e
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      SELECT * FROM (
        SELECT 'nome_fantasia'::text, x.*
        FROM public.busca_match_ua(e.nome_fantasia, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'razao_social', x.*
        FROM public.busca_match_ua(e.razao_social, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'cnpj', x.* FROM public.busca_match_raw(e.cnpj, par.t, par.thr) x
        UNION ALL
        SELECT 'cnae_principal', x.*
        FROM public.busca_match_ua(e.cnae_principal, par.t_ua, par.thr) x
      ) AS hits(campo, tipo_corr, score)
    ) AS m
    WHERE par.t IS NOT NULL AND length(par.t) >= 2

    UNION ALL

    SELECT
      'endereco', en.id,
      coalesce(nullif(btrim(en.nome), ''), nullif(btrim(en.logradouro), ''), 'Sem identificação'),
      m.campo, m.tipo_corr, m.score
    FROM public.enderecos en
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      SELECT * FROM (
        SELECT 'nome'::text, x.* FROM public.busca_match_ua(en.nome, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'logradouro', x.*
        FROM public.busca_match_ua(en.logradouro, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'numero', x.* FROM public.busca_match_raw(en.numero, par.t, par.thr) x
        UNION ALL
        SELECT 'bairro', x.* FROM public.busca_match_ua(en.bairro, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'complemento', x.*
        FROM public.busca_match_ua(en.complemento, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'cidade', x.* FROM public.busca_match_ua(en.cidade, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'estado', x.* FROM public.busca_match_raw(en.estado, par.t, par.thr) x
        UNION ALL
        SELECT 'cep', x.* FROM public.busca_match_raw(en.cep, par.t, par.thr) x
      ) AS hits(campo, tipo_corr, score)
    ) AS m
    WHERE par.t IS NOT NULL AND length(par.t) >= 2

    UNION ALL

    SELECT
      'veiculo', v.id,
      coalesce(nullif(btrim(v.placa), ''), nullif(btrim(concat_ws(' ', v.marca, v.modelo)), ''), 'Sem identificação'),
      m.campo, m.tipo_corr, m.score
    FROM public.veiculos v
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      SELECT * FROM (
        SELECT 'placa'::text, x.* FROM public.busca_match_raw(v.placa, par.t, par.thr) x
        UNION ALL
        SELECT 'marca', x.* FROM public.busca_match_ua(v.marca, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'modelo', x.* FROM public.busca_match_ua(v.modelo, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'cor', x.* FROM public.busca_match_ua(v.cor, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'ano_fabricacao', x.*
        FROM public.busca_match_raw(v.ano_fabricacao::text, par.t, par.thr) x
        UNION ALL
        SELECT 'ano_modelo', x.*
        FROM public.busca_match_raw(v.ano_modelo::text, par.t, par.thr) x
      ) AS hits(campo, tipo_corr, score)
    ) AS m
    WHERE par.t IS NOT NULL AND length(par.t) >= 2

    UNION ALL

    -- Documentos (antes: procedimentos)
    SELECT
      'documento', d.id,
      coalesce(nullif(btrim(d.nome), ''), 'Sem identificação'),
      m.campo, m.tipo_corr, m.score
    FROM public.documentos d
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      SELECT * FROM (
        SELECT 'nome'::text, x.* FROM public.busca_match_ua(d.nome, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'resumo', x.* FROM public.busca_match_ua(d.resumo, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'tipo', x.* FROM public.busca_match_raw(d.tipo, par.t, par.thr) x
        UNION ALL
        SELECT 'unidade', x.* FROM public.busca_match_raw(d.unidade, par.t, par.thr) x
        UNION ALL
        SELECT 'link_cronos', x.*
        FROM public.busca_match_raw(d.link_cronos, par.t, par.thr) x
        UNION ALL
        SELECT 'data', x.*
        FROM public.busca_match_raw(
          CASE
            WHEN d.data IS NULL THEN NULL
            ELSE to_char(d.data, 'YYYY-MM-DD')
              || ' ' || to_char(d.data, 'DD/MM/YYYY')
          END,
          par.t,
          par.thr
        ) x
      ) AS hits(campo, tipo_corr, score)
    ) AS m
    WHERE par.t IS NOT NULL AND length(par.t) >= 2

    UNION ALL

    SELECT
      'caso', c.id,
      coalesce(nullif(btrim(c.numero), ''), nullif(btrim(c.nome), ''), 'Sem identificação'),
      m.campo, m.tipo_corr, m.score
    FROM public.casos c
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      SELECT * FROM (
        SELECT 'nome'::text, x.* FROM public.busca_match_ua(c.nome, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'numero', x.* FROM public.busca_match_raw(c.numero, par.t, par.thr) x
        UNION ALL
        SELECT 'unidade', x.* FROM public.busca_match_raw(c.unidade, par.t, par.thr) x
        UNION ALL
        SELECT 'data_abertura', x.*
        FROM public.busca_match_raw(
          CASE
            WHEN c.data_abertura IS NULL THEN NULL
            ELSE to_char(c.data_abertura, 'YYYY-MM-DD')
              || ' ' || to_char(c.data_abertura, 'DD/MM/YYYY')
          END,
          par.t,
          par.thr
        ) x
      ) AS hits(campo, tipo_corr, score)
    ) AS m
    WHERE par.t IS NOT NULL AND length(par.t) >= 2

    UNION ALL

    SELECT
      'comunicacao', co.id,
      coalesce(nullif(btrim(co.valor), ''), 'Sem identificação'),
      m.campo, m.tipo_corr, m.score
    FROM public.comunicacoes co
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      SELECT * FROM (
        SELECT 'valor'::text, x.* FROM public.busca_match_raw(co.valor, par.t, par.thr) x
        UNION ALL
        SELECT 'tipo', x.* FROM public.busca_match_raw(co.tipo, par.t, par.thr) x
        UNION ALL
        SELECT 'operadora_provedor', x.*
        FROM public.busca_match_ua(co.operadora_provedor, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'status', x.* FROM public.busca_match_raw(co.status, par.t, par.thr) x
        UNION ALL
        SELECT 'fonte', x.* FROM public.busca_match_ua(co.fonte, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'observacao_geral', x.*
        FROM public.busca_match_ua(co.observacao_geral, par.t_ua, par.thr) x
      ) AS hits(campo, tipo_corr, score)
    ) AS m
    WHERE par.t IS NOT NULL AND length(par.t) >= 2

    UNION ALL

    SELECT
      'orcrim', o.id,
      coalesce(nullif(btrim(o.nome), ''), 'Sem identificação'),
      m.campo, m.tipo_corr, m.score
    FROM public.orcrims o
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      SELECT * FROM (
        SELECT 'nome'::text, x.* FROM public.busca_match_ua(o.nome, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'sigla', x.* FROM public.busca_match_raw(o.sigla, par.t, par.thr) x
        UNION ALL
        SELECT 'estado_origem', x.*
        FROM public.busca_match_raw(o.estado_origem, par.t, par.thr) x
        UNION ALL
        SELECT 'descricao', x.*
        FROM public.busca_match_ua(o.descricao, par.t_ua, par.thr) x
      ) AS hits(campo, tipo_corr, score)
    ) AS m
    WHERE par.t IS NOT NULL AND length(par.t) >= 2

    UNION ALL

    -- Observações (mensagem) → resultado aponta para a entidade dona.
    -- Sem filtro extra de unidade: SECURITY INVOKER + RLS de observacoes.
    SELECT
      obs.entidade_tipo,
      obs.entidade_id,
      coalesce(
        CASE obs.entidade_tipo
          WHEN 'pessoa' THEN (
            SELECT coalesce(nullif(btrim(p.nome), ''), 'Sem identificação')
            FROM public.pessoas p WHERE p.id = obs.entidade_id
          )
          WHEN 'empresa' THEN (
            SELECT coalesce(
              nullif(btrim(e.nome_fantasia), ''),
              nullif(btrim(e.razao_social), ''),
              'Sem identificação'
            )
            FROM public.empresas e WHERE e.id = obs.entidade_id
          )
          WHEN 'endereco' THEN (
            SELECT coalesce(
              nullif(btrim(en.nome), ''),
              nullif(btrim(en.logradouro), ''),
              'Sem identificação'
            )
            FROM public.enderecos en WHERE en.id = obs.entidade_id
          )
          WHEN 'veiculo' THEN (
            SELECT coalesce(
              nullif(btrim(v.placa), ''),
              nullif(btrim(concat_ws(' ', v.marca, v.modelo)), ''),
              'Sem identificação'
            )
            FROM public.veiculos v WHERE v.id = obs.entidade_id
          )
          WHEN 'documento' THEN (
            SELECT coalesce(nullif(btrim(d.nome), ''), 'Sem identificação')
            FROM public.documentos d WHERE d.id = obs.entidade_id
          )
          WHEN 'caso' THEN (
            SELECT coalesce(
              nullif(btrim(c.numero), ''),
              nullif(btrim(c.nome), ''),
              'Sem identificação'
            )
            FROM public.casos c WHERE c.id = obs.entidade_id
          )
          WHEN 'comunicacao' THEN (
            SELECT coalesce(nullif(btrim(co.valor), ''), 'Sem identificação')
            FROM public.comunicacoes co WHERE co.id = obs.entidade_id
          )
          WHEN 'orcrim' THEN (
            SELECT coalesce(nullif(btrim(oc.nome), ''), 'Sem identificação')
            FROM public.orcrims oc WHERE oc.id = obs.entidade_id
          )
          ELSE NULL
        END,
        'Sem identificação'
      ),
      m.campo,
      m.tipo_corr,
      m.score
    FROM public.observacoes obs
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      SELECT * FROM (
        SELECT 'mensagem'::text, x.*
        FROM public.busca_match_ua(obs.mensagem, par.t_ua, par.thr) x
      ) AS hits(campo, tipo_corr, score)
    ) AS m
    WHERE par.t IS NOT NULL AND length(par.t) >= 2


    UNION ALL

    SELECT
      'usuario', u.id,
      coalesce(nullif(btrim(u.nome), ''), 'Sem identificação'),
      m.campo, m.tipo_corr, m.score
    FROM public.perfis_usuario u
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      SELECT * FROM (
        SELECT 'nome'::text, x.* FROM public.busca_match_ua(u.nome, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'matricula', x.*
        FROM public.busca_match_raw(u.matricula, par.t, par.thr) x
        UNION ALL
        SELECT 'cpf', x.* FROM public.busca_match_raw(u.cpf, par.t, par.thr) x
        UNION ALL
        SELECT 'email', x.* FROM public.busca_match_raw(u.email, par.t, par.thr) x
        UNION ALL
        SELECT 'role', x.* FROM public.busca_match_raw(u.role, par.t, par.thr) x
        UNION ALL
        SELECT 'unidade', x.* FROM public.busca_match_raw(u.unidade, par.t, par.thr) x
      ) AS hits(campo, tipo_corr, score)
    ) AS m
    WHERE par.t IS NOT NULL AND length(par.t) >= 2
  ),
  ranqueados AS (
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
      c.score_similaridade DESC,
      c.campo_correspondente
  )
  SELECT
    r.entidade_tipo,
    r.entidade_id,
    r.rotulo_principal,
    r.campo_correspondente,
    r.tipo_correspondencia,
    r.score_similaridade
  FROM ranqueados r
  CROSS JOIN params par
  ORDER BY
    CASE WHEN r.tipo_correspondencia = 'exata' THEN 0 ELSE 1 END,
    r.score_similaridade DESC,
    r.entidade_tipo,
    r.rotulo_principal
  LIMIT (SELECT lim FROM params);
$$;

COMMENT ON FUNCTION public.busca_global(text, double precision, integer) IS
  'Busca global exata/aproximada (incl. observacoes.mensagem → entidade dona). SECURITY INVOKER (RLS).';

GRANT EXECUTE ON FUNCTION public.busca_global(text, double precision, integer)
  TO authenticated;