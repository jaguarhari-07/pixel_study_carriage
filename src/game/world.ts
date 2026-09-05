/* Train-car study room: tile grid, collision, seat definitions,
   the pre-rendered static layer, and the parallax scenery strips
   that scroll past the windows. */

import { makeCanvas } from "./sprites";
import type { LampDef, SeatDef } from "./types";

export const TILE = 16;
export const COLS = 52;
export const ROWS = 15;

export const WINDOW_BAND_Y = 2 * TILE; // rows 2..3
export const WINDOW_BAND_H = 2 * TILE;

export const BOOTH_XS = [7, 15, 23, 31, 39];
const WINDOW_SPANS: Array<[number, number]> = [
  [6, 11],
  [14, 19],
  [22, 27],
  [30, 35],
  [38, 43],
];

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SOLID = new Set(["c", "L", "W", "w", "T", "B", "p", "H", "S", "D", "C", "b", "R"]);

function buildGrid(): string[] {
  const rows: string[][] = [];
  for (let y = 0; y < ROWS; y++) {
    const row: string[] = [];
    for (let x = 0; x < COLS; x++) row.push(".");
    rows.push(row);
  }
  const set = (x: number, y: number, ch: string) => {
    if (x >= 0 && x < COLS && y >= 0 && y < ROWS) rows[y][x] = ch;
  };
  for (let x = 0; x < COLS; x++) {
    set(x, 0, "c");
    set(x, 1, "c");
    set(x, 4, "T");
    set(x, 13, "T");
    set(x, 14, "b");
  }
  for (const lx of [4, 12, 20, 28, 36, 44]) set(lx, 1, "L");
  for (const [x0, x1] of WINDOW_SPANS) for (let x = x0; x <= x1; x++) for (const y of [2, 3]) set(x, y, "w");
  for (let x = 0; x < COLS; x++) if (rows[2][x] === ".") set(x, 2, "W");
  for (let x = 0; x < COLS; x++) if (rows[3][x] === ".") set(x, 3, "W");
  // west wall / vestibule + east wall
  for (let y = 0; y < ROWS; y++) {
    set(0, y, y >= 5 && y <= 10 ? "d" : "W");
    set(51, y, "W");
  }
  // wall-line furniture (row 5)
  set(4, 5, "H");
  set(5, 5, "H");
  set(6, 5, "p");
  set(12, 5, "B");
  set(13, 5, "B");
  set(20, 5, "p");
  set(28, 5, "B");
  set(29, 5, "B");
  set(36, 5, "p");
  set(44, 5, "p");
  // booths: seat A, desk, desk, seat B
  for (const bx of BOOTH_XS) {
    set(bx, 6, "S");
    set(bx + 1, 6, "D");
    set(bx + 2, 6, "D");
    set(bx + 3, 6, "S");
    for (let i = 0; i < 4; i++) set(bx + i, 7, "r");
  }
  // snack cart, east end
  for (let x = 45; x <= 50; x++) set(x, 5, "C");
  for (let x = 46; x <= 49; x++) set(x, 6, "C");
  // loose floor plants
  set(13, 10, "p");
  set(34, 9, "p");
  return rows.map((r) => r.join(""));
}

function buildSeats(): SeatDef[] {
  const seats: SeatDef[] = [];
  BOOTH_XS.forEach((bx, i) => {
    seats.push({ id: `${i + 1}A`, booth: i + 1, side: "A", tileX: bx, tileY: 6, standX: bx, standY: 7, facing: "right" });
    seats.push({ id: `${i + 1}B`, booth: i + 1, side: "B", tileX: bx + 3, tileY: 6, standX: bx + 3, standY: 7, facing: "left" });
  });
  return seats;
}

/* ---------------- static layer painter ---------------- */

type Painter = (g: CanvasRenderingContext2D, x: number, y: number, grid: string[]) => void;

function tileAt(grid: string[], x: number, y: number): string {
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return "W";
  return grid[y][x];
}

