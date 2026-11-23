import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET, type ClothingItem, type ClothingItemRow, type Outfit, type OutfitItemRow, type OutfitRow } from "@/lib/types";
import { itemPaths } from "@/lib/storage-paths";

const SIGNED_URL_TTL = 60 * 60; // seconds

export type WardrobeRole = "owner" | "editor" | "viewer";

export interface WardrobeContext {
  id: string;
  role: WardrobeRole;
  ownerId: string;
  name: string;
}

export async function getWardrobeContext(supabase: SupabaseClient): Promise<WardrobeContext | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: owned } = await supabase
    .from("wardrobes")
    .select("id, owner_id, name")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (owned) return { id: owned.id, role: "owner", ownerId: owned.owner_id, name: owned.name };

  const { data: membership } = await supabase
    .from("wardrobe_members")
    .select("role, wardrobe_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!membership) return null;

  const { data: wardrobe } = await supabase
    .from("wardrobes")
    .select("id, owner_id, name")
    .eq("id", membership.wardrobe_id)
    .single();
  if (!wardrobe) return null;
  return {
    id: wardrobe.id,
    role: membership.role as "editor" | "viewer",
    ownerId: wardrobe.owner_id,
    name: wardrobe.name,
  };
}

export async function ensureOwnWardrobe(supabase: SupabaseClient, userId: string): Promise<WardrobeContext> {
  const existing = await getWardrobeContext(supabase);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("wardrobes")
    .insert({ owner_id: userId, name: "My wardrobe" })
    .select("id, owner_id, name")
    .single();
  if (error || !data) throw new Error("Could not create your wardrobe.");
  return { id: data.id, role: "owner", ownerId: data.owner_id, name: data.name };
}

/** Batch-sign storage paths. Missing objects are simply absent from the result. */
async function signPaths(supabase: SupabaseClient, paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(paths)];
  if (unique.length === 0) return out;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(unique, SIGNED_URL_TTL);
  if (error || !data) return out;
  for (const entry of data) {
    if (entry.path && entry.signedUrl && !entry.error) out.set(entry.path, entry.signedUrl);
  }
  return out;
}

export async function resolveItems(supabase: SupabaseClient, rows: ClothingItemRow[]): Promise<ClothingItem[]> {
  const paths: string[] = [];
  for (const r of rows) {
    paths.push(r.original_image_url, itemPaths(r.user_id, r.id).thumb);
    if (r.processed_image_url) paths.push(r.processed_image_url);
  }
  const signed = await signPaths(supabase, paths);

  return rows.map((r) => {
    const originalUrl = signed.get(r.original_image_url) ?? null;
    const processedUrl = r.processed_image_url ? signed.get(r.processed_image_url) ?? null : null;
    const displayUrl = processedUrl ?? originalUrl;
    return {
      ...r,
      originalUrl,
      displayUrl,
      thumbUrl: signed.get(itemPaths(r.user_id, r.id).thumb) ?? displayUrl,
    };
  });
}

export async function getWardrobe(supabase: SupabaseClient): Promise<ClothingItem[]> {
  const context = await getWardrobeContext(supabase);
  if (!context) return [];
  const { data, error } = await supabase
    .from("clothing_items")
    .select("*")
    .eq("wardrobe_id", context.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load your wardrobe: ${error.message}`);
  return resolveItems(supabase, (data ?? []) as ClothingItemRow[]);
}

interface OutfitWithItems extends OutfitRow {
  outfit_items: OutfitItemRow[];
}

/** Loads outfits with their slots; slots whose clothing item was deleted come back as `missing`. */
export async function getOutfits(supabase: SupabaseClient, onlyId?: string): Promise<Outfit[]> {
  const context = await getWardrobeContext(supabase);
  if (!context) return [];
  let query = supabase
    .from("outfits")
    .select("*, outfit_items(*)")
    .eq("wardrobe_id", context.id)
    .order("created_at", { ascending: false });
  if (onlyId) query = query.eq("id", onlyId);
  const { data, error } = await query;
  if (error) throw new Error(`Could not load outfits: ${error.message}`);
  const outfits = (data ?? []) as OutfitWithItems[];

  const ids = [...new Set(outfits.flatMap((o) => o.outfit_items.map((oi) => oi.clothing_item_id).filter(Boolean) as string[]))];
  let items: ClothingItem[] = [];
  if (ids.length) {
    const { data: rows, error: itemsError } = await supabase.from("clothing_items").select("*").in("id", ids);
    if (itemsError) throw new Error(`Could not load outfit items: ${itemsError.message}`);
    items = await resolveItems(supabase, (rows ?? []) as ClothingItemRow[]);
  }
  const byId = new Map(items.map((i) => [i.id, i]));

  return outfits.map(({ outfit_items, ...o }) => ({
    ...o,
    placements: [...outfit_items]
      .sort((a, b) => a.z_index - b.z_index)
      .map((oi) => {
        const item = oi.clothing_item_id ? byId.get(oi.clothing_item_id) ?? null : null;
        return {
          id: oi.id,
          clothing_item_id: oi.clothing_item_id,
          category: oi.slot_category,
          item,
          missing: item === null,
          x: oi.x,
          y: oi.y,
          scale: oi.scale,
          rotation: oi.rotation,
          z_index: oi.z_index,
          flipped: oi.flipped,
        };
      }),
  }));
}
