-- Add missing privileges for the authenticated API role.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.clothing_items to authenticated;
grant select, insert, update, delete on public.outfits to authenticated;
grant select, insert, update, delete on public.outfit_items to authenticated;
