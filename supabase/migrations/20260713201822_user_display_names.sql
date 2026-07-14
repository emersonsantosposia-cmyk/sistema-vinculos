-- Função para exibir nomes de usuários nas observações (timeline).
-- Lê de auth.users (nome no metadata ou parte local do e-mail).

CREATE OR REPLACE FUNCTION public.get_user_display_names(ids uuid[])
RETURNS TABLE (id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT
    u.id,
    COALESCE(
      NULLIF(u.raw_user_meta_data->>'full_name', ''),
      NULLIF(u.raw_user_meta_data->>'name', ''),
      NULLIF(split_part(u.email, '@', 1), ''),
      u.email::text,
      'Usuário'
    ) AS display_name
  FROM auth.users u
  WHERE u.id = ANY (ids);
$$;

REVOKE ALL ON FUNCTION public.get_user_display_names(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_display_names(uuid[]) TO authenticated;
