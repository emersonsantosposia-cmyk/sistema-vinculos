-- Reescreve políticas RLS com controle por credenciamento (ativo) e unidade.
-- Depende de: 20260717020000_perfis_usuario_e_unidade.sql
--
-- Laboratório de Ideias / Quadro de Evidências: tabelas ainda não existem;
-- quando forem criadas, reutilizar o padrão "ativo" desta migration.

-- ---------------------------------------------------------------------------
-- Helpers reutilizados nas políticas
-- ---------------------------------------------------------------------------
-- public.auth_usuario_ativo()   → boolean
-- public.auth_usuario_role()    → text
-- public.auth_usuario_unidade() → text

-- ===========================================================================
-- 1. Remover políticas antigas ("qualquer autenticado pode tudo")
-- ===========================================================================

-- Entidades
DROP POLICY IF EXISTS "pessoas_authenticated_all" ON public.pessoas;
DROP POLICY IF EXISTS "empresas_authenticated_all" ON public.empresas;
DROP POLICY IF EXISTS "locais_authenticated_all" ON public.enderecos;
DROP POLICY IF EXISTS "enderecos_authenticated_all" ON public.enderecos;
DROP POLICY IF EXISTS "veiculos_authenticated_all" ON public.veiculos;
DROP POLICY IF EXISTS "comunicacoes_authenticated_all" ON public.comunicacoes;
DROP POLICY IF EXISTS "procedimentos_authenticated_all" ON public.procedimentos;
DROP POLICY IF EXISTS "casos_authenticated_all" ON public.casos;

-- Auxiliares
DROP POLICY IF EXISTS "pessoas_redes_sociais_authenticated_all"
  ON public.pessoas_redes_sociais;
DROP POLICY IF EXISTS "pessoas_fotos_authenticated_all"
  ON public.pessoas_fotos;
DROP POLICY IF EXISTS "observacoes_authenticated_all" ON public.observacoes;
DROP POLICY IF EXISTS "vinculos_authenticated_all" ON public.vinculos;

-- Auditoria / storage (também exigirão ativo)
DROP POLICY IF EXISTS "auditoria_authenticated_select" ON public.auditoria;

DROP POLICY IF EXISTS "fotos_pessoas_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "fotos_pessoas_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "fotos_pessoas_update_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "fotos_pessoas_delete_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "fotos_veiculos_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "fotos_veiculos_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "fotos_veiculos_update_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "fotos_veiculos_delete_authenticated" ON storage.objects;

-- ===========================================================================
-- 2. REGRA GERAL — entidades sem restrição por unidade
--    Autenticado + ativo → CRUD completo
-- ===========================================================================

CREATE POLICY "pessoas_ativo_all"
  ON public.pessoas
  FOR ALL
  TO authenticated
  USING (public.auth_usuario_ativo())
  WITH CHECK (public.auth_usuario_ativo());

CREATE POLICY "empresas_ativo_all"
  ON public.empresas
  FOR ALL
  TO authenticated
  USING (public.auth_usuario_ativo())
  WITH CHECK (public.auth_usuario_ativo());

CREATE POLICY "enderecos_ativo_all"
  ON public.enderecos
  FOR ALL
  TO authenticated
  USING (public.auth_usuario_ativo())
  WITH CHECK (public.auth_usuario_ativo());

CREATE POLICY "veiculos_ativo_all"
  ON public.veiculos
  FOR ALL
  TO authenticated
  USING (public.auth_usuario_ativo())
  WITH CHECK (public.auth_usuario_ativo());

CREATE POLICY "comunicacoes_ativo_all"
  ON public.comunicacoes
  FOR ALL
  TO authenticated
  USING (public.auth_usuario_ativo())
  WITH CHECK (public.auth_usuario_ativo());

CREATE POLICY "pessoas_redes_sociais_ativo_all"
  ON public.pessoas_redes_sociais
  FOR ALL
  TO authenticated
  USING (public.auth_usuario_ativo())
  WITH CHECK (public.auth_usuario_ativo());

CREATE POLICY "pessoas_fotos_ativo_all"
  ON public.pessoas_fotos
  FOR ALL
  TO authenticated
  USING (public.auth_usuario_ativo())
  WITH CHECK (public.auth_usuario_ativo());

CREATE POLICY "observacoes_ativo_all"
  ON public.observacoes
  FOR ALL
  TO authenticated
  USING (public.auth_usuario_ativo())
  WITH CHECK (public.auth_usuario_ativo());

CREATE POLICY "vinculos_ativo_all"
  ON public.vinculos
  FOR ALL
  TO authenticated
  USING (public.auth_usuario_ativo())
  WITH CHECK (public.auth_usuario_ativo());

