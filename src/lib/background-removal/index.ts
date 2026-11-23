/**
 * Background removal service layer.
 *
 * The rest of the app only talks to `removeBackground()`. Which engine runs behind it is a single
 * environment variable (NEXT_PUBLIC_BG_REMOVAL_PROVIDER), so a provider can be swapped — or a new
 * one added to PROVIDERS below — without touching any wardrobe code.
 *
 *   "browser" (default)  free, runs locally in the browser via @imgly/background-removal
 *   "api"                posts to /api/remove-background, which holds the third-party key server-side
 *
 * Nothing here is ever called unless the user explicitly asks for it.
 */
import { browserProvider } from "./browser-provider";
import { apiProvider } from "./api-provider";
import type { BackgroundRemovalProvider } from "./types";

export { BackgroundRemovalError } from "./types";
export type { BackgroundRemovalProvider, RemoveOptions } from "./types";

const PROVIDERS: Record<string, BackgroundRemovalProvider> = {
  browser: browserProvider,
  api: apiProvider,
};

export function getProvider(): BackgroundRemovalProvider {
  const id = process.env.NEXT_PUBLIC_BG_REMOVAL_PROVIDER ?? "browser";
  return PROVIDERS[id] ?? browserProvider;
}

export function removeBackground(image: Blob, options?: import("./types").RemoveOptions): Promise<Blob> {
  return getProvider().remove(image, options);
}
