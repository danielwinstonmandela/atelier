"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Live camera viewfinder using getUserMedia. If the camera is unsupported or permission is denied,
 * `onUnavailable` is called so the parent can fall back to the native capture input.
 */
export function CameraCapture({
  onCapture,
  onCancel,
  onUnavailable,
}: {
  onCapture: (photo: Blob) => void;
  onCancel: () => void;
  onUnavailable: (reason: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        onUnavailable("Camera access isn't supported in this browser.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1440 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
          setReady(true);
        }
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : "";
        onUnavailable(
          name === "NotAllowedError" || name === "SecurityError"
            ? "Camera permission was denied. You can allow it in your browser settings, or choose a photo instead."
            : name === "NotFoundError"
              ? "No camera was found on this device."
              : "The camera couldn't be started."
        );
      }
    }
    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function snap() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
        else onUnavailable("The photo couldn't be captured. Please try again.");
      },
      "image/jpeg",
      0.92
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-foreground">
        <video ref={videoRef} playsInline muted className="size-full object-cover" />
        {!ready && <div className="absolute inset-0 flex items-center justify-center text-sm text-background/70">Starting camera…</div>}
      </div>
      <div className="flex gap-2">
        <Button size="lg" className="flex-1" onClick={snap} disabled={!ready}>
          <Camera /> Take photo
        </Button>
        <Button size="lg" variant="outline" onClick={onCancel}>
          <X /> Cancel
        </Button>
      </div>
    </div>
  );
}
