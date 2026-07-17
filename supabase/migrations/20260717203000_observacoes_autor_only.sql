-- Observações: só o autor edita/exclui; leitura/criação para usuários ativos.

DROP POLICY IF EXISTS "observacoes_ativo_all" ON public.observacoes;

CREATE POLICY "observacoes_select_ativo"
  ON public.observacoes
  FOR SELECT
  TO authenticated
  USING (public.auth_usuario_ativo());

CREATE POLICY "observacoes_insert_ativo"
  ON public.observacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.auth_usuario_ativo()
    AND usuario = (SELECT auth.uid())
  );

CREATE POLICY "observacoes_update_own"
  ON public.observacoes
  FOR UPDATE
  TO authenticated
  USING (
    public.auth_usuario_ativo()
    AND usuario = (SELECT auth.uid())
  )
  WITH CHECK (
    public.auth_usuario_ativo()
    AND usuario = (SELECT auth.uid())
  );

CREATE POLICY "observacoes_delete_own"
  ON public.observacoes
  FOR DELETE
  TO authenticated
  USING (
    public.auth_usuario_ativo()
    AND usuario = (SELECT auth.uid())
  );
