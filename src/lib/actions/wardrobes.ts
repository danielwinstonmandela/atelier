"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureOwnWardrobe } from "@/lib/data";
import type { ActionResult } from "@/lib/actions/items";

export async function inviteMember(email: string, role: "editor" | "viewer"): Promise<ActionResult> {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const wardrobe = await ensureOwnWardrobe(supabase, user.id);
  if (wardrobe.role !== "owner") return { ok: false, error: "Only the wardrobe owner can invite people." };

  const { error } = await supabase.from("wardrobe_invitations").insert({
    wardrobe_id: wardrobe.id,
    email: normalized,
    role,
    invited_by: user.id,
  });
  if (error) {
    return { ok: false, error: error.code === "23505" ? "That person already has a pending invitation." : "Could not send the invitation." };
  }

  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function acceptInvitation(id: string): Promise<ActionResult<{ wardrobeId: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in or create an account first." };

  const { data, error } = await supabase.rpc("accept_wardrobe_invitation", { invitation_id: id });
  if (error || !data) return { ok: false, error: "This invitation is invalid or no longer available." };
  revalidatePath("/", "layout");
  return { ok: true, data: { wardrobeId: data as string } };
}

export async function revokeInvitation(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const wardrobe = await ensureOwnWardrobe(supabase, user.id);
  if (wardrobe.role !== "owner") return { ok: false, error: "Only the wardrobe owner can revoke invitations." };

  const { error } = await supabase
    .from("wardrobe_invitations")
    .update({ status: "revoked" })
    .eq("id", id)
    .eq("wardrobe_id", wardrobe.id);
  if (error) return { ok: false, error: "Could not revoke the invitation." };
  revalidatePath("/sharing");
  return { ok: true, data: undefined };
}

export async function removeMember(userId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const wardrobe = await ensureOwnWardrobe(supabase, user.id);
  if (wardrobe.role !== "owner") return { ok: false, error: "Only the wardrobe owner can remove members." };

  const { error } = await supabase
    .from("wardrobe_members")
    .delete()
    .eq("wardrobe_id", wardrobe.id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: "Could not remove this member." };
  revalidatePath("/sharing");
  return { ok: true, data: undefined };
}
