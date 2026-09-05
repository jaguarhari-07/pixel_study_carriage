/* Procedural pixel-art factory: avatar sprite sheets (4-dir walk cycles),
   emote/status icons, portraits, and color utilities. Everything is drawn
   with 1px rects onto offscreen canvases — no external assets. */

export interface AvatarPalette {
  skin: string;
  skinShade: string;
  hair: string;
  hairShade: string;
  sweater: string;
  sweaterShade: string;
  pants: string;
  shoes: string;
  hat: string;
  hatShade: string;
  scarf: string;
  scarfShade: string;
  ink: string;
  blush: string;
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

export const SKINS = ["#f0c8a0", "#e0b088", "#c98d5e", "#a5673f", "#7c4a2e"];
const HAIRS = ["#3a2a24", "#241d24", "#5a3a2a", "#6e5a3a", "#2e2e3a", "#7a4a3a"];

export function darken(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - f)));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - f)));
  const b = Math.max(0, Math.round((n & 255) * (1 - f)));
  return `rgb(${r},${g},${b})`;
}

export function makePalette(sweater: string, hatColor: string, skin: string, hair: string): AvatarPalette {
  return {
    skin,
    skinShade: darken(skin, 0.18),
    hair,
    hairShade: darken(hair, 0.3),
    sweater,
    sweaterShade: darken(sweater, 0.28),
    pants: "#3d3448",
    shoes: "#241a16",
    hat: hatColor,
    hatShade: darken(hatColor, 0.3),
    scarf: "#c9564a",
    scarfShade: darken("#c9564a", 0.3),
    ink: "#1d130f",
    blush: "#e2907a",
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

function drawDown(g: G, p: AvatarPalette, acc: string, frame: number) {
  const beanie = acc === "beanie";
  const scarf = acc === "scarf";
  // hair / hat
  if (beanie) {
    rect(g, 4, 1, 8, 2, p.hat);
    px(g, 7, 0, p.hat);
    px(g, 8, 0, p.hat);
    rect(g, 3, 3, 10, 1, p.hatShade);
    rect(g, 3, 4, 10, 1, p.hair);
  } else {
    rect(g, 4, 1, 8, 1, p.hair);
    rect(g, 3, 2, 10, 2, p.hair);
    rect(g, 3, 4, 10, 1, p.hairShade);
  }
  // face
  rect(g, 4, 5, 8, 3, p.skin);
  rect(g, 3, 5, 1, 2, p.hair);
  rect(g, 12, 5, 1, 2, p.hair);
  px(g, 6, 6, p.ink);
  px(g, 9, 6, p.ink);
  px(g, 5, 7, p.blush);
  px(g, 10, 7, p.blush);
  // neck + torso
  if (scarf) {
    rect(g, 4, 8, 8, 1, p.scarf);
    rect(g, 10, 9, 2, 2, p.scarfShade);
  }
  rect(g, 4, 9, 8, 3, p.sweater);
  rect(g, 4, 9, 1, 3, p.sweaterShade);
  rect(g, 11, 9, 1, 3, p.sweaterShade);
  // arms + hands (swing on walk frames)
  const swing = frame === 2 ? -1 : frame === 4 ? 1 : 0;
  rect(g, 3, 9, 1, 2, p.sweaterShade);
  rect(g, 12, 9, 1, 2, p.sweaterShade);
  px(g, 3, 11 + Math.min(0, swing), p.skin);
  px(g, 12, 11 + Math.max(0, -swing), p.skin);
  // legs + shoes
  const leftUp = frame === 2;
  const rightUp = frame === 4;
  rect(g, 5, 12, 2, leftUp ? 1 : 2, p.pants);
  rect(g, 9, 12, 2, rightUp ? 1 : 2, p.pants);
  rect(g, 5, leftUp ? 13 : 14, 2, 1, p.shoes);
  rect(g, 9, rightUp ? 13 : 14, 2, 1, p.shoes);
}

function drawUp(g: G, p: AvatarPalette, acc: string, frame: number) {
  const beanie = acc === "beanie";
  const scarf = acc === "scarf";
  if (beanie) {
    rect(g, 4, 1, 8, 2, p.hat);
    px(g, 7, 0, p.hat);
    px(g, 8, 0, p.hat);
    rect(g, 3, 3, 10, 1, p.hatShade);
    rect(g, 3, 4, 10, 4, p.hair);
  } else {
    rect(g, 4, 1, 8, 1, p.hair);
    rect(g, 3, 2, 10, 6, p.hair);
  }
  if (scarf) {
    rect(g, 4, 8, 8, 1, p.scarf);
    rect(g, 6, 9, 2, 2, p.scarfShade);
  }
  rect(g, 4, 9, 8, 3, p.sweater);
  rect(g, 4, 9, 1, 3, p.sweaterShade);
  rect(g, 11, 9, 1, 3, p.sweaterShade);
  rect(g, 3, 9, 1, 2, p.sweaterShade);
  rect(g, 12, 9, 1, 2, p.sweaterShade);
  const leftUp = frame === 2;
  const rightUp = frame === 4;
  rect(g, 5, 12, 2, leftUp ? 1 : 2, p.pants);
  rect(g, 9, 12, 2, rightUp ? 1 : 2, p.pants);
  rect(g, 5, leftUp ? 13 : 14, 2, 1, p.shoes);
  rect(g, 9, rightUp ? 13 : 14, 2, 1, p.shoes);
}

function drawSide(g: G, p: AvatarPalette, acc: string, frame: number) {
  const beanie = acc === "beanie";
  const scarf = acc === "scarf";
  if (beanie) {
    rect(g, 5, 1, 7, 2, p.hat);
    px(g, 8, 0, p.hat);
    rect(g, 4, 3, 8, 1, p.hatShade);
    rect(g, 4, 4, 8, 1, p.hair);
  } else {
    rect(g, 5, 1, 7, 2, p.hair);
    rect(g, 4, 3, 8, 2, p.hair);
  }
  rect(g, 6, 5, 6, 3, p.skin);
  rect(g, 4, 5, 3, 3, p.hair); // back of head
  rect(g, 6, 5, 5, 1, p.hairShade); // fringe
  px(g, 10, 6, p.ink);
  px(g, 10, 7, p.blush);
  if (scarf) {
    rect(g, 5, 8, 7, 1, p.scarf);
    rect(g, 5, 9, 2, 2, p.scarfShade);
  }
  rect(g, 5, 9, 7, 3, p.sweater);
  rect(g, 5, 9, 1, 3, p.sweaterShade);
  // front arm swings
  const swing = frame === 2 ? -1 : frame === 4 ? 1 : 0;
  rect(g, 9, 9, 2, 2, p.sweaterShade);
  px(g, 10, 11 + swing, p.skin);
  // legs stride
  const stride = frame === 2 ? 1 : frame === 4 ? -1 : 0;
  rect(g, 6 + stride, 12, 2, 2, p.pants);
  rect(g, 8 - stride, 12, 2, 2, darken(p.pants, 0.25));
  rect(g, 6 + stride, 14, 2, 1, p.shoes);
  rect(g, 8 - stride, 14, 2, 1, darken(p.shoes, 0.2));
}

const sheetCache = new Map<string, HTMLCanvasElement>();

export function buildSheet(sweater: string, hat: string, skin: string, hair: string, acc: string): HTMLCanvasElement {
  const key = `${sweater}|${hat}|${skin}|${hair}|${acc}`;
  const hit = sheetCache.get(key);
  if (hit) return hit;
  const pal = makePalette(sweater, hat, skin, hair);
  const sheet = makeCanvas(16 * SHEET_COLS, 16 * 3);
  const g = sheet.getContext("2d")!;
  const frames = [0, 1, 2, 3, 4, 5];
  const rows: Array<(g: G, p: AvatarPalette, a: string, f: number) => void> = [drawDown, drawUp, drawSide];
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
    [6, 6],
    [9, 6],
  ],
  right: [[10, 6]],
  left: [[5, 6]],
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
export function portraitDataURL(sweater: string, hat: string, skin: string, hair: string, acc: string): string {
  const key = `${sweater}|${hat}|${skin}|${hair}|${acc}`;
  const hit = portraitCache.get(key);
  if (hit) return hit;
  const sheet = buildSheet(sweater, hat, skin, hair, acc);
  const c = makeCanvas(32, 32);
  const g = c.getContext("2d")!;
  g.drawImage(sheet, 0, 0, 16, 16, 0, 0, 32, 32);
  const url = c.toDataURL();
  portraitCache.set(key, url);
  return url;
}
