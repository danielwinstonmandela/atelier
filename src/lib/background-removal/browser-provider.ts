import { BackgroundRemovalError, type BackgroundRemovalProvider } from "./types";

/**
 * Local, free provider. The model (~40 MB) is downloaded on first use and cached by the browser,
 * so nothing is sent to a server and there is no per-image cost.
 */
export const browserProvider: BackgroundRemovalProvider = {
  id: "browser",
  async remove(image, options) {
    let mod: typeof import("@imgly/background-removal");
    try {
      mod = await import("@imgly/background-removal");
    } catch {
      throw new BackgroundRemovalError("unavailable", "The background remover couldn't be loaded.");
    }

    if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");

    try {
      const work = mod.removeBackground(image, {
        output: { format: "image/png" },
        progress: (_key: string, current: number, total: number) => {
          if (total > 0) options?.onProgress?.(Math.min(1, current / total));
        },
      });

      // The library has no cancel; race the abort signal so the UI is released immediately.
      if (!options?.signal) return await work;
      return await Promise.race([
        work,
        new Promise<never>((_, reject) =>
          options.signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {
            once: true,
          })
        ),
      ]);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      const msg = err instanceof Error ? err.message : "";
      if (/fetch|network|load|resource/i.test(msg)) {
        throw new BackgroundRemovalError(
          "unavailable",
          "The background-removal model couldn't be downloaded. Check your connection and try again."
        );
      }
      throw new BackgroundRemovalError("failed", "Background removal didn't work on this photo.");
    }
  },
};
