-- UCI Control — RYGF Fase 2, parte 1: Evaluación Funcional (MRC-SS/FSS-ICU/IMS) + EMR

create table public.mrc_assessments (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.stays on delete cascade,
  assessed_at timestamptz not null default now(),
  -- MRC-SS: 12 grupos musculares, 0-5 cada uno (nullable = grupo no evaluado)
  abd_hh_d int check (abd_hh_d between 0 and 5),
  flex_hh_d int check (flex_hh_d between 0 and 5),
  ext_mu_d int check (ext_mu_d between 0 and 5),
  abd_hh_i int check (abd_hh_i between 0 and 5),
  flex_hh_i int check (flex_hh_i between 0 and 5),
  ext_mu_i int check (ext_mu_i between 0 and 5),
  flex_rod_d int check (flex_rod_d between 0 and 5),
  ext_rod_d int check (ext_rod_d between 0 and 5),
  dors_pie_d int check (dors_pie_d between 0 and 5),
  flex_rod_i int check (flex_rod_i between 0 and 5),
  ext_rod_i int check (ext_rod_i between 0 and 5),
  dors_pie_i int check (dors_pie_i between 0 and 5),
  -- Índices de función/movilidad
  fss_icu int check (fss_icu between 0 and 35),
  ims int check (ims between 0 and 10),
  -- Fuerza y resistencia
  handgrip_d numeric,
  handgrip_i numeric,
  tiempo_trabajo_min int,
  pct_fcr int,
  borg_fuerza int check (borg_fuerza between 0 and 10),
  dolor_ena int check (dolor_ena between 0 and 10),
  dva_sesion boolean not null default false,
  uma numeric,
  set_min int,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);

create table public.emr_sessions (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.stays on delete cascade,
  session_at timestamptz not null default now(),
  session_type text not null default 'fuerza' check (session_type in ('fuerza','resistencia')),
  carga_pct int,
  cmh2o int,
  repeticiones int,
  series int,
  minutos int,
  tolerancia boolean not null default true,
  borg int check (borg between 0 and 10),
  pim_test int,
  pef_test int,
  fraccion_acort_pct numeric,
  eco_diaf_esp_mm numeric,
  eco_diaf_ins_mm numeric,
  notas text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);

do $$
declare t text;
begin
  foreach t in array array['mrc_assessments','emr_sessions']
  loop
    execute format('create trigger touch before insert or update on public.%I
                    for each row execute function public.touch_row()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "authenticated all" on public.%I
                    for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

alter publication supabase_realtime add table public.mrc_assessments, public.emr_sessions;
