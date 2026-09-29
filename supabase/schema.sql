-- ============================================================================
-- OutfitMax database schema
--
-- Run this in your Supabase dashboard:  SQL Editor → New query → paste → Run.
-- It is safe to run more than once (it drops/recreates the policies each time).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: garments  (one row = one clothing item, owned by a user)
-- ---------------------------------------------------------------------------
create table if not exists public.garments (
  id          uuid primary key default gen_random_uuid(),
  -- Who owns this item. Links to Supabase's built-in auth.users table.
  -- "on delete cascade" = if the user is deleted, their garments go too.
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),

  -- Where the photo lives (filled in during upload, step 2e).
  storage_path text not null,   -- path inside the Storage bucket
  image_url    text,            -- display URL for the image

  -- Attributes Gemini will extract from the photo.
  name        text,             -- short label, e.g. "black cotton hoodie"
  category    text,             -- top / bottom / shoes / outerwear / accessory
  color       text,
  pattern     text,
  material    text,
  season      text,
  description text,
  tags        text[] not null default '{}'   -- list of freeform keywords
);

-- Speeds up "get all garments for this user" lookups.
create index if not exists garments_user_id_idx on public.garments (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security: a user may only touch their OWN garments.
-- auth.uid() is the id of whoever is making the request.
-- ---------------------------------------------------------------------------
alter table public.garments enable row level security;

drop policy if exists "Users can view their own garments" on public.garments;
create policy "Users can view their own garments"
  on public.garments for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own garments" on public.garments;
create policy "Users can insert their own garments"
  on public.garments for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own garments" on public.garments;
create policy "Users can update their own garments"
  on public.garments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own garments" on public.garments;
create policy "Users can delete their own garments"
  on public.garments for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Data API access grants.
-- We turned OFF "automatically expose new tables" at project creation, so we
-- open this table to the API roles explicitly:
--   service_role  = our server admin key (bypasses RLS; full access)
--   authenticated = logged-in users (still fenced in by the RLS policies above)
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated, service_role;
grant all privileges on public.garments to service_role;
grant select, insert, update, delete on public.garments to authenticated;
