-- UCI Control v2 Fase 1 — módulo de ventilación (RYGF núcleo)

create table public.vent_settings (
  stay_id uuid primary key references public.stays on delete cascade,
  modo_sv text not null default 'VCV-AC',
  fio2 int not null default 50 check (fio2 between 21 and 100),
  spo2 int not null default 0,
  pao2 numeric not null default 0,
  peep int not null default 0,
  peep_i int not null default 0,
  vt int not null default 0,
  pc_ps int not null default 0,
  vol_min numeric not null default 0,
  fr_prog text not null default '',
  pplat int not null default 0,
  etco2 int not null default 0,
  vd_vt numeric not null default 0,
  fuga_cuff int not null default 0,
  rva int not null default 0,
  cest int not null default 0,
  -- antropometría para IBW / VT protector
  sexo text not null default 'h' check (sexo in ('h','m')),
  talla_cm int not null default 0,
  peso_real numeric not null default 0,
  -- weaning / SBT (compartido por el equipo)
  irrs numeric not null default 0,
  pim numeric not null default 0,
  pef numeric not null default 0,
  rass numeric not null default 0,
  cam_icu text not null default 'neg' check (cam_icu in ('neg','pos')),
  sat_ps numeric not null default 0,
  secreciones text not null default 'ok' check (secreciones in ('ok','abund')),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);

create table public.blood_gases (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.stays on delete cascade,
  drawn_at timestamptz not null default now(),
  ph numeric,
  pco2 numeric,
  po2 numeric,
  hco3 numeric,
  be numeric,
  sat numeric,
  lactato numeric,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);

do $$
declare t text;
begin
  foreach t in array array['vent_settings','blood_gases']
  loop
    execute format('create trigger touch before insert or update on public.%I
                    for each row execute function public.touch_row()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "authenticated all" on public.%I
                    for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

alter publication supabase_realtime add table public.vent_settings, public.blood_gases;
