/* Enhanced procedural pixel-art factory: detailed avatar sprite sheets (4-dir walk cycles),
    emote/status icons, portraits, and color utilities. Everything is drawn
    with 1px rects onto offscreen canvases — no external assets.
    
    Following modern 16x16 pixel art character design principles:
    - Larger, rounder heads for cuter proportions
    - More detailed hair with highlights
    - Bigger, more expressive eyes
    - Better clothing details and shading
    - Enhanced accessories */

export interface AvatarPalette {
  skin: string;
  skinShade: string;
  skinHighlight: string;
  hair: string;
  hairShade: string;
  hairHighlight: string;
  sweater: string;
  sweaterShade: string;
  sweaterHighlight: string;
  pants: string;
  pantsShade: string;
  shoes: string;
  shoesShade: string;
  hat: string;
  hatShade: string;
  hatHighlight: string;
  scarf: string;
  scarfShade: string;
  scarfHighlight: string;
  ink: string;
  blush: string;
  eyeWhite: string;
  eyeHighlight: string;
}

export interface Swatch {
  id: string;
  label: string;
  c: string;
  hat: string;
}

export const SWATCHES: Swatch[] = [
  { id: "ember", label: "Ember", c: "#e06a3c", hat: "#f2c14e" },
  { id: "moss", label: "Moss", c: "#5d8a5e", hat: "#d9a441" },
  { id: "dusk", label: "Dusk", c: "#5f7fae", hat: "#e26d6d" },
  { id: "rose", label: "Rose", c: "#d16a8a", hat: "#7fa07a" },
  { id: "gold", label: "Gold", c: "#d9a03d", hat: "#5f7fae" },
  { id: "plum", label: "Plum", c: "#8a5a7a", hat: "#f2a33c" },
];

export const SKINS = ["#f5d5b8", "#e8c4a0", "#d4a574", "#b8865c", "#8b6242"];
const HAIRS = ["#3a2a24", "#241d24", "#5a3a2a", "#6e5a3a", "#2e2e3a", "#7a4a3a", "#8b4513", "#654321"];

export function darken(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - f)));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - f)));
  const b = Math.max(0, Math.round((n & 255) * (1 - f)));
  return `rgb(${r},${g},${b})`;
}

export function lighten(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * (1 + f)));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * (1 + f)));
  const b = Math.min(255, Math.round((n & 255) * (1 + f)));
  return `rgb(${r},${g},${b})`;
}

export function makePalette(sweater: string, hatColor: string, skin: string, hair: string): AvatarPalette {
  return {
    skin,
    skinShade: darken(skin, 0.15),
    skinHighlight: lighten(skin, 0.15),
    hair,
    hairShade: darken(hair, 0.25),
    hairHighlight: lighten(hair, 0.2),
    sweater,
    sweaterShade: darken(sweater, 0.25),
    sweaterHighlight: lighten(sweater, 0.2),
    pants: "#4a4158",
    pantsShade: darken("#4a4158", 0.2),
    shoes: "#2a1f1a",
    shoesShade: darken("#2a1f1a", 0.15),
    hat: hatColor,
    hatShade: darken(hatColor, 0.25),
    hatHighlight: lighten(hatColor, 0.25),
    scarf: "#c9564a",
    scarfShade: darken("#c9564a", 0.25),
    scarfHighlight: lighten("#c9564a", 0.2),
    ink: "#1a1210",
    blush: "#e8a090",
    eyeWhite: "#ffffff",
    eyeHighlight: "#ffffff",
  };
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  return c;
}

type G = CanvasRenderingContext2D;
function px(g: G, x: number, y: number, c: string) {
  g.fillStyle = c;
  g.fillRect(x, y, 1, 1);
}
function rect(g: G, x: number, y: number, w: number, h: number, c: string) {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
}

/* ---------------- avatar frames ----------------
   Sheet layout: rows = down / up / right (left is mirrored at draw time),
   cols = idle0, idle1(bob), walkA, walkB, walkC, walkD  -> 96 x 48 */
export const SHEET_COLS = 6;

