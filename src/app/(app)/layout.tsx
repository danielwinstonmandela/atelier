import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { SetupNotice } from "@/components/setup-notice";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ensureOwnWardrobe, getWardrobeContext } from "@/lib/data";
import { SiteFooter } from "@/components/site-footer";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  let wardrobe = await getWardrobeContext(supabase);
  if (!wardrobe) wardrobe = await ensureOwnWardrobe(supabase, user.id);

  return (
    <>
      <AppHeader
        email={user.email ?? ""}
        wardrobeName={wardrobe?.name}
        role={wardrobe?.role}
        isOwner={wardrobe?.role === "owner"}
      />
      <main className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pt-12">{children}</main>
      <SiteFooter className="mx-auto max-w-6xl px-4 pb-8 sm:px-6" />
    </>
  );
}
