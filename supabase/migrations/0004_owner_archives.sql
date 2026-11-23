-- Ensure every Supabase account has exactly one owned archive.

create table if not exists public.wardrobes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My archive',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists wardrobes_owner_unique_idx
  on public.wardrobes(owner_id);

-- Backfill accounts that were created before the shared-archive migration.
insert into public.wardrobes (owner_id, name)
select u.id, 'My archive'
from auth.users u
where not exists (
  select 1 from public.wardrobes w where w.owner_id = u.id
)
on conflict (owner_id) do nothing;

-- Keep wardrobe_id populated for old clothing rows.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clothing_items'
      and column_name = 'wardrobe_id'
  ) then
    update public.clothing_items ci
    set wardrobe_id = w.id
    from public.wardrobes w
    where w.owner_id = ci.user_id
      and ci.wardrobe_id is null;
  end if;
end;
$$;

-- Create an archive immediately after a user signs up.
create or replace function public.create_owner_archive()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.wardrobes (owner_id, name)
  values (new.id, 'My archive')
  on conflict (owner_id) do nothing;
  return new;
end;
$$;

drop trigger if exists users_create_owner_archive on auth.users;
create trigger users_create_owner_archive
  after insert on auth.users
  for each row execute function public.create_owner_archive();

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.wardrobes to authenticated;

alter table public.wardrobes enable row level security;

drop policy if exists "wardrobes: members select" on public.wardrobes;
create policy "wardrobes: members select" on public.wardrobes
  for select using (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.wardrobe_members m
      where m.wardrobe_id = wardrobes.id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "wardrobes: owner insert" on public.wardrobes;
create policy "wardrobes: owner insert" on public.wardrobes
  for insert with check (owner_id = auth.uid());

drop policy if exists "wardrobes: owner update" on public.wardrobes;
create policy "wardrobes: owner update" on public.wardrobes
  for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

notify pgrst, 'reload schema';
