-- Migration: schema inicial da Rede Lince
-- Entidades: pessoas, empresas, locais, veículos, procedimentos, casos,
-- observações (timeline) e vínculos genéricos.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. pessoas
-- ---------------------------------------------------------------------------
CREATE TABLE public.pessoas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (
    tipo IN ('ppf', 'terceirizado', 'preso', 'advogado', 'visitante', 'outros')
  ),
  nome text NOT NULL,
  cpf text,
  nome_mae text,
  nome_pai text,
  profissao text,
  usuario_cadastro uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  data_cadastro timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pessoas IS
  'Cadastro de pessoas envolvidas em investigações (PPF, terceirizados, presos, advogados, visitantes e outros).';
COMMENT ON COLUMN public.pessoas.id IS 'Identificador único da pessoa.';
COMMENT ON COLUMN public.pessoas.tipo IS
  'Categoria da pessoa: ppf, terceirizado, preso, advogado, visitante ou outros.';
COMMENT ON COLUMN public.pessoas.nome IS 'Nome completo da pessoa.';
COMMENT ON COLUMN public.pessoas.cpf IS 'CPF da pessoa (quando disponível).';
COMMENT ON COLUMN public.pessoas.nome_mae IS 'Nome da mãe.';
COMMENT ON COLUMN public.pessoas.nome_pai IS 'Nome do pai.';
COMMENT ON COLUMN public.pessoas.profissao IS 'Profissão ou ocupação declarada.';
COMMENT ON COLUMN public.pessoas.usuario_cadastro IS
  'Usuário autenticado que registrou o cadastro.';
COMMENT ON COLUMN public.pessoas.data_cadastro IS
  'Data e hora em que o registro foi criado.';

-- ---------------------------------------------------------------------------
-- 2. pessoas_redes_sociais
-- ---------------------------------------------------------------------------
CREATE TABLE public.pessoas_redes_sociais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid NOT NULL REFERENCES public.pessoas (id) ON DELETE CASCADE,
  rede text,
  link text
);

COMMENT ON TABLE public.pessoas_redes_sociais IS
  'Perfis de redes sociais vinculados a uma pessoa.';
COMMENT ON COLUMN public.pessoas_redes_sociais.id IS
  'Identificador único do perfil de rede social.';
COMMENT ON COLUMN public.pessoas_redes_sociais.pessoa_id IS
  'Pessoa à qual o perfil pertence.';
COMMENT ON COLUMN public.pessoas_redes_sociais.rede IS
  'Nome da rede social (ex.: Instagram, Facebook, X).';
COMMENT ON COLUMN public.pessoas_redes_sociais.link IS
  'URL ou identificador do perfil na rede.';

-- ---------------------------------------------------------------------------
-- 3. pessoas_fotos
-- ---------------------------------------------------------------------------
CREATE TABLE public.pessoas_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid NOT NULL REFERENCES public.pessoas (id) ON DELETE CASCADE,
  url_arquivo text,
  tipo text CHECK (tipo IN ('perfil', 'outra')),
  data_upload timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pessoas_fotos IS
  'Fotos associadas a uma pessoa (perfil ou demais imagens).';
COMMENT ON COLUMN public.pessoas_fotos.id IS 'Identificador único da foto.';
COMMENT ON COLUMN public.pessoas_fotos.pessoa_id IS
  'Pessoa à qual a foto pertence.';
COMMENT ON COLUMN public.pessoas_fotos.url_arquivo IS
  'URL do arquivo de imagem armazenado (ex.: Supabase Storage).';
COMMENT ON COLUMN public.pessoas_fotos.tipo IS
  'Tipo da foto: perfil ou outra.';
COMMENT ON COLUMN public.pessoas_fotos.data_upload IS
  'Data e hora do upload da imagem.';

-- ---------------------------------------------------------------------------
-- 4. empresas
-- ---------------------------------------------------------------------------
CREATE TABLE public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_fantasia text,
  razao_social text NOT NULL,
  cnpj text,
  cnae_principal text,
  usuario_cadastro uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  data_cadastro timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.empresas IS
  'Cadastro de empresas e organizações relacionadas às investigações.';
COMMENT ON COLUMN public.empresas.id IS 'Identificador único da empresa.';
COMMENT ON COLUMN public.empresas.nome_fantasia IS 'Nome fantasia da empresa.';
COMMENT ON COLUMN public.empresas.razao_social IS
  'Razão social registrada (obrigatória).';
COMMENT ON COLUMN public.empresas.cnpj IS 'CNPJ da empresa (quando disponível).';
COMMENT ON COLUMN public.empresas.cnae_principal IS
  'Código CNAE da atividade principal.';
COMMENT ON COLUMN public.empresas.usuario_cadastro IS
  'Usuário autenticado que registrou o cadastro.';
