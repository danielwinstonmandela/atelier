"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BUCKET, isCategory, type ClothingItemRow } from "@/lib/types";
import { UUID_RE, itemPaths } from "@/lib/storage-paths";
import { ensureOwnWardrobe } from "@/lib/data";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

function cleanName(raw: unknown): string | null | "invalid" {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (s.length === 0) return null;
  if (s.length > 120) return "invalid";
  return s;
}

export interface CreateItemInput {
  id: string;
  name?: string | null;
  category: string;
  hasProcessed: boolean;
}

/**
 * Called after the browser has uploaded the image files straight to Storage
 * (under the user's own RLS-protected folder). Paths are derived server-side, never trusted from the client.
 */
export async function createItem(input: CreateItemInput): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session has expired. Please sign in again." };

  if (!UUID_RE.test(input.id)) return { ok: false, error: "Invalid item id." };
  if (!isCategory(input.category)) return { ok: false, error: "Please choose a valid category." };
  const name = cleanName(input.name);
  if (name === "invalid") return { ok: false, error: "Names can be up to 120 characters." };
  const wardrobe = await ensureOwnWardrobe(supabase, user.id);
  if (wardrobe.role !== "owner") return { ok: false, error: "Only the wardrobe owner can add pieces." };
  const paths = itemPaths(wardrobe.ownerId, input.id);

  // Make sure the uploads really landed before creating a row that points at them.
  const folder = `${wardrobe.ownerId}/${input.id}`;
  const { data: listed, error: listError } = await supabase.storage.from(BUCKET).list(folder);
  if (listError) return { ok: false, error: "Could not verify the uploaded photo. Please try again." };
  const names = new Set((listed ?? []).map((f) => f.name));
  if (!names.has("original.jpg")) return { ok: false, error: "The photo upload didn't finish. Please try again." };
  const processedOk = input.hasProcessed && names.has("processed.png");

  const { error } = await supabase.from("clothing_items").insert({
    id: input.id,
    user_id: user.id,
    wardrobe_id: wardrobe.id,
    name,
    category: input.category,
    original_image_url: paths.original,
    processed_image_url: processedOk ? paths.processed : null,
  });
  if (error) return { ok: false, error: "Could not save this item. Please try again." };

  revalidatePath("/");
  return { ok: true, data: { id: input.id } };
}

export async function updateItem(
  id: string,
  patch: { name?: string | null; category?: string }
): Promise<ActionResult<ClothingItemRow>> {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid item." };
  const update: { name?: string | null; category?: string } = {};

  if ("name" in patch) {
    const name = cleanName(patch.name);
    if (name === "invalid") return { ok: false, error: "Names can be up to 120 characters." };
    update.name = name;
  }
  if (patch.category !== undefined) {
    if (!isCategory(patch.category)) return { ok: false, error: "Please choose a valid category." };
    update.category = patch.category;
  }
  if (Object.keys(update).length === 0) return { ok: false, error: "Nothing to update." };

  const supabase = await createClient();
  const context = await ensureOwnWardrobe(supabase, (await supabase.auth.getUser()).data.user?.id ?? "");
  if (context.role !== "owner") return { ok: false, error: "Only the wardrobe owner can edit pieces." };
  const { data, error } = await supabase.from("clothing_items").update(update).eq("id", id).select().single();
  if (error || !data) return { ok: false, error: "Could not update this item. Please try again." };

  revalidatePath("/");
  revalidatePath("/outfits", "layout");
  return { ok: true, data: data as ClothingItemRow };
}

export async function deleteItem(id: string): Promise<ActionResult> {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid item." };
  const supabase = await createClient();
  const context = await ensureOwnWardrobe(supabase, (await supabase.auth.getUser()).data.user?.id ?? "");
  if (context.role !== "owner") return { ok: false, error: "Only the wardrobe owner can delete pieces." };

  const { data: row, error: readError } = await supabase
    .from("clothing_items")
    .select("user_id")
    .eq("id", id)
    .single();
  if (readError || !row) return { ok: false, error: "That item no longer exists." };

  // Delete the row first (saved outfits keep working — their reference is nulled by the FK),
  // then clean up the files.
  const { error } = await supabase.from("clothing_items").delete().eq("id", id);
  if (error) return { ok: false, error: "Could not delete this item. Please try again." };

  const p = itemPaths(row.user_id, id);
  await supabase.storage.from(BUCKET).remove([p.original, p.processed, p.thumb]);

  revalidatePath("/");
  revalidatePath("/outfits", "layout");
  return { ok: true, data: undefined };
}
