create table if not exists public.tk_app_state (
  id text primary key,
  data_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.tk_app_state enable row level security;

drop policy if exists "service role full access on tk_app_state" on public.tk_app_state;

create policy "service role full access on tk_app_state"
on public.tk_app_state
for all
to service_role
using (true)
with check (true);

insert into public.tk_app_state (id, data_json)
values ('primary', '{}'::jsonb)
on conflict (id) do nothing;
