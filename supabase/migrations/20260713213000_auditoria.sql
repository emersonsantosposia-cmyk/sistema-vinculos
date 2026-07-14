-- Migration: trilha de auditoria via triggers Postgres
-- Registra insert/update/delete nas tabelas de entidades,
-- independentemente da aplicação cliente.

-- ---------------------------------------------------------------------------
-- Tabela auditoria
-- ---------------------------------------------------------------------------
CREATE TABLE public.auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela text NOT NULL,
  registro_id uuid NOT NULL,
  acao text NOT NULL CHECK (acao IN ('insert', 'update', 'delete')),
  usuario uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  data_hora timestamptz NOT NULL DEFAULT now(),
  resumo text
);

COMMENT ON TABLE public.auditoria IS
  'Log imutável de criação, edição e exclusão nas tabelas de entidades.';
COMMENT ON COLUMN public.auditoria.tabela IS
  'Nome da tabela afetada (ex.: pessoas, empresas).';
COMMENT ON COLUMN public.auditoria.registro_id IS
  'UUID do registro criado, alterado ou excluído.';
COMMENT ON COLUMN public.auditoria.acao IS
  'Tipo da operação: insert, update ou delete.';
COMMENT ON COLUMN public.auditoria.usuario IS
  'Usuário autenticado responsável (auth.uid() no momento da operação).';
COMMENT ON COLUMN public.auditoria.data_hora IS
  'Data e hora em que a operação ocorreu.';
COMMENT ON COLUMN public.auditoria.resumo IS
  'Para update: lista dos campos alterados com valores antigo → novo. Nulo em insert/delete.';

CREATE INDEX auditoria_tabela_registro_idx
  ON public.auditoria (tabela, registro_id);

CREATE INDEX auditoria_data_hora_idx
  ON public.auditoria (data_hora DESC);

CREATE INDEX auditoria_usuario_idx
  ON public.auditoria (usuario);

-- ---------------------------------------------------------------------------
-- Função genérica de auditoria
-- SECURITY DEFINER: grava o log mesmo com RLS restritiva na tabela auditoria.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_auditoria_entidade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario uuid := auth.uid();
  v_registro_id uuid;
  v_resumo text;
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_registro_id := NEW.id;

    INSERT INTO public.auditoria (tabela, registro_id, acao, usuario, resumo)
    VALUES (TG_TABLE_NAME, v_registro_id, 'insert', v_usuario, NULL);

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_registro_id := NEW.id;
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);

    SELECT string_agg(
      format(
        '%s: %s → %s',
        k.key,
        COALESCE(v_old ->> k.key, 'null'),
        COALESCE(v_new ->> k.key, 'null')
      ),
      '; '
      ORDER BY k.key
    )
    INTO v_resumo
    FROM jsonb_object_keys(v_old) AS k(key)
    WHERE (v_old -> k.key) IS DISTINCT FROM (v_new -> k.key);

    -- Só grava se houve alteração efetiva de algum campo
    IF v_resumo IS NOT NULL THEN
      INSERT INTO public.auditoria (tabela, registro_id, acao, usuario, resumo)
      VALUES (TG_TABLE_NAME, v_registro_id, 'update', v_usuario, v_resumo);
    END IF;

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_registro_id := OLD.id;

    INSERT INTO public.auditoria (tabela, registro_id, acao, usuario, resumo)
    VALUES (TG_TABLE_NAME, v_registro_id, 'delete', v_usuario, NULL);

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.fn_auditoria_entidade() IS
  'Trigger function: registra insert/update/delete em public.auditoria.';

-- ---------------------------------------------------------------------------
-- Triggers nas tabelas de entidades principais
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_auditoria_pessoas
  AFTER INSERT OR UPDATE OR DELETE ON public.pessoas
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auditoria_entidade();

CREATE TRIGGER trg_auditoria_empresas
  AFTER INSERT OR UPDATE OR DELETE ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auditoria_entidade();

CREATE TRIGGER trg_auditoria_locais
  AFTER INSERT OR UPDATE OR DELETE ON public.locais
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auditoria_entidade();

CREATE TRIGGER trg_auditoria_veiculos
  AFTER INSERT OR UPDATE OR DELETE ON public.veiculos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auditoria_entidade();

CREATE TRIGGER trg_auditoria_procedimentos
  AFTER INSERT OR UPDATE OR DELETE ON public.procedimentos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auditoria_entidade();

CREATE TRIGGER trg_auditoria_casos
  AFTER INSERT OR UPDATE OR DELETE ON public.casos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auditoria_entidade();

-- Tabelas satélite / relacionadas às entidades (também registradas)
CREATE TRIGGER trg_auditoria_pessoas_redes_sociais
  AFTER INSERT OR UPDATE OR DELETE ON public.pessoas_redes_sociais
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auditoria_entidade();

CREATE TRIGGER trg_auditoria_pessoas_fotos
  AFTER INSERT OR UPDATE OR DELETE ON public.pessoas_fotos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auditoria_entidade();

CREATE TRIGGER trg_auditoria_observacoes
  AFTER INSERT OR UPDATE OR DELETE ON public.observacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auditoria_entidade();

CREATE TRIGGER trg_auditoria_vinculos
  AFTER INSERT OR UPDATE OR DELETE ON public.vinculos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auditoria_entidade();

-- ---------------------------------------------------------------------------
-- RLS: autentados podem ler; escrita apenas via trigger (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auditoria_authenticated_select"
  ON public.auditoria
  FOR SELECT
  TO authenticated
  USING (true);

-- Bloqueia UPDATE/DELETE da aplicação (imutabilidade prática)
REVOKE INSERT, UPDATE, DELETE ON public.auditoria FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.auditoria FROM anon;

-- Garante que o owner da função (role de migration) possa inserir
GRANT INSERT ON public.auditoria TO postgres;
GRANT SELECT ON public.auditoria TO authenticated;
