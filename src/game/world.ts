/* Train-car study room: tile grid, collision, seat definitions,
   the pre-rendered static layer, and the parallax scenery strips
   that scroll past the windows. All art is painted procedurally. */

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

/* dynamic props the engine draws on top of the static layer */
export const CLOCK = { x: 21 * TILE, y: 2 * TILE + 15, r: 10 };
export const HANG_SIGN_X = 18 * TILE;

/* palette */
const P = {
  ceil: "#2c1c28",
  ceilRib: "#231420",
  ceilEdge: "#1a0e18",
  lampBrass: "#d9a441",
  lampBrassD: "#9c7226",
  bulb: "#ffe0a0",
  wall: "#5e3b2c",
  wallHi: "#6f4735",
  wallLo: "#4e2f23",
  panel: "#53342a",
  rail: "#c99a4e",
  railD: "#8a6a3a",
  frame: "#8a5638",
  frameHi: "#a06a3a",
  frameLo: "#6b4227",
  floor: "#7c4a2c",
  floorHi: "#8d5936",
  floorLo: "#6b3f24",
  floorSeam: "#5a351e",
  base: "#3a231a",
  rug: "#54705a",
  rugHi: "#64836a",
  rugLo: "#46604c",
  rugGold: "#c99a4e",
  cushionA: "#5f8260",
  cushionAD: "#48654a",
  cushionAH: "#71966f",
  cushionB: "#c08348",
  cushionBD: "#9a6736",
  cushionBH: "#d29a5e",
  wood: "#5e3b2c",
  woodD: "#4a2f24",
  desk: "#a8703e",
  deskHi: "#c49058",
  deskLo: "#8a5a30",
  brass: "#d9a441",
  brassHi: "#f2c14e",
  brassLo: "#9c7226",
  ink: "#170d09",
  cream: "#f4e7d3",
  teal: "#4a6a66",
  tealD: "#3a544f",
};

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ 0;
    t = (t ^ (t >>> 14)) >>> 0;
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

type G = CanvasRenderingContext2D;
function tileAt(grid: string[], x: number, y: number): string {
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return "W";
  return grid[y][x];
}

function makeR(g: G) {
  return (x: number, y: number, w: number, h: number, c: string) => {
    g.fillStyle = c;
    g.fillRect(Math.round(x), Math.round(y), w, h);
  };
}

