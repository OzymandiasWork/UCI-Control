-- UCI Control — módulos de roles del turno y ocupación/proyección

create table public.shift_staff (
  id uuid primary key default gen_random_uuid(),
  shift_date date not null default current_date,
  shift_type text not null default 'Día' check (shift_type in ('Día','Noche')),
  role text not null default 'Enfermera/o'
    check (role in ('Médico/a','Enfermera/o','TENS','Kinesiólogo/a','Auxiliar')),
  name text not null default '',
  boxes text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);
create index shift_staff_by_day on public.shift_staff (shift_date, shift_type);

create table public.occupancy_snapshots (
  snap_date date primary key default current_date,
  occupied int not null default 0,
  free int not null default 0,
  on_vm int not null default 0,
  critical int not null default 0,
  created_at timestamptz not null default now()
);

create trigger touch before insert or update on public.shift_staff
  for each row execute function public.touch_row();

alter table public.shift_staff enable row level security;
create policy "authenticated all" on public.shift_staff
  for all to authenticated using (true) with check (true);

alter table public.occupancy_snapshots enable row level security;
create policy "authenticated read" on public.occupancy_snapshots
  for select to authenticated using (true);
create policy "authenticated write" on public.occupancy_snapshots
  for insert to authenticated with check (true);

alter publication supabase_realtime add table public.shift_staff, public.occupancy_snapshots;

-- Snapshot diario automático de ocupación (08:00 hora Chile ≈ 11:00/12:00 UTC)
create extension if not exists pg_cron;
select cron.schedule('occupancy-daily-snapshot', '0 11 * * *', $cron$
  insert into public.occupancy_snapshots (snap_date, occupied, free, on_vm, critical)
  select current_date,
         count(*),
         24 - count(*),
         count(*) filter (where dias_vm > 0),
         count(*) filter (where alert = 'critical')
  from public.stays where active
  on conflict (snap_date) do update
    set occupied = excluded.occupied, free = excluded.free,
        on_vm = excluded.on_vm, critical = excluded.critical
$cron$);

-- Snapshot inicial de hoy
insert into public.occupancy_snapshots (snap_date, occupied, free, on_vm, critical)
select current_date, count(*), 24 - count(*),
       count(*) filter (where dias_vm > 0),
       count(*) filter (where alert = 'critical')
from public.stays where active
on conflict (snap_date) do nothing;
