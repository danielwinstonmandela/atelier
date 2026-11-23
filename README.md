# Wardrobe — Digital Wardrobe MVP

## Theme and typography

The app includes Light, Night and System themes. Night is the default. Söhne is expected to be installed locally at `public/fonts/`:

- `soehne-var.woff2` (preferred variable file), or
- `soehne-buch.woff2`, `soehne-kraftig.woff2`, and `soehne-halbfett.woff2`

Söhne is commercially licensed and its font files must not be committed to a public repository. The app automatically falls back to Inter when no Söhne files are present. To switch back to plain Inter, remove the Söhne `@font-face` declarations from `src/app/globals.css`.


A minimalist, visual-first personal wardrobe: photograph your clothes, browse them, combine them into outfits, and save the ones you like.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui-style components (Radix) · Supabase (Postgres, Auth, Storage) · Vercel

## What's in the MVP

| Area | Status |
|---|---|
| Email/password auth (Supabase Auth), route protection | ✅ |
| Add item: upload from gallery/files **or** camera capture, preview, category, optional name | ✅ |
| Optional background removal (never automatic, original always kept, revertible, graceful failure) | ✅ |
| Wardrobe gallery: responsive grid, category filters, detail, edit, delete (with confirmation) | ✅ |
| Outfit builder: Top / Bottom / Shoes + optional Extra, replace and clear per slot | ✅ |
| Save outfit (empty outfits blocked), browse, open, modify, save as new, delete | ✅ |
| Deleted clothing never breaks saved outfits (slot shows "no longer in your wardrobe") | ✅ |
| Row Level Security on all tables **and** storage; no service-role key anywhere | ✅ |
| Excluded features (recommendations, try-on, analytics, …) | not built, by design |

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). It creates:
   - `clothing_items`, `outfits`, `outfit_items` with foreign keys, constraints and indexes
   - RLS policies so each user only ever sees their own rows
   - a **private** `wardrobe` storage bucket with per-user folder policies (`<user_id>/…`)
   - explicit table privileges for the Supabase `authenticated` role
3. Existing projects that already ran `0001_init.sql` should also run [`supabase/migrations/0002_grant_app_tables.sql`](supabase/migrations/0002_grant_app_tables.sql).
4. Existing projects should then run [`supabase/migrations/0003_shared_wardrobes.sql`](supabase/migrations/0003_shared_wardrobes.sql) for shared wardrobe support.
5. Run [`supabase/migrations/0002_outfit_canvas.sql`](supabase/migrations/0002_outfit_canvas.sql) to add the normalized free-form outfit canvas fields and remove the old one-piece-per-slot uniqueness constraint.
6. **Authentication → Providers**: keep *Email* enabled. For quick local testing you may turn off *Confirm email*; otherwise users confirm via the emailed link.
7. **Authentication → URL Configuration**: set *Site URL* to your deployed URL and add `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback` to *Redirect URLs*.

## 2. Run locally

```bash
cp .env.example .env.local     # then fill in the two values from Project Settings → API
npm install
npm run dev                    # http://localhost:3000
```

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Publishable key (safe in the browser; protected by RLS) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | no | Legacy alternative; publishable key is preferred |
| `NEXT_PUBLIC_SITE_URL` | no | Used for confirmation-email redirects |
| `NEXT_PUBLIC_BG_REMOVAL_PROVIDER` | no | `browser` (default) or `api` |
| `REMOVE_BG_API_KEY` | no | Only for the `api` provider. Server-side only. |

Without the two Supabase variables the app shows a setup screen instead of crashing.

## 3. Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel: **Add New → Project**, import the repo (framework preset: Next.js).
3. Add the environment variables above (at minimum the two Supabase ones) and deploy.
4. Add the Vercel URL to Supabase *Site URL* / *Redirect URLs* (step 1.4).

## How it works

**Images.** The browser downsizes the photo (longest side 1600 px, JPEG) and uploads it straight to Supabase Storage under `<user_id>/<item_id>/original.jpg`, plus a 480 px WebP thumbnail used by grids so full-size images aren't loaded unnecessarily. The bucket is private; pages receive short-lived signed URLs generated on the server. The `*_image_url` columns store the **storage path** (not a public URL) for that reason. A Server Action then verifies the upload and inserts the row — paths are derived server-side, never trusted from the client. Deleting an item removes its files.

> The stored "original" is the photo after downscaling to 1600 px, not the raw camera file. This keeps storage small; change `MAX_ORIGINAL_DIM` in `src/lib/image.ts` if you want more resolution.

**Background removal** lives behind `src/lib/background-removal/`. The app only calls `removeBackground()`; the provider is chosen by `NEXT_PUBLIC_BG_REMOVAL_PROVIDER`:

- `browser` (default): free, runs locally via [`@imgly/background-removal`](https://github.com/imgly/background-removal-js). The ~40 MB model downloads on first use and is cached. No data leaves the device and there are no per-image costs.
- `api`: posts to `/api/remove-background`, which proxies to remove.bg using `REMOVE_BG_API_KEY` (server-side only) and translates quota/limit errors into clear messages.

Add another engine by implementing the two-line `BackgroundRemovalProvider` interface and registering it in `index.ts`. Failures never block saving — the original is always kept.

> **Licensing note:** `@imgly/background-removal` is licensed AGPL-3.0 (commercial licences available from IMG.LY). That is fine for a personal project; review it before shipping a commercial or closed-source product, or switch to another provider.

**Security.** RLS on every table; `outfit_items` ownership flows through the parent outfit, and a database trigger refuses an outfit that references someone else's clothing. Storage policies restrict each user to their own folder. Uploads are validated by type and size on the client, enforced by bucket limits (10 MB; JPEG/PNG/WebP), and the Server Actions validate every id, category and name. The service-role key is never used.

## Project layout

```
src/
  app/
    login/                 auth screen
    auth/callback/         email-confirmation handler
    api/remove-background/ optional server-side provider
    (app)/                 authenticated shell
      page.tsx             My Wardrobe
      add/                 Add Item
      outfits/             Saved Outfits  ·  new/ Builder  ·  [id]/ open & modify
  components/              UI (ui/ = shadcn-style primitives), gallery, builder, forms
  lib/
    actions/               Server Actions: auth, items, outfits
    background-removal/    swappable provider layer
    supabase/              browser / server / middleware clients
    data.ts                queries + signed-URL resolution
    image.ts               client-side resize/encode
supabase/migrations/       schema, RLS, storage policies
```

## Known limits / next steps

- Camera capture uses `getUserMedia` (HTTPS or localhost required) and falls back to the device's native camera picker on phones when unavailable.
- HEIC photos only work in browsers that can decode them (Safari); others get a clear message to choose JPEG/PNG/WebP.
- Replacing a saved outfit's pieces is delete-then-insert rather than a single transaction; if it fails mid-way the app reports an error and the outfit can simply be re-saved.
- Not tested against a live Supabase project in this build environment (no credentials available) — the type-check, production build and auth-redirect smoke test pass; please run the SQL and walk through the journeys once with your own project.
# atelier
