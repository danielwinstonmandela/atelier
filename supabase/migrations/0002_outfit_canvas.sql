-- Free-form canvas layout for saved outfits.

alter table public.outfit_items
  add column if not exists x double precision not null default 0.5,
  add column if not exists y double precision not null default 0.5,
  add column if not exists scale double precision not null default 1,
  add column if not exists rotation double precision not null default 0,
  add column if not exists z_index integer not null default 0,
  add column if not exists flipped boolean not null default false;

alter table public.outfit_items
  drop constraint if exists outfit_items_scale_check,
  drop constraint if exists outfit_items_rotation_check,
  drop constraint if exists outfit_items_x_check,
  drop constraint if exists outfit_items_y_check;

alter table public.outfit_items
  add constraint outfit_items_x_check check (x between 0 and 1),
  add constraint outfit_items_y_check check (y between 0 and 1),
  add constraint outfit_items_scale_check check (scale between 0.05 and 2),
  add constraint outfit_items_rotation_check check (rotation between -360 and 360);

do $$
declare
  constraint_name text;
begin
  select c.conname into constraint_name
  from pg_constraint c
  where c.conrelid = 'public.outfit_items'::regclass
    and c.contype = 'u'
    and pg_get_constraintdef(c.oid) like '%(outfit_id, slot_category)%';

  if constraint_name is not null then
    execute format('alter table public.outfit_items drop constraint %I', constraint_name);
  end if;
end;
$$;

-- Convert old slot layouts into the 3:4 canvas.
with ranked as (
  select
    oi.id,
    oi.slot_category,
    row_number() over (
      partition by oi.outfit_id
      order by
        case oi.slot_category
          when 'Top' then 1
          when 'Bottom' then 2
          when 'Shoes' then 3
          else 4
        end,
        oi.id
    ) - 1 as position
  from public.outfit_items oi
)
update public.outfit_items oi
set
  x = 0.5,
  y = case oi.slot_category
    when 'Top' then 0.28
    when 'Bottom' then 0.55
    when 'Shoes' then 0.85
    else 0.10
  end,
  scale = 0.5,
  rotation = 0,
  z_index = ranked.position,
  flipped = false
from ranked
where oi.id = ranked.id
  and oi.x = 0.5
  and oi.y = 0.5
  and oi.scale = 1;
