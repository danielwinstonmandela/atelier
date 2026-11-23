"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthState {
  error?: string;
  message?: string;
}

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Please enter a valid email address." } as const;
  if (password.length < 8) return { error: "Password must be at least 8 characters." } as const;
  return { email, password } as const;
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const creds = readCredentials(formData);
  if ("error" in creds) return { error: creds.error };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(creds);
  if (error) return { error: "Those details didn't match an account. Check them and try again." };
  redirect("/");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const creds = readCredentials(formData);
  if ("error" in creds) return { error: creds.error };

  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? h.get("origin") ?? `https://${h.get("host")}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...creds,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: error.message };

  // With email confirmation enabled there is no session yet.
  if (!data.session) {
    return { message: "Check your inbox to confirm your email, then sign in." };
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