COMMENT ON COLUMN public.empresas.data_cadastro IS
  'Data e hora em que o registro foi criado.';

-- ---------------------------------------------------------------------------
-- 5. locais
-- ---------------------------------------------------------------------------
CREATE TABLE public.locais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text,
  logradouro text,
  numero text,
  bairro text,
  complemento text,
  cidade text,
  estado text,
  cep text,
  latitude numeric,
  longitude numeric,
  usuario_cadastro uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  data_cadastro timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.locais IS
  'Endereços e pontos geográficos de interesse investigativo.';
COMMENT ON COLUMN public.locais.id IS 'Identificador único do local.';
COMMENT ON COLUMN public.locais.nome IS
  'Nome ou apelido do local (ex.: sede, galpão).';
COMMENT ON COLUMN public.locais.logradouro IS 'Logradouro (rua, avenida etc.).';
COMMENT ON COLUMN public.locais.numero IS 'Número do endereço.';
COMMENT ON COLUMN public.locais.bairro IS 'Bairro.';
COMMENT ON COLUMN public.locais.complemento IS
  'Complemento do endereço (apto, sala etc.).';
COMMENT ON COLUMN public.locais.cidade IS 'Cidade.';
COMMENT ON COLUMN public.locais.estado IS 'Unidade federativa (UF).';
COMMENT ON COLUMN public.locais.cep IS 'CEP.';
COMMENT ON COLUMN public.locais.latitude IS 'Latitude geográfica.';
COMMENT ON COLUMN public.locais.longitude IS 'Longitude geográfica.';
COMMENT ON COLUMN public.locais.usuario_cadastro IS
  'Usuário autenticado que registrou o cadastro.';
COMMENT ON COLUMN public.locais.data_cadastro IS
  'Data e hora em que o registro foi criado.';

-- ---------------------------------------------------------------------------
-- 6. veiculos
-- ---------------------------------------------------------------------------
CREATE TABLE public.veiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placa text,
  marca text,
  modelo text,
  cor text,
  ano_fabricacao int,
  ano_modelo int,
  foto_url text,
  usuario_cadastro uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  data_cadastro timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.veiculos IS
  'Cadastro de veículos relacionados a pessoas, empresas ou procedimentos.';
COMMENT ON COLUMN public.veiculos.id IS 'Identificador único do veículo.';
COMMENT ON COLUMN public.veiculos.placa IS 'Placa do veículo.';
COMMENT ON COLUMN public.veiculos.marca IS 'Marca do veículo.';
COMMENT ON COLUMN public.veiculos.modelo IS 'Modelo do veículo.';
COMMENT ON COLUMN public.veiculos.cor IS 'Cor predominante.';
COMMENT ON COLUMN public.veiculos.ano_fabricacao IS 'Ano de fabricação.';
COMMENT ON COLUMN public.veiculos.ano_modelo IS 'Ano do modelo.';
COMMENT ON COLUMN public.veiculos.foto_url IS
  'URL da foto do veículo (ex.: Supabase Storage).';
COMMENT ON COLUMN public.veiculos.usuario_cadastro IS
  'Usuário autenticado que registrou o cadastro.';
COMMENT ON COLUMN public.veiculos.data_cadastro IS
  'Data e hora em que o registro foi criado.';

-- ---------------------------------------------------------------------------
-- 7. procedimentos
-- ---------------------------------------------------------------------------
CREATE TABLE public.procedimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text CHECK (tipo IN ('RCI', 'RELINT', 'DADOS', 'OUTROS')),
  nome text,
  resumo text,
  data date,
  link_cronos text,
  usuario_cadastro uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  data_cadastro timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.procedimentos IS
  'Procedimentos de inteligência/investigação (RCI, RELINT, DADOS e outros).';
COMMENT ON COLUMN public.procedimentos.id IS
  'Identificador único do procedimento.';
COMMENT ON COLUMN public.procedimentos.tipo IS
  'Tipo do procedimento: RCI, RELINT, DADOS ou OUTROS.';
COMMENT ON COLUMN public.procedimentos.nome IS
  'Nome ou título do procedimento.';
COMMENT ON COLUMN public.procedimentos.resumo IS
  'Resumo descritivo do conteúdo.';
COMMENT ON COLUMN public.procedimentos.data IS
  'Data de referência do procedimento.';
COMMENT ON COLUMN public.procedimentos.link_cronos IS
  'Link para o registro correspondente no sistema Cronos.';
COMMENT ON COLUMN public.procedimentos.usuario_cadastro IS
  'Usuário autenticado que registrou o cadastro.';
COMMENT ON COLUMN public.procedimentos.data_cadastro IS
  'Data e hora em que o registro foi criado.';

