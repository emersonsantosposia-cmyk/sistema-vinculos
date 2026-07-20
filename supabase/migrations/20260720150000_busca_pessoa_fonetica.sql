-- Busca fonética + trigrama com limiar reduzido para nomes de pessoa
-- (pessoas.nome, nome_mae, nome_pai). Demais campos/entidades inalterados.
--
-- Abordagem: chave_fonetica_pt (normalização PT-BR) em vez de Soundex/dmetaphone,
-- que são orientados ao inglês e fracos com UTF-8. Extensão fuzzystrmatch
-- habilitada para uso eventual (ex.: levenshtein), mas a chave PT cobre os
-- pares beatris/beatriz, sousa/souza, xico/chico, alessandra/alexandra, etc.

CREATE EXTENSION IF NOT EXISTS fuzzystrmatch WITH SCHEMA public;

-- ---------------------------------------------------------------------------
-- Chave fonética simplificada para nomes em português brasileiro
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chave_fonetica_pt(valor text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
DECLARE
  s text;
BEGIN
  IF valor IS NULL OR btrim(valor) = '' THEN
    RETURN '';
  END IF;

  s := lower(public.immutable_unaccent(valor));
  s := regexp_replace(s, '[^a-z[:space:]]', '', 'g');
  s := regexp_replace(s, '[[:space:]]+', ' ', 'g');
  s := btrim(s);

  -- Digrafos / padrões comuns (ordem importa)
  s := replace(s, 'ph', 'f');
  s := replace(s, 'th', 't');
  s := replace(s, 'ch', 'x');
  s := replace(s, 'lh', 'li');
  s := replace(s, 'nh', 'ni');
  s := replace(s, 'y', 'i');
  s := replace(s, 'w', 'v');
  s := replace(s, 'z', 's');
  s := replace(s, 'x', 's');

  -- Letras dobradas → simples (ll, ss, nn, cc, …)
  s := regexp_replace(s, '(.)\1+', '\1', 'g');

  RETURN s;
END;
$$;

COMMENT ON FUNCTION public.chave_fonetica_pt(text) IS
  'Normalização fonética simplificada para nomes PT-BR (busca de pessoas).';

-- ---------------------------------------------------------------------------
-- Match só para nome / nome_mae / nome_pai:
--   exata (ILIKE) | trigrama limiar 0.3 | chave fonética → aproximada
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.busca_match_pessoa_nome(
  valor text,
  termo_ua text
)
RETURNS TABLE(tipo_corr text, score double precision)
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
DECLARE
  limiar_nome constant double precision := 0.3;
  v_ua text;
  sim double precision;
  chave_v text;
  chave_t text;
BEGIN
  IF termo_ua IS NULL OR btrim(termo_ua) = '' THEN
    RETURN;
  END IF;

  v_ua := public.immutable_unaccent(coalesce(valor, ''));

  IF v_ua ILIKE '%' || termo_ua || '%' THEN
    tipo_corr := 'exata';
    score := 1.0;
    RETURN NEXT;
    RETURN;
  END IF;

  sim := similarity(v_ua, termo_ua);
  IF sim >= limiar_nome THEN
    tipo_corr := 'aproximada';
    score := sim;
    RETURN NEXT;
    RETURN;
  END IF;

  chave_v := public.chave_fonetica_pt(valor);
  chave_t := public.chave_fonetica_pt(termo_ua);

  IF chave_t <> '' AND chave_v LIKE '%' || chave_t || '%' THEN
    tipo_corr := 'aproximada';
    score := greatest(sim, 0.75);
    RETURN NEXT;
    RETURN;
  END IF;

  -- Sobreposição de tokens fonéticos (ex.: busca multi-palavra)
  IF chave_t <> '' AND EXISTS (
    SELECT 1
    FROM unnest(string_to_array(chave_t, ' ')) AS tw(tok)
    CROSS JOIN unnest(string_to_array(chave_v, ' ')) AS vw(vtok)
    WHERE tw.tok <> '' AND tw.tok = vw.vtok
  ) THEN
    tipo_corr := 'aproximada';
    score := greatest(sim, 0.75);
    RETURN NEXT;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.busca_match_pessoa_nome(text, text) IS
  'Match de nome de pessoa: ILIKE + trigrama(0.3) + chave_fonetica_pt.';

CREATE INDEX IF NOT EXISTS pessoas_nome_fonetica_trgm_idx
  ON public.pessoas USING gin (public.chave_fonetica_pt(nome) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS pessoas_nome_mae_fonetica_trgm_idx
  ON public.pessoas USING gin (public.chave_fonetica_pt(nome_mae) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS pessoas_nome_pai_fonetica_trgm_idx
  ON public.pessoas USING gin (public.chave_fonetica_pt(nome_pai) gin_trgm_ops);

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
        SELECT 'nome'::text, x.* FROM public.busca_match_pessoa_nome(p.nome, par.t_ua) x
        UNION ALL
        SELECT 'alcunha', x.* FROM public.busca_match_ua(p.alcunha, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'cpf', x.* FROM public.busca_match_raw(p.cpf, par.t, par.thr) x
        UNION ALL
        SELECT 'nome_mae', x.* FROM public.busca_match_pessoa_nome(p.nome_mae, par.t_ua) x
        UNION ALL
        SELECT 'nome_pai', x.* FROM public.busca_match_pessoa_nome(p.nome_pai, par.t_ua) x
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
  'Busca global exata/aproximada. Nomes de pessoa: ILIKE + trgm(0.3) + fonética PT-BR. SECURITY INVOKER (RLS).';

GRANT EXECUTE ON FUNCTION public.busca_global(text, double precision, integer)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.chave_fonetica_pt(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.busca_match_pessoa_nome(text, text) TO authenticated;