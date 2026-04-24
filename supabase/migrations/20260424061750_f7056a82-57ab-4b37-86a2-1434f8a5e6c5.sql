-- Health Diary: dose logs
create table public.dose_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  remedy_id text not null,
  remedy_name text not null,
  remedy_local_name text not null,
  remedy_emoji text not null,
  dose text not null,
  feel text check (feel in ('better','same','worse')),
  taken_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.dose_logs enable row level security;

create policy "Users view their own dose logs"
  on public.dose_logs for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert their own dose logs"
  on public.dose_logs for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update their own dose logs"
  on public.dose_logs for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users delete their own dose logs"
  on public.dose_logs for delete
  to authenticated
  using (auth.uid() = user_id);

create index dose_logs_user_taken_idx on public.dose_logs (user_id, taken_at desc);