export function paintStaticLayer(grid: string[]): HTMLCanvasElement {
  const cv = makeCanvas(COLS * TILE, ROWS * TILE);
  const g = cv.getContext("2d")!;
  const R = makeR(g);
  const rnd = mulberry32(1234);

  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const ch = grid[ty][tx];
      const X = tx * TILE;
      const Y = ty * TILE;
      const n = Math.abs(Math.sin(tx * 127.1 + ty * 311.7)); // stable per-tile noise

      /* --- ceiling --- */
      if (ch === "c" || ch === "L") {
        R(X, Y, 16, 16, P.ceil);
        // ribbed panels
        for (let i = 0; i < 2; i++) R(X + i * 8 + 3, Y, 1, 16, P.ceilRib);
        R(X, Y + 15, 16, 1, P.ceilEdge);
        if (ty === 0) {
          R(X, Y + 6, 16, 1, P.ceilRib);
          R(X, Y + 12, 16, 1, "#342231");
        }
        if (ch === "L") {
          // brass fixture + lit amber shade
          R(X + 7, Y + 10, 2, 2, P.lampBrassD);
          R(X + 5, Y + 12, 6, 1, P.lampBrass);
          R(X + 4, Y + 13, 8, 2, P.lampBrass);
          R(X + 3, Y + 15, 10, 1, P.lampBrassD);
          R(X + 5, Y + 14, 6, 1, P.bulb);
          R(X + 6, Y + 15, 4, 1, "#fff0c8");
          R(X + 4, Y + 12, 1, 1, P.brassHi);
        }
      }
      /* --- upper wall band --- */
      else if (ch === "W") {
        const vert = ty === 2;
        R(X, Y, 16, 16, vert ? P.wallHi : P.wall);
        // tall panel moulding
        R(X + 2, Y + 2, 12, 12, P.panel);
        R(X + 3, Y + 3, 10, 10, vert ? P.wall : P.wallLo);
        R(X + 2, Y + 2, 12, 1, P.wallHi);
        R(X + 2, Y + 13, 12, 1, P.wallLo);
        if (n > 0.78) R(X + 5, Y + 6, 5, 1, P.wallHi);
      } else if (ch === "w") {
        // scenery shows through — frame drawn per-span below
      } else if (ch === "d") {
        R(X, Y, 16, 16, P.woodD);
      }
      /* --- wainscot / table line (row 4) --- */
      else if (ch === "T") {
        if (ty === 4) {
          R(X, Y, 16, 16, P.wallLo);
          R(X, Y, 16, 2, P.rail); // brass picture rail
          R(X, Y + 2, 16, 1, P.railD);
          R(X + 2, Y + 5, 12, 8, P.panel);
          R(X + 3, Y + 6, 10, 6, P.wallLo);
          R(X + 3, Y + 6, 10, 1, P.woodD);
          R(X, Y + 14, 16, 2, P.base);
        } else {
          // row 13: floor edge / seat rail base
          R(X, Y, 16, 16, P.wallLo);
          R(X, Y, 16, 1, P.woodD);
          R(X, Y + 3, 16, 2, P.base);
          R(X + 3, Y + 7, 10, 2, P.panel);
          R(X, Y + 13, 16, 3, P.ceilEdge);
        }
      } else if (ch === "b") {
        R(X, Y, 16, 16, "#241610");
        R(X, Y, 16, 2, P.ceilEdge);
        if (n > 0.5) R(X + 5, Y + 6, 6, 1, "#2e1c14");
      }
      /* --- rug runner --- */
      else if (ch === "r") {
        const leftOpen = tileAt(grid, tx - 1, ty) !== "r";
        const rightOpen = tileAt(grid, tx + 1, ty) !== "r";
        R(X, Y, 16, 16, P.rug);
        // weave texture
        for (let yy = 0; yy < 16; yy += 2) R(X, Y + yy, 16, 1, (yy / 2 + tx) % 2 === 0 ? P.rugHi : P.rug);
        R(X, Y + 1, 16, 1, P.rugGold);
        R(X, Y + 2, 16, 1, P.rugLo);
        R(X, Y + 13, 16, 1, P.rugLo);
        R(X, Y + 14, 16, 1, P.rugGold);
        // diamond motif
        if (!leftOpen && !rightOpen) {
          const cx = X + 8;
          R(cx - 1, Y + 6, 2, 4, P.rugGold);
          R(cx - 2, Y + 7, 4, 2, P.rugGold);
          R(cx - 3, Y + 8, 1, 1, P.cream);
          R(cx + 2, Y + 8, 1, 1, P.cream);
        }
        if (leftOpen) R(X, Y, 2, 16, P.rugGold);
        if (rightOpen) R(X + 14, Y, 2, 16, P.rugGold);
      }
      /* --- floor planks --- */
      else {
        const tone = n > 0.66 ? P.floorHi : n < 0.22 ? P.floorLo : P.floor;
        R(X, Y, 16, 16, tone);
        R(X, Y, 1, 16, P.floorSeam);
        R(X, Y + 7, 16, 1, P.floorSeam);
        const board = Math.floor(n * 4);
        if (board === 0) R(X + 5, Y + 3, 4, 1, P.floorLo);
        if (board === 1) R(X + 9, Y + 11, 4, 1, P.floorLo);
        if (board === 2) R(X + 3, Y + 12, 3, 1, P.floorHi);
        if (n > 0.85) R(X + 11, Y + 5, 1, 1, P.floorSeam);
        // warm sheen streaks
        if (n > 0.7) R(X + 2, Y + 1, 7, 1, "rgba(255,205,130,0.14)");
        if (n < 0.15) R(X + 8, Y + 9, 6, 1, "rgba(255,205,130,0.10)");
      }

      if (ch === "B") paintBookshelf(g, X, Y, tx);
      if (ch === "p") paintPlant(g, X, Y, n);
      if (ch === "H") paintCoatRack(g, X, Y, tx);
      if (ch === "S") paintSeat(g, X, Y, tx);
      if (ch === "D") paintDesk(g, X, Y, tx);
      if (ch === "C") paintCartTile(g, X, Y, tx, ty);
    }
  }

  // brass baseboard along the wall foot
  R(TILE, 4 * TILE + 15, (COLS - 2) * TILE, 1, P.railD);

  /* --- window frames, valance, curtains, mullions --- */
  for (const [x0, x1] of WINDOW_SPANS) {
    const X = x0 * TILE;
    const W = (x1 - x0 + 1) * TILE;
    const Y = WINDOW_BAND_Y;
    // outer wood frame with hi/lo bevel
    R(X, Y, W, 3, P.frameHi);
    R(X, Y + 29, W, 3, P.frameLo);
    R(X, Y, 3, 32, P.frameHi);
    R(X + W - 3, Y, 3, 32, P.frameLo);
    R(X + 1, Y + 1, W - 2, 1, P.brass); // brass liner top
    R(X + 1, Y + 30, W - 2, 1, P.brassLo);
    // mullions
    R(X + Math.floor(W / 3), Y + 3, 2, 26, P.frame);
    R(X + Math.floor((2 * W) / 3), Y + 3, 2, 26, P.frame);
    R(X + Math.floor(W / 3), Y + 3, 1, 26, P.frameHi);
    // soft shadow at glass top
    R(X + 3, Y + 3, W - 6, 2, "rgba(20,10,20,0.28)");
    // scalloped valance
    R(X + 3, Y + 3, W - 6, 3, "#b8813f");
    for (let i = 0; i < Math.floor((W - 6) / 5); i++) {
      R(X + 4 + i * 5, Y + 6, 3, 1, "#a06a34");
      R(X + 5 + i * 5, Y + 7, 1, 1, "#a06a34");
    }
    // side curtains (teal-green velvet)
    for (const side of [0, 1]) {
      const cx = side === 0 ? X + 3 : X + W - 9;
      R(cx, Y + 3, 6, 26, P.teal);
      R(cx + (side === 0 ? 0 : 5), Y + 3, 1, 26, P.tealD);
      R(cx + 2, Y + 3, 1, 26, "#577c72");
      R(cx + 4, Y + 3, 1, 26, P.tealD);
      // tieback
      R(cx + 1, Y + 17, 4, 2, P.brass);
      R(cx + 1, Y + 24, 4, 3, P.tealD);
      R(cx + 2, Y + 26, 2, 2, P.tealD);
    }
  }

  /* --- framed pictures in wall gaps --- */
  const pics: Array<[number, (R2: ReturnType<typeof makeR>) => void]> = [
    [
      12,
      (R2) => {
        // mountain painting
        R2(0, 0, 12, 14, "#1d2a3a");
        R2(0, 8, 12, 4, "#2c3c4a");
        R2(3, 4, 3, 5, "#46586a");
        R2(6, 6, 4, 3, "#3a4c5e");
        R2(9, 2, 2, 2, "#f4e7d3");
      },
    ],
    [
      28,
      (R2) => {
        // botanical print
        R2(0, 0, 12, 14, "#e8d9b8");
        R2(5, 3, 1, 8, "#5d7a5a");
        R2(3, 4, 2, 2, "#6f8f6a");
        R2(7, 6, 2, 2, "#6f8f6a");
        R2(4, 8, 2, 2, "#5d7a5a");
        R2(5, 11, 2, 1, "#b06a3a");
      },
    ],
    [
      36,
      (R2) => {
        // train poster
        R2(0, 0, 12, 14, "#31404e");
        R2(1, 8, 10, 3, "#d9a441");
        R2(2, 9, 2, 2, "#f4e7d3");
        R2(5, 9, 2, 2, "#f4e7d3");
        R2(8, 9, 2, 2, "#f4e7d3");
        R2(1, 4, 10, 1, "#9aa5b5");
        R2(3, 2, 6, 1, "#9aa5b5");
      },
    ],
  ];
  for (const [fx, draw] of pics) {
    const X = fx * TILE + 2;
    const Y = 2 * TILE + 5;
    R(X - 1, Y - 1, 14, 16, P.brassLo);
    R(X - 1, Y - 1, 14, 1, P.brass);
    R(X, Y, 12, 14, P.ink);
    const sub = makeCanvas(12, 14).getContext("2d")!;
    draw(makeR(sub));
    g.drawImage(sub.canvas, X, Y);
    R(X, Y, 12, 1, "rgba(255,235,200,0.14)");
  }

  /* --- wall clock base (hands drawn live by the engine) --- */
  {
    const cx = CLOCK.x;
    const cy = CLOCK.y;
    R(cx - 11, cy - 11, 22, 22, P.brassLo);
    R(cx - 10, cy - 10, 20, 20, P.brass);
    R(cx - 10, cy - 10, 20, 1, P.brassHi);
    R(cx - 8, cy - 8, 16, 16, P.ink);
    R(cx - 7, cy - 7, 14, 14, "#f0e2c4");
    R(cx - 7, cy - 7, 14, 2, "#d8c8a4");
    // ticks
    R(cx - 1, cy - 7, 2, 2, P.ink);
    R(cx - 1, cy + 5, 2, 2, P.ink);
    R(cx - 7, cy - 1, 2, 2, P.ink);
    R(cx + 5, cy - 1, 2, 2, P.ink);
    // small "N O" lettering ticks
    R(cx - 4, cy - 5, 1, 1, "#8a6a3a");
    R(cx + 3, cy - 5, 1, 1, "#8a6a3a");
  }

  /* --- chalk menu above the snack cart --- */
  {
    const X = 46 * TILE;
    const Y = 2 * TILE + 2;
    R(X - 2, Y - 1, 4 * TILE + 4, 30, P.brassLo);
    R(X, Y, 4 * TILE, 28, "#2e2430");
    R(X + 1, Y + 1, 4 * TILE - 2, 26, "#241c28");
    R(X + 4, Y + 4, 22, 2, "#e8d5b5");
    R(X + 28, Y + 4, 14, 2, "#c98f4e");
    const lines = [20, 26, 16];
    lines.forEach((w, i) => {
      R(X + 6, Y + 10 + i * 5, w, 1, "#9aa5b5");
      R(X + 44, Y + 10 + i * 5, 8, 1, "#f2a33c");
    });
    R(X + 6, Y + 24, 10, 1, "#5d7a5a");
  }

  /* --- west-end double door --- */
  {
    const DX = 0;
    const DY = 5 * TILE;
    R(DX, DY, 2 * TILE, 6 * TILE, P.woodD);
    R(DX + 1, DY + 1, 14, 94, P.wall);
    R(DX + 17, DY + 1, 14, 94, P.panel);
    R(DX + 15, DY, 2, 96, P.ink);
    // round windows with brass rings
    for (const ox of [3, 19]) {
      R(DX + ox, DY + 8, 10, 18, P.brassLo);
      R(DX + ox + 1, DY + 9, 8, 16, "#31404e");
      R(DX + ox + 2, DY + 10, 6, 14, "#40556b");
      R(DX + ox + 2, DY + 10, 6, 2, "#5d7a95");
      R(DX + ox + 3, DY + 12, 2, 6, "#7f95b5");
    }
    // rivets
    for (let ry = 0; ry < 8; ry++) {
      R(DX + 2, DY + 6 + ry * 11, 1, 1, P.brassLo);
      R(DX + 29, DY + 6 + ry * 11, 1, 1, P.brassLo);
    }
    R(DX + 12, DY + 42, 2, 12, P.brass);
    R(DX + 18, DY + 42, 2, 12, P.brass);
    R(DX + 12, DY + 42, 2, 2, P.brassHi);
    R(DX + 18, DY + 42, 2, 2, P.brassHi);
    R(DX, DY + 92, 32, 4, P.base);
    R(DX + 1, DY + 84, 30, 2, P.brassLo); // kickplate
    // placard above
    R(DX + 4, DY - 9, 24, 8, P.brass);
    R(DX + 5, DY - 8, 22, 6, P.ink);
    R(DX + 7, DY - 6, 4, 2, P.brassHi);
    R(DX + 13, DY - 6, 2, 2, P.brassHi);
    R(DX + 17, DY - 6, 6, 2, P.brassHi);
  }

  /* --- soft contact shadows under wall furniture & booths --- */
  g.fillStyle = "rgba(16,7,4,0.30)";
  for (let tx = 1; tx < COLS - 1; tx++) {
    const ch5 = tileAt(grid, tx, 5);
    if (SOLID.has(ch5) && ch5 !== "p") g.fillRect(tx * TILE, 6 * TILE, TILE, 3);
    if (grid[6][tx] === "S" || grid[6][tx] === "D") g.fillRect(tx * TILE + 1, 7 * TILE - 1, TILE - 2, 2);
  }
  // ambient floor shading near the edges of the car
  const floorGrad = g.createLinearGradient(0, 6 * TILE, 0, 13 * TILE);
  floorGrad.addColorStop(0, "rgba(30,12,8,0.18)");
  floorGrad.addColorStop(0.4, "rgba(30,12,8,0)");
  floorGrad.addColorStop(1, "rgba(30,12,8,0.30)");
  g.fillStyle = floorGrad;
  g.fillRect(TILE, 6 * TILE, (COLS - 2) * TILE, 7 * TILE);

  void rnd;
  return cv;
}

