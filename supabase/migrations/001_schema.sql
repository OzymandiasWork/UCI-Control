-- UCI Control v1 — esquema inicial
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.stays (
  id uuid primary key default gen_random_uuid(),
  box_number int not null check (box_number between 1 and 24),
  active boolean not null default true,
  patient_name text not null default '',
  record_number text not null default '',
  diagnosis text not null default '',
  alert text not null default 'none'
    check (alert in ('none','moderate','critical','eol','procurement','trial')),
  residente text not null default '',
  destination text not null default '',
  dias_hosp int not null default 0,
  dias_vm int not null default 0,
  vm_mode text not null default '—',
  rcp text not null default 'Sí',
  alergias text not null default '',
  prevision text not null default 'Fonasa A',
  consentimiento boolean not null default false,
  balance_meta text not null default '',
  balance_real text not null default '',
  contacto_nombre text not null default '',
  contacto_tel text not null default '',
  ultimo_contacto text not null default '',
  notes text not null default '',
  enfermera text not null default '',
  tens text not null default '',
  kine text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);
-- un solo paciente activo por box
create unique index stays_one_active_per_box on public.stays (box_number) where active;

create table public.sofa_assessments (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.stays on delete cascade,
  assessed_on date not null default current_date,
  resp int check (resp between 0 and 4),
  coag int check (coag between 0 and 4),
  liver int check (liver between 0 and 4),
  cardio int check (cardio between 0 and 4),
  neuro int check (neuro between 0 and 4),
  renal int check (renal between 0 and 4),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users,
  unique (stay_id, assessed_on)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.stays on delete cascade,
  text text not null default '',
  done boolean not null default false,
  position int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);

create table public.antibiotics (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.stays on delete cascade,
  drug text not null default '',
  day int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);

create table public.accesses (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.stays on delete cascade,
  type text not null default 'CVC',
  day int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);

create table public.nutrition (
  stay_id uuid primary key references public.stays on delete cascade,
  nutri_type text not null default 'Ayuno',
  via text not null default '',
  cal_meta int not null default 0,
  cal_real int not null default 0,
  dias int not null default 0,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);

create table public.unit_events (
  id uuid primary key default gen_random_uuid(),
  time text not null default '',
  label text not null default '',
  event_date date not null default current_date,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);

-- trigger de auditoría
create or replace function public.touch_row() returns trigger
language plpgsql security definer as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['stays','sofa_assessments','goals','antibiotics','accesses','nutrition','unit_events']
  loop
    execute format('create trigger touch before insert or update on public.%I
                    for each row execute function public.touch_row()', t);
  end loop;
end $$;

-- RLS: solo usuarios autenticados, acceso total (v1 sin roles)
do $$
declare t text;
begin
  foreach t in array array['profiles','stays','sofa_assessments','goals','antibiotics','accesses','nutrition','unit_events']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "authenticated all" on public.%I
                    for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Realtime
alter publication supabase_realtime add table
  public.stays, public.sofa_assessments, public.goals,
  public.antibiotics, public.accesses, public.nutrition, public.unit_events;