-- ---------------------------------------------------------------------------
-- 8. casos
-- ---------------------------------------------------------------------------
CREATE TABLE public.casos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text,
  nome text,
  data_abertura date,
  link_cronos text,
  usuario_cadastro uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  data_cadastro timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.casos IS
  'Casos investigativos que agrupam entidades e procedimentos.';
COMMENT ON COLUMN public.casos.id IS 'Identificador único do caso.';
COMMENT ON COLUMN public.casos.numero IS
  'Número oficial ou interno do caso.';
COMMENT ON COLUMN public.casos.nome IS 'Nome ou título do caso.';
COMMENT ON COLUMN public.casos.data_abertura IS 'Data de abertura do caso.';
COMMENT ON COLUMN public.casos.link_cronos IS
  'Link para o registro correspondente no sistema Cronos.';
COMMENT ON COLUMN public.casos.usuario_cadastro IS
  'Usuário autenticado que registrou o cadastro.';
COMMENT ON COLUMN public.casos.data_cadastro IS
  'Data e hora em que o registro foi criado.';

-- ---------------------------------------------------------------------------
-- 9. observacoes (timeline genérica)
-- ---------------------------------------------------------------------------
CREATE TABLE public.observacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_tipo text NOT NULL CHECK (
    entidade_tipo IN (
      'pessoa',
      'empresa',
      'local',
      'veiculo',
      'procedimento',
      'caso'
    )
  ),
  entidade_id uuid NOT NULL,
  usuario uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  mensagem text NOT NULL,
  data_hora timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.observacoes IS
  'Timeline genérica de observações (estilo posts) anexadas a qualquer entidade.';
COMMENT ON COLUMN public.observacoes.id IS
  'Identificador único da observação.';
COMMENT ON COLUMN public.observacoes.entidade_tipo IS
  'Tipo da entidade alvo: pessoa, empresa, local, veiculo, procedimento ou caso.';
COMMENT ON COLUMN public.observacoes.entidade_id IS
  'ID da entidade à qual a observação se refere.';
COMMENT ON COLUMN public.observacoes.usuario IS
  'Usuário autenticado que postou a observação.';
COMMENT ON COLUMN public.observacoes.mensagem IS
  'Conteúdo textual da observação.';
COMMENT ON COLUMN public.observacoes.data_hora IS
  'Data e hora da publicação na timeline.';

CREATE INDEX observacoes_entidade_idx
  ON public.observacoes (entidade_tipo, entidade_id);

-- ---------------------------------------------------------------------------
-- 10. vinculos (relação genérica entre entidades)
-- ---------------------------------------------------------------------------
CREATE TABLE public.vinculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_origem_tipo text NOT NULL CHECK (
    entidade_origem_tipo IN (
      'pessoa',
      'empresa',
      'local',
      'veiculo',
      'procedimento',
      'caso'
    )
  ),
  entidade_origem_id uuid NOT NULL,
  entidade_destino_tipo text NOT NULL CHECK (
    entidade_destino_tipo IN (
      'pessoa',
      'empresa',
      'local',
      'veiculo',
      'procedimento',
      'caso'
    )
  ),
  entidade_destino_id uuid NOT NULL,
  tipo_vinculo text,
  observacao text,
  usuario_cadastro uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  data_cadastro timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.vinculos IS
  'Relações genéricas entre quaisquer duas entidades do sistema (grafo de vínculos).';
COMMENT ON COLUMN public.vinculos.id IS 'Identificador único do vínculo.';
COMMENT ON COLUMN public.vinculos.entidade_origem_tipo IS
  'Tipo da entidade de origem do vínculo.';
COMMENT ON COLUMN public.vinculos.entidade_origem_id IS
  'ID da entidade de origem.';
COMMENT ON COLUMN public.vinculos.entidade_destino_tipo IS
  'Tipo da entidade de destino do vínculo.';
COMMENT ON COLUMN public.vinculos.entidade_destino_id IS
  'ID da entidade de destino.';
COMMENT ON COLUMN public.vinculos.tipo_vinculo IS
  'Natureza do vínculo (ex.: proprietário de, reside em, associado a, familiar de).';
COMMENT ON COLUMN public.vinculos.observacao IS
  'Observação complementar sobre o vínculo.';
COMMENT ON COLUMN public.vinculos.usuario_cadastro IS
  'Usuário autenticado que registrou o vínculo.';
COMMENT ON COLUMN public.vinculos.data_cadastro IS
  'Data e hora em que o vínculo foi criado.';

CREATE INDEX vinculos_origem_idx
  ON public.vinculos (entidade_origem_tipo, entidade_origem_id);

CREATE INDEX vinculos_destino_idx
  ON public.vinculos (entidade_destino_tipo, entidade_destino_id);
