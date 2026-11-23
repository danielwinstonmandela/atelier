"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Camera, Check, ImagePlus, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CameraCapture } from "@/components/camera-capture";
import { CategoryPicker } from "@/components/category-picker";
import { createItem } from "@/lib/actions/items";
import { BackgroundRemovalError, removeBackground } from "@/lib/background-removal";
import { prepareOriginal, prepareProcessed, prepareThumb } from "@/lib/image";
import { itemPaths } from "@/lib/storage-paths";
import { createClient } from "@/lib/supabase/client";
import { ACCEPTED_IMAGE_TYPES, BUCKET, MAX_UPLOAD_BYTES, type Category } from "@/lib/types";
import { cn } from "@/lib/utils";

type BgState = "idle" | "working" | "done" | "error" | "declined";

export function AddItemForm({ userId }: { userId: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const captureInput = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [source, setSource] = useState<Blob | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [cutout, setCutout] = useState<Blob | null>(null);
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null);
  const [view, setView] = useState<"original" | "cutout">("original");
  const [bg, setBg] = useState<BgState>("idle");
  const [bgProgress, setBgProgress] = useState(0);
  const [bgError, setBgError] = useState<string | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Manage object URLs so we never leak memory
  useEffect(() => {
    if (!source) return setSourceUrl(null);
    const url = URL.createObjectURL(source);
    setSourceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [source]);
  useEffect(() => {
    if (!cutout) return setCutoutUrl(null);
    const url = URL.createObjectURL(cutout);
    setCutoutUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [cutout]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const resetProcessing = useCallback(() => {
    abortRef.current?.abort();
    setCutout(null);
    setView("original");
    setBg("idle");
    setBgProgress(0);
    setBgError(null);
  }, []);

  const acceptImage = useCallback(
    (file: Blob, label?: string) => {
      setError(null);
      if (file.type && !ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        return setError(`${label ?? "That file"} isn't a supported image. Please choose a JPEG, PNG or WebP photo.`);
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        return setError(`${label ?? "That photo"} is larger than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB. Please choose a smaller one.`);
      }
      resetProcessing();
      setSource(file);
      setCameraOpen(false);
    },
    [resetProcessing]
  );

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (file) acceptImage(file, file.name);
  }

  async function runBackgroundRemoval() {
    if (!source) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setBg("working");
    setBgError(null);
    setBgProgress(0);
    try {
      const result = await removeBackground(source, { signal: controller.signal, onProgress: setBgProgress });
      if (controller.signal.aborted) return;
      setCutout(result);
      setView("cutout");
      setBg("done");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setBg("error");
      setBgError(
        err instanceof BackgroundRemovalError
          ? err.message
          : "Background removal didn't work. You can still save the original photo."
      );
    }
  }

  function cancelBackgroundRemoval() {
    abortRef.current?.abort();
    setBg("idle");
  }

  function revertToOriginal() {
    resetProcessing();
    setBg("declined");
  }

  async function save() {
    if (!source || !category) return;
    setError(null);
    const supabase = createClient();
    const id = crypto.randomUUID();
    const paths = itemPaths(userId, id);
    const uploaded: string[] = [];

    try {
      setSaving("Preparing photo…");
      const original = await prepareOriginal(source);
      const processed = cutout ? await prepareProcessed(cutout) : null;
      const thumb = await prepareThumb((processed ?? original).blob);

      const upload = async (path: string, blob: Blob) => {
        const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
          contentType: blob.type,
          upsert: false,
          cacheControl: "31536000",
        });
        if (error) throw new Error("Uploading failed. Check your connection and try again.");
        uploaded.push(path);
      };

      setSaving("Uploading…");
      await upload(paths.original, original.blob);
      if (processed) await upload(paths.processed, processed.blob);
      await upload(paths.thumb, thumb.blob); // best-effort variants are fine to be required here: tiny

      setSaving("Saving…");
      const res = await createItem({ id, name: name.trim() || null, category, hasProcessed: Boolean(processed) });
      if (!res.ok) throw new Error(res.error);

      toast.success("Added to the archive");
      router.push("/");
      router.refresh();
    } catch (err) {
      if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded).catch(() => undefined);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSaving(null);
    }
  }

  const previewUrl = view === "cutout" && cutoutUrl ? cutoutUrl : sourceUrl;
  const canSave = Boolean(source && category) && bg !== "working" && !saving;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-10">
        <p className="eyebrow mb-3">New item</p>
        <h1 className="display text-4xl sm:text-5xl">Add to the archive</h1>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
        {/* ---------- Left: photo ---------- */}
        <section aria-label="Photo">
          {cameraOpen ? (
            <CameraCapture
              onCapture={(blob) => acceptImage(blob, "The photo")}
              onCancel={() => setCameraOpen(false)}
              onUnavailable={(reason) => {
                setCameraOpen(false);
                setError(reason);
                // On phones the native camera sheet is still available through the capture input.
                if (/denied/i.test(reason) === false) captureInput.current?.click();
              }}
            />
          ) : source && previewUrl ? (
            <div className="space-y-4">
              <div
                className={cn(
                  "tile aspect-[4/5] w-full",
                  view === "cutout" && "bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,hsl(var(--background))_0%_50%)] bg-[length:20px_20px]"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Preview of your clothing item"
                  className={cn("absolute inset-0 size-full", view === "cutout" ? "object-contain p-[6%]" : "object-cover")}
                />
                {bg === "working" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/75 backdrop-blur-[2px]">
                    <Loader2 className="size-6 animate-spin" />
                    <p className="text-sm">
                      {bgProgress > 0 && bgProgress < 1 ? `Preparing the remover… ${Math.round(bgProgress * 100)}%` : "Removing background…"}
                    </p>
                    <p className="max-w-[16rem] text-center text-xs text-muted-foreground">
                      The first time can take a moment while a small model downloads.
                    </p>
                  </div>
                )}
              </div>

              {bg === "done" && (
                <div className="flex gap-1 rounded-full bg-muted p-1 text-xs">
                  {(["cutout", "original"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setView(v)}
                      className={cn("flex-1 rounded-full px-3 py-1.5 capitalize transition-colors", view === v ? "bg-background shadow-sm" : "text-muted-foreground")}
                    >
                      {v === "cutout" ? "Cut-out" : "Original"}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50"
                disabled={Boolean(saving)}
                onClick={() => {
                  resetProcessing();
                  setSource(null);
                }}
              >
                Choose a different photo
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="group flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card transition-colors hover:border-foreground/50"
              >
                <ImagePlus className="size-7 text-muted-foreground transition-colors group-hover:text-foreground" strokeWidth={1.25} />
                <span className="display text-2xl">Choose a photo</span>
                <span className="text-sm text-muted-foreground">from your gallery or files</span>
              </button>
              <Button variant="outline" size="lg" className="w-full" onClick={() => setCameraOpen(true)}>
                <Camera /> Take a photo
              </Button>
            </div>
          )}

          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only" onChange={onFilePicked} tabIndex={-1} />
          <input ref={captureInput} type="file" accept="image/*" capture="environment" className="sr-only" onChange={onFilePicked} tabIndex={-1} />
        </section>

        {/* ---------- Right: details ---------- */}
        <section aria-label="Details" className={cn("space-y-8 transition-opacity", !source && "pointer-events-none opacity-40")} aria-disabled={!source}>
          {/* Optional background removal */}
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="display text-xl">Would you like to remove the background?</p>
            <p className="mt-1 text-sm text-muted-foreground">Optional. Your original photo is always kept.</p>

            {bg === "idle" && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={runBackgroundRemoval} disabled={!source}>
                  <Sparkles /> Yes, remove background
                </Button>
                <Button variant="outline" onClick={() => setBg("declined")} disabled={!source}>
                  No, keep original image
                </Button>
              </div>
            )}
            {bg === "working" && (
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={cancelBackgroundRemoval}>
                  Cancel
                </Button>
              </div>
            )}
            {bg === "done" && (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-4" /> Background removed
                </span>
                <Button variant="outline" size="sm" onClick={revertToOriginal}>
                  <RotateCcw /> Revert to original
                </Button>
              </div>
            )}
            {bg === "declined" && (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                Keeping the original image.
                <button type="button" className="text-foreground underline underline-offset-4" onClick={() => setBg("idle")}>
                  Change my mind
                </button>
              </div>
            )}
            {bg === "error" && (
              <div className="mt-4 space-y-3" role="alert">
                <p className="flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" /> {bgError}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={runBackgroundRemoval}>
                    Try again
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setBg("declined")}>
                    Keep original
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <span className="eyebrow">Category</span>
            <CategoryPicker value={category} onChange={setCategory} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="name" className="eyebrow">
              Name <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <Input id="name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="e.g. Navy oxford shirt" />
          </div>

          <div aria-live="polite">
            {error && (
              <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button size="lg" className="flex-1" onClick={save} disabled={!canSave}>
              {saving && <Loader2 className="animate-spin" />}
              {saving ?? "Record in archive"}
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/" aria-disabled={Boolean(saving)} onClick={(e) => saving && e.preventDefault()}>
                Cancel
              </Link>
            </Button>
          </div>
          {source && !category && <p className="-mt-4 text-xs text-muted-foreground">Choose a category to continue.</p>}
        </section>
      </div>
    </div>
  );
}
