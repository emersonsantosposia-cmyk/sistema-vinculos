-- Controle de acesso por unidade (base).
-- Cria perfis_usuario, funções auxiliares de auth e coluna unidade
-- em procedimentos/casos.
--
-- ATENÇÃO — procedimentos e casos:
-- A coluna unidade é NOT NULL. Registros existentes recebem o default
-- temporário 'CGIN' e o DEFAULT é removido em seguida.
-- Revise/corrija as unidades dos registros existentes depois, ou rode
-- o seed-cleanup antes desta migration se preferir partir de base limpa:
--   npm run seed:cleanup

-- ---------------------------------------------------------------------------
-- 1. Domínio de unidades (reutilizado em CHECKs)
-- ---------------------------------------------------------------------------
-- Valores permitidos: CGIN, PFCAT, PFCG, PFMOS, PFPV, PFBRA

-- ---------------------------------------------------------------------------
-- 2. Tabela perfis_usuario
-- ---------------------------------------------------------------------------
CREATE TABLE public.perfis_usuario (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  nome text NOT NULL,
  matricula text NOT NULL,
  cpf text NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('administrador', 'analista')),
  unidade text CHECK (
    unidade IS NULL
    OR unidade IN ('CGIN', 'PFCAT', 'PFCG', 'PFMOS', 'PFPV', 'PFBRA')
  ),
  ativo boolean NOT NULL DEFAULT true,
  usuario_cadastro uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  data_cadastro timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perfis_usuario_matricula_key UNIQUE (matricula),
  CONSTRAINT perfis_usuario_role_unidade_check CHECK (
    (role = 'administrador' AND unidade IS NULL)
    OR (role = 'analista' AND unidade IS NOT NULL)
  )
);

COMMENT ON TABLE public.perfis_usuario IS
  'Perfil de acesso do usuário (complementa auth.users). Controla role, unidade e credenciamento.';
COMMENT ON COLUMN public.perfis_usuario.id IS
  'Mesmo id de auth.users; exclusão do auth remove o perfil.';
COMMENT ON COLUMN public.perfis_usuario.nome IS
  'Nome completo do servidor.';
COMMENT ON COLUMN public.perfis_usuario.matricula IS
  'Matrícula funcional do servidor (única).';
COMMENT ON COLUMN public.perfis_usuario.cpf IS
  'CPF do servidor.';
COMMENT ON COLUMN public.perfis_usuario.email IS
  'E-mail do servidor (espelho operacional; login continua em auth.users).';
COMMENT ON COLUMN public.perfis_usuario.role IS
  'Papel de acesso: administrador ou analista.';
COMMENT ON COLUMN public.perfis_usuario.unidade IS
  'Unidade do analista (CGIN, PFCAT, PFCG, PFMOS, PFPV, PFBRA). Nulo para administrador.';
COMMENT ON COLUMN public.perfis_usuario.ativo IS
  'Credenciamento: false = descredenciado, perde acesso.';
COMMENT ON COLUMN public.perfis_usuario.usuario_cadastro IS
  'Administrador que cadastrou este perfil.';
COMMENT ON COLUMN public.perfis_usuario.data_cadastro IS
  'Data/hora de criação do perfil.';

CREATE INDEX perfis_usuario_role_idx ON public.perfis_usuario (role);
CREATE INDEX perfis_usuario_unidade_idx ON public.perfis_usuario (unidade)
  WHERE unidade IS NOT NULL;
CREATE INDEX perfis_usuario_ativo_idx ON public.perfis_usuario (ativo);

-- ---------------------------------------------------------------------------
-- 3. Coluna unidade em procedimentos e casos
--    Default temporário 'CGIN' para dados existentes; depois removido.
-- ---------------------------------------------------------------------------
ALTER TABLE public.procedimentos
  ADD COLUMN unidade text NOT NULL DEFAULT 'CGIN'
  CONSTRAINT procedimentos_unidade_check
    CHECK (unidade IN ('CGIN', 'PFCAT', 'PFCG', 'PFMOS', 'PFPV', 'PFBRA'));

ALTER TABLE public.procedimentos
  ALTER COLUMN unidade DROP DEFAULT;

COMMENT ON COLUMN public.procedimentos.unidade IS
  'Unidade responsável pelo procedimento (CGIN, PFCAT, PFCG, PFMOS, PFPV, PFBRA).';

ALTER TABLE public.casos
  ADD COLUMN unidade text NOT NULL DEFAULT 'CGIN'
  CONSTRAINT casos_unidade_check
    CHECK (unidade IN ('CGIN', 'PFCAT', 'PFCG', 'PFMOS', 'PFPV', 'PFBRA'));

ALTER TABLE public.casos
  ALTER COLUMN unidade DROP DEFAULT;

COMMENT ON COLUMN public.casos.unidade IS
  'Unidade responsável pelo caso (CGIN, PFCAT, PFCG, PFMOS, PFPV, PFBRA).';

CREATE INDEX procedimentos_unidade_idx ON public.procedimentos (unidade);
CREATE INDEX casos_unidade_idx ON public.casos (unidade);

-- ---------------------------------------------------------------------------
-- 4. Funções auxiliares (SECURITY DEFINER) para políticas RLS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_usuario_ativo()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.ativo FROM public.perfis_usuario p WHERE p.id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_usuario_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role
  FROM public.perfis_usuario p
  WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.auth_usuario_unidade()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.unidade
  FROM public.perfis_usuario p
  WHERE p.id = auth.uid();
$$;

COMMENT ON FUNCTION public.auth_usuario_ativo() IS
  'Retorna se o usuário autenticado está ativo (credenciado). Sem perfil → false.';
COMMENT ON FUNCTION public.auth_usuario_role() IS
  'Retorna o role do usuário autenticado (administrador|analista). Sem perfil → null.';
COMMENT ON FUNCTION public.auth_usuario_unidade() IS
  'Retorna a unidade do usuário autenticado. Administrador → null.';

REVOKE ALL ON FUNCTION public.auth_usuario_ativo() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_usuario_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_usuario_unidade() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.auth_usuario_ativo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_usuario_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_usuario_unidade() TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. RLS em perfis_usuario
-- ---------------------------------------------------------------------------
ALTER TABLE public.perfis_usuario ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado lê o próprio perfil
CREATE POLICY "perfis_usuario_select_own"
  ON public.perfis_usuario
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Administrador lê todos os perfis
CREATE POLICY "perfis_usuario_select_admin"
  ON public.perfis_usuario
  FOR SELECT
  TO authenticated
  USING (public.auth_usuario_role() = 'administrador');

-- Apenas administrador cria/atualiza/exclui perfis
CREATE POLICY "perfis_usuario_insert_admin"
  ON public.perfis_usuario
  FOR INSERT
  TO authenticated
  WITH CHECK (public.auth_usuario_role() = 'administrador');

CREATE POLICY "perfis_usuario_update_admin"
  ON public.perfis_usuario
  FOR UPDATE
  TO authenticated
  USING (public.auth_usuario_role() = 'administrador')
  WITH CHECK (public.auth_usuario_role() = 'administrador');

CREATE POLICY "perfis_usuario_delete_admin"
  ON public.perfis_usuario
  FOR DELETE
  TO authenticated
  USING (public.auth_usuario_role() = 'administrador');
