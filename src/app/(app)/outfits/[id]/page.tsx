import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OutfitBuilder } from "@/components/outfit-builder";
import { getOutfits, getWardrobe } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { UUID_RE } from "@/lib/storage-paths";

export const metadata: Metadata = { title: "Edit look" };
export const dynamic = "force-dynamic";

export default async function OutfitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const [wardrobe, outfits] = await Promise.all([getWardrobe(supabase), getOutfits(supabase, id)]);
  const outfit = outfits[0];
  if (!outfit) notFound();

  // key forces a fresh builder state when navigating between outfits or after a save
  return <OutfitBuilder key={`${outfit.id}-${outfit.updated_at}`} wardrobe={wardrobe} outfit={outfit} />;
}
