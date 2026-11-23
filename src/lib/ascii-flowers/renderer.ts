import type { FlowerGeometry } from "./geometry";

export interface GridPoint { char: string; x: number; y: number; color: string; alpha: number }

export function projectFlower(
  geometry: FlowerGeometry,
  angle: number,
  pitch: number,
  palette: string[],
  theme: "dark" | "light",
  cols = 36,
  rows = 24
): GridPoint[] {
  const grid = new Uint8Array(cols * rows);
  const result: GridPoint[] = [];
  const xa = 1 / 0.6;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const ramp = theme === "dark" ? " .:*+=#@" : "@#*+=:. ";

  for (const point of geometry.points) {
    const x1 = point.x * cos - point.z * sin;
    const z1 = point.x * sin + point.z * cos;
    const y1 = point.y * cosPitch - z1 * sinPitch;
    const z2 = point.y * sinPitch + z1 * cosPitch;
    const px = Math.round((x1 * xa + 0.62) * (cols - 1) / 1.24);
    const py = Math.round((0.75 - y1) * (rows - 1) / 1.5);
    if (px < 0 || px >= cols || py < 0 || py >= rows) continue;
    const depth = z2 * 50 + 50;
    const index = py * cols + px;
    if (grid[index] >= depth) continue;
    grid[index] = depth;
    const shade = Math.max(0, Math.min(ramp.length - 1, Math.floor(point.brightness * (ramp.length - 1))));
    const char = ramp[shade] ?? ".";
    if (char === " ") continue;
    const colorIndex =
      point.kind === 3 ? (palette.length > 3 ? 2 : 1)
      : point.kind === 4 ? (palette.length > 4 ? 3 : palette.length - 1)
      : point.kind === 5 ? (palette.length > 4 ? 4 : palette.length - 1)
      : point.kind % 3;
    result.push({
      char,
      x: px,
      y: py,
      color: palette[colorIndex] ?? palette[0],
      alpha: theme === "dark" ? point.brightness : 0.65 + point.brightness * 0.35,
    });
  }
  return result;
}
