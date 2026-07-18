-- Visualizações salvas do diagrama de vínculos.
-- Qualquer usuário ativo vê e cria; só o autor ou administrador exclui.

CREATE TABLE public.diagrama_visualizacoes_salvas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  entidade_inicial_tipo text NOT NULL,
  entidade_inicial_id uuid NOT NULL,
  estado_json jsonb NOT NULL,
  usuario_cadastro uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  data_cadastro timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT diagrama_visualizacoes_salvas_nome_check
    CHECK (length(btrim(nome)) > 0)
);

COMMENT ON TABLE public.diagrama_visualizacoes_salvas IS
  'Estados salvos do diagrama de vínculos para retomar ou compartilhar explorações.';
COMMENT ON COLUMN public.diagrama_visualizacoes_salvas.nome IS
  'Nome dado pelo analista para identificar a exploração.';
COMMENT ON COLUMN public.diagrama_visualizacoes_salvas.entidade_inicial_tipo IS
  'Tipo da entidade raiz do diagrama (pessoa, caso, etc.).';
COMMENT ON COLUMN public.diagrama_visualizacoes_salvas.entidade_inicial_id IS
  'ID da entidade raiz do diagrama.';
COMMENT ON COLUMN public.diagrama_visualizacoes_salvas.estado_json IS
  'Snapshot dos nós/arestas/posições/pins suficientes para reconstruir o canvas.';
COMMENT ON COLUMN public.diagrama_visualizacoes_salvas.usuario_cadastro IS
  'Usuário que salvou a visualização.';
COMMENT ON COLUMN public.diagrama_visualizacoes_salvas.data_cadastro IS
  'Data/hora em que a visualização foi salva.';

CREATE INDEX diagrama_visualizacoes_salvas_data_idx
  ON public.diagrama_visualizacoes_salvas (data_cadastro DESC);

CREATE INDEX diagrama_visualizacoes_salvas_raiz_idx
  ON public.diagrama_visualizacoes_salvas (entidade_inicial_tipo, entidade_inicial_id);

ALTER TABLE public.diagrama_visualizacoes_salvas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "diagrama_visualizacoes_select_ativo"
  ON public.diagrama_visualizacoes_salvas
  FOR SELECT
  TO authenticated
  USING (public.auth_usuario_ativo());

CREATE POLICY "diagrama_visualizacoes_insert_ativo"
  ON public.diagrama_visualizacoes_salvas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.auth_usuario_ativo()
    AND usuario_cadastro = (SELECT auth.uid())
  );

CREATE POLICY "diagrama_visualizacoes_update_own"
  ON public.diagrama_visualizacoes_salvas
  FOR UPDATE
  TO authenticated
  USING (
    public.auth_usuario_ativo()
    AND usuario_cadastro = (SELECT auth.uid())
  )
  WITH CHECK (
    public.auth_usuario_ativo()
    AND usuario_cadastro = (SELECT auth.uid())
  );

CREATE POLICY "diagrama_visualizacoes_delete_own_or_admin"
  ON public.diagrama_visualizacoes_salvas
  FOR DELETE
  TO authenticated
  USING (
    public.auth_usuario_ativo()
    AND (
      public.auth_usuario_role() = 'administrador'
      OR usuario_cadastro = (SELECT auth.uid())
    )
  );
