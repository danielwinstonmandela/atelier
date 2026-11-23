export function SetupNotice() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
      <p className="eyebrow mb-3">Setup required</p>
      <h1 className="display mb-4 text-4xl">Connect Supabase to begin</h1>
      <p className="mb-6 text-muted-foreground">
        This app needs a Supabase project for authentication, the database and image storage. Copy{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm">.env.example</code> to{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm">.env.local</code>, fill in the two values, run the
        SQL in <code className="rounded bg-muted px-1.5 py-0.5 text-sm">supabase/migrations</code>, then restart the
        dev server. The README walks through each step.
      </p>
      <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
        {`NEXT_PUBLIC_SUPABASE_URL=...\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...`}
      </pre>
    </main>
  );
}