function paintBookshelf(g: G, X: number, Y: number, tx: number) {
  const R = makeR(g);
  R(X, Y, 16, 16, P.wood);
  R(X, Y, 16, 1, P.frameHi);
  R(X, Y + 15, 16, 1, P.woodD);
  R(X + 1, Y + 2, 14, 12, "#2c1a12");
  const colors = ["#c98f4e", "#7fa07a", "#7f95b5", "#e26d6d", "#d9a441", "#8a5a7a", "#5f8260"];
  const r = mulberry32(tx * 77 + 5);
  // two shelves of varied books
  let bx = X + 2;
  while (bx < X + 13) {
    const bw = 1 + Math.floor(r() * 2);
    const bh = 4 + Math.floor(r() * 2);
    const c = colors[Math.floor(r() * colors.length)];
    R(bx, Y + 8 - bh, bw, bh, c);
    if (bw > 1) R(bx, Y + 8 - bh, bw, 1, "rgba(255,235,200,0.25)");
    bx += bw + (r() > 0.8 ? 1 : 0);
  }
  bx = X + 2;
  while (bx < X + 13) {
    const bw = 1 + Math.floor(r() * 2);
    const bh = 3 + Math.floor(r() * 2);
    const c = colors[Math.floor(r() * colors.length)];
    R(bx, Y + 14 - bh, bw, bh, c);
    bx += bw + (r() > 0.85 ? 1 : 0);
  }
  // leaning book + shelf boards + brass plate
  R(X + 12, Y + 3, 2, 5, "#e26d6d");
  R(X, Y + 8, 16, 1, P.frameLo);
  R(X + 6, Y + 9, 4, 1, P.brass);
  // trailing plant on top
  R(X + 12, Y - 0, 3, 2, "#b06a3a");
  R(X + 12, Y - 2, 3, 2, "#6f8f6a");
  R(X + 14, Y, 1, 3, "#5d7a5a");
}

