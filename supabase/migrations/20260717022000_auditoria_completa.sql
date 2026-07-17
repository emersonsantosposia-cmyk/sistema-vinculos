-- Auditoria completa: estado OLD/NEW em jsonb, triggers em todas as
-- tabelas de negócio e RLS restrita a administradores.
--
-- Evolui a tabela/triggers já criados em 20260713213000_auditoria.sql.

-- ===========================================================================
-- 1. Evoluir schema de public.auditoria
-- ===========================================================================

-- Renomeia colunas do modelo antigo (se ainda existirem)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'auditoria'
      AND column_name = 'tabela'
  ) THEN
    ALTER TABLE public.auditoria RENAME COLUMN tabela TO tabela_afetada;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'auditoria'
      AND column_name = 'usuario'
  ) THEN
    ALTER TABLE public.auditoria RENAME COLUMN usuario TO usuario_id;
  END IF;
END $$;

-- Remove resumo textual do modelo antigo
ALTER TABLE public.auditoria DROP COLUMN IF EXISTS resumo;

-- Campos de snapshot
ALTER TABLE public.auditoria
  ADD COLUMN IF NOT EXISTS dados_antigos jsonb;

ALTER TABLE public.auditoria
  ADD COLUMN IF NOT EXISTS dados_novos jsonb;

COMMENT ON TABLE public.auditoria IS
  'Log imutável de insert/update/delete com snapshot JSON do registro.';
COMMENT ON COLUMN public.auditoria.tabela_afetada IS
  'Nome da tabela afetada (TG_TABLE_NAME).';
COMMENT ON COLUMN public.auditoria.registro_id IS
  'UUID do registro criado, alterado ou excluído.';
COMMENT ON COLUMN public.auditoria.acao IS
  'Operação: insert, update ou delete.';
COMMENT ON COLUMN public.auditoria.usuario_id IS
  'Usuário autenticado (auth.uid()) no momento da operação.';
COMMENT ON COLUMN public.auditoria.dados_antigos IS
  'Estado do registro antes da alteração (null em insert).';
COMMENT ON COLUMN public.auditoria.dados_novos IS
  'Estado do registro depois da alteração (null em delete).';
COMMENT ON COLUMN public.auditoria.data_hora IS
  'Data/hora da operação.';

-- Índices (recria com nomes alinhados ao schema novo)
DROP INDEX IF EXISTS public.auditoria_tabela_registro_idx;
DROP INDEX IF EXISTS public.auditoria_data_hora_idx;
DROP INDEX IF EXISTS public.auditoria_usuario_idx;

CREATE INDEX auditoria_tabela_registro_idx
  ON public.auditoria (tabela_afetada, registro_id);

CREATE INDEX auditoria_data_hora_idx
  ON public.auditoria (data_hora DESC);

CREATE INDEX auditoria_usuario_id_idx
  ON public.auditoria (usuario_id);