export function paintStaticLayer(grid: string[]): HTMLCanvasElement {
  const cv = makeCanvas(COLS * TILE, ROWS * TILE);
  const g = cv.getContext("2d")!;
  const rnd = mulberry32(1234);
  const R = (x: number, y: number, w: number, h: number, c: string) => {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  };

  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const ch = grid[ty][tx];
      const X = tx * TILE;
      const Y = ty * TILE;
      const n = Math.abs(Math.sin(tx * 127.1 + ty * 311.7)) ; // stable per-tile noise

      if (ch === "c" || ch === "L") {
        R(X, Y, 16, 16, "#33202c");
        R(X, 0, 2, 16, "#2b1a25");
        R(X, Y + 14, 16, 2, "#241621");
        if (ch === "L") {
          // brass lamp fixture
          R(X + 7, Y + 12, 2, 2, "#8a6a3a");
          R(X + 3, Y + 13, 10, 2, "#d9a441");
          R(X + 4, Y + 15, 8, 1, "#b8862f");
          R(X + 6, Y + 15, 4, 1, "#ffd98a");
        }
      } else if (ch === "W") {
        R(X, Y, 16, 16, "#5e3b2c");
        R(X + 2, Y, 1, 16, "#53342a");
        R(X, Y + 8, 16, 1, "#6b4433");
        if (n > 0.72) {
          R(X + 5, Y + 3, 6, 1, "#6b4433");
        }
      } else if (ch === "w") {
        // hole — scenery shows through; frame drawn per-span below
      } else if (ch === "d") {
        R(X, Y, 16, 16, "#4a2f24");
      } else if (ch === "T") {
        R(X, Y, 16, 16, "#6e452c");
        R(X, ty === 4 ? Y : Y + 14, 16, 2, "#8a5638");
        R(X + 2, Y + 4, 12, 8, "#61402a");
        R(X + 3, Y + 5, 10, 6, "#573823");
      } else if (ch === "b") {
        R(X, Y, 16, 16, "#3a241c");
        R(X, Y, 16, 2, "#2b1a14");
      } else if (ch === "r") {
        const leftOpen = tileAt(grid, tx - 1, ty) !== "r";
        const rightOpen = tileAt(grid, tx + 1, ty) !== "r";
        R(X, Y, 16, 16, "#5d7a5a");
        R(X, Y, 16, 1, "#6f8f6a");
        R(X, Y + 15, 16, 1, "#4a624a");
        if (leftOpen) R(X, Y, 2, 16, "#c98f4e");
        if (rightOpen) R(X + 14, Y, 2, 16, "#c98f4e");
        if ((tx + ty) % 2 === 0) R(X + 7, Y + 7, 2, 2, "#6f8f6a");
      } else {
        // floor planks
        R(X, Y, 16, 16, "#8a5a36");
        R(X, Y, 1, 16, "#75492a");
        const board = Math.floor(n * 3);
        if (board === 0) R(X + 6, Y + 4, 3, 1, "#75492a");
        if (board === 1) R(X + 9, Y + 11, 3, 1, "#7c5030");
        if (n > 0.8) R(X + 11, Y + 6, 1, 1, "#6b4227");
        R(X, Y + 8, 16, 1, "#7f5232");
      }

      if (ch === "B") paintBookshelf(g, X, Y, tx);
      if (ch === "p") paintPlant(g, X, Y, n);
      if (ch === "H") paintCoatRack(g, X, Y, tx);
      if (ch === "S") paintSeat(g, X, Y, tx);
      if (ch === "D") paintDesk(g, X, Y, tx);
      if (ch === "C") paintCartTile(g, X, Y, tx, ty);
    }
  }

  // window frames, valance, mullions per span
  for (const [x0, x1] of WINDOW_SPANS) {
    const X = x0 * TILE;
    const W = (x1 - x0 + 1) * TILE;
    const Y = WINDOW_BAND_Y;
    R(X, Y, W, 2, "#8a5638");
    R(X, Y + 30, W, 2, "#8a5638");
    R(X, Y, 2, 32, "#8a5638");
    R(X + W - 2, Y, 2, 32, "#8a5638");
    R(X, Y + 29, W, 1, "#6e4227");
    // mullions
    R(X + Math.floor(W / 3), Y + 2, 2, 28, "#8a5638");
    R(X + Math.floor((2 * W) / 3), Y + 2, 2, 28, "#8a5638");
    // warm valance
    R(X + 2, Y + 2, W - 4, 3, "#c98f4e");
    for (let i = 0; i < (W - 4) / 4; i++) R(X + 3 + i * 4, Y + 5, 2, 1, "#b87f42");
  }

  // little framed pictures on wall gaps
  for (const fx of [12, 20, 28, 36]) {
    const X = fx * TILE;
    R(X + 2, 2 * TILE + 6, 12, 14, "#8a5638");
    R(X + 3, 2 * TILE + 7, 10, 12, "#31404e");
    R(X + 3, 2 * TILE + 13, 10, 3, "#46584a");
    R(X + 5, 2 * TILE + 9, 2, 2, "#f4e7d3");
  }

  // chalk menu above the snack cart
  R(46 * TILE, 2 * TILE + 2, 4 * TILE, 28, "#2e2430");
  R(46 * TILE + 1, 2 * TILE + 3, 4 * TILE - 2, 26, "#241c28");
  R(46 * TILE + 2, 2 * TILE + 1, 4 * TILE - 4, 2, "#8a5638");
  g.fillStyle = "#f4e7d3";
  R(46 * TILE + 8, 2 * TILE + 7, 30, 2, "#e8d5b5");
  R(46 * TILE + 10, 2 * TILE + 13, 24, 1, "#9aa5b5");
  R(46 * TILE + 10, 2 * TILE + 17, 28, 1, "#9aa5b5");
  R(46 * TILE + 10, 2 * TILE + 21, 20, 1, "#9aa5b5");
  R(46 * TILE + 44, 2 * TILE + 13, 6, 1, "#f2a33c");
  R(46 * TILE + 44, 2 * TILE + 17, 6, 1, "#f2a33c");

  // west-end double door
  const DX = 0;
  const DY = 5 * TILE;
  R(DX, DY, 2 * TILE, 6 * TILE, "#4a2f24");
  R(DX + 2, DY + 2, 13, 92, "#5e3b2c");
  R(DX + 17, DY + 2, 13, 92, "#573823");
  R(DX + 4, DY + 8, 9, 16, "#31404e");
  R(DX + 5, DY + 9, 7, 14, "#40556b");
  R(DX + 19, DY + 8, 9, 16, "#31404e");
  R(DX + 20, DY + 9, 7, 14, "#40556b");
  R(DX + 12, DY + 40, 2, 10, "#d9a441");
  R(DX + 18, DY + 40, 2, 10, "#d9a441");
  R(DX, DY + 92, 32, 4, "#3a241c");

  // shadow strip under wall furniture
  g.fillStyle = "rgba(20,8,4,0.25)";
  for (let tx = 1; tx < COLS - 1; tx++) {
    if (SOLID.has(tileAt(grid, tx, 5)) && tileAt(grid, tx, 5) !== "p") g.fillRect(tx * TILE, 6 * TILE, TILE, 2);
  }
  void rnd;
  return cv;
}

