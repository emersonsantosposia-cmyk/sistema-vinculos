-- Amplia busca_global para todos os campos textuais das entidades.
-- Mantém unaccent + pg_trgm; SECURITY INVOKER (RLS).

-- ---------------------------------------------------------------------------
-- Helpers de score (texto com/sem unaccent)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.busca_match_ua(
  valor text,
  termo_ua text,
  limiar double precision
)
RETURNS TABLE(tipo_corr text, score double precision)
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT s.tipo_corr, s.score
  FROM (
    SELECT
      CASE
        WHEN termo_ua IS NULL OR btrim(termo_ua) = '' THEN NULL
        WHEN public.immutable_unaccent(coalesce(valor, ''))
          ILIKE '%' || termo_ua || '%' THEN 'exata'
        WHEN similarity(
          public.immutable_unaccent(coalesce(valor, '')),
          termo_ua
        ) >= limiar THEN 'aproximada'
        ELSE NULL
      END AS tipo_corr,
      CASE
        WHEN termo_ua IS NULL OR btrim(termo_ua) = '' THEN NULL::double precision
        WHEN public.immutable_unaccent(coalesce(valor, ''))
          ILIKE '%' || termo_ua || '%' THEN 1.0::double precision
        ELSE similarity(
          public.immutable_unaccent(coalesce(valor, '')),
          termo_ua
        )::double precision
      END AS score
  ) s
  WHERE s.tipo_corr IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.busca_match_raw(
  valor text,
  termo text,
  limiar double precision
)
RETURNS TABLE(tipo_corr text, score double precision)
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT s.tipo_corr, s.score
  FROM (
    SELECT
      CASE
        WHEN termo IS NULL OR btrim(termo) = '' THEN NULL
        WHEN coalesce(valor, '') ILIKE '%' || termo || '%' THEN 'exata'
        WHEN similarity(coalesce(valor, ''), termo) >= limiar THEN 'aproximada'
        ELSE NULL
      END AS tipo_corr,
      CASE
        WHEN termo IS NULL OR btrim(termo) = '' THEN NULL::double precision
        WHEN coalesce(valor, '') ILIKE '%' || termo || '%' THEN 1.0::double precision
        ELSE similarity(coalesce(valor, ''), termo)::double precision
      END AS score
  ) s
  WHERE s.tipo_corr IS NOT NULL;
$$;

-- ---------------------------------------------------------------------------
-- Índices GIN (trgm + unaccent) para os campos adicionados
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS pessoas_nome_mae_trgm_idx
  ON public.pessoas USING gin (nome_mae gin_trgm_ops);
CREATE INDEX IF NOT EXISTS pessoas_nome_pai_trgm_idx
  ON public.pessoas USING gin (nome_pai gin_trgm_ops);
CREATE INDEX IF NOT EXISTS pessoas_profissao_trgm_idx
  ON public.pessoas USING gin (profissao gin_trgm_ops);