// === FEMALE CHARACTER (default) ===
function drawDownFemale(g: G, p: AvatarPalette, acc: string, frame: number) {
  const beanie = acc === "beanie";
  const scarf = acc === "scarf";
  
  // === HAIR / HAT (larger, rounder, feminine) ===
  if (beanie) {
    // Beanie with pattern
    rect(g, 3, 0, 10, 1, p.hatHighlight);
    rect(g, 3, 1, 10, 2, p.hat);
    rect(g, 2, 3, 12, 1, p.hatShade);
    // Beanie fold
    rect(g, 2, 4, 12, 1, p.hat);
    // Hair peeking out (longer)
    rect(g, 3, 5, 10, 1, p.hair);
    rect(g, 4, 6, 2, 1, p.hairShade);
    rect(g, 10, 6, 2, 1, p.hairShade);
  } else {
    // Long flowing hair with volume
    rect(g, 4, 0, 8, 1, p.hairHighlight);
    rect(g, 3, 1, 10, 1, p.hair);
    rect(g, 2, 2, 12, 2, p.hair);
    rect(g, 2, 4, 12, 2, p.hairShade);
    // Hair strands
    rect(g, 3, 3, 1, 2, p.hairHighlight);
    rect(g, 12, 3, 1, 2, p.hairHighlight);
    // Side hair (longer, flowing down)
    rect(g, 2, 6, 2, 3, p.hair);
    rect(g, 12, 6, 2, 3, p.hair);
    rect(g, 2, 9, 2, 1, p.hairShade);
    rect(g, 12, 9, 2, 1, p.hairShade);
  }
  
  // === FACE (larger, rounder, feminine) ===
  rect(g, 4, 6, 8, 4, p.skin);
  rect(g, 3, 7, 1, 2, p.skinShade);
  rect(g, 12, 7, 1, 2, p.skinShade);
  // Cheek highlights
  rect(g, 5, 7, 1, 1, p.skinHighlight);
  rect(g, 10, 7, 1, 1, p.skinHighlight);
  
  // === EYES (bigger, more expressive, with lashes) ===
  // Eye whites
  rect(g, 5, 7, 2, 2, p.eyeWhite);
  rect(g, 9, 7, 2, 2, p.eyeWhite);
  // Pupils
  px(g, 6, 8, p.ink);
  px(g, 10, 8, p.ink);
  // Eye highlights
  px(g, 5, 7, p.eyeHighlight);
  px(g, 9, 7, p.eyeHighlight);
  // Eyelashes (subtle)
  px(g, 5, 6, p.ink);
  px(g, 9, 6, p.ink);
  
  // Nose hint
  px(g, 7, 9, p.skinShade);
  px(g, 8, 9, p.skinShade);
  
  // Mouth (softer)
  rect(g, 6, 10, 4, 1, p.skinShade);
  px(g, 7, 10, p.blush);
  px(g, 8, 10, p.blush);
  
  // Blush (more prominent)
  px(g, 4, 8, p.blush);
  px(g, 11, 8, p.blush);
  px(g, 4, 9, p.blush);
  px(g, 11, 9, p.blush);
  
  // === NECK & TORSO ===
  if (scarf) {
    rect(g, 4, 10, 8, 1, p.scarf);
    rect(g, 4, 11, 2, 2, p.scarfShade);
    rect(g, 10, 11, 2, 2, p.scarfShade);
    rect(g, 5, 11, 1, 1, p.scarfHighlight);
  }
  
  // Sweater with details (slightly narrower shoulders)
  rect(g, 4, 11, 8, 3, p.sweater);
  rect(g, 4, 11, 1, 3, p.sweaterShade);
  rect(g, 11, 11, 1, 3, p.sweaterShade);
  rect(g, 5, 11, 1, 1, p.sweaterHighlight);
  // Sweater pattern
  rect(g, 6, 12, 4, 1, p.sweaterShade);
  
  // === ARMS ===
  const swing = frame === 2 ? -1 : frame === 4 ? 1 : 0;
  rect(g, 3, 11, 1, 2, p.sweaterShade);
  rect(g, 12, 11, 1, 2, p.sweaterShade);
  // Hands
  px(g, 3, 13 + Math.min(0, swing), p.skin);
  px(g, 12, 13 + Math.max(0, -swing), p.skin);
  
  // === LEGS & SHOES ===
  const leftUp = frame === 2;
  const rightUp = frame === 4;
  rect(g, 5, 14, 2, leftUp ? 1 : 2, p.pants);
  rect(g, 9, 14, 2, rightUp ? 1 : 2, p.pants);
  rect(g, 5, 14, 1, leftUp ? 1 : 2, p.pantsShade);
  rect(g, 9, 14, 1, rightUp ? 1 : 2, p.pantsShade);
  // Shoes
  rect(g, 5, leftUp ? 15 : 16, 2, 1, p.shoes);
  rect(g, 9, rightUp ? 15 : 16, 2, 1, p.shoes);
  rect(g, 5, leftUp ? 15 : 16, 1, 1, p.shoesShade);
  rect(g, 9, rightUp ? 15 : 16, 1, 1, p.shoesShade);
}