function paintBookshelf(g: CanvasRenderingContext2D, X: number, Y: number, tx: number) {
  const R = (x: number, y: number, w: number, h: number, c: string) => {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  };
  R(X, Y, 16, 16, "#5e3b2c");
  R(X, Y, 16, 1, "#8a5638");
  R(X + 1, Y + 2, 14, 12, "#3a241c");
  const colors = ["#c98f4e", "#7fa07a", "#7f95b5", "#e26d6d", "#d9a441", "#8a5a7a"];
  const r = mulberry32(tx * 77 + 5);
  for (let i = 0; i < 5; i++) {
    const bw = 2 + Math.floor(r() * 2);
    R(X + 2 + i * 2.4, Y + 3, bw, 5, colors[Math.floor(r() * colors.length)]);
    R(X + 2 + i * 2.4, Y + 9, bw, 4, colors[Math.floor(r() * colors.length)]);
  }
  R(X, Y + 8, 16, 1, "#5e3b2c");
}

function paintPlant(g: CanvasRenderingContext2D, X: number, Y: number, n: number) {
  const R = (x: number, y: number, w: number, h: number, c: string) => {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  };
  const leaf = n > 0.5 ? "#6f8f6a" : "#5d7a5a";
  R(X + 5, Y + 9, 6, 5, "#b06a3a");
  R(X + 4, Y + 8, 8, 2, "#c97f4a");
  R(X + 6, Y + 14, 4, 2, "#8a4f2a");
  R(X + 6, Y + 1, 4, 8, leaf);
  R(X + 3, Y + 3, 3, 5, "#4a624a");
  R(X + 10, Y + 3, 3, 5, "#4a624a");
  R(X + 4, Y + 2, 2, 3, leaf);
  R(X + 10, Y + 2, 2, 3, leaf);
  R(X + 7, Y + 4, 2, 1, "#8fae86");
}