function paintPlant(g: G, X: number, Y: number, n: number) {
  const R = makeR(g);
  // terracotta pot with pattern band
  R(X + 5, Y + 9, 6, 5, "#b06a3a");
  R(X + 5, Y + 9, 2, 5, "#c97f4a");
  R(X + 4, Y + 8, 8, 2, "#c97f4a");
  R(X + 4, Y + 8, 8, 1, "#d98f5a");
  R(X + 5, Y + 11, 6, 1, "#8a4f2a");
  R(X + 6, Y + 14, 4, 2, "#8a4f2a");
  // foliage: layered clumps with highlights
  const leaf = n > 0.5 ? "#6f8f6a" : "#62835f";
  const leafD = "#4a624a";
  R(X + 6, Y, 4, 9, leaf);
  R(X + 3, Y + 2, 3, 6, leafD);
  R(X + 10, Y + 2, 3, 6, leafD);
  R(X + 4, Y + 1, 2, 3, leaf);
  R(X + 10, Y + 1, 2, 3, leaf);
  R(X + 2, Y + 4, 1, 3, leafD);
  R(X + 13, Y + 4, 1, 3, leafD);
  R(X + 7, Y + 1, 2, 1, "#8fae86");
  R(X + 6, Y + 4, 1, 1, "#8fae86");
  R(X + 10, Y + 5, 1, 1, "#8fae86");
}

