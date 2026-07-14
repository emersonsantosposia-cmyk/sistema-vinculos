-- Migration: buckets privados de Storage (fotos de pessoas e veículos)
--
-- Buckets NÃO públicos: o frontend não deve usar getPublicUrl().
-- Para exibir imagens, gere signed URLs no backend/cliente autenticado
-- (createSignedUrl / createSignedUrls) com tempo de expiração curto.
--
-- Políticas iniciais: qualquer usuário autenticado pode ler, enviar e
-- excluir objetos nesses buckets. Refine depois se necessário
-- (ex.: pastas por usuário, papéis distintos).

-- ---------------------------------------------------------------------------
-- Buckets (privados)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'fotos-pessoas',
    'fotos-pessoas',
    false,
    10485760, -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'fotos-veiculos',
    'fotos-veiculos',
    false,
    10485760, -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- fotos-pessoas
-- ---------------------------------------------------------------------------
CREATE POLICY "fotos_pessoas_select_authenticated"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'fotos-pessoas');

CREATE POLICY "fotos_pessoas_insert_authenticated"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'fotos-pessoas');

CREATE POLICY "fotos_pessoas_update_authenticated"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'fotos-pessoas')
  WITH CHECK (bucket_id = 'fotos-pessoas');

CREATE POLICY "fotos_pessoas_delete_authenticated"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'fotos-pessoas');

-- ---------------------------------------------------------------------------
-- fotos-veiculos
-- ---------------------------------------------------------------------------
CREATE POLICY "fotos_veiculos_select_authenticated"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'fotos-veiculos');

CREATE POLICY "fotos_veiculos_insert_authenticated"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'fotos-veiculos');

CREATE POLICY "fotos_veiculos_update_authenticated"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'fotos-veiculos')
  WITH CHECK (bucket_id = 'fotos-veiculos');

CREATE POLICY "fotos_veiculos_delete_authenticated"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'fotos-veiculos');