function paintCoatRack(g: CanvasRenderingContext2D, X: number, Y: number, tx: number) {
  const R = (x: number, y: number, w: number, h: number, c: string) => {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  };
  if (tx === 4) {
    R(X + 7, Y, 2, 14, "#6e452c");
    R(X + 4, Y + 1, 8, 1, "#8a5638");
    R(X + 4, Y + 2, 1, 2, "#d9a441");
    R(X + 11, Y + 2, 1, 2, "#d9a441");
    // hanging coat
    R(X + 9, Y + 3, 6, 9, "#8a5a7a");
    R(X + 9, Y + 3, 6, 1, "#6e4560");
    R(X + 11, Y + 6, 2, 1, "#d9a441");
    R(X + 5, Y + 14, 6, 2, "#5e3b2c");
  } else {
    R(X + 6, Y + 4, 5, 10, "#c9564a");
    R(X + 6, Y + 4, 5, 1, "#a84438");
    R(X + 7, Y + 8, 3, 1, "#e8d5b5");
    R(X + 3, Y + 14, 10, 2, "#5e3b2c");
  }
}

function paintSeat(g: CanvasRenderingContext2D, X: number, Y: number, tx: number) {
  const R = (x: number, y: number, w: number, h: number, c: string) => {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  };
  const boothIdx = Math.floor((tx - 7) / 8);
  const cushion = boothIdx % 2 === 0 ? "#62835f" : "#c98a4e";
  const cushionD = boothIdx % 2 === 0 ? "#4a624a" : "#a86f3a";
  R(X + 1, Y + 2, 14, 12, "#5e3b2c");
  R(X + 2, Y + 1, 12, 3, cushion);
  R(X + 2, Y + 1, 12, 1, cushionD);
  R(X + 2, Y + 5, 12, 5, cushion);
  R(X + 2, Y + 8, 12, 2, cushionD);
  R(X + 1, Y + 12, 14, 2, "#4a2f24");
  R(X + 2, Y + 14, 3, 2, "#3a241c");
  R(X + 11, Y + 14, 3, 2, "#3a241c");
}

function paintDesk(g: CanvasRenderingContext2D, X: number, Y: number, tx: number) {
  const R = (x: number, y: number, w: number, h: number, c: string) => {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  };
  R(X, Y + 3, 16, 11, "#a06a3a");
  R(X, Y + 3, 16, 2, "#c98a4e");
  R(X, Y + 5, 16, 1, "#8a5630");
  R(X + 1, Y + 13, 14, 3, "#7c4c28");
  const leftOfPair = (tx - 7) % 8 === 1;
  if (leftOfPair) {
    // open book + pencil
    R(X + 3, Y + 6, 7, 5, "#f4e7d3");
    R(X + 6, Y + 6, 1, 5, "#c9a86e");
    R(X + 4, Y + 7, 2, 1, "#a8886a");
    R(X + 7, Y + 8, 2, 1, "#a8886a");
    R(X + 11, Y + 7, 4, 1, "#f2c14e");
    R(X + 14, Y + 7, 1, 1, "#3a2a24");
  } else {
    // teacup + little lamp
    R(X + 2, Y + 7, 4, 3, "#e8d5b5");
    R(X + 2, Y + 7, 4, 1, "#b98d5e");
    R(X + 6, Y + 8, 1, 1, "#e8d5b5");
    R(X + 10, Y + 5, 2, 6, "#8a6a3a");
    R(X + 8, Y + 3, 6, 2, "#d9a441");
    R(X + 9, Y + 5, 4, 1, "#ffd98a");
  }
}