function paintCoatRack(g: G, X: number, Y: number, tx: number) {
  const R = makeR(g);
  if (tx === 4) {
    R(X + 7, Y, 2, 14, P.frame);
    R(X + 7, Y, 1, 14, P.frameHi);
    R(X + 4, Y + 1, 8, 1, P.brass);
    R(X + 4, Y + 2, 1, 2, P.brassHi);
    R(X + 11, Y + 2, 1, 2, P.brassHi);
    // hanging plum coat
    R(X + 9, Y + 3, 6, 9, "#8a5a7a");
    R(X + 9, Y + 3, 6, 1, "#6e4560");
    R(X + 9, Y + 4, 1, 8, "#9c6a8a");
    R(X + 11, Y + 6, 2, 1, P.brass);
    R(X + 5, Y + 14, 6, 2, P.wood);
  } else {
    // umbrella stand + umbrella
    R(X + 6, Y + 4, 5, 10, "#c9564a");
    R(X + 6, Y + 4, 5, 1, "#a84438");
    R(X + 6, Y + 4, 1, 10, "#d96a5a");
    R(X + 7, Y + 8, 3, 1, P.cream);
    R(X + 12, Y + 1, 1, 12, "#31404e");
    R(X + 11, Y, 3, 1, "#31404e");
    R(X + 12, Y + 12, 1, 1, P.brass);
    R(X + 3, Y + 14, 10, 2, P.wood);
  }
}

function paintSeat(g: G, X: number, Y: number, tx: number) {
  const R = makeR(g);
  const boothIdx = Math.floor((tx - 7) / 8);
  const even = boothIdx % 2 === 0;
  const cushion = even ? P.cushionA : P.cushionB;
  const cushionD = even ? P.cushionAD : P.cushionBD;
  const cushionH = even ? P.cushionAH : P.cushionBH;
  // wood shell + brass trim
  R(X, Y + 1, 16, 13, P.wood);
  R(X, Y + 1, 1, 13, P.frameHi);
  R(X + 15, Y + 1, 1, 13, P.woodD);
  R(X, Y + 1, 16, 1, P.brassLo);
  // tall tufted backrest
  R(X + 1, Y, 14, 6, cushion);
  R(X + 1, Y, 14, 1, cushionH);
  R(X + 1, Y + 5, 14, 1, cushionD);
  R(X + 5, Y + 1, 1, 4, cushionD);
  R(X + 10, Y + 1, 1, 4, cushionD);
  R(X + 3, Y + 2, 1, 1, cushionD); // buttons
  R(X + 8, Y + 2, 1, 1, cushionD);
  R(X + 12, Y + 2, 1, 1, cushionD);
  // seat cushion
  R(X + 1, Y + 6, 14, 5, cushion);
  R(X + 1, Y + 6, 14, 1, cushionH);
  R(X + 1, Y + 9, 14, 2, cushionD);
  R(X + 1, Y + 10, 14, 1, "rgba(0,0,0,0.15)");
  // base + feet
  R(X, Y + 12, 16, 2, P.woodD);
  R(X + 1, Y + 14, 3, 2, P.base);
  R(X + 12, Y + 14, 3, 2, P.base);
  R(X + 1, Y + 14, 3, 1, P.frameLo);
  R(X + 12, Y + 14, 3, 1, P.frameLo);
}

