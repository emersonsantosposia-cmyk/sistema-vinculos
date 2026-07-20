-- DELETE das 8 entidades principais: apenas administrador ativo.
-- SELECT/INSERT/UPDATE inalterados em significado.
-- Não afeta vinculos, observacoes, pessoas_fotos, pessoas_redes_sociais.

-- ---------------------------------------------------------------------------
-- Tabelas com política FOR ALL (ativo) → separar por comando
-- ---------------------------------------------------------------------------

-- pessoas
DROP POLICY IF EXISTS "pessoas_ativo_all" ON public.pessoas;
DROP POLICY IF EXISTS "pessoas_select_ativo" ON public.pessoas;
DROP POLICY IF EXISTS "pessoas_insert_ativo" ON public.pessoas;
DROP POLICY IF EXISTS "pessoas_update_ativo" ON public.pessoas;
DROP POLICY IF EXISTS "pessoas_delete_admin" ON public.pessoas;

CREATE POLICY "pessoas_select_ativo"
  ON public.pessoas FOR SELECT TO authenticated
  USING (public.auth_usuario_ativo());

CREATE POLICY "pessoas_insert_ativo"
  ON public.pessoas FOR INSERT TO authenticated
  WITH CHECK (public.auth_usuario_ativo());

CREATE POLICY "pessoas_update_ativo"
  ON public.pessoas FOR UPDATE TO authenticated
  USING (public.auth_usuario_ativo())
  WITH CHECK (public.auth_usuario_ativo());

CREATE POLICY "pessoas_delete_admin"
  ON public.pessoas FOR DELETE TO authenticated
  USING (
    public.auth_usuario_ativo()
    AND public.auth_usuario_role() = 'administrador'
  );

-- empresas
DROP POLICY IF EXISTS "empresas_ativo_all" ON public.empresas;
DROP POLICY IF EXISTS "empresas_select_ativo" ON public.empresas;
DROP POLICY IF EXISTS "empresas_insert_ativo" ON public.empresas;
DROP POLICY IF EXISTS "empresas_update_ativo" ON public.empresas;
DROP POLICY IF EXISTS "empresas_delete_admin" ON public.empresas;

CREATE POLICY "empresas_select_ativo"
  ON public.empresas FOR SELECT TO authenticated
  USING (public.auth_usuario_ativo());

CREATE POLICY "empresas_insert_ativo"
  ON public.empresas FOR INSERT TO authenticated
  WITH CHECK (public.auth_usuario_ativo());

CREATE POLICY "empresas_update_ativo"
  ON public.empresas FOR UPDATE TO authenticated
  USING (public.auth_usuario_ativo())
  WITH CHECK (public.auth_usuario_ativo());

CREATE POLICY "empresas_delete_admin"
  ON public.empresas FOR DELETE TO authenticated
  USING (
    public.auth_usuario_ativo()
    AND public.auth_usuario_role() = 'administrador'
  );

-- enderecos
DROP POLICY IF EXISTS "enderecos_ativo_all" ON public.enderecos;
DROP POLICY IF EXISTS "enderecos_select_ativo" ON public.enderecos;
DROP POLICY IF EXISTS "enderecos_insert_ativo" ON public.enderecos;
DROP POLICY IF EXISTS "enderecos_update_ativo" ON public.enderecos;
DROP POLICY IF EXISTS "enderecos_delete_admin" ON public.enderecos;

CREATE POLICY "enderecos_select_ativo"
  ON public.enderecos FOR SELECT TO authenticated
  USING (public.auth_usuario_ativo());

CREATE POLICY "enderecos_insert_ativo"
  ON public.enderecos FOR INSERT TO authenticated
  WITH CHECK (public.auth_usuario_ativo());

CREATE POLICY "enderecos_update_ativo"
  ON public.enderecos FOR UPDATE TO authenticated
  USING (public.auth_usuario_ativo())
  WITH CHECK (public.auth_usuario_ativo());

CREATE POLICY "enderecos_delete_admin"
  ON public.enderecos FOR DELETE TO authenticated
  USING (
    public.auth_usuario_ativo()
    AND public.auth_usuario_role() = 'administrador'
  );

-- veiculos
DROP POLICY IF EXISTS "veiculos_ativo_all" ON public.veiculos;
DROP POLICY IF EXISTS "veiculos_select_ativo" ON public.veiculos;
DROP POLICY IF EXISTS "veiculos_insert_ativo" ON public.veiculos;
DROP POLICY IF EXISTS "veiculos_update_ativo" ON public.veiculos;
DROP POLICY IF EXISTS "veiculos_delete_admin" ON public.veiculos;

