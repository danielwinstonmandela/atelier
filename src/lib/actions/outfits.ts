"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isCategory } from "@/lib/types";
import { UUID_RE } from "@/lib/storage-paths";
import type { ActionResult } from "@/lib/actions/items";
import { getWardrobeContext } from "@/lib/data";

export interface SaveOutfitInput {
  /** Existing outfit to modify. Ignored when `asNew` is true. */
  id?: string;
  name?: string | null;
  placements: {
    clothing_item_id: string | null;
    category: string;
    x: number;
    y: number;
    scale: number;
    rotation: number;
    z_index: number;
    flipped: boolean;
  }[];
  asNew?: boolean;
}

export async function saveOutfit(input: SaveOutfitInput): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session has expired. Please sign in again." };
  const wardrobe = await getWardrobeContext(supabase);
  if (!wardrobe) return { ok: false, error: "You do not belong to a wardrobe." };
  if (wardrobe.role === "viewer") return { ok: false, error: "Viewers cannot change outfits." };

  const placements = input.placements ?? [];
  if (placements.length === 0) return { ok: false, error: "Add at least one piece before saving." };
  if (placements.length > 30) return { ok: false, error: "An outfit can contain at most 30 pieces." };

  for (const p of placements) {
    if (!isCategory(p.category)) return { ok: false, error: "That outfit contains an invalid category." };
    if (p.clothing_item_id !== null && !UUID_RE.test(p.clothing_item_id)) {
      return { ok: false, error: "That outfit contains an invalid piece." };
    }
    if (![p.x, p.y, p.scale, p.rotation].every(Number.isFinite)) {
      return { ok: false, error: "That outfit contains invalid positioning." };
    }
    if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1 || p.scale < 0.05 || p.scale > 2 ||
        p.rotation < -360 || p.rotation > 360) {
      return { ok: false, error: "That outfit contains positioning outside the canvas limits." };
    }
    if (!Number.isInteger(p.z_index)) return { ok: false, error: "That outfit contains an invalid layer." };
  }

  const name = input.name?.trim() ? input.name.trim() : null;
  if (name && name.length > 120) return { ok: false, error: "Names can be up to 120 characters." };

  // Every referenced piece must exist in this user's wardrobe (RLS limits the query to their own rows).
  const itemIds = [...new Set(placements.flatMap((p) => p.clothing_item_id ? [p.clothing_item_id] : []))];
  if (itemIds.length === 0) return { ok: false, error: "Add at least one piece before saving." };
  if (itemIds.length > 0) {
    const { data: found, error: findError } = await supabase
      .from("clothing_items")
      .select("id")
      .eq("wardrobe_id", wardrobe.id)
      .in("id", itemIds);
    if (findError) return { ok: false, error: "Could not check your wardrobe. Please try again." };
    if ((found ?? []).length !== itemIds.length) {
      return { ok: false, error: "One of those pieces is no longer in your wardrobe. Please pick another." };
    }
  }

  const rows = (outfitId: string) =>
    placements
      .map((p) => ({
        outfit_id: outfitId,
        clothing_item_id: p.clothing_item_id,
        slot_category: p.category,
        x: p.x,
        y: p.y,
        scale: p.scale,
        rotation: p.rotation,
        z_index: p.z_index,
        flipped: p.flipped,
      }));

  let outfitId = input.asNew ? undefined : input.id;

  if (outfitId) {
    if (!UUID_RE.test(outfitId)) return { ok: false, error: "Invalid outfit." };
    const { data: updated, error } = await supabase
      .from("outfits")
      .update({ name })
      .eq("id", outfitId)
      .select("id")
      .single();
    if (error || !updated) return { ok: false, error: "Could not update this outfit. It may have been deleted." };

    const { error: delError } = await supabase.from("outfit_items").delete().eq("outfit_id", outfitId);
    if (delError) return { ok: false, error: "Could not update this outfit. Please try again." };
    const { error: insError } = await supabase.from("outfit_items").insert(rows(outfitId));
    if (insError) return { ok: false, error: "Could not update this outfit. Please try again." };
  } else {
    const { data: created, error } = await supabase
      .from("outfits")
      .insert({ user_id: wardrobe.ownerId, wardrobe_id: wardrobe.id, created_by: user.id, name })
      .select("id")
      .single();
    if (error || !created) return { ok: false, error: "Could not save this outfit. Please try again." };
    outfitId = created.id as string;

    const { error: insError } = await supabase.from("outfit_items").insert(rows(outfitId));
    if (insError) {
      await supabase.from("outfits").delete().eq("id", outfitId); // don't leave an empty shell behind
      return { ok: false, error: "Could not save this outfit. Please try again." };
    }
  }

  revalidatePath("/outfits", "layout");
  return { ok: true, data: { id: outfitId } };
}

export async function deleteOutfit(id: string): Promise<ActionResult> {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid outfit." };
  const supabase = await createClient();
  const wardrobe = await getWardrobeContext(supabase);
  if (!wardrobe || wardrobe.role === "viewer") {
    return { ok: false, error: "Viewers cannot delete outfits." };
  }
  const { error } = await supabase.from("outfits").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete this outfit. Please try again." };
  revalidatePath("/outfits", "layout");
  return { ok: true, data: undefined };
}