// === MALE CHARACTER ===
function drawDownMale(g: G, p: AvatarPalette, acc: string, frame: number) {
  const beanie = acc === "beanie";
  const scarf = acc === "scarf";
  
  // === HAIR / HAT (shorter, more angular, masculine) ===
  if (beanie) {
    // Beanie with pattern
    rect(g, 3, 0, 10, 1, p.hatHighlight);
    rect(g, 3, 1, 10, 2, p.hat);
    rect(g, 2, 3, 12, 1, p.hatShade);
    // Beanie fold
    rect(g, 2, 4, 12, 1, p.hat);
    // Hair peeking out (shorter)
    rect(g, 3, 5, 10, 1, p.hair);
    rect(g, 4, 6, 1, 1, p.hairShade);
    rect(g, 11, 6, 1, 1, p.hairShade);
  } else {
    // Short, styled hair
    rect(g, 4, 0, 8, 1, p.hairHighlight);
    rect(g, 3, 1, 10, 1, p.hair);
    rect(g, 2, 2, 12, 2, p.hair);
    rect(g, 2, 4, 12, 1, p.hairShade);
    // Hair texture
    rect(g, 3, 3, 1, 1, p.hairHighlight);
    rect(g, 12, 3, 1, 1, p.hairHighlight);
    // Side hair (shorter)
    rect(g, 2, 5, 2, 1, p.hair);
    rect(g, 12, 5, 2, 1, p.hair);
  }
  
  // === FACE (slightly more angular, masculine) ===
  rect(g, 4, 6, 8, 4, p.skin);
  rect(g, 3, 7, 1, 2, p.skinShade);
  rect(g, 12, 7, 1, 2, p.skinShade);
  // Cheek highlights (subtler)
  rect(g, 5, 7, 1, 1, p.skinHighlight);
  rect(g, 10, 7, 1, 1, p.skinHighlight);
  
  // === EYES (slightly smaller, no lashes) ===
  // Eye whites
  rect(g, 5, 7, 2, 2, p.eyeWhite);
  rect(g, 9, 7, 2, 2, p.eyeWhite);
  // Pupils
  px(g, 6, 8, p.ink);
  px(g, 10, 8, p.ink);
  // Eye highlights
  px(g, 5, 7, p.eyeHighlight);
  px(g, 9, 7, p.eyeHighlight);
  // No eyelashes for male
  
  // Nose hint (more defined)
  px(g, 7, 9, p.skinShade);
  px(g, 8, 9, p.skinShade);
  px(g, 7, 10, p.skinShade);
  
  // Mouth (straighter)
  rect(g, 6, 10, 4, 1, p.skinShade);
  
  // Blush (less prominent)
  px(g, 4, 8, p.blush);
  px(g, 11, 8, p.blush);
  
  // === NECK & TORSO ===
  if (scarf) {
    rect(g, 4, 10, 8, 1, p.scarf);
    rect(g, 4, 11, 2, 2, p.scarfShade);
    rect(g, 10, 11, 2, 2, p.scarfShade);
    rect(g, 5, 11, 1, 1, p.scarfHighlight);
  }
  
  // Sweater with details (broader shoulders)
  rect(g, 3, 11, 10, 3, p.sweater);
  rect(g, 3, 11, 1, 3, p.sweaterShade);
  rect(g, 12, 11, 1, 3, p.sweaterShade);
  rect(g, 4, 11, 1, 1, p.sweaterHighlight);
  // Sweater pattern
  rect(g, 5, 12, 6, 1, p.sweaterShade);
  
  // === ARMS ===
  const swing = frame === 2 ? -1 : frame === 4 ? 1 : 0;
  rect(g, 2, 11, 1, 2, p.sweaterShade);
  rect(g, 13, 11, 1, 2, p.sweaterShade);
  // Hands
  px(g, 2, 13 + Math.min(0, swing), p.skin);
  px(g, 13, 13 + Math.max(0, -swing), p.skin);
  
  // === LEGS & SHOES ===
  const leftUp = frame === 2;
  const rightUp = frame === 4;
  rect(g, 5, 14, 2, leftUp ? 1 : 2, p.pants);
  rect(g, 9, 14, 2, rightUp ? 1 : 2, p.pants);
  rect(g, 5, 14, 1, leftUp ? 1 : 2, p.pantsShade);
  rect(g, 9, 14, 1, rightUp ? 1 : 2, p.pantsShade);
  // Shoes
  rect(g, 5, leftUp ? 15 : 16, 2, 1, p.shoes);
  rect(g, 9, rightUp ? 15 : 16, 2, 1, p.shoes);
  rect(g, 5, leftUp ? 15 : 16, 1, 1, p.shoesShade);
  rect(g, 9, rightUp ? 15 : 16, 1, 1, p.shoesShade);
}

