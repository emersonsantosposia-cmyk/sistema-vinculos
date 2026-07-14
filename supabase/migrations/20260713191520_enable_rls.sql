-- Migration: Row Level Security (RLS) inicial
--
-- IMPORTANTE: estas políticas são um ponto de partida.
-- Devem ser refinadas depois, por exemplo:
--   - usuário só edita/exclui o que ele mesmo cadastrou (usuario_cadastro = auth.uid());
--   - perfis com permissões diferentes por tipo de entidade;
--   - leitura ampla com escrita restrita a papéis específicos.
-- Por enquanto, qualquer usuário autenticado tem CRUD completo;
-- usuários não autenticados não têm nenhum acesso.

-- ---------------------------------------------------------------------------
-- Habilitar RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pessoas_redes_sociais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pessoas_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vinculos ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Políticas: authenticated tem SELECT, INSERT, UPDATE e DELETE
-- (role anon não recebe políticas → sem acesso)
-- ---------------------------------------------------------------------------

-- pessoas
CREATE POLICY "pessoas_authenticated_all"
  ON public.pessoas
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- pessoas_redes_sociais
CREATE POLICY "pessoas_redes_sociais_authenticated_all"
  ON public.pessoas_redes_sociais
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- pessoas_fotos
CREATE POLICY "pessoas_fotos_authenticated_all"
  ON public.pessoas_fotos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- empresas
CREATE POLICY "empresas_authenticated_all"
  ON public.empresas
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- locais
CREATE POLICY "locais_authenticated_all"
  ON public.locais
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- veiculos
CREATE POLICY "veiculos_authenticated_all"
  ON public.veiculos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- procedimentos
CREATE POLICY "procedimentos_authenticated_all"
  ON public.procedimentos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- casos
CREATE POLICY "casos_authenticated_all"
  ON public.casos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- observacoes
CREATE POLICY "observacoes_authenticated_all"
  ON public.observacoes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- vinculos
CREATE POLICY "vinculos_authenticated_all"
  ON public.vinculos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