-- ===========================================================================
-- 3. REGRA ESPECÍFICA — procedimentos e casos (por unidade)
-- ===========================================================================
-- Visibilidade / alteração:
--   ativo AND (administrador OR unidade do usuário = CGIN OR unidade da linha
--              = unidade do usuário)
-- INSERT adicional: analista de unidade != CGIN só pode inserir a própria
-- unidade (já coberto pela condição acima; reforçado explicitamente no WITH CHECK).

-- --- procedimentos ---
CREATE POLICY "procedimentos_select_por_unidade"
  ON public.procedimentos
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

CREATE POLICY "procedimentos_insert_por_unidade"
  ON public.procedimentos
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
      -- Analista fora da CGIN: unidade inserida = própria unidade
      NOT (
        public.auth_usuario_role() = 'analista'
        AND public.auth_usuario_unidade() IS DISTINCT FROM 'CGIN'
      )
      OR unidade = public.auth_usuario_unidade()
    )
  );

CREATE POLICY "procedimentos_update_por_unidade"
  ON public.procedimentos
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

CREATE POLICY "procedimentos_delete_por_unidade"
  ON public.procedimentos
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

-- --- casos ---
CREATE POLICY "casos_select_por_unidade"
  ON public.casos
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

CREATE POLICY "casos_insert_por_unidade"
  ON public.casos
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

CREATE POLICY "casos_update_por_unidade"
  ON public.casos
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

CREATE POLICY "casos_delete_por_unidade"
  ON public.casos
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

-- ===========================================================================
-- 4. Auditoria e Storage — também exigem usuário ativo
-- ===========================================================================

CREATE POLICY "auditoria_select_ativo"
  ON public.auditoria
  FOR SELECT
  TO authenticated
  USING (public.auth_usuario_ativo());

-- fotos-pessoas
CREATE POLICY "fotos_pessoas_select_ativo"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'fotos-pessoas'
    AND public.auth_usuario_ativo()
  );

CREATE POLICY "fotos_pessoas_insert_ativo"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fotos-pessoas'
    AND public.auth_usuario_ativo()
  );

CREATE POLICY "fotos_pessoas_update_ativo"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'fotos-pessoas'
    AND public.auth_usuario_ativo()
  )
  WITH CHECK (
    bucket_id = 'fotos-pessoas'
    AND public.auth_usuario_ativo()
  );

CREATE POLICY "fotos_pessoas_delete_ativo"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'fotos-pessoas'
    AND public.auth_usuario_ativo()
  );

-- fotos-veiculos
CREATE POLICY "fotos_veiculos_select_ativo"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'fotos-veiculos'
    AND public.auth_usuario_ativo()
  );

CREATE POLICY "fotos_veiculos_insert_ativo"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fotos-veiculos'
    AND public.auth_usuario_ativo()
  );

CREATE POLICY "fotos_veiculos_update_ativo"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'fotos-veiculos'
    AND public.auth_usuario_ativo()
  )
  WITH CHECK (
    bucket_id = 'fotos-veiculos'
    AND public.auth_usuario_ativo()
  );

CREATE POLICY "fotos_veiculos_delete_ativo"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'fotos-veiculos'
    AND public.auth_usuario_ativo()
  );

-- ===========================================================================
-- 5. Reforço em perfis_usuario: admin só age se estiver ativo
--    (SELECT do próprio perfil continua liberado, mesmo inativo,
--     para a aplicação detectar descredenciamento.)
-- ===========================================================================
DROP POLICY IF EXISTS "perfis_usuario_select_admin" ON public.perfis_usuario;
DROP POLICY IF EXISTS "perfis_usuario_insert_admin" ON public.perfis_usuario;
DROP POLICY IF EXISTS "perfis_usuario_update_admin" ON public.perfis_usuario;
DROP POLICY IF EXISTS "perfis_usuario_delete_admin" ON public.perfis_usuario;

CREATE POLICY "perfis_usuario_select_admin"
  ON public.perfis_usuario
  FOR SELECT
  TO authenticated
  USING (
    public.auth_usuario_ativo()
    AND public.auth_usuario_role() = 'administrador'
  );

CREATE POLICY "perfis_usuario_insert_admin"
  ON public.perfis_usuario
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.auth_usuario_ativo()
    AND public.auth_usuario_role() = 'administrador'
  );

CREATE POLICY "perfis_usuario_update_admin"
  ON public.perfis_usuario
  FOR UPDATE
  TO authenticated
  USING (
    public.auth_usuario_ativo()
    AND public.auth_usuario_role() = 'administrador'
  )
  WITH CHECK (
    public.auth_usuario_ativo()
    AND public.auth_usuario_role() = 'administrador'
  );

CREATE POLICY "perfis_usuario_delete_admin"
  ON public.perfis_usuario
  FOR DELETE
  TO authenticated
  USING (
    public.auth_usuario_ativo()
    AND public.auth_usuario_role() = 'administrador'
  );