// Keep old function names as aliases for backward compatibility
function drawDown(g: G, p: AvatarPalette, acc: string, frame: number) {
  drawDownFemale(g, p, acc, frame);
}

// === FEMALE UP VIEW ===
function drawUpFemale(g: G, p: AvatarPalette, acc: string, frame: number) {
  const beanie = acc === "beanie";
  const scarf = acc === "scarf";
  
  // === HAIR / HAT (back view, feminine - longer) ===
  if (beanie) {
    rect(g, 3, 0, 10, 1, p.hatHighlight);
    rect(g, 3, 1, 10, 2, p.hat);
    rect(g, 2, 3, 12, 1, p.hatShade);
    rect(g, 2, 4, 12, 1, p.hat);
    rect(g, 3, 5, 10, 4, p.hair);
    rect(g, 4, 6, 2, 2, p.hairShade);
    rect(g, 10, 6, 2, 2, p.hairShade);
    rect(g, 3, 9, 2, 1, p.hairShade);
    rect(g, 11, 9, 2, 1, p.hairShade);
  } else {
    rect(g, 4, 0, 8, 1, p.hairHighlight);
    rect(g, 3, 1, 10, 1, p.hair);
    rect(g, 2, 2, 12, 2, p.hair);
    rect(g, 2, 4, 12, 5, p.hairShade);
    rect(g, 3, 3, 1, 3, p.hairHighlight);
    rect(g, 12, 3, 1, 3, p.hairHighlight);
    rect(g, 2, 9, 2, 1, p.hair);
    rect(g, 12, 9, 2, 1, p.hair);
  }
  
  // === NECK ===
  if (scarf) {
    rect(g, 4, 10, 8, 1, p.scarf);
    rect(g, 6, 11, 4, 2, p.scarfShade);
    rect(g, 7, 11, 2, 1, p.scarfHighlight);
  }
  
  // === TORSO (back, narrower shoulders) ===
  rect(g, 4, 11, 8, 3, p.sweater);
  rect(g, 4, 11, 1, 3, p.sweaterShade);
  rect(g, 11, 11, 1, 3, p.sweaterShade);
  rect(g, 5, 11, 1, 1, p.sweaterHighlight);
  rect(g, 6, 12, 4, 1, p.sweaterShade);
  
  // === ARMS ===
  rect(g, 3, 11, 1, 2, p.sweaterShade);
  rect(g, 12, 11, 1, 2, p.sweaterShade);
  
  // === LEGS & SHOES ===
  const leftUp = frame === 2;
  const rightUp = frame === 4;
  rect(g, 5, 14, 2, leftUp ? 1 : 2, p.pants);
  rect(g, 9, 14, 2, rightUp ? 1 : 2, p.pants);
  rect(g, 5, 14, 1, leftUp ? 1 : 2, p.pantsShade);
  rect(g, 9, 14, 1, rightUp ? 1 : 2, p.pantsShade);
  rect(g, 5, leftUp ? 15 : 16, 2, 1, p.shoes);
  rect(g, 9, rightUp ? 15 : 16, 2, 1, p.shoes);
  rect(g, 5, leftUp ? 15 : 16, 1, 1, p.shoesShade);
  rect(g, 9, rightUp ? 15 : 16, 1, 1, p.shoesShade);
}