function paintCartTile(g: CanvasRenderingContext2D, X: number, Y: number, tx: number, ty: number) {
  const R = (x: number, y: number, w: number, h: number, c: string) => {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  };
  if (ty === 5) {
    // counter top with goods
    R(X, Y + 6, 16, 10, "#a06a3a");
    R(X, Y + 6, 16, 2, "#c98a4e");
    R(X, Y + 8, 16, 1, "#8a5630");
    if (tx === 45) {
      R(X + 2, Y + 1, 8, 5, "#7f95b5");
      R(X + 3, Y + 2, 6, 3, "#b9c9e2");
      R(X + 1, Y + 5, 10, 2, "#d9a441");
    }
    if (tx === 46 || tx === 47) {
      // glass pastry case
      R(X, Y, 16, 7, "#31404e");
      R(X + 1, Y + 1, 14, 5, "#40556b");
      R(X + 2, Y + 3, 3, 2, "#f2c14e");
      R(X + 6, Y + 3, 3, 2, "#e06a3c");
      R(X + 10, Y + 3, 3, 2, "#d9a03d");
      R(X, Y + 6, 16, 1, "#d9a441");
    }
    if (tx === 48) {
      // big teapot (steam source)
      R(X + 3, Y + 1, 8, 5, "#c9564a");
      R(X + 4, Y, 6, 1, "#a84438");
      R(X + 11, Y + 2, 3, 2, "#c9564a");
      R(X + 2, Y + 2, 1, 2, "#a84438");
      R(X + 5, Y + 2, 4, 1, "#e88a7a");
    }
    if (tx === 49) {
      R(X + 2, Y + 2, 3, 4, "#e8d5b5");
      R(X + 6, Y + 3, 3, 3, "#e8d5b5");
      R(X + 10, Y + 2, 3, 4, "#c9a86e");
    }
    if (tx === 50) {
      R(X + 2, Y + 1, 10, 5, "#5e3b2c");
      R(X + 3, Y + 2, 8, 3, "#3a241c");
      R(X + 4, Y + 3, 6, 1, "#f2a33c");
    }
  } else {
    // counter front
    R(X, Y, 16, 16, "#7c4c28");
    R(X, Y, 16, 2, "#5e3b2c");
    R(X + 2, Y + 3, 12, 10, "#6b4227");
    R(X + 3, Y + 4, 10, 8, "#7c4c28");
    R(X + 7, Y + 7, 2, 2, "#d9a441");
    R(X, Y + 14, 16, 2, "#4a2f24");
  }
}

/* ---------------- parallax scenery ---------------- */

export interface SceneryLayer {
  canvas: HTMLCanvasElement;
  factor: number;
}

