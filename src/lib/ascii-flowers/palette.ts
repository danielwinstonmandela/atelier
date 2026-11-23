export type FlowerKind = "daisy" | "tulip";
export type FlowerColorMode = "muted" | "full" | "mono";

export const FLOWER_COLOR_MODE: FlowerColorMode = "full";
export const FLOWER_OPACITY = { night: 0.16, light: 0.12 } as const;

const MUTED = {
  daisy: ["#d3bebe", "#9b8b75", "#b7ad90"],
  tulip: ["#c8a0a5", "#aa8586", "#b9a09b"],
  stem: "#71836f",
  leaf: "#687768",
};

export function flowerPalette(kind: FlowerKind, mode: FlowerColorMode = FLOWER_COLOR_MODE) {
  if (mode === "mono") return kind === "daisy" ? ["#d8d8d8", "#b5b5b5"] : ["#c4c4c4", "#9a9a9a"];
  if (mode === "full") {
    return kind === "daisy"
      ? ["#f4d1e2", "#fff1bd", "#ffd45a", "#88a66a", "#668b57"]
      : ["#ff91a4", "#df5f73", "#ffc1ca", "#88a66a", "#668b57"];
  }
  return kind === "daisy" ? MUTED.daisy : MUTED.tulip;
}
