-- Separa a sugestão "Pai ou Mãe" em "Pai" e "Mãe" (ambos com inverso Filho(a)).

-- Remove a sugestão antiga e o espelho Filho(a) → Pai ou Mãe.
DELETE FROM public.tipos_vinculo_sugeridos
WHERE entidade_origem_tipo = 'pessoa'
  AND entidade_destino_tipo = 'pessoa'
  AND (
    (
      lower(termo_direto) = lower('Pai ou Mãe')
      AND lower(termo_inverso) = lower('Filho(a)')
    )
    OR (
      lower(termo_direto) = lower('Filho(a)')
      AND lower(termo_inverso) = lower('Pai ou Mãe')
    )
  );

-- Insere Pai / Mãe e os espelhos Filho(a) → Pai e Filho(a) → Mãe.
INSERT INTO public.tipos_vinculo_sugeridos (
  entidade_origem_tipo,
  entidade_destino_tipo,
  termo_direto,
  termo_inverso,
  simetrico
)
VALUES
  ('pessoa', 'pessoa', 'Pai', 'Filho(a)', false),
  ('pessoa', 'pessoa', 'Mãe', 'Filho(a)', false),
  ('pessoa', 'pessoa', 'Filho(a)', 'Pai', false),
  ('pessoa', 'pessoa', 'Filho(a)', 'Mãe', false)
ON CONFLICT DO NOTHING;
