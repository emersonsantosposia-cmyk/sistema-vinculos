-- Restringe get_user_display_names: só nome de perfis_usuario, só se ativo,
-- sem acessar auth.users (e-mail/metadados).

CREATE OR REPLACE FUNCTION public.get_user_display_names(ids uuid[])
RETURNS TABLE (id uuid, display_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Chamador inativo ou sem sessão válida: nada.
  IF NOT public.auth_usuario_ativo() THEN
    RETURN;
  END IF;

  IF ids IS NULL OR coalesce(cardinality(ids), 0) = 0 THEN
    RETURN;
  END IF;

  -- Só IDs que existem em perfis_usuario — nunca auth.users.
  -- UUIDs sem perfil (ou inventados) não retornam linha (sem e-mail/metadados).
  RETURN QUERY
  SELECT
    p.id,
    p.nome::text AS display_name
  FROM public.perfis_usuario p
  WHERE p.id = ANY (ids);
END;
$$;

COMMENT ON FUNCTION public.get_user_display_names(uuid[]) IS
  'Resolve nomes de exibição a partir de perfis_usuario.nome. '
  'Exige auth_usuario_ativo(); não lê auth.users nem devolve e-mail/metadados.';

REVOKE ALL ON FUNCTION public.get_user_display_names(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_display_names(uuid[]) TO authenticated;
