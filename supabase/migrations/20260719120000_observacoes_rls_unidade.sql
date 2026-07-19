-- Fecha vazamento de observações ligadas a documentos/casos de outras unidades.
-- Mantém leitura/escrita livre (usuário ativo) para demais entidade_tipo.
-- UPDATE/DELETE continuam restritos ao autor, com a mesma barreira de unidade.

DROP POLICY IF EXISTS "observacoes_select_ativo" ON public.observacoes;
DROP POLICY IF EXISTS "observacoes_insert_ativo" ON public.observacoes;
DROP POLICY IF EXISTS "observacoes_update_own" ON public.observacoes;
DROP POLICY IF EXISTS "observacoes_delete_own" ON public.observacoes;

-- Predicado compartilhado: acesso à entidade-pai da observação.
CREATE OR REPLACE FUNCTION public.observacao_entidade_acessivel(
  p_entidade_tipo text,
  p_entidade_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    public.auth_usuario_ativo()
    AND (
      (
        p_entidade_tipo IS DISTINCT FROM 'documento'
        AND p_entidade_tipo IS DISTINCT FROM 'caso'
      )
      OR (
        p_entidade_tipo = 'documento'
        AND EXISTS (
          SELECT 1
          FROM public.documentos d
          WHERE d.id = p_entidade_id
            AND (
              public.auth_usuario_role() = 'administrador'
              OR public.auth_usuario_unidade() = 'CGIN'
              OR d.unidade = public.auth_usuario_unidade()
            )
        )
      )
      OR (
        p_entidade_tipo = 'caso'
        AND EXISTS (
          SELECT 1
          FROM public.casos c
          WHERE c.id = p_entidade_id
            AND (
              public.auth_usuario_role() = 'administrador'
              OR public.auth_usuario_unidade() = 'CGIN'
              OR c.unidade = public.auth_usuario_unidade()
            )
        )
      )
    );
$$;

COMMENT ON FUNCTION public.observacao_entidade_acessivel(text, uuid) IS
  'True se o usuário ativo pode ver observações da entidade: regra geral, '
  'ou a mesma regra de unidade de documentos/casos quando aplicável.';

REVOKE ALL ON FUNCTION public.observacao_entidade_acessivel(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.observacao_entidade_acessivel(text, uuid) TO authenticated;

CREATE POLICY "observacoes_select_ativo"
  ON public.observacoes
  FOR SELECT
  TO authenticated
  USING (
    public.observacao_entidade_acessivel(entidade_tipo, entidade_id)
  );

CREATE POLICY "observacoes_insert_ativo"
  ON public.observacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.observacao_entidade_acessivel(entidade_tipo, entidade_id)
    AND usuario = (SELECT auth.uid())
  );

CREATE POLICY "observacoes_update_own"
  ON public.observacoes
  FOR UPDATE
  TO authenticated
  USING (
    public.observacao_entidade_acessivel(entidade_tipo, entidade_id)
    AND usuario = (SELECT auth.uid())
  )
  WITH CHECK (
    public.observacao_entidade_acessivel(entidade_tipo, entidade_id)
    AND usuario = (SELECT auth.uid())
  );

CREATE POLICY "observacoes_delete_own"
  ON public.observacoes
  FOR DELETE
  TO authenticated
  USING (
    public.observacao_entidade_acessivel(entidade_tipo, entidade_id)
    AND usuario = (SELECT auth.uid())
  );