export function buildScenery(): { sky: HTMLCanvasElement; layers: SceneryLayer[] } {
  const W = 512;
  const H = 32;
  const sky = makeCanvas(W, H);
  {
    const g = sky.getContext("2d")!;
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#3a2c50");
    grad.addColorStop(0.45, "#7a4a5a");
    grad.addColorStop(0.8, "#d98a5a");
    grad.addColorStop(1, "#f2b06a");
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    // low sun
    const sx = 380;
    const sg = g.createRadialGradient(sx, 26, 1, sx, 26, 26);
    sg.addColorStop(0, "rgba(255,226,160,0.95)");
    sg.addColorStop(0.35, "rgba(255,200,120,0.5)");
    sg.addColorStop(1, "rgba(255,200,120,0)");
    g.fillStyle = sg;
    g.fillRect(sx - 28, 0, 56, H);
    g.fillStyle = "#ffe2a0";
    g.fillRect(sx - 3, 22, 7, 6);
    g.fillStyle = "#fff0c8";
    g.fillRect(sx - 2, 23, 5, 3);
    // stars up top
    const r = mulberry32(99);
    g.fillStyle = "rgba(244,231,211,0.8)";
    for (let i = 0; i < 26; i++) {
      g.fillRect(Math.floor(r() * W), Math.floor(r() * 10), 1, 1);
    }
  }

  const mkLayer = (factor: number, draw: (g: CanvasRenderingContext2D) => void): SceneryLayer => {
    const c = makeCanvas(W, H);
    draw(c.getContext("2d")!);
    return { canvas: c, factor };
  };

  const clouds = mkLayer(0.06, (g) => {
    const r = mulberry32(7);
    g.fillStyle = "rgba(138,106,122,0.55)";
    for (let i = 0; i < 7; i++) {
      const cx = Math.floor(r() * W);
      const cy = 3 + Math.floor(r() * 8);
      const cw = 14 + Math.floor(r() * 26);
      g.fillRect(cx, cy, cw, 2);
      g.fillRect(cx + 4, cy - 1, cw - 8, 1);
      g.fillRect(cx + 2, cy + 2, cw - 4, 1);
    }
  });

  const mountains = mkLayer(0.16, (g) => {
    const r = mulberry32(21);
    g.fillStyle = "#4a3a5e";
    for (let x = 0; x < W; x++) {
      const h = 8 + Math.abs(Math.sin(x * 0.045) * 6) + Math.floor(r() * 2);
      g.fillRect(x, 30 - h, 1, h);
    }
    g.fillStyle = "#5d4a72";
    for (let x = 0; x < W; x++) {
      const h = 5 + Math.abs(Math.sin(x * 0.08 + 2) * 4);
      g.fillRect(x, 30 - h, 1, h);
    }
  });

  const hills = mkLayer(0.38, (g) => {
    const r = mulberry32(42);
    g.fillStyle = "#46584a";
    for (let x = 0; x < W; x++) {
      const h = 5 + Math.abs(Math.sin(x * 0.06 + 1) * 5) + (r() > 0.9 ? 1 : 0);
      g.fillRect(x, 31 - h, 1, h);
    }
    g.fillStyle = "#3a4c40";
    for (let i = 0; i < 14; i++) {
      const tx = Math.floor(r() * W);
      g.fillRect(tx, 24, 1, 4);
      g.fillRect(tx - 1, 25, 3, 1);
      g.fillRect(tx - 2, 26, 5, 1);
    }
  });

  const near = mkLayer(1.0, (g) => {
    const r = mulberry32(777);
    g.fillStyle = "#2f3d38";
    g.fillRect(0, 29, W, 3);
    g.fillStyle = "#26332c";
    g.fillRect(0, 28, W, 1);
    // fence
    g.fillStyle = "#241d24";
    for (let x = 0; x < W; x += 6) g.fillRect(x, 24, 1, 5);
    g.fillRect(0, 25, W, 1);
    // pines
    for (let i = 0; i < 12; i++) {
      const tx = Math.floor(r() * W);
      const th = 8 + Math.floor(r() * 8);
      g.fillStyle = "#1e2a24";
      g.fillRect(tx, 28 - th, 2, th);
      g.fillStyle = "#26332c";
      for (let l = 0; l < 4; l++) {
        const w = 2 + l * 2;
        g.fillRect(tx - Math.floor(w / 2) + 1, 28 - th + l * 2, w, 2);
      }
    }
    // passing cottages with lit windows
    for (let i = 0; i < 3; i++) {
      const cx = 40 + Math.floor(r() * (W - 90));
      g.fillStyle = "#33283a";
      g.fillRect(cx, 16, 14, 12);
      g.fillStyle = "#241c2c";
      g.fillRect(cx - 1, 15, 16, 2);
      g.fillRect(cx + 2, 13, 10, 2);
      g.fillStyle = "#ffd27a";
      g.fillRect(cx + 3, 19, 3, 3);
      g.fillRect(cx + 9, 19, 2, 3);
    }
    // telegraph poles
    g.fillStyle = "#1c1520";
    for (let x = 20; x < W; x += 90) {
      g.fillRect(x, 6, 2, 23);
      g.fillRect(x - 3, 8, 8, 1);
      g.fillRect(x - 2, 12, 6, 1);
    }
    g.strokeStyle = "rgba(28,21,32,0.7)";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, 8.5);
    g.lineTo(W, 8.5);
    g.stroke();
  });

  return { sky, layers: [clouds, mountains, hills, near] };
}

/* ---------------- assembled world ---------------- */

export interface World {
  grid: string[];
  seats: SeatDef[];
  lamps: LampDef[];
  windowSpans: Array<[number, number]>;
  staticLayer: HTMLCanvasElement;
  scenery: { sky: HTMLCanvasElement; layers: SceneryLayer[] };
  spawn: { x: number; y: number };
  steamAt: { x: number; y: number };
}

export function buildWorld(): World {
  const grid = buildGrid();
  return {
    grid,
    seats: buildSeats(),
    lamps: [4, 12, 20, 28, 36, 44].map((x) => ({ x, y: 1 })),
    windowSpans: WINDOW_SPANS,
    staticLayer: paintStaticLayer(grid),
    scenery: buildScenery(),
    spawn: { x: 3 * TILE + 8, y: 11 * TILE + 8 },
    steamAt: { x: 48 * TILE + 8, y: 5 * TILE },
  };
}

export function isSolid(world: World, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  return SOLID.has(world.grid[ty][tx]);
}