function paintDesk(g: G, X: number, Y: number, tx: number) {
  const R = makeR(g);
  // top slab with grain + bevel
  R(X, Y + 3, 16, 11, P.desk);
  R(X, Y + 3, 16, 2, P.deskHi);
  R(X, Y + 3, 1, 11, P.deskHi);
  R(X + 15, Y + 3, 1, 11, P.deskLo);
  R(X, Y + 5, 16, 1, P.deskLo);
  R(X + 3, Y + 4, 5, 1, "rgba(122,66,30,0.5)");
  R(X + 9, Y + 4, 4, 1, "rgba(122,66,30,0.5)");
  R(X + 1, Y + 13, 14, 3, "#7c4c28");
  R(X + 1, Y + 13, 14, 1, P.deskLo);
  const leftOfPair = (tx - 7) % 8 === 1;
  if (leftOfPair) {
    // open book, pencil, sticky note
    R(X + 3, Y + 6, 7, 5, P.cream);
    R(X + 6, Y + 6, 1, 5, "#c9a86e");
    R(X + 4, Y + 7, 2, 1, "#a8886a");
    R(X + 7, Y + 8, 2, 1, "#a8886a");
    R(X + 4, Y + 9, 2, 1, "#a8886a");
    R(X + 11, Y + 7, 4, 1, P.brassHi);
    R(X + 14, Y + 7, 1, 1, P.ink);
    R(X + 10, Y + 10, 4, 3, "#e2b25a");
    R(X + 10, Y + 10, 4, 1, "#f2c97a");
  } else {
    // teacup + brass reading lamp with warm shade
    R(X + 2, Y + 7, 4, 3, "#e8d5b5");
    R(X + 2, Y + 7, 4, 1, "#b98d5e");
    R(X + 6, Y + 8, 1, 1, "#e8d5b5");
    R(X + 2, Y + 10, 4, 1, "#c9a86e");
    R(X + 10, Y + 5, 2, 6, P.railD);
    R(X + 8, Y + 3, 6, 2, P.brass);
    R(X + 8, Y + 3, 6, 1, P.brassHi);
    R(X + 9, Y + 5, 4, 1, "#ffe0a0");
    R(X + 9, Y + 6, 4, 2, "rgba(255,214,138,0.35)");
  }
}

