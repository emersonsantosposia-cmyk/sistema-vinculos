-- Foto ilustrativa (caminho no Storage) para endereços, empresas e orcrims.
-- Padrão alinhado a veiculos.foto_url + buckets privados.

ALTER TABLE public.enderecos
  ADD COLUMN IF NOT EXISTS foto_url text;

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS foto_url text;

ALTER TABLE public.orcrims
  ADD COLUMN IF NOT EXISTS foto_url text;

COMMENT ON COLUMN public.enderecos.foto_url IS
  'Caminho do arquivo no bucket fotos-enderecos (não é URL pública).';
COMMENT ON COLUMN public.empresas.foto_url IS
  'Caminho do arquivo no bucket fotos-empresas (não é URL pública).';
COMMENT ON COLUMN public.orcrims.foto_url IS
  'Caminho do arquivo no bucket fotos-orcrims (não é URL pública).';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'fotos-enderecos',
    'fotos-enderecos',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'fotos-empresas',
    'fotos-empresas',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'fotos-orcrims',
    'fotos-orcrims',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
ON CONFLICT (id) DO NOTHING;

-- fotos-enderecos
CREATE POLICY "fotos_enderecos_select_ativo"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'fotos-enderecos'
    AND public.auth_usuario_ativo()
  );

CREATE POLICY "fotos_enderecos_insert_ativo"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fotos-enderecos'
    AND public.auth_usuario_ativo()
  );

CREATE POLICY "fotos_enderecos_update_ativo"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'fotos-enderecos'
    AND public.auth_usuario_ativo()
  )
  WITH CHECK (
    bucket_id = 'fotos-enderecos'
    AND public.auth_usuario_ativo()
  );

CREATE POLICY "fotos_enderecos_delete_ativo"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'fotos-enderecos'
    AND public.auth_usuario_ativo()
  );

-- fotos-empresas
CREATE POLICY "fotos_empresas_select_ativo"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'fotos-empresas'
    AND public.auth_usuario_ativo()
  );

CREATE POLICY "fotos_empresas_insert_ativo"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fotos-empresas'
    AND public.auth_usuario_ativo()
  );

CREATE POLICY "fotos_empresas_update_ativo"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'fotos-empresas'
    AND public.auth_usuario_ativo()
  )
  WITH CHECK (
    bucket_id = 'fotos-empresas'
    AND public.auth_usuario_ativo()
  );

CREATE POLICY "fotos_empresas_delete_ativo"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'fotos-empresas'
    AND public.auth_usuario_ativo()
  );

-- fotos-orcrims
CREATE POLICY "fotos_orcrims_select_ativo"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'fotos-orcrims'
    AND public.auth_usuario_ativo()
  );

CREATE POLICY "fotos_orcrims_insert_ativo"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fotos-orcrims'
    AND public.auth_usuario_ativo()
  );

CREATE POLICY "fotos_orcrims_update_ativo"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'fotos-orcrims'
    AND public.auth_usuario_ativo()
  )
  WITH CHECK (
    bucket_id = 'fotos-orcrims'
    AND public.auth_usuario_ativo()
  );

CREATE POLICY "fotos_orcrims_delete_ativo"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'fotos-orcrims'
    AND public.auth_usuario_ativo()
  );
