-- Leaderboard arcade: mejor score por IP (hasheada) en cada mapa de campaña.
create table if not exists public.arcade_records (
  ip_hash text primary key,
  name text,
  role text,
  score_muelle integer not null default 0,
  score_bahia integer not null default 0,
  score_tormenta integer not null default 0,
  time_muelle double precision,
  time_bahia double precision,
  time_tormenta double precision,
  total integer generated always as (score_muelle + score_bahia + score_tormenta) stored,
  updated_at timestamptz not null default now(),
  constraint arcade_name_len check (name is null or (char_length(name) between 3 and 8)),
  constraint arcade_name_chars check (name is null or name ~ '^[A-Z0-9]+$'),
  constraint arcade_role_ok check (role is null or role in ('CARGADOR', 'CAPITAN', 'GRUMETE', 'PIRATA'))
);

create index if not exists arcade_records_total_idx
  on public.arcade_records (total desc)
  where name is not null;

alter table public.arcade_records enable row level security;

comment on table public.arcade_records is
  'Arcade leaderboard: best score per IP hash per campaign map; name set after all 3 maps.';
