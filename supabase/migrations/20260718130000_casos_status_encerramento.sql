-- Status do caso + data de encerramento (obrigatória quando encerrado).

alter table public.casos
  add column if not exists status text;

update public.casos
set status = 'em_andamento'
where status is null;

alter table public.casos
  alter column status set default 'em_andamento',
  alter column status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'casos_status_check'
      and conrelid = 'public.casos'::regclass
  ) then
    alter table public.casos
      add constraint casos_status_check
      check (status in ('em_andamento', 'encerrado'));
  end if;
end $$;

alter table public.casos
  add column if not exists data_encerramento date;

comment on column public.casos.status is
  'Situação do caso: em_andamento | encerrado.';
comment on column public.casos.data_encerramento is
  'Data de encerramento; preenchida quando status = encerrado.';
