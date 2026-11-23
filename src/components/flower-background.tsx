"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { buildFlower } from "@/lib/ascii-flowers/geometry";
import { flowerPalette, FLOWER_OPACITY, type FlowerKind } from "@/lib/ascii-flowers/palette";
import { mulberry32 } from "@/lib/ascii-flowers/random";
import { projectFlower } from "@/lib/ascii-flowers/renderer";

export type FlowerIntensity = "quiet" | "normal" | "bold";

interface FlowerLayout {
  kind: FlowerKind;
  seed: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  direction: number;
  pitch: number;
  phase: number;
}

export function FlowerBackground({ intensity = "normal" }: { intensity?: FlowerIntensity }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();
  const effectiveIntensity: FlowerIntensity =
    intensity === "bold" ? "bold" : pathname.startsWith("/outfits/new") || pathname.includes("/outfits/")
      ? "quiet"
      : intensity;
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    try {
      setEnabled(localStorage.getItem("wardrobe-background-flowers") !== "off");
    } catch {}
    const changed = (event: Event) => setEnabled((event as CustomEvent<boolean>).detail);
    window.addEventListener("wardrobe:flowers", changed);
    return () => window.removeEventListener("wardrobe:flowers", changed);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frame = 0;
    let resizeTimer = 0;
    let stopped = false;
    let flowers: FlowerLayout[] = [];
    const geometries = new Map<number, ReturnType<typeof buildFlower>>();
    let seed = Date.now();
    try {
      const stored = sessionStorage.getItem("wardrobe-flower-seed");
      seed = stored ? Number(stored) : seed;
      if (!stored) sessionStorage.setItem("wardrobe-flower-seed", String(seed));
    } catch {}

    const rebuild = () => {
      const width = window.innerWidth;
      const mobile = width < 720;
      const random = mulberry32(seed ^ (width << 4));
      const count = effectiveIntensity === "bold"
        ? (mobile ? 7 : 15)
        : effectiveIntensity === "quiet"
          ? (mobile ? 3 : 5)
          : (mobile ? 5 : 11);
      const candidates: FlowerLayout[] = [];
      for (let i = 0; i < count * 5 && candidates.length < count; i++) {
        const edge = random() < 0.68;
        const x = edge
          ? (random() < 0.5 ? random() * 0.28 : 0.72 + random() * 0.28)
          : 0.25 + random() * 0.5;
        const y = 0.06 + random() * 0.88;
        if (x > 0.28 && x < 0.72 && y > 0.18 && y < 0.82) continue;
        if (candidates.some((flower) => Math.hypot(flower.x - x, flower.y - y) < 0.16)) continue;
        candidates.push({
          kind: random() > 0.48 ? "daisy" : "tulip",
          seed: Math.floor(random() * 100000),
          x,
          y,
          size: 45 + random() * 95,
          speed: 0.1 + random() * 0.3,
          direction: random() > 0.5 ? 1 : -1,
          pitch: -0.18 + random() * 0.36,
          phase: random() * Math.PI * 2,
        });
      }
      flowers = candidates;
      for (const flower of flowers) {
        if (!geometries.has(flower.seed)) geometries.set(flower.seed, buildFlower(flower.kind, flower.seed));
      }
    };

    rebuild();
    let debounce = 0;
    const resize = () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => rebuild(), 120);
    };

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduceMotion = media.matches;
    const motionChanged = () => {
      reduceMotion = media.matches;
      if (reduceMotion) draw(performance.now());
    };
    media.addEventListener("change", motionChanged);
    window.addEventListener("resize", resize);

    const theme = resolvedTheme === "light" ? "light" : "dark";
    const baseOpacity = theme === "dark" ? FLOWER_OPACITY.night : FLOWER_OPACITY.light;
    const opacity = baseOpacity * (effectiveIntensity === "bold" ? 1.4 : effectiveIntensity === "quiet" ? 0.5 : 1);

    function draw(time: number) {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = opacity;
      ctx.font = 'bold 7px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (const flower of flowers) {
        const palette = flowerPalette(flower.kind);
        const geometry = geometries.get(flower.seed) ?? buildFlower(flower.kind, flower.seed);
        const angle = reduceMotion ? flower.phase : flower.phase + time * 0.001 * flower.speed * flower.direction;
        const grid = projectFlower(geometry, angle, flower.pitch, palette, theme, 36, 24);
        const cell = Math.max(3, flower.size / 36);
        const originX = flower.x * width;
        const originY = flower.y * height;
        for (const point of grid) {
          ctx.fillStyle = theme === "light" ? point.color : point.color;
          ctx.globalAlpha = opacity * point.alpha;
          ctx.fillText(point.char, originX + (point.x - 18) * cell, originY + (point.y - 12) * cell);
        }
      }
      ctx.globalAlpha = 1;
    }

    let lastTime = 0;
    const animate = (time: number) => {
      if (stopped) return;
      if (document.hidden) {
        frame = requestAnimationFrame(animate);
        return;
      }
      if (time - lastTime >= 42 || reduceMotion) {
        draw(time);
        lastTime = time;
        if (reduceMotion) return;
      }
      frame = requestAnimationFrame(animate);
    };
    draw(performance.now());
    if (!reduceMotion) frame = requestAnimationFrame(animate);

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(debounce);
      window.removeEventListener("resize", resize);
      media.removeEventListener("change", motionChanged);
    };
  }, [enabled, resolvedTheme, effectiveIntensity]);

  if (!enabled) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      style={{
        maskImage: "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,.7) 34%, black 100%)",
        WebkitMaskImage: "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,.7) 34%, black 100%)",
      }}
    />
  );
}
