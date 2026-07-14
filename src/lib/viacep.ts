export type ViaCepResult = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
};

export async function fetchViaCep(
  cep: string,
): Promise<{ data: ViaCepResult | null; error: string | null }> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) {
    return { data: null, error: "CEP deve ter 8 dígitos." };
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) {
      return { data: null, error: "Falha ao consultar o ViaCEP." };
    }
    const json = (await res.json()) as ViaCepResult;
    if (json.erro) {
      return { data: null, error: "CEP não encontrado." };
    }
    return { data: json, error: null };
  } catch {
    return { data: null, error: "Não foi possível consultar o ViaCEP." };
  }
}