CREATE INDEX IF NOT EXISTS pessoas_tipo_trgm_idx
  ON public.pessoas USING gin (tipo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS pessoas_nome_mae_unaccent_trgm_idx
  ON public.pessoas USING gin (public.immutable_unaccent(nome_mae) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS pessoas_nome_pai_unaccent_trgm_idx
  ON public.pessoas USING gin (public.immutable_unaccent(nome_pai) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS pessoas_profissao_unaccent_trgm_idx
  ON public.pessoas USING gin (public.immutable_unaccent(profissao) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS empresas_cnae_principal_trgm_idx
  ON public.empresas USING gin (cnae_principal gin_trgm_ops);
CREATE INDEX IF NOT EXISTS empresas_cnae_principal_unaccent_trgm_idx
  ON public.empresas USING gin (public.immutable_unaccent(cnae_principal) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS enderecos_numero_trgm_idx
  ON public.enderecos USING gin (numero gin_trgm_ops);
CREATE INDEX IF NOT EXISTS enderecos_bairro_trgm_idx
  ON public.enderecos USING gin (bairro gin_trgm_ops);
CREATE INDEX IF NOT EXISTS enderecos_complemento_trgm_idx
  ON public.enderecos USING gin (complemento gin_trgm_ops);
CREATE INDEX IF NOT EXISTS enderecos_cidade_trgm_idx
  ON public.enderecos USING gin (cidade gin_trgm_ops);
CREATE INDEX IF NOT EXISTS enderecos_estado_trgm_idx
  ON public.enderecos USING gin (estado gin_trgm_ops);
CREATE INDEX IF NOT EXISTS enderecos_cep_trgm_idx
  ON public.enderecos USING gin (cep gin_trgm_ops);
CREATE INDEX IF NOT EXISTS enderecos_bairro_unaccent_trgm_idx
  ON public.enderecos USING gin (public.immutable_unaccent(bairro) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS enderecos_complemento_unaccent_trgm_idx
  ON public.enderecos USING gin (public.immutable_unaccent(complemento) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS enderecos_cidade_unaccent_trgm_idx
  ON public.enderecos USING gin (public.immutable_unaccent(cidade) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS veiculos_cor_trgm_idx
  ON public.veiculos USING gin (cor gin_trgm_ops);
CREATE INDEX IF NOT EXISTS veiculos_cor_unaccent_trgm_idx
  ON public.veiculos USING gin (public.immutable_unaccent(cor) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS procedimentos_tipo_trgm_idx
  ON public.procedimentos USING gin (tipo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS procedimentos_unidade_trgm_idx
  ON public.procedimentos USING gin (unidade gin_trgm_ops);

CREATE INDEX IF NOT EXISTS casos_unidade_trgm_idx
  ON public.casos USING gin (unidade gin_trgm_ops);

CREATE INDEX IF NOT EXISTS comunicacoes_tipo_trgm_idx
  ON public.comunicacoes USING gin (tipo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS comunicacoes_operadora_trgm_idx
  ON public.comunicacoes USING gin (operadora_provedor gin_trgm_ops);
CREATE INDEX IF NOT EXISTS comunicacoes_status_trgm_idx
  ON public.comunicacoes USING gin (status gin_trgm_ops);
CREATE INDEX IF NOT EXISTS comunicacoes_fonte_trgm_idx
  ON public.comunicacoes USING gin (fonte gin_trgm_ops);
CREATE INDEX IF NOT EXISTS comunicacoes_observacao_geral_trgm_idx
  ON public.comunicacoes USING gin (observacao_geral gin_trgm_ops);
CREATE INDEX IF NOT EXISTS comunicacoes_operadora_unaccent_trgm_idx
  ON public.comunicacoes USING gin (public.immutable_unaccent(operadora_provedor) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS comunicacoes_fonte_unaccent_trgm_idx
  ON public.comunicacoes USING gin (public.immutable_unaccent(fonte) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS comunicacoes_observacao_geral_unaccent_trgm_idx
  ON public.comunicacoes USING gin (public.immutable_unaccent(observacao_geral) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS orcrims_estado_origem_trgm_idx
  ON public.orcrims USING gin (estado_origem gin_trgm_ops);

CREATE INDEX IF NOT EXISTS perfis_usuario_cpf_trgm_idx
  ON public.perfis_usuario USING gin (cpf gin_trgm_ops);
CREATE INDEX IF NOT EXISTS perfis_usuario_email_trgm_idx
  ON public.perfis_usuario USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS perfis_usuario_role_trgm_idx
  ON public.perfis_usuario USING gin (role gin_trgm_ops);
CREATE INDEX IF NOT EXISTS perfis_usuario_unidade_trgm_idx
  ON public.perfis_usuario USING gin (unidade gin_trgm_ops);

CREATE INDEX IF NOT EXISTS pessoas_redes_sociais_rede_trgm_idx
  ON public.pessoas_redes_sociais USING gin (rede gin_trgm_ops);
CREATE INDEX IF NOT EXISTS pessoas_redes_sociais_link_trgm_idx
  ON public.pessoas_redes_sociais USING gin (link gin_trgm_ops);
CREATE INDEX IF NOT EXISTS pessoas_redes_sociais_rede_unaccent_trgm_idx
  ON public.pessoas_redes_sociais USING gin (public.immutable_unaccent(rede) gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- busca_global — todos os campos
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
      public.immutable_unaccent(nullif(btrim(termo), '')) AS t_ua,
      greatest(coalesce(limiar, 0.5), 0.0) AS thr,
      greatest(coalesce(limite, 50), 1) AS lim
  ),
  candidatos AS (
    -- Pessoas
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

    -- Redes sociais → resultado como pessoa
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

    -- Empresas
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

    -- Endereços
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

    -- Veículos
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

    -- Procedimentos
    SELECT
      'procedimento', pr.id,
      coalesce(nullif(btrim(pr.nome), ''), 'Sem identificação'),
      m.campo, m.tipo_corr, m.score
    FROM public.procedimentos pr
    CROSS JOIN params par
    CROSS JOIN LATERAL (
      SELECT * FROM (
        SELECT 'nome'::text, x.* FROM public.busca_match_ua(pr.nome, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'resumo', x.* FROM public.busca_match_ua(pr.resumo, par.t_ua, par.thr) x
        UNION ALL
        SELECT 'tipo', x.* FROM public.busca_match_raw(pr.tipo, par.t, par.thr) x
        UNION ALL
        SELECT 'unidade', x.* FROM public.busca_match_raw(pr.unidade, par.t, par.thr) x
        UNION ALL
        SELECT 'data', x.*
        FROM public.busca_match_raw(
          CASE
            WHEN pr.data IS NULL THEN NULL
            ELSE to_char(pr.data, 'YYYY-MM-DD')
              || ' ' || to_char(pr.data, 'DD/MM/YYYY')
          END,
          par.t,
          par.thr
        ) x
      ) AS hits(campo, tipo_corr, score)
    ) AS m
    WHERE par.t IS NOT NULL AND length(par.t) >= 2

    UNION ALL

    -- Casos
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

    -- Comunicações
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

    -- Orcrims
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

    -- Usuários (perfis)
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
  'Busca global exata/aproximada em todos os campos textuais das entidades. SECURITY INVOKER (RLS).';

GRANT EXECUTE ON FUNCTION public.busca_global(text, double precision, integer)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.busca_match_ua(text, text, double precision)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.busca_match_raw(text, text, double precision)
  TO authenticated;