function paintCartTile(g: G, X: number, Y: number, tx: number, ty: number) {
  const R = makeR(g);
  if (ty === 5) {
    // counter top
    R(X, Y + 6, 16, 10, P.desk);
    R(X, Y + 6, 16, 2, P.deskHi);
    R(X, Y + 6, 1, 10, P.deskHi);
    R(X, Y + 8, 16, 1, P.deskLo);
    if (tx === 45) {
      // ice bucket / carafe
      R(X + 2, Y + 1, 8, 5, "#7f95b5");
      R(X + 3, Y + 2, 6, 3, "#b9c9e2");
      R(X + 1, Y + 5, 10, 2, P.brass);
      R(X + 11, Y + 2, 3, 4, "#c9564a");
      R(X + 12, Y + 1, 1, 1, "#5d7a5a");
    }
    if (tx === 46 || tx === 47) {
      // glowing pastry case
      R(X, Y, 16, 7, "#31404e");
      R(X + 1, Y + 1, 14, 5, "#4a5f78");
      R(X + 1, Y + 1, 14, 1, "#5d7a95");
      R(X + 2, Y + 3, 3, 2, "#f2c14e");
      R(X + 6, Y + 3, 3, 2, "#e06a3c");
      R(X + 10, Y + 3, 3, 2, "#d9a03d");
      R(X + 2, Y + 5, 12, 1, "rgba(255,214,138,0.5)");
      R(X, Y + 6, 16, 1, P.brass);
    }
    if (tx === 48) {
      // big teapot (steam source)
      R(X + 3, Y + 1, 8, 5, "#c9564a");
      R(X + 4, Y, 6, 1, "#a84438");
      R(X + 11, Y + 2, 3, 2, "#c9564a");
      R(X + 2, Y + 2, 1, 2, "#a84438");
      R(X + 4, Y + 2, 5, 1, "#e88a7a");
      R(X + 5, Y - 1, 1, 1, "#f4e7d3");
    }
    if (tx === 49) {
      R(X + 2, Y + 2, 3, 4, "#e8d5b5");
      R(X + 6, Y + 3, 3, 3, "#e8d5b5");
      R(X + 10, Y + 2, 3, 4, "#c9a86e");
      R(X + 3, Y + 3, 1, 1, "#b98d5e");
    }
    if (tx === 50) {
      R(X + 2, Y + 1, 10, 5, P.wood);
      R(X + 3, Y + 2, 8, 3, "#2c1a12");
      R(X + 4, Y + 3, 6, 1, "#f2a33c");
      R(X + 1, Y + 5, 12, 1, P.brassLo);
    }
    // brass rail on top edge
    R(X, Y + 6, 16, 1, P.brass);
  } else {
    // counter front
    R(X, Y, 16, 16, "#7c4c28");
    R(X, Y, 16, 2, P.wood);
    R(X + 2, Y + 3, 12, 9, "#6b4227");
    R(X + 3, Y + 4, 10, 7, "#7c4c28");
    R(X + 3, Y + 4, 10, 1, "#8a5630");
    R(X + 7, Y + 7, 2, 2, P.brass);
    R(X, Y + 12, 16, 2, P.woodD);
    // wheels
    if (tx === 46 || tx === 49) {
      R(X + 4, Y + 12, 6, 4, P.ink);
      R(X + 5, Y + 13, 4, 2, "#3a2c22");
      R(X + 6, Y + 13, 2, 2, P.brassLo);
    }
    R(X, Y + 15, 16, 1, P.ceilEdge);
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
    grad.addColorStop(0, "#2c2148");
    grad.addColorStop(0.4, "#6e4258");
    grad.addColorStop(0.72, "#c9764e");
    grad.addColorStop(0.92, "#f2a95e");
    grad.addColorStop(1, "#ffd489");
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    // low sun with layered halo
    const sx = 380;
    const sg = g.createRadialGradient(sx, 26, 1, sx, 26, 28);
    sg.addColorStop(0, "rgba(255,230,170,0.95)");
    sg.addColorStop(0.3, "rgba(255,200,120,0.55)");
    sg.addColorStop(1, "rgba(255,200,120,0)");
    g.fillStyle = sg;
    g.fillRect(sx - 30, 0, 60, H);
    g.fillStyle = "#ffe2a0";
    g.fillRect(sx - 3, 22, 7, 6);
    g.fillStyle = "#fff0c8";
    g.fillRect(sx - 2, 23, 5, 3);
    // crescent moon high up
    g.fillStyle = "#f4e7d3";
    g.fillRect(88, 3, 4, 4);
    g.fillRect(87, 4, 1, 2);
    g.fillStyle = "#3a2c50";
    g.fillRect(90, 3, 2, 3);
    // stars
    const r = mulberry32(99);
    for (let i = 0; i < 34; i++) {
      const a = 0.35 + r() * 0.55;
      g.fillStyle = `rgba(244,231,211,${a.toFixed(2)})`;
      g.fillRect(Math.floor(r() * W), Math.floor(r() * 11), 1, 1);
    }
    // horizon haze band
    g.fillStyle = "rgba(255,180,110,0.16)";
    g.fillRect(0, 24, W, 4);
  }

  const mkLayer = (factor: number, draw: (g: G) => void): SceneryLayer => {
    const c = makeCanvas(W, H);
    draw(c.getContext("2d")!);
    return { canvas: c, factor };
  };

  const clouds = mkLayer(0.06, (g) => {
    const r = mulberry32(7);
    for (let i = 0; i < 8; i++) {
      const cx = Math.floor(r() * W);
      const cy = 3 + Math.floor(r() * 9);
      const cw = 16 + Math.floor(r() * 28);
      g.fillStyle = "rgba(120,88,110,0.5)";
      g.fillRect(cx, cy, cw, 2);
      g.fillRect(cx + 4, cy - 1, cw - 9, 1);
      g.fillRect(cx + 2, cy + 2, cw - 5, 1);
      g.fillStyle = "rgba(255,190,140,0.35)";
      g.fillRect(cx + 2, cy + 2, cw - 6, 1); // lit underside
    }
  });

  const mountains = mkLayer(0.16, (g) => {
    const r = mulberry32(21);
    g.fillStyle = "#43345c";
    for (let x = 0; x < W; x++) {
      const h = 9 + Math.abs(Math.sin(x * 0.045) * 7) + Math.floor(r() * 2);
      g.fillRect(x, 30 - h, 1, h);
    }
    // snow caps
    g.fillStyle = "#8a7aa0";
    for (let x = 0; x < W; x++) {
      const h = 9 + Math.abs(Math.sin(x * 0.045) * 7);
      if (h > 13) g.fillRect(x, 30 - h, 1, 2);
    }
    g.fillStyle = "#574670";
    for (let x = 0; x < W; x++) {
      const h = 5 + Math.abs(Math.sin(x * 0.08 + 2) * 4);
      g.fillRect(x, 30 - h, 1, h);
    }
  });

  const hills = mkLayer(0.38, (g) => {
    const r = mulberry32(42);
    g.fillStyle = "#3f5247";
    for (let x = 0; x < W; x++) {
      const h = 5 + Math.abs(Math.sin(x * 0.06 + 1) * 5) + (r() > 0.9 ? 1 : 0);
      g.fillRect(x, 31 - h, 1, h);
    }
    g.fillStyle = "rgba(255,170,110,0.14)";
    for (let x = 0; x < W; x++) {
      const h = 5 + Math.abs(Math.sin(x * 0.06 + 1) * 5);
      if (h > 7) g.fillRect(x, 31 - h, 1, 1); // dusk rim light
    }
    g.fillStyle = "#35463c";
    for (let i = 0; i < 16; i++) {
      const tx = Math.floor(r() * W);
      g.fillRect(tx, 24, 1, 4);
      g.fillRect(tx - 1, 25, 3, 1);
      g.fillRect(tx - 2, 26, 5, 1);
    }
  });

  const near = mkLayer(1.0, (g) => {
    const r = mulberry32(777);
    g.fillStyle = "#2c3a34";
    g.fillRect(0, 29, W, 3);
    g.fillStyle = "#232f29";
    g.fillRect(0, 28, W, 1);
    // fence
    g.fillStyle = "#221b26";
    for (let x = 0; x < W; x += 6) g.fillRect(x, 24, 1, 5);
    g.fillRect(0, 25, W, 1);
    // bushes
    for (let i = 0; i < 18; i++) {
      const tx = Math.floor(r() * W);
      g.fillStyle = "#26332c";
      g.fillRect(tx, 26, 3, 2);
      g.fillRect(tx + 1, 25, 2, 1);
    }
    // pines
    for (let i = 0; i < 12; i++) {
      const tx = Math.floor(r() * W);
      const th = 8 + Math.floor(r() * 8);
      g.fillStyle = "#1c2721";
      g.fillRect(tx, 28 - th, 2, th);
      g.fillStyle = "#26332c";
      for (let l = 0; l < 4; l++) {
        const w = 2 + l * 2;
        g.fillRect(tx - Math.floor(w / 2) + 1, 28 - th + l * 2, w, 2);
      }
      g.fillStyle = "rgba(255,170,110,0.2)";
      g.fillRect(tx + 1, 28 - th, 1, 2);
    }
    // cottages with lit windows
    for (let i = 0; i < 3; i++) {
      const cx = 40 + Math.floor(r() * (W - 100));
      g.fillStyle = "#31273a";
      g.fillRect(cx, 16, 15, 12);
      g.fillStyle = "#241c2c";
      g.fillRect(cx - 1, 15, 17, 2);
      g.fillRect(cx + 2, 13, 11, 2);
      g.fillStyle = "#ffd27a";
      g.fillRect(cx + 3, 19, 3, 3);
      g.fillRect(cx + 9, 19, 2, 3);
      g.fillStyle = "rgba(255,210,122,0.25)";
      g.fillRect(cx + 2, 22, 5, 1);
    }
    // semaphore signal with glowing head
    g.fillStyle = "#1c1520";
    g.fillRect(300, 10, 2, 19);
    g.fillRect(298, 10, 6, 1);
    g.fillStyle = "#14321f";
    g.fillRect(302, 10, 3, 4);
    g.fillStyle = "#7fe08a";
    g.fillRect(303, 11, 1, 2);
    // telegraph poles + catenary
    g.fillStyle = "#1c1520";
    for (let x = 20; x < W; x += 90) {
      g.fillRect(x, 6, 2, 23);
      g.fillRect(x - 3, 8, 8, 1);
      g.fillRect(x - 2, 12, 6, 1);
    }
    g.strokeStyle = "rgba(28,21,32,0.75)";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, 8.5);
    g.lineTo(W, 8.5);
    g.moveTo(0, 12.5);
    g.lineTo(W, 12.5);
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