// === MALE UP VIEW ===
function drawUpMale(g: G, p: AvatarPalette, acc: string, frame: number) {
  const beanie = acc === "beanie";
  const scarf = acc === "scarf";
  
  // === HAIR / HAT (back view, masculine - shorter) ===
  if (beanie) {
    rect(g, 3, 0, 10, 1, p.hatHighlight);
    rect(g, 3, 1, 10, 2, p.hat);
    rect(g, 2, 3, 12, 1, p.hatShade);
    rect(g, 2, 4, 12, 1, p.hat);
    rect(g, 3, 5, 10, 2, p.hair);
    rect(g, 4, 6, 1, 1, p.hairShade);
    rect(g, 11, 6, 1, 1, p.hairShade);
  } else {
    rect(g, 4, 0, 8, 1, p.hairHighlight);
    rect(g, 3, 1, 10, 1, p.hair);
    rect(g, 2, 2, 12, 2, p.hair);
    rect(g, 2, 4, 12, 2, p.hairShade);
    rect(g, 3, 3, 1, 1, p.hairHighlight);
    rect(g, 12, 3, 1, 1, p.hairHighlight);
    rect(g, 2, 6, 2, 1, p.hair);
    rect(g, 12, 6, 2, 1, p.hair);
  }
  
  // === NECK ===
  if (scarf) {
    rect(g, 4, 10, 8, 1, p.scarf);
    rect(g, 6, 11, 4, 2, p.scarfShade);
    rect(g, 7, 11, 2, 1, p.scarfHighlight);
  }
  
  // === TORSO (back, broader shoulders) ===
  rect(g, 3, 11, 10, 3, p.sweater);
  rect(g, 3, 11, 1, 3, p.sweaterShade);
  rect(g, 12, 11, 1, 3, p.sweaterShade);
  rect(g, 4, 11, 1, 1, p.sweaterHighlight);
  rect(g, 5, 12, 6, 1, p.sweaterShade);
  
  // === ARMS ===
  rect(g, 2, 11, 1, 2, p.sweaterShade);
  rect(g, 13, 11, 1, 2, p.sweaterShade);
  
  // === LEGS & SHOES ===
  const leftUp = frame === 2;
  const rightUp = frame === 4;
  rect(g, 5, 14, 2, leftUp ? 1 : 2, p.pants);
  rect(g, 9, 14, 2, rightUp ? 1 : 2, p.pants);
  rect(g, 5, 14, 1, leftUp ? 1 : 2, p.pantsShade);
  rect(g, 9, 14, 1, rightUp ? 1 : 2, p.pantsShade);
  rect(g, 5, leftUp ? 15 : 16, 2, 1, p.shoes);
  rect(g, 9, rightUp ? 15 : 16, 2, 1, p.shoes);
  rect(g, 5, leftUp ? 15 : 16, 1, 1, p.shoesShade);
  rect(g, 9, rightUp ? 15 : 16, 1, 1, p.shoesShade);
}

// Keep old function name as alias
function drawUp(g: G, p: AvatarPalette, acc: string, frame: number) {
  drawUpFemale(g, p, acc, frame);
}

