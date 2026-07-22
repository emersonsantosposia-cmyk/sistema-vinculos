-- Renomeia o tipo de vínculo Empregado(a) → Funcionário(a)
-- (sugestões + registros já cadastrados).

UPDATE public.tipos_vinculo_sugeridos
SET termo_direto = 'Funcionário(a)'
WHERE lower(termo_direto) IN ('empregado(a)', 'empregado');

UPDATE public.tipos_vinculo_sugeridos
SET termo_inverso = 'Funcionário(a)'
WHERE lower(termo_inverso) IN ('empregado(a)', 'empregado');

UPDATE public.vinculos
SET tipo_a_para_b = 'Funcionário(a)'
WHERE lower(trim(tipo_a_para_b)) IN ('empregado(a)', 'empregado');

UPDATE public.vinculos
SET tipo_b_para_a = 'Funcionário(a)'
WHERE lower(trim(tipo_b_para_a)) IN ('empregado(a)', 'empregado');

UPDATE public.vinculos
SET tipo_vinculo = 'Funcionário(a)'
WHERE lower(trim(tipo_vinculo)) IN ('empregado(a)', 'empregado');
