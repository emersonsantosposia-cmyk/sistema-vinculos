-- Sócio(a) entre pessoa e empresa passa a ser simétrico (Sócio(a) ↔ Sócio(a)).
-- Assim, em empresa → pessoa, "Sócio(a)" aparece como opção própria e
-- "Pertence a" fica com inverso único Proprietário(a) (autofill deixa de ser ambíguo).

DELETE FROM public.tipos_vinculo_sugeridos
WHERE (
  entidade_origem_tipo = 'pessoa'
  AND entidade_destino_tipo = 'empresa'
  AND lower(termo_direto) = lower('Sócio(a)')
  AND lower(termo_inverso) = lower('Pertence a')
)
OR (
  entidade_origem_tipo = 'empresa'
  AND entidade_destino_tipo = 'pessoa'
  AND lower(termo_direto) = lower('Pertence a')
  AND lower(termo_inverso) = lower('Sócio(a)')
);

INSERT INTO public.tipos_vinculo_sugeridos (
  entidade_origem_tipo,
  entidade_destino_tipo,
  termo_direto,
  termo_inverso,
  simetrico
)
VALUES
  ('pessoa', 'empresa', 'Sócio(a)', 'Sócio(a)', true),
  ('empresa', 'pessoa', 'Sócio(a)', 'Sócio(a)', true)
ON CONFLICT DO NOTHING;
