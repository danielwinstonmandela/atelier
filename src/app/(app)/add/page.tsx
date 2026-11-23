import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AddItemForm } from "@/components/add-item-form";
import { createClient } from "@/lib/supabase/server";
import { ensureOwnWardrobe, getWardrobeContext } from "@/lib/data";

export const metadata: Metadata = { title: "Add item" };

export default async function AddItemPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  let wardrobe = await getWardrobeContext(supabase);
  if (!wardrobe) wardrobe = await ensureOwnWardrobe(supabase, user.id);
  if (wardrobe?.role !== "owner") redirect("/");
  return <AddItemForm userId={user.id} />;
}
