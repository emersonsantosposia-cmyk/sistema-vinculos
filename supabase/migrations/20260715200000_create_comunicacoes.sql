-- Migration: entidade Comunicações
-- Cria a tabela comunicacoes, amplia CHECKs de observacoes/vinculos,
-- habilita RLS e registra auditoria no mesmo padrão das demais entidades.

-- ---------------------------------------------------------------------------
-- 1. Tabela comunicacoes
-- ---------------------------------------------------------------------------
CREATE TABLE public.comunicacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (
    tipo IN (
      'imsi',
      'imei',
      'email',
      'telefone_fixo',
      'whatsapp',
      'telegram',
      'radio',
      'outros'
    )
  ),
  valor text NOT NULL,
  operadora_provedor text,
  status text NOT NULL DEFAULT 'desconhecido' CHECK (
    status IN ('ativo', 'inativo', 'desconhecido')
  ),
  fonte text,
  observacao_geral text,
  usuario_cadastro uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  data_cadastro timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.comunicacoes IS
  'Meios de comunicação e identificadores digitais/telefone utilizados nas investigações (IMSI, IMEI, e-mail, WhatsApp etc.).';
COMMENT ON COLUMN public.comunicacoes.id IS
  'Identificador único do registro de comunicação.';
COMMENT ON COLUMN public.comunicacoes.tipo IS
  'Tipo do meio/identificador: imsi (número de celular/SIM), imei (aparelho de celular), email, telefone_fixo, whatsapp, telegram, radio ou outros.';
COMMENT ON COLUMN public.comunicacoes.valor IS
  'Identificador em si; o significado muda conforme o tipo — ex.: número IMSI/MSISDN, número IMEI do aparelho, endereço de e-mail, telefone fixo, handle/número de WhatsApp ou Telegram, identificador de rádio etc.';
COMMENT ON COLUMN public.comunicacoes.operadora_provedor IS
  'Operadora ou provedor associado (opcional; ex.: Vivo, Claro, Tim, Gmail, Outlook). Mais relevante para celular e e-mail.';
COMMENT ON COLUMN public.comunicacoes.status IS
  'Situação do meio de comunicação: ativo, inativo ou desconhecido (padrão).';
COMMENT ON COLUMN public.comunicacoes.fonte IS
  'Origem da informação (texto livre, opcional).';
COMMENT ON COLUMN public.comunicacoes.observacao_geral IS
  'Observação simples do próprio cadastro (diferente da timeline genérica em observacoes).';
COMMENT ON COLUMN public.comunicacoes.usuario_cadastro IS
  'Usuário autenticado que registrou o cadastro.';
COMMENT ON COLUMN public.comunicacoes.data_cadastro IS
  'Data e hora em que o registro foi criado.';

-- ---------------------------------------------------------------------------
-- 2. Ampliar CHECKs de entidade_tipo (observacoes e vinculos)
-- ---------------------------------------------------------------------------
ALTER TABLE public.observacoes DROP CONSTRAINT IF EXISTS observacoes_entidade_tipo_check;
ALTER TABLE public.vinculos DROP CONSTRAINT IF EXISTS vinculos_entidade_origem_tipo_check;
ALTER TABLE public.vinculos DROP CONSTRAINT IF EXISTS vinculos_entidade_destino_tipo_check;

ALTER TABLE public.observacoes
  ADD CONSTRAINT observacoes_entidade_tipo_check
  CHECK (
    entidade_tipo IN (
      'pessoa',
      'empresa',
      'endereco',
      'veiculo',
      'procedimento',
      'caso',
      'comunicacao'
    )
  );

ALTER TABLE public.vinculos
  ADD CONSTRAINT vinculos_entidade_origem_tipo_check
  CHECK (
    entidade_origem_tipo IN (
      'pessoa',
      'empresa',
      'endereco',
      'veiculo',
      'procedimento',
      'caso',
      'comunicacao'
    )
  );

ALTER TABLE public.vinculos
  ADD CONSTRAINT vinculos_entidade_destino_tipo_check
  CHECK (
    entidade_destino_tipo IN (
      'pessoa',
      'empresa',
      'endereco',
      'veiculo',
      'procedimento',
      'caso',
      'comunicacao'
    )
  );

COMMENT ON COLUMN public.observacoes.entidade_tipo IS
  'Tipo da entidade alvo: pessoa, empresa, endereco, veiculo, procedimento, caso ou comunicacao.';

-- ---------------------------------------------------------------------------
-- 3. RLS (mesmo padrão: authenticated com SELECT/INSERT/UPDATE/DELETE)
-- ---------------------------------------------------------------------------
ALTER TABLE public.comunicacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comunicacoes_authenticated_all"
  ON public.comunicacoes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 4. Trigger de auditoria (mesmo padrão das demais entidades)
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_auditoria_comunicacoes
  AFTER INSERT OR UPDATE OR DELETE ON public.comunicacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auditoria_entidade();
