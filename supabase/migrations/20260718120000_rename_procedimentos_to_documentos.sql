-- =============================================================================
-- Renomeação da entidade: procedimentos → documentos
-- =============================================================================
-- Histórico: o cadastro antes chamado "Procedimentos" passa a se chamar
-- "Documentos" em todo o sistema (tabela, entidade_tipo, RLS, busca_global e
-- agregações do dashboard).
--
-- O campo `tipo` (RCI, INFO, RDCI, OUTROS — e legados RELINT/DADOS) NÃO muda;
-- apenas o nome da entidade/tabela.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Renomear tabela (idempotente se o push anterior falhou no meio)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.procedimentos') IS NOT NULL
     AND to_regclass('public.documentos') IS NULL THEN
    ALTER TABLE public.procedimentos RENAME TO documentos;
  END IF;
END $$;

COMMENT ON TABLE public.documentos IS
  'Cadastro de documentos investigativos (antes: procedimentos).';
COMMENT ON COLUMN public.documentos.id IS
  'Identificador único do documento.';
COMMENT ON COLUMN public.documentos.tipo IS
  'Tipo do documento: RCI, INFO, RDCI ou OUTROS (valores de negócio inalterados).';
COMMENT ON COLUMN public.documentos.nome IS
  'Nome ou título do documento (campo legado: assunto).';
COMMENT ON COLUMN public.documentos.resumo IS
  'Resumo do conteúdo do documento.';
COMMENT ON COLUMN public.documentos.data IS
  'Data de referência do documento.';
COMMENT ON COLUMN public.documentos.link_cronos IS
  'Link para o registro correspondente no sistema Cronos.';
COMMENT ON COLUMN public.documentos.usuario_cadastro IS
  'Usuário que cadastrou o documento.';
COMMENT ON COLUMN public.documentos.data_cadastro IS
  'Data/hora de cadastro do documento.';

