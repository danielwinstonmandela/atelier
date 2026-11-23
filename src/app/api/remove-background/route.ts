import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Optional server-side provider (used only when NEXT_PUBLIC_BG_REMOVAL_PROVIDER=api).
 * Proxies to remove.bg's free tier. The key lives in REMOVE_BG_API_KEY and never reaches the browser.
 * Swap the fetch below to use any other HTTP provider.
 */
export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server-side background removal isn't configured. You can still save the original photo." },
      { status: 501 }
    );
  }

  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  if (!(image instanceof File)) return NextResponse.json({ error: "No image received." }, { status: 400 });
  if (!ALLOWED.includes(image.type)) return NextResponse.json({ error: "Unsupported image type." }, { status: 415 });
  if (image.size > MAX_BYTES) return NextResponse.json({ error: "That image is too large." }, { status: 413 });

  const upstreamBody = new FormData();
  upstreamBody.append("image_file", image);
  upstreamBody.append("size", "auto");
  upstreamBody.append("format", "png");

  let upstream: Response;
  try {
    upstream = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: upstreamBody,
    });
  } catch {
    return NextResponse.json({ error: "The background-removal service is unreachable." }, { status: 503 });
  }

  if (upstream.status === 402 || upstream.status === 429) {
    return NextResponse.json(
      { error: "The free background-removal allowance has been used up. You can still save the original photo." },
      { status: 429 }
    );
  }
  if (!upstream.ok) {
    return NextResponse.json({ error: "Background removal didn't work on this photo." }, { status: 502 });
  }

  return new NextResponse(await upstream.arrayBuffer(), {
    status: 200,
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}