-- ===========================================================================
-- 2. Função de trigger genérica
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.fn_registrar_auditoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario uuid := auth.uid();
  v_registro_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_registro_id := NEW.id;

    INSERT INTO public.auditoria (
      tabela_afetada,
      registro_id,
      acao,
      usuario_id,
      dados_antigos,
      dados_novos
    )
    VALUES (
      TG_TABLE_NAME,
      v_registro_id,
      'insert',
      v_usuario,
      NULL,
      to_jsonb(NEW)
    );

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_registro_id := NEW.id;

    INSERT INTO public.auditoria (
      tabela_afetada,
      registro_id,
      acao,
      usuario_id,
      dados_antigos,
      dados_novos
    )
    VALUES (
      TG_TABLE_NAME,
      v_registro_id,
      'update',
      v_usuario,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_registro_id := OLD.id;

    INSERT INTO public.auditoria (
      tabela_afetada,
      registro_id,
      acao,
      usuario_id,
      dados_antigos,
      dados_novos
    )
    VALUES (
      TG_TABLE_NAME,
      v_registro_id,
      'delete',
      v_usuario,
      to_jsonb(OLD),
      NULL
    );

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.fn_registrar_auditoria() IS
  'Trigger genérica: grava insert/update/delete em public.auditoria com OLD/NEW em jsonb.';

-- Compatibilidade: mantém o nome antigo apontando para a mesma lógica
-- (recria o corpo, pois trigger functions não podem ser "aliased" por chamada).
CREATE OR REPLACE FUNCTION public.fn_auditoria_entidade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario uuid := auth.uid();
  v_registro_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_registro_id := NEW.id;
    INSERT INTO public.auditoria (
      tabela_afetada, registro_id, acao, usuario_id, dados_antigos, dados_novos
    )
    VALUES (TG_TABLE_NAME, v_registro_id, 'insert', v_usuario, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_registro_id := NEW.id;
    INSERT INTO public.auditoria (
      tabela_afetada, registro_id, acao, usuario_id, dados_antigos, dados_novos
    )
    VALUES (TG_TABLE_NAME, v_registro_id, 'update', v_usuario, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_registro_id := OLD.id;
    INSERT INTO public.auditoria (
      tabela_afetada, registro_id, acao, usuario_id, dados_antigos, dados_novos
    )
    VALUES (TG_TABLE_NAME, v_registro_id, 'delete', v_usuario, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- ===========================================================================
-- 3. Triggers em todas as tabelas do sistema
-- ===========================================================================

-- Pessoas e satélites
DROP TRIGGER IF EXISTS trg_auditoria_pessoas ON public.pessoas;
CREATE TRIGGER trg_auditoria_pessoas
  AFTER INSERT OR UPDATE OR DELETE ON public.pessoas
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_registrar_auditoria();

DROP TRIGGER IF EXISTS trg_auditoria_pessoas_redes_sociais
  ON public.pessoas_redes_sociais;
CREATE TRIGGER trg_auditoria_pessoas_redes_sociais
  AFTER INSERT OR UPDATE OR DELETE ON public.pessoas_redes_sociais
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_registrar_auditoria();

DROP TRIGGER IF EXISTS trg_auditoria_pessoas_fotos ON public.pessoas_fotos;
CREATE TRIGGER trg_auditoria_pessoas_fotos
  AFTER INSERT OR UPDATE OR DELETE ON public.pessoas_fotos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_registrar_auditoria();

-- Demais entidades
DROP TRIGGER IF EXISTS trg_auditoria_empresas ON public.empresas;
CREATE TRIGGER trg_auditoria_empresas
  AFTER INSERT OR UPDATE OR DELETE ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_registrar_auditoria();

DROP TRIGGER IF EXISTS trg_auditoria_enderecos ON public.enderecos;
DROP TRIGGER IF EXISTS trg_auditoria_locais ON public.enderecos;
CREATE TRIGGER trg_auditoria_enderecos
  AFTER INSERT OR UPDATE OR DELETE ON public.enderecos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_registrar_auditoria();

DROP TRIGGER IF EXISTS trg_auditoria_veiculos ON public.veiculos;
CREATE TRIGGER trg_auditoria_veiculos
  AFTER INSERT OR UPDATE OR DELETE ON public.veiculos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_registrar_auditoria();

DROP TRIGGER IF EXISTS trg_auditoria_comunicacoes ON public.comunicacoes;
CREATE TRIGGER trg_auditoria_comunicacoes
  AFTER INSERT OR UPDATE OR DELETE ON public.comunicacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_registrar_auditoria();

DROP TRIGGER IF EXISTS trg_auditoria_procedimentos ON public.procedimentos;
CREATE TRIGGER trg_auditoria_procedimentos
  AFTER INSERT OR UPDATE OR DELETE ON public.procedimentos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_registrar_auditoria();

DROP TRIGGER IF EXISTS trg_auditoria_casos ON public.casos;
CREATE TRIGGER trg_auditoria_casos
  AFTER INSERT OR UPDATE OR DELETE ON public.casos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_registrar_auditoria();

DROP TRIGGER IF EXISTS trg_auditoria_observacoes ON public.observacoes;
CREATE TRIGGER trg_auditoria_observacoes
  AFTER INSERT OR UPDATE OR DELETE ON public.observacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_registrar_auditoria();

DROP TRIGGER IF EXISTS trg_auditoria_vinculos ON public.vinculos;
CREATE TRIGGER trg_auditoria_vinculos
  AFTER INSERT OR UPDATE OR DELETE ON public.vinculos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_registrar_auditoria();

-- Perfis de usuário (controle de acesso)
DROP TRIGGER IF EXISTS trg_auditoria_perfis_usuario ON public.perfis_usuario;
CREATE TRIGGER trg_auditoria_perfis_usuario
  AFTER INSERT OR UPDATE OR DELETE ON public.perfis_usuario
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_registrar_auditoria();

-- Laboratório de Ideias / Quadro de Evidências (somente se já existirem)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'laboratorio_ideias',
    'ideias',
    'quadro_evidencias',
    'evidencias'
  ]
  LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS %I ON public.%I',
        'trg_auditoria_' || t,
        t
      );
      EXECUTE format(
        'CREATE TRIGGER %I
           AFTER INSERT OR UPDATE OR DELETE ON public.%I
           FOR EACH ROW
           EXECUTE FUNCTION public.fn_registrar_auditoria()',
        'trg_auditoria_' || t,
        t
      );
    END IF;
  END LOOP;
END $$;

-- ===========================================================================
-- 4. RLS — somente administrador lê; escrita só via trigger (SECURITY DEFINER)
-- ===========================================================================

ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auditoria_authenticated_select" ON public.auditoria;
DROP POLICY IF EXISTS "auditoria_select_ativo" ON public.auditoria;
DROP POLICY IF EXISTS "auditoria_select_admin" ON public.auditoria;

CREATE POLICY "auditoria_select_admin"
  ON public.auditoria
  FOR SELECT
  TO authenticated
  USING (
    public.auth_usuario_ativo()
    AND public.auth_usuario_role() = 'administrador'
  );

-- Sem políticas de INSERT/UPDATE/DELETE para authenticated/anon:
-- a API não grava direto; o trigger (SECURITY DEFINER) bypassa RLS.
REVOKE INSERT, UPDATE, DELETE ON public.auditoria FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.auditoria FROM anon;

GRANT SELECT ON public.auditoria TO authenticated;
GRANT INSERT ON public.auditoria TO postgres;
