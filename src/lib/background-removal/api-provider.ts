import { BackgroundRemovalError, type BackgroundRemovalProvider } from "./types";

/** Calls our own route handler, which keeps any third-party API key on the server. */
export const apiProvider: BackgroundRemovalProvider = {
  id: "api",
  async remove(image, options) {
    const form = new FormData();
    form.append("image", image, "image.jpg");

    let res: Response;
    try {
      res = await fetch("/api/remove-background", { method: "POST", body: form, signal: options?.signal });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      throw new BackgroundRemovalError("unavailable", "Couldn't reach the background-removal service.");
    }

    if (res.ok) return await res.blob();

    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.status === 429 || res.status === 402) {
      throw new BackgroundRemovalError(
        "rate_limited",
        body.error ?? "The free background-removal allowance has been used up. You can still save the original photo."
      );
    }
    if (res.status === 501 || res.status === 503) {
      throw new BackgroundRemovalError("unavailable", body.error ?? "Background removal isn't set up on this server.");
    }
    throw new BackgroundRemovalError("failed", body.error ?? "Background removal didn't work on this photo.");
  },
};