// === FEMALE SIDE VIEW ===
function drawSideFemale(g: G, p: AvatarPalette, acc: string, frame: number) {
  const beanie = acc === "beanie";
  const scarf = acc === "scarf";
  
  // === HAIR / HAT (side view, feminine - longer) ===
  if (beanie) {
    rect(g, 4, 0, 8, 1, p.hatHighlight);
    rect(g, 4, 1, 8, 2, p.hat);
    rect(g, 3, 3, 9, 1, p.hatShade);
    rect(g, 3, 4, 9, 1, p.hat);
    rect(g, 4, 5, 8, 1, p.hair);
    rect(g, 5, 6, 2, 1, p.hairShade);
    // Hair flowing down back
    rect(g, 3, 7, 2, 3, p.hair);
    rect(g, 3, 10, 2, 1, p.hairShade);
  } else {
    rect(g, 5, 0, 7, 1, p.hairHighlight);
    rect(g, 4, 1, 8, 1, p.hair);
    rect(g, 3, 2, 9, 2, p.hair);
    rect(g, 3, 4, 9, 2, p.hairShade);
    rect(g, 4, 3, 1, 2, p.hairHighlight);
    rect(g, 11, 3, 1, 2, p.hairHighlight);
    // Long hair flowing down
    rect(g, 3, 6, 2, 4, p.hair);
    rect(g, 3, 10, 2, 1, p.hairShade);
  }
  
  // === FACE (side view, feminine) ===
  rect(g, 6, 6, 6, 4, p.skin);
  rect(g, 5, 7, 1, 2, p.skinShade);
  rect(g, 6, 7, 1, 1, p.skinHighlight);
  
  // === EYE (side view - one eye visible, with lash) ===
  rect(g, 9, 7, 2, 2, p.eyeWhite);
  px(g, 10, 8, p.ink);
  px(g, 9, 7, p.eyeHighlight);
  px(g, 9, 6, p.ink); // eyelash
  
  // Nose
  px(g, 11, 9, p.skinShade);
  
  // Mouth (softer)
  rect(g, 10, 10, 2, 1, p.skinShade);
  px(g, 10, 10, p.blush);
  
  // Blush (more prominent)
  px(g, 8, 8, p.blush);
  px(g, 8, 9, p.blush);
  
  // === NECK & TORSO ===
  if (scarf) {
    rect(g, 5, 10, 7, 1, p.scarf);
    rect(g, 5, 11, 2, 2, p.scarfShade);
    rect(g, 6, 11, 1, 1, p.scarfHighlight);
  }
  
  rect(g, 5, 11, 7, 3, p.sweater);
  rect(g, 5, 11, 1, 3, p.sweaterShade);
  rect(g, 6, 11, 1, 1, p.sweaterHighlight);
  rect(g, 7, 12, 4, 1, p.sweaterShade);
  
  // === ARM ===
  const swing = frame === 2 ? -1 : frame === 4 ? 1 : 0;
  rect(g, 9, 11, 2, 2, p.sweaterShade);
  px(g, 10, 13 + swing, p.skin);
  
  // === LEGS & SHOES ===
  const stride = frame === 2 ? 1 : frame === 4 ? -1 : 0;
  rect(g, 6 + stride, 14, 2, 2, p.pants);
  rect(g, 8 - stride, 14, 2, 2, p.pantsShade);
  rect(g, 6 + stride, 14, 1, 2, p.pantsShade);
  rect(g, 6 + stride, 16, 2, 1, p.shoes);
  rect(g, 8 - stride, 16, 2, 1, p.shoesShade);
}