-- Índices (renomear para refletir a nova tabela; nomes antigos ainda funcionam)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS old_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'i'
      AND c.relname LIKE 'procedimentos_%'
  LOOP
    EXECUTE format(
      'ALTER INDEX public.%I RENAME TO %I',
      r.old_name,
      replace(r.old_name, 'procedimentos_', 'documentos_')
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2–3. Atualizar entidade_tipo = procedimento → documento + CHECKs
--     Ordem: DROP CHECK → UPDATE dados → ADD CHECK (evita 23514).
-- ---------------------------------------------------------------------------

-- observacoes
ALTER TABLE public.observacoes
  DROP CONSTRAINT IF EXISTS observacoes_entidade_tipo_check;

UPDATE public.observacoes
SET entidade_tipo = 'documento'
WHERE entidade_tipo = 'procedimento';

ALTER TABLE public.observacoes
  ADD CONSTRAINT observacoes_entidade_tipo_check
  CHECK (
    entidade_tipo = ANY (
      ARRAY[
        'pessoa'::text,
        'empresa'::text,
        'endereco'::text,
        'veiculo'::text,
        'documento'::text,
        'caso'::text,
        'comunicacao'::text,
        'orcrim'::text
      ]
    )
  );

COMMENT ON COLUMN public.observacoes.entidade_tipo IS
  'Tipo da entidade alvo: pessoa, empresa, endereco, veiculo, documento, caso, comunicacao ou orcrim.';

-- vinculos (origem e destino)
ALTER TABLE public.vinculos
  DROP CONSTRAINT IF EXISTS vinculos_entidade_origem_tipo_check;

ALTER TABLE public.vinculos
  DROP CONSTRAINT IF EXISTS vinculos_entidade_destino_tipo_check;

UPDATE public.vinculos
SET entidade_origem_tipo = 'documento'
WHERE entidade_origem_tipo = 'procedimento';

UPDATE public.vinculos
SET entidade_destino_tipo = 'documento'
WHERE entidade_destino_tipo = 'procedimento';

ALTER TABLE public.vinculos
  ADD CONSTRAINT vinculos_entidade_origem_tipo_check
  CHECK (
    entidade_origem_tipo = ANY (
      ARRAY[
        'pessoa'::text,
        'empresa'::text,
        'endereco'::text,
        'veiculo'::text,
        'documento'::text,
        'caso'::text,
        'comunicacao'::text,
        'orcrim'::text
      ]
    )
  );

ALTER TABLE public.vinculos
  ADD CONSTRAINT vinculos_entidade_destino_tipo_check
  CHECK (
    entidade_destino_tipo = ANY (
      ARRAY[
        'pessoa'::text,
        'empresa'::text,
        'endereco'::text,
        'veiculo'::text,
        'documento'::text,
        'caso'::text,
        'comunicacao'::text,
        'orcrim'::text
      ]
    )
  );

COMMENT ON COLUMN public.vinculos.entidade_origem_tipo IS
  'Tipo da entidade de origem do vínculo: pessoa, empresa, endereco, veiculo, documento, caso, comunicacao ou orcrim.';
COMMENT ON COLUMN public.vinculos.entidade_destino_tipo IS
  'Tipo da entidade de destino do vínculo: pessoa, empresa, endereco, veiculo, documento, caso, comunicacao ou orcrim.';

-- diagrama_visualizacoes_salvas (sem CHECK tipado; só dados)
UPDATE public.diagrama_visualizacoes_salvas
SET entidade_inicial_tipo = 'documento'
WHERE entidade_inicial_tipo = 'procedimento';

-- estado_json pode conter entidadeTipo: "procedimento" em snapshots
UPDATE public.diagrama_visualizacoes_salvas
SET estado_json = replace(
  estado_json::text,
  '"entidadeTipo":"procedimento"',
  '"entidadeTipo":"documento"'
)::jsonb
WHERE estado_json::text LIKE '%"entidadeTipo":"procedimento"%';

UPDATE public.diagrama_visualizacoes_salvas
SET estado_json = replace(
  estado_json::text,
  '"entidadeTipo": "procedimento"',
  '"entidadeTipo": "documento"'
)::jsonb
WHERE estado_json::text LIKE '%"entidadeTipo": "procedimento"%';

-- quadro_nos (Fase 7, se existir)
DO $$
DECLARE
  cname text;
BEGIN
  IF to_regclass('public.quadro_nos') IS NULL THEN
    RETURN;
  END IF;

  SELECT con.conname INTO cname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'quadro_nos'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%entidade_tipo%'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.quadro_nos DROP CONSTRAINT %I', cname);
  END IF;

  UPDATE public.quadro_nos
  SET entidade_tipo = 'documento'
  WHERE entidade_tipo = 'procedimento';

  ALTER TABLE public.quadro_nos
    ADD CONSTRAINT quadro_nos_entidade_tipo_check
    CHECK (
      entidade_tipo = ANY (
        ARRAY[
          'pessoa'::text,
          'empresa'::text,
          'endereco'::text,
          'veiculo'::text,
          'documento'::text,
          'caso'::text,
          'comunicacao'::text,
          'orcrim'::text
        ]
      )
    );

  COMMENT ON COLUMN public.quadro_nos.entidade_tipo IS
    'Tipo da entidade representada no nó: pessoa, empresa, endereco, veiculo, documento, caso, comunicacao ou orcrim.';
END $$;

