import type { Metadata } from "next";
import { WardrobeGallery } from "@/components/wardrobe-gallery";
import { ensureOwnWardrobe, getWardrobe } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { getWardrobeContext } from "@/lib/data";

export const metadata: Metadata = { title: "Archive" };
export const dynamic = "force-dynamic";

export default async function WardrobePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await ensureOwnWardrobe(supabase, user.id);
  const items = await getWardrobe(supabase);
  const wardrobe = await getWardrobeContext(supabase);
  return <WardrobeGallery items={items} canEdit={wardrobe?.role === "owner"} />;
}
