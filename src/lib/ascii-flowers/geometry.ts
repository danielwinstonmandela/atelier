import type { FlowerKind } from "./palette";
import { mulberry32 } from "./random";

export interface Point3 { x: number; y: number; z: number; brightness: number; kind: number }
export interface FlowerGeometry { points: Point3[] }

export function buildFlower(kind: FlowerKind, seed: number): FlowerGeometry {
  const random = mulberry32(seed);
  const points: Point3[] = [];

  for (let i = 0; i < 34; i++) {
    const angle = (i / 34) * Math.PI * 2;
    const radius = kind === "daisy" ? 0.13 + random() * 0.03 : 0.12 + random() * 0.05;
    for (let j = 0; j < 3; j++) {
      const r = radius * (0.35 + j * 0.28);
      points.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        z: kind === "daisy" ? 0.24 + random() * 0.03 : 0.28 + random() * 0.08,
        brightness: 0.55 + random() * 0.45,
        kind: j,
      });
    }
  }

  if (kind === "daisy") {
    for (let i = 0; i < 24; i++) {
      const angle = random() * Math.PI * 2;
      const radius = Math.sqrt(random()) * 0.055;
      points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, z: 0.29, brightness: 0.8 + random() * 0.2, kind: 3 });
    }
  } else {
    for (let i = 0; i < 18; i++) {
      points.push({
        x: (random() - 0.5) * 0.17,
        y: (random() - 0.5) * 0.12,
        z: 0.24 + random() * 0.08,
        brightness: 0.55 + random() * 0.45,
        kind: 2,
      });
    }
  }

  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    points.push({
      x: Math.sin(t * Math.PI) * 0.025,
      y: -0.22 - t * 0.42,
      z: 0.05,
      brightness: 0.35 + (1 - t) * 0.2,
      kind: 4,
    });
  }

  for (let i = 0; i < 16; i++) {
    const side = i % 2 ? 1 : -1;
    const t = i / 16;
    points.push({
      x: side * (0.05 + t * 0.08),
      y: -0.32 - t * 0.18,
      z: 0.04,
      brightness: 0.35 + random() * 0.25,
      kind: 5,
    });
  }
  return { points };
}