-- laboratorio_vinculos (Fase 7, se existir — colunas típicas de tipo)
DO $$
BEGIN
  IF to_regclass('public.laboratorio_vinculos') IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'laboratorio_vinculos'
      AND column_name = 'entidade_tipo'
  ) THEN
    EXECUTE $u$
      UPDATE public.laboratorio_vinculos
      SET entidade_tipo = 'documento'
      WHERE entidade_tipo = 'procedimento'
    $u$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'laboratorio_vinculos'
      AND column_name = 'entidade_origem_tipo'
  ) THEN
    EXECUTE $u$
      UPDATE public.laboratorio_vinculos
      SET entidade_origem_tipo = 'documento'
      WHERE entidade_origem_tipo = 'procedimento'
    $u$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'laboratorio_vinculos'
      AND column_name = 'entidade_destino_tipo'
  ) THEN
    EXECUTE $u$
      UPDATE public.laboratorio_vinculos
      SET entidade_destino_tipo = 'documento'
      WHERE entidade_destino_tipo = 'procedimento'
    $u$;
  END IF;
END $$;

-- Histórico de auditoria: nome da tabela afetada
UPDATE public.auditoria
SET tabela_afetada = 'documentos'
WHERE tabela_afetada = 'procedimentos';

-- ---------------------------------------------------------------------------
-- 4. busca_global — documentos no lugar de procedimentos
--    Campos: unidade, tipo, nome (assunto), resumo, link_cronos, data (+ alcunha pessoas)
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
  'Busca global exata/aproximada (incl. documentos; antes procedimentos). SECURITY INVOKER (RLS).';

GRANT EXECUTE ON FUNCTION public.busca_global(text, double precision, integer)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. RLS — documentos e casos (mesma lógica por unidade)
--    RENAME TABLE preserva as policies; recriamos com nomes atualizados.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "procedimentos_select_por_unidade" ON public.documentos;
DROP POLICY IF EXISTS "procedimentos_insert_por_unidade" ON public.documentos;
DROP POLICY IF EXISTS "procedimentos_update_por_unidade" ON public.documentos;
DROP POLICY IF EXISTS "procedimentos_delete_por_unidade" ON public.documentos;
DROP POLICY IF EXISTS "documentos_select_por_unidade" ON public.documentos;
DROP POLICY IF EXISTS "documentos_insert_por_unidade" ON public.documentos;
DROP POLICY IF EXISTS "documentos_update_por_unidade" ON public.documentos;
DROP POLICY IF EXISTS "documentos_delete_por_unidade" ON public.documentos;

CREATE POLICY "documentos_select_por_unidade"
  ON public.documentos
  FOR SELECT
  TO authenticated
  USING (
    public.auth_usuario_ativo()
    AND (
      public.auth_usuario_role() = 'administrador'
      OR public.auth_usuario_unidade() = 'CGIN'
      OR unidade = public.auth_usuario_unidade()
    )
  );

CREATE POLICY "documentos_insert_por_unidade"
  ON public.documentos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.auth_usuario_ativo()
    AND (
      public.auth_usuario_role() = 'administrador'
      OR public.auth_usuario_unidade() = 'CGIN'
      OR unidade = public.auth_usuario_unidade()
    )
    AND (
      NOT (
        public.auth_usuario_role() = 'analista'
        AND public.auth_usuario_unidade() IS DISTINCT FROM 'CGIN'
      )
      OR unidade = public.auth_usuario_unidade()
    )
  );

CREATE POLICY "documentos_update_por_unidade"
  ON public.documentos
  FOR UPDATE
  TO authenticated
  USING (
    public.auth_usuario_ativo()
    AND (
      public.auth_usuario_role() = 'administrador'
      OR public.auth_usuario_unidade() = 'CGIN'
      OR unidade = public.auth_usuario_unidade()
    )
  )
  WITH CHECK (
    public.auth_usuario_ativo()
    AND (
      public.auth_usuario_role() = 'administrador'
      OR public.auth_usuario_unidade() = 'CGIN'
      OR unidade = public.auth_usuario_unidade()
    )
    AND (
      NOT (
        public.auth_usuario_role() = 'analista'
        AND public.auth_usuario_unidade() IS DISTINCT FROM 'CGIN'
      )
      OR unidade = public.auth_usuario_unidade()
    )
  );