// === MALE SIDE VIEW ===
function drawSideMale(g: G, p: AvatarPalette, acc: string, frame: number) {
  const beanie = acc === "beanie";
  const scarf = acc === "scarf";
  
  // === HAIR / HAT (side view, masculine - shorter) ===
  if (beanie) {
    rect(g, 4, 0, 8, 1, p.hatHighlight);
    rect(g, 4, 1, 8, 2, p.hat);
    rect(g, 3, 3, 9, 1, p.hatShade);
    rect(g, 3, 4, 9, 1, p.hat);
    rect(g, 4, 5, 8, 1, p.hair);
    rect(g, 5, 6, 1, 1, p.hairShade);
    // Short hair at back
    rect(g, 3, 7, 2, 1, p.hair);
  } else {
    rect(g, 5, 0, 7, 1, p.hairHighlight);
    rect(g, 4, 1, 8, 1, p.hair);
    rect(g, 3, 2, 9, 2, p.hair);
    rect(g, 3, 4, 9, 1, p.hairShade);
    rect(g, 4, 3, 1, 1, p.hairHighlight);
    rect(g, 11, 3, 1, 1, p.hairHighlight);
    // Short hair at back
    rect(g, 3, 5, 2, 2, p.hair);
  }
  
  // === FACE (side view, masculine) ===
  rect(g, 6, 6, 6, 4, p.skin);
  rect(g, 5, 7, 1, 2, p.skinShade);
  rect(g, 6, 7, 1, 1, p.skinHighlight);
  
  // === EYE (side view - one eye visible, no lash) ===
  rect(g, 9, 7, 2, 2, p.eyeWhite);
  px(g, 10, 8, p.ink);
  px(g, 9, 7, p.eyeHighlight);
  // No eyelash for male
  
  // Nose (more defined)
  px(g, 11, 9, p.skinShade);
  px(g, 11, 10, p.skinShade);
  
  // Mouth (straighter)
  rect(g, 10, 10, 2, 1, p.skinShade);
  
  // Blush (less prominent)
  px(g, 8, 8, p.blush);
  
  // === NECK & TORSO ===
  if (scarf) {
    rect(g, 5, 10, 7, 1, p.scarf);
    rect(g, 5, 11, 2, 2, p.scarfShade);
    rect(g, 6, 11, 1, 1, p.scarfHighlight);
  }
  
  rect(g, 4, 11, 8, 3, p.sweater);
  rect(g, 4, 11, 1, 3, p.sweaterShade);
  rect(g, 5, 11, 1, 1, p.sweaterHighlight);
  rect(g, 6, 12, 5, 1, p.sweaterShade);
  
  // === ARM ===
  const swing = frame === 2 ? -1 : frame === 4 ? 1 : 0;
  rect(g, 10, 11, 2, 2, p.sweaterShade);
  px(g, 11, 13 + swing, p.skin);
  
  // === LEGS & SHOES ===
  const stride = frame === 2 ? 1 : frame === 4 ? -1 : 0;
  rect(g, 6 + stride, 14, 2, 2, p.pants);
  rect(g, 8 - stride, 14, 2, 2, p.pantsShade);
  rect(g, 6 + stride, 14, 1, 2, p.pantsShade);
  rect(g, 6 + stride, 16, 2, 1, p.shoes);
  rect(g, 8 - stride, 16, 2, 1, p.shoesShade);
}

// Keep old function name as alias
function drawSide(g: G, p: AvatarPalette, acc: string, frame: number) {
  drawSideFemale(g, p, acc, frame);
}

const sheetCache = new Map<string, HTMLCanvasElement>();

export function buildSheet(sweater: string, hat: string, skin: string, hair: string, acc: string, gender: string = "female"): HTMLCanvasElement {
  const key = `${sweater}|${hat}|${skin}|${hair}|${acc}|${gender}`;
  const hit = sheetCache.get(key);
  if (hit) return hit;
  const pal = makePalette(sweater, hat, skin, hair);
  const sheet = makeCanvas(16 * SHEET_COLS, 16 * 3);
  const g = sheet.getContext("2d")!;
  const frames = [0, 1, 2, 3, 4, 5];
  
  // Choose drawing functions based on gender
  const drawDownFn = gender === "male" ? drawDownMale : drawDownFemale;
  const drawUpFn = gender === "male" ? drawUpMale : drawUpFemale;
  const drawSideFn = gender === "male" ? drawSideMale : drawSideFemale;
  
  const rows: Array<(g: G, p: AvatarPalette, a: string, f: number) => void> = [drawDownFn, drawUpFn, drawSideFn];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < frames.length; c++) {
      const f = frames[c];
      g.save();
      g.translate(c * 16, r * 16);
      if (f % 2 === 1) g.translate(0, -1); // bob frames
      rows[r](g, pal, acc, f);
      g.restore();
    }
  }
  sheetCache.set(key, sheet);
  return sheet;
}

/* Eye positions per direction for the blink overlay (tile-space px). */
export const EYE_SPOTS: Record<string, Array<[number, number]>> = {
  down: [
    [6, 8],
    [10, 8],
  ],
  right: [[10, 8]],
  left: [[5, 8]],
  up: [],
};

/* ---------------- emote / status icons (10x10) ---------------- */

function iconCanvas(draw: (g: G) => void): HTMLCanvasElement {
  const c = makeCanvas(10, 10);
  draw(c.getContext("2d")!);
  return c;
}

const iconCache = new Map<string, HTMLCanvasElement>();

