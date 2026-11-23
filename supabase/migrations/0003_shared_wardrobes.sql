-- Shared wardrobe membership and invitations.

create table if not exists public.wardrobes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My wardrobe',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists wardrobes_owner_unique_idx on public.wardrobes(owner_id);

create table if not exists public.wardrobe_members (
  wardrobe_id uuid not null references public.wardrobes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (wardrobe_id, user_id)
);

create table if not exists public.wardrobe_invitations (
  id uuid primary key default gen_random_uuid(),
  wardrobe_id uuid not null references public.wardrobes(id) on delete cascade,
  email text not null,
  role text not null check (role in ('editor', 'viewer')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create unique index if not exists wardrobe_invitations_pending_email_idx
  on public.wardrobe_invitations (wardrobe_id, lower(email))
  where status = 'pending';

alter table public.clothing_items add column if not exists wardrobe_id uuid references public.wardrobes(id);
alter table public.outfits add column if not exists wardrobe_id uuid references public.wardrobes(id);
alter table public.outfits add column if not exists created_by uuid references auth.users(id);

insert into public.wardrobes (id, owner_id, name)
select gen_random_uuid(), user_id, 'My wardrobe'
from (select distinct user_id from public.clothing_items
      union select distinct user_id from public.outfits) users
on conflict do nothing;

-- Assign the existing backfilled wardrobe deterministically.
update public.clothing_items ci
set wardrobe_id = w.id
from public.wardrobes w
where w.owner_id = ci.user_id and ci.wardrobe_id is null;

update public.outfits o
set wardrobe_id = w.id,
    created_by = coalesce(o.created_by, o.user_id)
from public.wardrobes w
where w.owner_id = o.user_id and o.wardrobe_id is null;

alter table public.clothing_items alter column wardrobe_id set not null;
alter table public.outfits alter column wardrobe_id set not null;
alter table public.outfits alter column created_by set not null;

create or replace function public.is_wardrobe_owner(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.wardrobes w where w.id = target and w.owner_id = auth.uid());
$$;

create or replace function public.is_wardrobe_member(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wardrobes w
    where w.id = target and w.owner_id = auth.uid()
  ) or exists (
    select 1 from public.wardrobe_members m
    where m.wardrobe_id = target and m.user_id = auth.uid()
  );
$$;

create or replace function public.wardrobe_role(target uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.wardrobes w where w.id = target and w.owner_id = auth.uid()) then 'owner'
    else (select m.role from public.wardrobe_members m where m.wardrobe_id = target and m.user_id = auth.uid())
  end;
$$;

alter table public.wardrobes enable row level security;
alter table public.wardrobe_members enable row level security;
alter table public.wardrobe_invitations enable row level security;

drop policy if exists "clothing_items: owner select" on public.clothing_items;
drop policy if exists "clothing_items: owner insert" on public.clothing_items;
drop policy if exists "clothing_items: owner update" on public.clothing_items;
drop policy if exists "clothing_items: owner delete" on public.clothing_items;
drop policy if exists "clothing_items: members select" on public.clothing_items;
create policy "clothing_items: members select" on public.clothing_items
  for select using (public.is_wardrobe_member(wardrobe_id));
create policy "clothing_items: owner insert" on public.clothing_items
  for insert with check (public.is_wardrobe_owner(wardrobe_id) and user_id = auth.uid());
create policy "clothing_items: owner update" on public.clothing_items
  for update using (public.is_wardrobe_owner(wardrobe_id))
  with check (public.is_wardrobe_owner(wardrobe_id) and user_id = auth.uid());
create policy "clothing_items: owner delete" on public.clothing_items
  for delete using (public.is_wardrobe_owner(wardrobe_id));

drop policy if exists "outfits: owner select" on public.outfits;
drop policy if exists "outfits: owner insert" on public.outfits;
drop policy if exists "outfits: owner update" on public.outfits;
drop policy if exists "outfits: owner delete" on public.outfits;
drop policy if exists "outfits: members select" on public.outfits;
drop policy if exists "outfits: members insert" on public.outfits;
drop policy if exists "outfits: creator or owner update" on public.outfits;
drop policy if exists "outfits: creator or owner delete" on public.outfits;
create policy "outfits: members select" on public.outfits
  for select using (public.is_wardrobe_member(wardrobe_id));
create policy "outfits: members insert" on public.outfits
  for insert with check (
    public.wardrobe_role(wardrobe_id) in ('owner', 'editor')
    and created_by = auth.uid()
  );
create policy "outfits: creator or owner update" on public.outfits
  for update using (
    public.wardrobe_role(wardrobe_id) in ('owner', 'editor')
    and (created_by = auth.uid() or public.is_wardrobe_owner(wardrobe_id))
  )
  with check (
    public.wardrobe_role(wardrobe_id) in ('owner', 'editor')
    and (created_by = auth.uid() or public.is_wardrobe_owner(wardrobe_id))
  );
create policy "outfits: creator or owner delete" on public.outfits
  for delete using (
    public.wardrobe_role(wardrobe_id) in ('owner', 'editor')
    and (created_by = auth.uid() or public.is_wardrobe_owner(wardrobe_id))
  );

drop policy if exists "outfit_items: owner select" on public.outfit_items;
drop policy if exists "outfit_items: owner insert" on public.outfit_items;
drop policy if exists "outfit_items: owner update" on public.outfit_items;
drop policy if exists "outfit_items: owner delete" on public.outfit_items;
drop policy if exists "outfit_items: members select" on public.outfit_items;
drop policy if exists "outfit_items: creator or owner insert" on public.outfit_items;
drop policy if exists "outfit_items: creator or owner update" on public.outfit_items;
drop policy if exists "outfit_items: creator or owner delete" on public.outfit_items;
create policy "outfit_items: members select" on public.outfit_items
  for select using (exists (
    select 1 from public.outfits o where o.id = outfit_id and public.is_wardrobe_member(o.wardrobe_id)
  ));
create policy "outfit_items: creator or owner insert" on public.outfit_items
  for insert with check (exists (
    select 1 from public.outfits o
    where o.id = outfit_id and (o.created_by = auth.uid() or public.is_wardrobe_owner(o.wardrobe_id))
  ));
create policy "outfit_items: creator or owner update" on public.outfit_items
  for update using (exists (
    select 1 from public.outfits o
    where o.id = outfit_id and (o.created_by = auth.uid() or public.is_wardrobe_owner(o.wardrobe_id))
  ))
  with check (exists (
    select 1 from public.outfits o
    where o.id = outfit_id and (o.created_by = auth.uid() or public.is_wardrobe_owner(o.wardrobe_id))
  ));
create policy "outfit_items: creator or owner delete" on public.outfit_items
  for delete using (exists (
    select 1 from public.outfits o
    where o.id = outfit_id and (o.created_by = auth.uid() or public.is_wardrobe_owner(o.wardrobe_id))
  ));

drop policy if exists "wardrobes: members select" on public.wardrobes;
drop policy if exists "wardrobes: owner insert" on public.wardrobes;
drop policy if exists "wardrobes: owner update" on public.wardrobes;
create policy "wardrobes: members select" on public.wardrobes
  for select using (public.is_wardrobe_member(id));
create policy "wardrobes: owner insert" on public.wardrobes
  for insert with check (owner_id = auth.uid());
create policy "wardrobes: owner update" on public.wardrobes
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "members: owner and member select" on public.wardrobe_members;
drop policy if exists "members: owner insert" on public.wardrobe_members;
drop policy if exists "members: owner update" on public.wardrobe_members;
drop policy if exists "members: owner delete" on public.wardrobe_members;
create policy "members: owner and member select" on public.wardrobe_members
  for select using (user_id = auth.uid() or public.is_wardrobe_owner(wardrobe_id));
create policy "members: owner insert" on public.wardrobe_members
  for insert with check (public.is_wardrobe_owner(wardrobe_id));
create policy "members: owner update" on public.wardrobe_members
  for update using (public.is_wardrobe_owner(wardrobe_id))
  with check (public.is_wardrobe_owner(wardrobe_id));
create policy "members: owner delete" on public.wardrobe_members
  for delete using (public.is_wardrobe_owner(wardrobe_id));

drop policy if exists "invitations: owner manage" on public.wardrobe_invitations;
drop policy if exists "invitations: recipient select" on public.wardrobe_invitations;
create policy "invitations: owner manage" on public.wardrobe_invitations
  for all using (public.is_wardrobe_owner(wardrobe_id))
  with check (public.is_wardrobe_owner(wardrobe_id));
create policy "invitations: recipient select" on public.wardrobe_invitations
  for select using (lower(email) = lower(coalesce(auth.jwt()->>'email', '')));

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.wardrobes to authenticated;
grant select, insert, update, delete on public.wardrobe_members to authenticated;
grant select, insert, update, delete on public.wardrobe_invitations to authenticated;
grant select, insert, update, delete on public.clothing_items to authenticated;
grant select, insert, update, delete on public.outfits to authenticated;
grant select, insert, update, delete on public.outfit_items to authenticated;

create or replace function public.accept_wardrobe_invitation(invitation_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  invite public.wardrobe_invitations%rowtype;
  user_email text;
begin
  select coalesce(auth.email(), '') into user_email;
  select * into invite
  from public.wardrobe_invitations i
  where i.id = invitation_id and i.status = 'pending';

  if invite.id is null then
    raise exception 'Invitation not found';
  end if;
  if lower(invite.email) <> lower(user_email) then
    raise exception 'This invitation belongs to another account';
  end if;

  insert into public.wardrobe_members (wardrobe_id, user_id, role)
  values (invite.wardrobe_id, auth.uid(), invite.role)
  on conflict (wardrobe_id, user_id) do update set role = excluded.role;

  update public.wardrobe_invitations
  set status = 'accepted', accepted_at = now()
  where id = invite.id;

  return invite.wardrobe_id;
end;
$$;

grant execute on function public.accept_wardrobe_invitation(uuid) to authenticated;

-- Storage: owners upload in their folder; wardrobe members may read owner files.
drop policy if exists "wardrobe: owner read" on storage.objects;
drop policy if exists "wardrobe: member read" on storage.objects;
create policy "wardrobe: member read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'wardrobe'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1
        from public.wardrobes w
        where w.owner_id::text = (storage.foldername(name))[1]
          and public.is_wardrobe_member(w.id)
      )
    )
  );

-- Shared outfits may reference clothing from the same wardrobe.
create or replace function public.check_outfit_item_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.clothing_item_id is not null and not exists (
    select 1
    from public.clothing_items ci
    join public.outfits o on o.id = new.outfit_id
    where ci.id = new.clothing_item_id
      and ci.wardrobe_id = o.wardrobe_id
  ) then
    raise exception 'clothing item does not belong to the outfit wardrobe';
  end if;
  return new;
end;
$$;
