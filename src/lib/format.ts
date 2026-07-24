import {
  CASO_STATUS,
  COMUNICACAO_STATUS,
  COMUNICACAO_TIPOS,
  COMUNICACAO_TIPOS_COM_OPERADORA,
  PESSOA_TIPOS,
  DOCUMENTO_TIPOS,
  type CasoStatus,
  type ComunicacaoStatus,
  type ComunicacaoTipo,
  type DocumentoTipo,
  type PessoaTipo,
} from "@/lib/types";

export function labelPessoaTipo(tipo: string): string {
  if (tipo === "outros") return "Agente público de outros órgãos";
  return PESSOA_TIPOS.find((t) => t.value === tipo)?.label ?? tipo;
}

/** Primeiro nome + último sobrenome (ex.: "Ana Laura Costa" → "Ana Costa"). */
export function formatNomeCurto(nome: string | null | undefined): string {
  if (!nome?.trim()) return "—";
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export function labelDocumentoTipo(tipo: string | null | undefined): string {
  if (!tipo) return "—";
  return DOCUMENTO_TIPOS.find((t) => t.value === tipo)?.label ?? tipo;
}

export function isDocumentoTipo(value: string): value is DocumentoTipo {
  return DOCUMENTO_TIPOS.some((t) => t.value === value);
}

/** Máscara 000.000.000-00 enquanto digita. */
export function maskCpfInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function formatCpf(cpf: string | null | undefined): string {
  if (!cpf) return "—";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

/** Aplica máscara 00.000.000/0000-00 enquanto digita. */
export function maskCnpjInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function formatCnpj(cnpj: string | null | undefined): string {
  if (!cnpj) return "—";
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return cnpj;
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

/** Máscara 00000-000 enquanto digita. */
export function maskCepInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

export function formatCep(cep: string | null | undefined): string {
  if (!cep) return "—";
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return cep;
  return digits.replace(/^(\d{5})(\d{3})$/, "$1-$2");
}

export const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

export type UF = (typeof UFS)[number];

export function isUF(value: string): value is UF {
  return (UFS as readonly string[]).includes(value);
}

/** Linha principal de identificação: logradouro + número. */
export function formatEnderecoTitulo(endereco: {
  logradouro?: string | null;
  numero?: string | null;
}): string {
  const line = [endereco.logradouro, endereco.numero]
    .filter(Boolean)
    .join(", ");
  return line || "Endereço sem logradouro";
}

export function formatEnderecoResumo(endereco: {
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
}): string {
  const line1 = [endereco.logradouro, endereco.numero].filter(Boolean).join(", ");
  const line2 = [endereco.bairro, endereco.cidade, endereco.estado]
    .filter(Boolean)
    .join(" · ");
  const parts = [line1, line2].filter(Boolean);
  return parts.length > 0 ? parts.join(" — ") : "—";
}

/** Normaliza placa para apenas letras/números em maiúsculas. */
export function normalizePlaca(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 7);
}

/**
 * Máscara de placa: antiga AAA-0000 ou Mercosul AAA0A00.
 * Detecta Mercosul quando o 5º caractere é letra.
 */
export function maskPlacaInput(value: string): string {
  const raw = normalizePlaca(value);
  if (raw.length <= 3) return raw;

  const isMercosul = raw.length >= 5 && /[A-Z]/.test(raw[4]);
  if (isMercosul) return raw;

  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

export function formatPlaca(placa: string | null | undefined): string {
  if (!placa) return "—";
  const raw = normalizePlaca(placa);
  if (raw.length === 0) return "—";
  if (raw.length === 7 && /[A-Z]/.test(raw[4])) return raw;
  if (raw.length > 3) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
  return raw;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  // date-only (YYYY-MM-DD) deve usar calendário local, sem shift de fuso
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("pt-BR");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}

/**
 * Idade em anos completos a partir de data_nascimento (YYYY-MM-DD ou Date).
 * Sempre calculada na leitura — nunca persistida.
 */
export function calcularIdade(
  dataNascimento: string | null | undefined,
  referencia: Date = new Date(),
): number | null {
  if (!dataNascimento) return null;

  let year: number;
  let month: number;
  let day: number;

  if (/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
    [year, month, day] = dataNascimento.split("-").map(Number);
  } else {
    const parsed = new Date(dataNascimento);
    if (Number.isNaN(parsed.getTime())) return null;
    year = parsed.getUTCFullYear();
    month = parsed.getUTCMonth() + 1;
    day = parsed.getUTCDate();
  }

  let idade = referencia.getFullYear() - year;
  const mesRef = referencia.getMonth() + 1;
  const diaRef = referencia.getDate();
  if (mesRef < month || (mesRef === month && diaRef < day)) {
    idade -= 1;
  }
  return idade < 0 ? null : idade;
}

export function formatIdade(
  dataNascimento: string | null | undefined,
): string {
  const idade = calcularIdade(dataNascimento);
  if (idade === null) return "—";
  return `${idade} ano${idade === 1 ? "" : "s"}`;
}

/** Ex.: 15/03/1990 (36 anos) — idade sempre calculada na leitura. */
export function formatNascimentoComIdade(
  dataNascimento: string | null | undefined,
): string {
  if (!dataNascimento) return "—";
  const data = formatDate(dataNascimento);
  const idade = calcularIdade(dataNascimento);
  if (idade === null) return data;
  return `${data} (${idade} ano${idade === 1 ? "" : "s"})`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Ex.: 12/07/2026 às 14:30 */
export function formatObservacaoDataHora(
  value: string | null | undefined,
): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const data = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const hora = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${data} às ${hora}`;
}

export function isPessoaTipo(value: string): value is PessoaTipo {
  return PESSOA_TIPOS.some((t) => t.value === value);
}

export function labelComunicacaoTipo(tipo: string | null | undefined): string {
  if (!tipo) return "—";
  return COMUNICACAO_TIPOS.find((t) => t.value === tipo)?.label ?? tipo;
}

export function labelCasoStatus(status: string | null | undefined): string {
  if (!status) return "—";
  return CASO_STATUS.find((t) => t.value === status)?.label ?? status;
}

export function isCasoStatus(value: string): value is CasoStatus {
  return CASO_STATUS.some((t) => t.value === value);
}

export function labelComunicacaoStatus(
  status: string | null | undefined,
): string {
  if (!status) return "—";
  return COMUNICACAO_STATUS.find((t) => t.value === status)?.label ?? status;
}

export function isComunicacaoTipo(value: string): value is ComunicacaoTipo {
  return COMUNICACAO_TIPOS.some((t) => t.value === value);
}

export function isComunicacaoStatus(value: string): value is ComunicacaoStatus {
  return COMUNICACAO_STATUS.some((t) => t.value === value);
}

export function comunicacaoMostraOperadora(
  tipo: string | null | undefined,
): boolean {
  return (
    !!tipo &&
    (COMUNICACAO_TIPOS_COM_OPERADORA as readonly string[]).includes(tipo)
  );
}

/** Rótulo dinâmico do campo valor conforme o tipo escolhido. */
export function labelComunicacaoValor(
  tipo: string | null | undefined,
): string {
  switch (tipo) {
    case "imsi":
      return "Número (IMSI)";
    case "imei":
      return "Número IMEI do aparelho";
    case "email":
      return "Endereço de e-mail";
    case "telefone_fixo":
      return "Telefone fixo";
    case "whatsapp":
      return "Número ou usuário WhatsApp";
    case "telegram":
      return "Número ou usuário Telegram";
    case "radio":
      return "Identificador de rádio";
    case "outros":
      return "Identificador";
    default:
      return "Valor";
  }
}