export function getIcon(kind: string): HTMLCanvasElement {
  const hit = iconCache.get(kind);
  if (hit) return hit;
  let c: HTMLCanvasElement;
  switch (kind) {
    case "book":
      c = iconCanvas((g) => {
        rect(g, 1, 2, 8, 6, "#5a3a2a");
        rect(g, 1, 2, 3, 5, "#f4e7d3");
        rect(g, 6, 2, 3, 5, "#e8d5b5");
        px(g, 4, 2, "#f4e7d3");
        px(g, 5, 2, "#e8d5b5");
        px(g, 4, 3, "#c9a86e");
        px(g, 5, 3, "#c9a86e");
        px(g, 2, 3, "#a8886a");
        px(g, 2, 4, "#a8886a");
        px(g, 7, 3, "#a8886a");
        px(g, 7, 4, "#a8886a");
        rect(g, 1, 8, 8, 1, "#3a241a");
      });
      break;
    case "wave":
      c = iconCanvas((g) => {
        rect(g, 4, 2, 4, 5, "#f0c8a0");
        rect(g, 3, 3, 1, 3, "#f0c8a0");
        rect(g, 8, 3, 1, 3, "#f0c8a0");
        px(g, 4, 1, "#f0c8a0");
        px(g, 7, 1, "#f0c8a0");
        rect(g, 4, 7, 4, 2, "#5f7fae");
        px(g, 2, 2, "#f2c14e");
        px(g, 1, 4, "#f2c14e");
        px(g, 9, 2, "#f2c14e");
      });
      break;
    case "coffee":
      c = iconCanvas((g) => {
        rect(g, 2, 4, 6, 5, "#e8d5b5");
        rect(g, 2, 4, 6, 1, "#b98d5e");
        rect(g, 8, 5, 1, 2, "#e8d5b5");
        rect(g, 1, 9, 8, 1, "#c9a86e");
        px(g, 3, 2, "#f4e7d3");
        px(g, 4, 1, "#f4e7d3");
        px(g, 5, 2, "#f4e7d3");
        rect(g, 3, 6, 4, 2, "#8a5a34");
      });
      break;
    case "heart":
      c = iconCanvas((g) => {
        rect(g, 2, 2, 2, 2, "#e26d6d");
        rect(g, 6, 2, 2, 2, "#e26d6d");
        rect(g, 2, 4, 6, 2, "#e26d6d");
        rect(g, 3, 6, 4, 1, "#e26d6d");
        rect(g, 4, 7, 2, 1, "#c9564a");
        px(g, 2, 2, "#f0908a");
      });
      break;
    case "music":
      c = iconCanvas((g) => {
        rect(g, 3, 2, 1, 6, "#f4e7d3");
        rect(g, 7, 3, 1, 5, "#f4e7d3");
        rect(g, 3, 2, 5, 1, "#f4e7d3");
        rect(g, 1, 7, 3, 2, "#f2a33c");
        rect(g, 5, 8, 3, 2, "#f2a33c");
      });
      break;
    case "spark":
      c = iconCanvas((g) => {
        rect(g, 4, 1, 2, 8, "#f2c14e");
        rect(g, 1, 4, 8, 2, "#f2c14e");
        px(g, 2, 2, "#f4e7d3");
        px(g, 7, 7, "#f4e7d3");
        px(g, 7, 2, "#f4e7d3");
        px(g, 2, 7, "#f4e7d3");
      });
      break;
    default:
      c = iconCanvas(() => {});
  }
  iconCache.set(kind, c);
  return c;
}

/* Portrait for HUD lists — idle frame rendered at 2x. */
const portraitCache = new Map<string, string>();
export function portraitDataURL(sweater: string, hat: string, skin: string, hair: string, acc: string, gender: string = "female"): string {
  const key = `${sweater}|${hat}|${skin}|${hair}|${acc}|${gender}`;
  const hit = portraitCache.get(key);
  if (hit) return hit;
  const sheet = buildSheet(sweater, hat, skin, hair, acc, gender);
  const c = makeCanvas(32, 32);
  const g = c.getContext("2d")!;
  g.drawImage(sheet, 0, 0, 16, 16, 0, 0, 32, 32);
  const url = c.toDataURL();
  portraitCache.set(key, url);
  return url;
}
