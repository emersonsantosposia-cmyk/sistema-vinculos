-- Coordenadas de endereço: ajuste manual e nível de precisão do geocode.

ALTER TABLE public.enderecos
  ADD COLUMN IF NOT EXISTS coordenadas_ajustadas_manualmente boolean NOT NULL DEFAULT false;

ALTER TABLE public.enderecos
  ADD COLUMN IF NOT EXISTS geocode_precisao text
  CHECK (
    geocode_precisao IS NULL
    OR geocode_precisao IN ('exata', 'rua', 'bairro_cidade')
  );

COMMENT ON COLUMN public.enderecos.coordenadas_ajustadas_manualmente IS
  'True quando latitude/longitude foram definidas ou ajustadas manualmente (arraste, clique ou digitação). Impede sobrescrita silenciosa pela geocodificação automática.';

COMMENT ON COLUMN public.enderecos.geocode_precisao IS
  'Nível de precisão do último geocode automático: exata (número do imóvel), rua ou bairro_cidade. Nulo se nunca geocodificado ou se coordenadas foram ajustadas manualmente.';
