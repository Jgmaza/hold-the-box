-- Campaña nueva: muelle, bahía, aldea y campamento. La Tormenta sale del juego;
-- score_tormenta / time_tormenta se quedan (no se pierden datos) pero ya no suman al total.
alter table public.arcade_records
  add column if not exists score_aldea integer not null default 0,
  add column if not exists score_campamento integer not null default 0,
  add column if not exists time_aldea double precision,
  add column if not exists time_campamento double precision;

drop index if exists public.arcade_records_total_idx;

alter table public.arcade_records drop column total;

alter table public.arcade_records
  add column total integer generated always as (score_muelle + score_bahia + score_aldea + score_campamento) stored;

create index if not exists arcade_records_total_idx
  on public.arcade_records (total desc)
  where name is not null;

comment on table public.arcade_records is
  'Arcade leaderboard: best score per IP hash per campaign map (muelle, bahia, aldea, campamento).';
