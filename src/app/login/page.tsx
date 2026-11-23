import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { AuthForm } from "./auth-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  const { error } = await searchParams;

  return (
    <main className="relative grid min-h-dvh lg:grid-cols-2">
      <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6"><ThemeToggle /></div>
      <section className="relative hidden bg-muted lg:flex lg:flex-col lg:justify-between lg:p-14">
        <p className="eyebrow">ATELIER</p>
        <div>
          <h1 className="display max-w-md text-6xl leading-[1.05]">
            Things, ensembles, looks, <em className="italic">quietly</em> in order.
          </h1>
          <p className="mt-6 max-w-sm text-muted-foreground">
            Photograph your pieces once. Browse the archive and compose looks without opening a drawer.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Private by design.</p>
        <SiteFooter className="absolute bottom-6 left-14 hidden lg:block" />
      </section>

      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm animate-fade-up">
          <p className="eyebrow mb-3 lg:hidden">ATELIER</p>
          <AuthForm callbackError={error === "callback"} />
        </div>
      </section>
    </main>
  );
}
