-- Digital Wardrobe — initial schema, RLS and storage policies.
-- Run in the Supabase SQL editor (or `supabase db push`).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- clothing_items
-- image columns store object paths inside the private "wardrobe" bucket
-- ("<user_id>/<item_id>/original.jpg"), resolved to signed URLs by the server.
-- ---------------------------------------------------------------------------
create table if not exists public.clothing_items (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name                text check (name is null or char_length(name) <= 120),
  category            text not null check (char_length(category) between 1 and 40),
  original_image_url  text not null,
  processed_image_url text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists clothing_items_user_category_idx
  on public.clothing_items (user_id, category, created_at desc);

create trigger clothing_items_updated_at
  before update on public.clothing_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- outfits
-- ---------------------------------------------------------------------------
create table if not exists public.outfits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name       text check (name is null or char_length(name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outfits_user_created_idx
  on public.outfits (user_id, created_at desc);

create trigger outfits_updated_at
  before update on public.outfits
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- outfit_items
-- clothing_item_id is nullable + ON DELETE SET NULL: deleting a clothing item
-- never breaks a saved outfit; the slot simply shows as "no longer in wardrobe".
-- ---------------------------------------------------------------------------
create table if not exists public.outfit_items (
  id               uuid primary key default gen_random_uuid(),
  outfit_id        uuid not null references public.outfits (id) on delete cascade,
  clothing_item_id uuid references public.clothing_items (id) on delete set null,
  slot_category    text not null check (char_length(slot_category) between 1 and 40),
  unique (outfit_id, slot_category)
);

create index if not exists outfit_items_outfit_idx on public.outfit_items (outfit_id);
create index if not exists outfit_items_clothing_idx on public.outfit_items (clothing_item_id);

-- Guard: an outfit may only reference clothing items owned by the outfit's owner.
create or replace function public.check_outfit_item_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.clothing_item_id is not null and not exists (
    select 1
    from public.clothing_items ci
    join public.outfits o on o.id = new.outfit_id
    where ci.id = new.clothing_item_id and ci.user_id = o.user_id
  ) then
    raise exception 'clothing item does not belong to the outfit owner';
  end if;
  return new;
end;
$$;

create trigger outfit_items_owner_check
  before insert or update on public.outfit_items
  for each row execute function public.check_outfit_item_owner();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.clothing_items enable row level security;
alter table public.outfits        enable row level security;
alter table public.outfit_items   enable row level security;

-- API roles need table privileges in addition to RLS policies.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.clothing_items to authenticated;
grant select, insert, update, delete on public.outfits to authenticated;
grant select, insert, update, delete on public.outfit_items to authenticated;

create policy "clothing_items: owner select" on public.clothing_items
  for select using (user_id = auth.uid());
create policy "clothing_items: owner insert" on public.clothing_items
  for insert with check (user_id = auth.uid());
create policy "clothing_items: owner update" on public.clothing_items
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "clothing_items: owner delete" on public.clothing_items
  for delete using (user_id = auth.uid());

create policy "outfits: owner select" on public.outfits
  for select using (user_id = auth.uid());
create policy "outfits: owner insert" on public.outfits
  for insert with check (user_id = auth.uid());
create policy "outfits: owner update" on public.outfits
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "outfits: owner delete" on public.outfits
  for delete using (user_id = auth.uid());

-- outfit_items has no user_id: ownership flows through the parent outfit.
create policy "outfit_items: owner select" on public.outfit_items
  for select using (exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = auth.uid()));
create policy "outfit_items: owner insert" on public.outfit_items
  for insert with check (exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = auth.uid()));
create policy "outfit_items: owner update" on public.outfit_items
  for update using (exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = auth.uid()))
  with check (exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = auth.uid()));
create policy "outfit_items: owner delete" on public.outfit_items
  for delete using (exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Storage: private bucket, one folder per user ("<user_id>/...")
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wardrobe', 'wardrobe', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "wardrobe: owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "wardrobe: owner upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "wardrobe: owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "wardrobe: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);