CREATE POLICY "documentos_delete_por_unidade"
  ON public.documentos
  FOR DELETE
  TO authenticated
  USING (
    public.auth_usuario_ativo()
    AND (
      public.auth_usuario_role() = 'administrador'
      OR public.auth_usuario_unidade() = 'CGIN'
      OR unidade = public.auth_usuario_unidade()
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Trigger de auditoria
--    RENAME TABLE preserva o trigger na tabela; renomeamos só o identificador.
--    fn_registrar_auditoria usa TG_TABLE_NAME → novos eventos gravarão
--    tabela = 'documentos'. Linhas antigas já foram atualizadas acima.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'documentos'
      AND t.tgname = 'trg_auditoria_procedimentos'
  ) THEN
    ALTER TRIGGER trg_auditoria_procedimentos ON public.documentos
      RENAME TO trg_auditoria_documentos;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7. Dashboard: funções que referenciam a tabela / coluna procedimentos
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.dashboard_totais_entidades(integer, integer);

CREATE FUNCTION public.dashboard_totais_entidades(
  p_ano integer DEFAULT NULL,
  p_mes integer DEFAULT NULL
)
RETURNS TABLE (
  pessoas bigint,
  empresas bigint,
  enderecos bigint,
  veiculos bigint,
  documentos bigint,
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
    (SELECT count(*)::bigint FROM public.documentos d, bounds b
      WHERE (b.d_from IS NULL OR d.data_cadastro >= b.d_from)
        AND (b.d_to IS NULL OR d.data_cadastro < b.d_to)),
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

DROP FUNCTION IF EXISTS public.dashboard_proc_casos_por_unidade(integer, integer);

CREATE FUNCTION public.dashboard_proc_casos_por_unidade(
  p_ano integer DEFAULT NULL,
  p_mes integer DEFAULT NULL
)
RETURNS TABLE (
  unidade text,
  documentos bigint,
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
  docs AS (
    SELECT d.unidade, count(*)::bigint AS total
    FROM public.documentos d, bounds b
    WHERE (b.d_from IS NULL OR d.data_cadastro >= b.d_from)
      AND (b.d_to IS NULL OR d.data_cadastro < b.d_to)
    GROUP BY d.unidade
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
    coalesce(docs.total, 0)::bigint AS documentos,
    coalesce(cas.total, 0)::bigint AS casos
  FROM unidades u
  LEFT JOIN docs ON docs.unidade = u.unidade
  LEFT JOIN cas ON cas.unidade = u.unidade
  ORDER BY array_position(
    ARRAY['CGIN', 'PFCAT', 'PFCG', 'PFMOS', 'PFPV', 'PFBRA'],
    u.unidade
  );
$$;

COMMENT ON FUNCTION public.dashboard_proc_casos_por_unidade(integer, integer) IS
  'Documentos e casos por unidade com filtro opcional de ano/mês.';

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
      d.unidade,
      CASE
        WHEN upper(coalesce(d.tipo, 'OUTROS')) IN ('RCI', 'INFO', 'RDCI', 'OUTROS')
          THEN upper(coalesce(d.tipo, 'OUTROS'))
        WHEN upper(coalesce(d.tipo, '')) = 'RELINT' THEN 'INFO'
        WHEN upper(coalesce(d.tipo, '')) = 'DADOS' THEN 'RDCI'
        ELSE 'OUTROS'
      END AS tipo_norm
    FROM public.documentos d, bounds b
    WHERE (b.d_from IS NULL OR d.data_cadastro >= b.d_from)
      AND (b.d_to IS NULL OR d.data_cadastro < b.d_to)
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
  'Documentos por tipo (RCI/INFO/RDCI/OUTROS) e unidade, com filtro opcional de ano/mês.';

GRANT EXECUTE ON FUNCTION public.dashboard_proc_por_tipo_unidade(integer, integer) TO authenticated;
