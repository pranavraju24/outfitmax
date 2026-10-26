-- Outfits the user saved from suggestions.
create table if not exists public.saved_outfits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  title       text,
  rationale   text,
  garment_ids uuid[] not null default '{}'
);

create index if not exists saved_outfits_user_id_idx on public.saved_outfits (user_id);

alter table public.saved_outfits enable row level security;

drop policy if exists "Users can view their own saved outfits" on public.saved_outfits;
create policy "Users can view their own saved outfits"
  on public.saved_outfits for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own saved outfits" on public.saved_outfits;
create policy "Users can insert their own saved outfits"
  on public.saved_outfits for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own saved outfits" on public.saved_outfits;
create policy "Users can delete their own saved outfits"
  on public.saved_outfits for delete
  using (auth.uid() = user_id);

grant all privileges on public.saved_outfits to service_role;
grant select, insert, delete on public.saved_outfits to authenticated;