CREATE POLICY "veiculos_select_ativo"
  ON public.veiculos FOR SELECT TO authenticated
  USING (public.auth_usuario_ativo());

CREATE POLICY "veiculos_insert_ativo"
  ON public.veiculos FOR INSERT TO authenticated
  WITH CHECK (public.auth_usuario_ativo());

CREATE POLICY "veiculos_update_ativo"
  ON public.veiculos FOR UPDATE TO authenticated
  USING (public.auth_usuario_ativo())
  WITH CHECK (public.auth_usuario_ativo());

CREATE POLICY "veiculos_delete_admin"
  ON public.veiculos FOR DELETE TO authenticated
  USING (
    public.auth_usuario_ativo()
    AND public.auth_usuario_role() = 'administrador'
  );

-- comunicacoes
DROP POLICY IF EXISTS "comunicacoes_ativo_all" ON public.comunicacoes;
DROP POLICY IF EXISTS "comunicacoes_select_ativo" ON public.comunicacoes;
DROP POLICY IF EXISTS "comunicacoes_insert_ativo" ON public.comunicacoes;
DROP POLICY IF EXISTS "comunicacoes_update_ativo" ON public.comunicacoes;
DROP POLICY IF EXISTS "comunicacoes_delete_admin" ON public.comunicacoes;

CREATE POLICY "comunicacoes_select_ativo"
  ON public.comunicacoes FOR SELECT TO authenticated
  USING (public.auth_usuario_ativo());

CREATE POLICY "comunicacoes_insert_ativo"
  ON public.comunicacoes FOR INSERT TO authenticated
  WITH CHECK (public.auth_usuario_ativo());

CREATE POLICY "comunicacoes_update_ativo"
  ON public.comunicacoes FOR UPDATE TO authenticated
  USING (public.auth_usuario_ativo())
  WITH CHECK (public.auth_usuario_ativo());

CREATE POLICY "comunicacoes_delete_admin"
  ON public.comunicacoes FOR DELETE TO authenticated
  USING (
    public.auth_usuario_ativo()
    AND public.auth_usuario_role() = 'administrador'
  );

-- orcrims
DROP POLICY IF EXISTS "orcrims_ativo_all" ON public.orcrims;
DROP POLICY IF EXISTS "orcrims_select_ativo" ON public.orcrims;
DROP POLICY IF EXISTS "orcrims_insert_ativo" ON public.orcrims;
DROP POLICY IF EXISTS "orcrims_update_ativo" ON public.orcrims;
DROP POLICY IF EXISTS "orcrims_delete_admin" ON public.orcrims;

CREATE POLICY "orcrims_select_ativo"
  ON public.orcrims FOR SELECT TO authenticated
  USING (public.auth_usuario_ativo());

CREATE POLICY "orcrims_insert_ativo"
  ON public.orcrims FOR INSERT TO authenticated
  WITH CHECK (public.auth_usuario_ativo());

CREATE POLICY "orcrims_update_ativo"
  ON public.orcrims FOR UPDATE TO authenticated
  USING (public.auth_usuario_ativo())
  WITH CHECK (public.auth_usuario_ativo());

CREATE POLICY "orcrims_delete_admin"
  ON public.orcrims FOR DELETE TO authenticated
  USING (
    public.auth_usuario_ativo()
    AND public.auth_usuario_role() = 'administrador'
  );

-- ---------------------------------------------------------------------------
-- documentos / casos: só o DELETE muda (independente de unidade)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "documentos_delete_por_unidade" ON public.documentos;
DROP POLICY IF EXISTS "documentos_delete_admin" ON public.documentos;

CREATE POLICY "documentos_delete_admin"
  ON public.documentos FOR DELETE TO authenticated
  USING (
    public.auth_usuario_ativo()
    AND public.auth_usuario_role() = 'administrador'
  );

DROP POLICY IF EXISTS "casos_delete_por_unidade" ON public.casos;
DROP POLICY IF EXISTS "casos_delete_admin" ON public.casos;

CREATE POLICY "casos_delete_admin"
  ON public.casos FOR DELETE TO authenticated
  USING (
    public.auth_usuario_ativo()
    AND public.auth_usuario_role() = 'administrador'
  );
