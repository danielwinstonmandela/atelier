export type BackgroundRemovalErrorCode =
  | "unavailable" // service/model could not be reached or loaded
  | "rate_limited" // free tier or quota exhausted
  | "unsupported" // image can't be processed
  | "failed";

export class BackgroundRemovalError extends Error {
  constructor(
    public code: BackgroundRemovalErrorCode,
    message: string
  ) {
    super(message);
    this.name = "BackgroundRemovalError";
  }
}

export interface RemoveOptions {
  signal?: AbortSignal;
  /** 0..1 — only reported by providers that can (the browser model download, mostly) */
  onProgress?: (fraction: number) => void;
}

export interface BackgroundRemovalProvider {
  id: string;
  /** Resolves with a PNG that has a transparent background. Must never mutate the input. */
  remove(image: Blob, options?: RemoveOptions): Promise<Blob>;
}
