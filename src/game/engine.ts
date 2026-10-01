/* Pixel study-car engine: fixed-height camera that follows the player
   through the train car, WASD/arrow movement with tile collision,
   proximity sit/stand, bot passengers that wander + study, emotes,
   dust/steam/rain particles, lamp lighting and parallax windows.

   All occupants live in `players` keyed by id. Bots are driven locally;
   a realtime transport could replace the bot brain by writing remote
   states into the same map. */

import { buildSheet, convertToSpriteSheet, EYE_SPOTS, getIcon, SKINS, SWATCHES } from "./sprites";
import { buildWorld, CLOCK, COLS, HANG_SIGN_X, isSolid, ROWS, TILE, WINDOW_BAND_H, WINDOW_BAND_Y, type World } from "./world";
import type { BoothCycle, Dir, EmoteKind, HudSnapshot, Identity, PassengerHud, PlayerState, SeatDef } from "./types";

export const PLAYER_ID = "you";
const FOCUS_MS = 25 * 60 * 1000;
const BREAK_MS = 5 * 60 * 1000;
const TRAIN_SPEED = 62; // world px per second of scenery drift

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  kind: "spark" | "steam" | "dust";
  seed: number;
}

interface BotBrain {
  mode: "sitting" | "goto" | "pause";
  targetX: number;
  targetY: number;
  targetSeatId: string | null;
  timer: number;
  thinkIn: number;
  replyWaveIn: number;
  emoteIn: number;
}

interface BotSpec {
  id: string;
  name: string;
  sweaterId: string;
  accessory: "none" | "beanie" | "scarf";
  skin: string;
  hair: string;
  gender: "male" | "female";
}

const BOT_SPECS: BotSpec[] = [
  { id: "mira", name: "Mira", sweaterId: "rose", accessory: "scarf", skin: SKINS[0], hair: "#5a3a2a", gender: "female" },
  { id: "jun", name: "Jun", sweaterId: "moss", accessory: "beanie", skin: SKINS[3], hair: "#241d24", gender: "male" },
  { id: "ada", name: "Ada", sweaterId: "gold", accessory: "none", skin: SKINS[1], hair: "#6e5a3a", gender: "female" },
  { id: "theo", name: "Theo", sweaterId: "dusk", accessory: "none", skin: SKINS[4], hair: "#2e2e3a", gender: "male" },
];

const rnd = Math.random;

export class Engine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private world: World;
  private players = new Map<string, PlayerState>();
  private brains = new Map<string, BotBrain>();
  private sheets = new Map<string, HTMLCanvasElement>();
  private keys = new Set<string>();
  private raf = 0;
  private last = 0;
  private running = false;
  private time = 0;
  private trainDist = 0;
  private camX = 0;
  private viewW = 0;
  private viewH = 0;
  private S = 2;
  private dpr = 1;
  private sway = 0;
  private nearSeat: SeatDef | null = null;
  private seatTaken = new Map<string, string>();
  private boothCycles = new Map<number, BoothCycle>();
  private particles: Particle[] = [];
  private rainOn = false;
  private raindrops: Array<{ x: number; y: number }> = [];
  private steamAcc = 0;
  private hudAcc = 0;
  private blinkSeeds = new Map<string, { next: number; until: number }>();
  private animAcc = new Map<string, number>();
  private shoot: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
  private shootNext = 6;
  private ro: ResizeObserver | null = null;
  private identity: Identity | null = null;
  onHud: ((s: HudSnapshot) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.world = buildWorld();
    this.bindInput();
    this.observeResize();
    this.initAmbientParticles();
    // Pre-seat three study partners so the car feels lived-in on arrival.
    this.spawnBots();
    this.last = performance.now();
    this.running = true;
    this.raf = requestAnimationFrame(this.frame);
  }

  /* ---------------- public API ---------------- */

  async board(identity: Identity) {
    // Prevent double-boarding
    if (this.identity && this.players.has(PLAYER_ID)) {
      console.warn("Player already boarded");
      return;
    }

    this.identity = identity;
    const swatch = SWATCHES.find((s) => s.id === identity.sweater) ?? SWATCHES[0];
    const skin = SKINS[(identity.name.length + 2) % SKINS.length];
    const hair = ["#3a2a24", "#241d24", "#5a3a2a", "#7a4a3a"][(identity.name.length + 1) % 4];
    
    // If custom skin image is provided, convert it to sprite sheet
    let customSheet: HTMLCanvasElement | undefined;
    if (identity.skinImage) {
      try {
        customSheet = await convertToSpriteSheet(identity.skinImage);
      } catch (err) {
        console.error("Failed to convert custom skin:", err);
      }
    }
    
    this.sheets.set(PLAYER_ID, buildSheet(swatch.c, swatch.hat, skin, hair, identity.accessory, identity.gender, customSheet));
    const p: PlayerState = {
      id: PLAYER_ID,
      name: identity.name || "Traveler",
      sweater: swatch.c,
      accessory: identity.accessory,
      pos: { ...this.world.spawn },
      dir: "right",
      moving: false,
      seatId: null,
      status: "walking",
      isBot: false,
      emote: null,
    };
    this.players.set(PLAYER_ID, p);
    this.camX = Math.max(0, p.pos.x - this.viewWorldW() / 2);
    
    // Emit HUD update immediately
    this.emitHud();
    
    // a neighbor notices you boarding
    const greeter = [...this.players.values()].find((b) => b.isBot && b.seatId);
    if (greeter) {
      const brain = this.brains.get(greeter.id);
      if (brain) brain.replyWaveIn = 1.1;
    }
  }

  emote(kind: EmoteKind) {
    const p = this.players.get(PLAYER_ID);
    if (!p) return;
    p.emote = { kind, until: this.time + 2.2 };
    if (kind === "wave") {
      for (const b of this.players.values()) {
        if (b.isBot && Math.hypot(b.pos.x - p.pos.x, b.pos.y - p.pos.y) < 90) {
          const brain = this.brains.get(b.id);
          if (brain) brain.replyWaveIn = 0.35 + rnd() * 0.6;
        }
      }
    }
  }

  setRain(on: boolean) {
    this.rainOn = on;
    this.raindrops = on
      ? Array.from({ length: 46 }, () => ({ x: rnd() * COLS * TILE, y: WINDOW_BAND_Y + rnd() * WINDOW_BAND_H }))
      : [];
  }

  /** Touchpad hooks */
  setVirtualKey(dir: Dir, down: boolean) {
    const map: Record<Dir, string> = { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD" };
    if (down) this.keys.add(map[dir]);
    else this.keys.delete(map[dir]);
  }
  virtualAction() {
    this.pressAction();
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.ro?.disconnect();
  }

  /* ---------------- setup ---------------- */

  private spawnBots() {
    const seatPool = [...this.world.seats].sort(() => rnd() - 0.5);
    BOT_SPECS.forEach((spec, i) => {
      const swatch = SWATCHES.find((s) => s.id === spec.sweaterId)!;
      this.sheets.set(spec.id, buildSheet(swatch.c, swatch.hat, spec.skin, spec.hair, spec.accessory, spec.gender));
      const state: PlayerState = {
        id: spec.id,
        name: spec.name,
        sweater: swatch.c,
        accessory: spec.accessory,
        pos: { x: (10 + i * 9) * TILE, y: 10 * TILE + 8 },
        dir: "down",
        moving: false,
        seatId: null,
        status: "idle",
        isBot: true,
        emote: null,
      };
      this.players.set(spec.id, state);
      const brain: BotBrain = {
        mode: "pause",
        targetX: 0,
        targetY: 0,
        targetSeatId: null,
        timer: 0,
        thinkIn: 0.4 + i * 0.7,
        replyWaveIn: -1,
        emoteIn: 6 + rnd() * 12,
      };
      this.brains.set(spec.id, brain);
      // first two bots are already settled into booths, studying
      if (i < 2) {
        const seat = seatPool.pop();
        if (seat) {
          this.sitDown(state, seat);
          brain.timer = 26 + rnd() * 34;
        }
      }
    });
  }

  private initAmbientParticles() {
    for (let i = 0; i < 52; i++) {
      const lamp = this.world.lamps[Math.floor(rnd() * this.world.lamps.length)];
      this.particles.push({
        x: lamp.x * TILE + 8 + (rnd() - 0.5) * 44,
        y: 34 + rnd() * 96,
        vx: (rnd() - 0.5) * 2,
        vy: -(1 + rnd() * 2.5),
        life: rnd() * 6,
        maxLife: 5 + rnd() * 5,
        kind: "dust",
        seed: rnd() * 10,
      });
    }
  }

  private observeResize() {
    const parent = this.canvas.parentElement!;
    const apply = () => {
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.viewW = parent.clientWidth;
      this.viewH = parent.clientHeight;
      this.canvas.width = Math.round(this.viewW * this.dpr);
      this.canvas.height = Math.round(this.viewH * this.dpr);
      this.canvas.style.width = `${this.viewW}px`;
      this.canvas.style.height = `${this.viewH}px`;
      this.S = this.viewH / (ROWS * TILE);
    };
    apply();
    this.ro = new ResizeObserver(apply);
    this.ro.observe(parent);
  }

  private bindInput() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const code = e.code;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(code)) e.preventDefault();
    if (code === "KeyE" || code === "Space" || code === "Enter") {
      if (!e.repeat) this.pressAction();
      return;
    }
    if (code === "KeyG") {
      if (!e.repeat) this.emote("wave");
      return;
    }
    this.keys.add(code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  /* ---------------- interaction ---------------- */

  private pressAction() {
    const p = this.players.get(PLAYER_ID);
    if (!p) return;
    if (p.seatId) {
      this.standUp(p);
      return;
    }
    if (this.nearSeat && !this.seatTaken.has(this.nearSeat.id)) {
      this.sitDown(p, this.nearSeat);
    }
  }

  private sitDown(p: PlayerState, seat: SeatDef) {
    this.seatTaken.set(seat.id, p.id);
    p.seatId = seat.id;
    p.status = "studying";
    p.dir = seat.facing;
    p.moving = false;
    p.pos.x = seat.tileX * TILE + 8;
    p.pos.y = seat.tileY * TILE + 15;
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: p.pos.x,
        y: p.pos.y - 8,
        vx: (rnd() - 0.5) * 26,
        vy: -14 - rnd() * 18,
        life: 0,
        maxLife: 0.5 + rnd() * 0.3,
        kind: "spark",
        seed: rnd() * 10,
      });
    }
    if (!p.isBot) {
      const partner = this.boothPartner(p);
      if (partner) partner.emote = { kind: "heart", until: this.time + 2 };
      this.ensureBoothCycle(seat.booth);
    }
  }

  private standUp(p: PlayerState) {
    const seat = this.world.seats.find((s) => s.id === p.seatId);
    this.seatTaken.delete(p.seatId!);
    p.seatId = null;
    p.status = "walking";
    if (seat) {
      p.pos.x = seat.standX * TILE + 8;
      p.pos.y = seat.standY * TILE + 12;
      p.dir = "down";
    }
    if (!p.isBot) {
      const booth = seat?.booth;
      if (booth && ![...this.players.values()].some((o) => o.isBot && o.seatId?.startsWith(String(booth)))) {
        this.boothCycles.delete(booth);
      }
    }
  }

  private boothPartner(p: PlayerState): PlayerState | null {
    const seat = this.world.seats.find((s) => s.id === p.seatId);
    if (!seat) return null;
    for (const o of this.players.values()) {
      if (o.id === p.id) continue;
      const os = this.world.seats.find((s) => s.id === o.seatId);
      if (os && os.booth === seat.booth) return o;
    }
    return null;
  }

  private ensureBoothCycle(booth: number) {
    if (!this.boothCycles.has(booth)) {
      this.boothCycles.set(booth, { booth, mode: "focus", endsAt: performance.now() + FOCUS_MS });
    }
  }

  /* ---------------- bots ---------------- */

  private updateBots(dt: number) {
    const now = performance.now();
    for (const b of this.players.values()) {
      if (!b.isBot) continue;
      const brain = this.brains.get(b.id)!;

      if (brain.replyWaveIn >= 0) {
        brain.replyWaveIn -= dt;
        if (brain.replyWaveIn < 0 && brain.replyWaveIn > -dt - 0.001) {
          b.emote = { kind: "wave", until: this.time + 2 };
        }
      }

      if (b.seatId) {
        // settled: study, occasionally sip tea, eventually move on
        b.status = "studying";
        brain.timer -= dt;
        brain.emoteIn -= dt;
        if (brain.emoteIn < 0) {
          b.emote = { kind: rnd() > 0.5 ? "coffee" : "music", until: this.time + 2.2 };
          brain.emoteIn = 9 + rnd() * 14;
        }
        const seat = this.world.seats.find((s) => s.id === b.seatId)!;
        this.ensureBoothCycle(seat.booth);
        if (brain.timer <= 0) {
          this.standUp(b);
          brain.mode = "pause";
          brain.thinkIn = 0.6 + rnd() * 2.2;
        }
        continue;
      }

      if (brain.mode === "pause") {
        b.moving = false;
        b.status = "idle";
        this.animAcc.set(b.id, 0);
        brain.thinkIn -= dt;
        if (brain.thinkIn <= 0) {
          const freeSeats = this.world.seats.filter((s) => !this.seatTaken.has(s.id));
          if (freeSeats.length && rnd() < 0.75) {
            const seat = freeSeats[Math.floor(rnd() * freeSeats.length)];
            brain.mode = "goto";
            brain.targetSeatId = seat.id;
            brain.targetX = seat.standX * TILE + 8;
            brain.targetY = seat.standY * TILE + 8;
          } else {
            brain.mode = "goto";
            brain.targetSeatId = null;
            let tx = 4 + Math.floor(rnd() * 40);
            let ty = 8 + Math.floor(rnd() * 4);
            if (isSolid(this.world, tx, ty)) {
              tx = 20;
              ty = 10;
            }
            brain.targetX = tx * TILE + 8;
            brain.targetY = ty * TILE + 8;
          }
        }
        continue;
      }

      // goto: walk with simple axis-priority steering
      const dx = brain.targetX - b.pos.x;
      const dy = brain.targetY - b.pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 3) {
        b.moving = false;
        if (brain.targetSeatId) {
          const seat = this.world.seats.find((s) => s.id === brain.targetSeatId)!;
          if (!this.seatTaken.has(seat.id)) {
            this.sitDown(b, seat);
            brain.timer = 22 + rnd() * 40;
            brain.emoteIn = 4 + rnd() * 8;
          }
        }
        brain.mode = "pause";
        brain.thinkIn = brain.targetSeatId ? 0.5 : 1 + rnd() * 3;
        continue;
      }
      const speed = 52;
      let mx = 0;
      let my = 0;
      if (Math.abs(dx) > 2) mx = Math.sign(dx) * speed;
      else if (Math.abs(dy) > 2) my = Math.sign(dy) * speed;
      const moved = this.tryMove(b, mx * dt, my * dt);
      if (!moved.movedX && !moved.movedY) {
        // blocked: try the other axis order briefly, then reroute
        const alt = this.tryMove(b, my !== 0 ? 0 : Math.sign(dx || 1) * speed * dt, my !== 0 ? 0 : speed * dt * Math.sign(dy || 1));
        if (!alt.movedX && !alt.movedY) {
          brain.mode = "pause";
          brain.thinkIn = 0.3;
        }
      }
      b.moving = true;
      b.status = "walking";
      this.animAcc.set(b.id, (this.animAcc.get(b.id) ?? 0) + dt * 8);
      void now;
    }

    // booth cycles tick only while someone studies there
    const activeBooths = new Set<number>();
    for (const p of this.players.values()) {
      if (!p.seatId) continue;
      const seat = this.world.seats.find((s) => s.id === p.seatId);
      if (seat) activeBooths.add(seat.booth);
    }
    for (const booth of [...this.boothCycles.keys()]) {
      if (!activeBooths.has(booth)) {
        this.boothCycles.delete(booth);
        continue;
      }
      const c = this.boothCycles.get(booth)!;
      if (now >= c.endsAt) {
        c.mode = c.mode === "focus" ? "break" : "focus";
        c.endsAt = now + (c.mode === "focus" ? FOCUS_MS : BREAK_MS);
      }
    }
  }

  /* ---------------- movement ---------------- */

  private solidAt(wx: number, wy: number): boolean {
    return isSolid(this.world, Math.floor(wx / TILE), Math.floor(wy / TILE));
  }

  private boxSolid(x: number, y: number): boolean {
    // body hitbox: 8px wide, feet at y, top at y-9
    return (
      this.solidAt(x - 3.5, y - 9) ||
      this.solidAt(x + 3.5, y - 9) ||
      this.solidAt(x - 3.5, y - 1) ||
      this.solidAt(x + 3.5, y - 1)
    );
  }

  private tryMove(p: PlayerState, dx: number, dy: number): { movedX: boolean; movedY: boolean } {
    let movedX = false;
    let movedY = false;
    if (dx !== 0) {
      const nx = p.pos.x + dx;
      if (!this.boxSolid(nx, p.pos.y)) {
        p.pos.x = nx;
        movedX = true;
      }
    }
    if (dy !== 0) {
      const ny = p.pos.y + dy;
      if (!this.boxSolid(p.pos.x, ny)) {
        p.pos.y = ny;
        movedY = true;
      }
    }
    return { movedX, movedY };
  }

  private updatePlayer(dt: number) {
    const p = this.players.get(PLAYER_ID);
    if (!p) return;
    if (p.seatId) {
      p.moving = false;
      p.status = "studying";
      return;
    }
    let dx = 0;
    let dy = 0;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) dx -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) dx += 1;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) dy -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) dy += 1;
    const speed = 105;
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      const res = this.tryMove(p, (dx / len) * speed * dt, (dy / len) * speed * dt);
      p.moving = res.movedX || res.movedY;
      if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? "right" : "left";
      else p.dir = dy > 0 ? "down" : "up";
      p.status = "walking";
      if (p.moving) this.animAcc.set(PLAYER_ID, (this.animAcc.get(PLAYER_ID) ?? 0) + dt * 9.5);
    } else {
      p.moving = false;
      this.animAcc.set(PLAYER_ID, 0);
      if (p.status === "walking") p.status = "idle";
    }
  }

  private detectNearSeat() {
    const p = this.players.get(PLAYER_ID);
    this.nearSeat = null;
    if (!p || p.seatId) return;
    let best = 13;
    for (const seat of this.world.seats) {
      if (this.seatTaken.has(seat.id)) continue;
      const d = Math.hypot(p.pos.x - (seat.standX * TILE + 8), p.pos.y - (seat.standY * TILE + 10));
      if (d < best) {
        best = d;
        this.nearSeat = seat;
      }
    }
  }

  /* ---------------- particles ---------------- */

  private updateParticles(dt: number) {
    const w = this.world;
    this.steamAcc += dt;
    if (this.steamAcc > 0.16) {
      this.steamAcc = 0;
      this.particles.push({
        x: w.steamAt.x + (rnd() - 0.5) * 5,
        y: w.steamAt.y,
        vx: (rnd() - 0.5) * 3,
        vy: -(7 + rnd() * 6),
        life: 0,
        maxLife: 1.5 + rnd() * 0.8,
        kind: "steam",
        seed: rnd() * 10,
      });
    }
    for (const pt of this.particles) {
      pt.life += dt;
      pt.x += pt.vx * dt + (pt.kind === "dust" ? Math.sin(this.time * 0.8 + pt.seed) * 4 * dt : Math.sin(pt.life * 3 + pt.seed) * 3 * dt);
      pt.y += pt.vy * dt;
      if (pt.kind === "dust" && pt.life > pt.maxLife) {
        pt.life = 0;
        const lamp = w.lamps[Math.floor(rnd() * w.lamps.length)];
        pt.x = lamp.x * TILE + 8 + (rnd() - 0.5) * 44;
        pt.y = 88 + rnd() * 40;
        pt.maxLife = 5 + rnd() * 5;
      }
    }
    this.particles = this.particles.filter((pt) => pt.life < pt.maxLife || pt.kind === "dust");

    if (this.rainOn) {
      for (const d of this.raindrops) {
        d.y += 130 * dt;
        d.x -= (TRAIN_SPEED * 0.7 + 40) * dt;
        if (d.y > WINDOW_BAND_Y + WINDOW_BAND_H) {
          d.y = WINDOW_BAND_Y - 2;
          d.x = rnd() * COLS * TILE;
        }
        if (d.x < 0) d.x += COLS * TILE;
      }
    }
  }

  /* ---------------- HUD bridge ---------------- */

  private emitHud() {
    if (!this.onHud) return;
    const p = this.players.get(PLAYER_ID);
    const passengers: PassengerHud[] = [];
    let partnerName: string | null = null;
    let partnerFocusLeft: number | null = null;
    for (const pl of this.players.values()) {
      const seat = this.world.seats.find((s) => s.id === pl.seatId);
      let activity: string;
      if (pl.seatId && seat) activity = `Studying · booth ${seat.id}`;
      else if (pl.moving) activity = "Strolling the aisle";
      else activity = "Looking out the window";
      passengers.push({ name: pl.name, color: pl.sweater, activity, isYou: !pl.isBot });
      if (p && pl.isBot && seat && p.seatId) {
        const mySeat = this.world.seats.find((s) => s.id === p.seatId);
        if (mySeat && mySeat.booth === seat.booth) {
          partnerName = pl.name;
          const cycle = this.boothCycles.get(seat.booth);
          if (cycle && cycle.mode === "focus") partnerFocusLeft = Math.max(0, Math.round((cycle.endsAt - performance.now()) / 1000));
        }
      }
    }
    const mySeat = p?.seatId ? this.world.seats.find((s) => s.id === p.seatId) : null;
    passengers.sort((a, b) => Number(b.isYou) - Number(a.isYou));
    this.onHud({
      boarded: !!p,
      seated: !!p?.seatId,
      seatLabel: mySeat ? `Booth ${mySeat.id}` : null,
      partnerName,
      partnerFocusLeft,
      passengers,
      nearSeatId: this.nearSeat?.id ?? null,
    });
  }

  /* ---------------- main loop ---------------- */

  private viewWorldW(): number {
    return this.viewW / this.S;
  }

  private frame = (t: number) => {
    if (!this.running) return;
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    this.time += dt;
    this.trainDist += TRAIN_SPEED * dt;
    this.sway = Math.sin(this.time * 2.2) * 1.15;

    // occasional shooting star behind the windows
    this.shootNext -= dt;
    if (!this.shoot && this.shootNext <= 0) {
      this.shoot = {
        x: this.viewW * (0.2 + Math.random() * 0.6),
        y: Math.random() * 0.35,
        vx: -(90 + Math.random() * 70),
        vy: 26 + Math.random() * 20,
        life: 0.9,
      };
      this.shootNext = 7 + Math.random() * 10;
    }
    if (this.shoot) {
      this.shoot.life -= dt;
      this.shoot.x += this.shoot.vx * dt;
      this.shoot.y += (this.shoot.vy * dt) / Math.max(1, this.viewH * 0.1);
      if (this.shoot.life <= 0) this.shoot = null;
    }

    this.updatePlayer(dt);
    this.updateBots(dt);
    this.detectNearSeat();
    this.updateParticles(dt);

    // camera eases toward the player, clamped to the car
    const p = this.players.get(PLAYER_ID);
    if (p) {
      const vw = this.viewWorldW();
      const mapW = COLS * TILE;
      const target = mapW <= vw ? -(vw - mapW) / 2 : Math.max(0, Math.min(mapW - vw, p.pos.x - vw / 2));
      this.camX += (target - this.camX) * Math.min(1, dt * 5);
    }

    this.hudAcc += dt;
    if (this.hudAcc > 0.25) {
      this.hudAcc = 0;
      this.emitHud();
    }

    this.render();
    this.raf = requestAnimationFrame(this.frame);
  };

  /* ---------------- rendering ---------------- */

  private render() {
    const { ctx } = this;
    const S = this.S;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#140d0a";
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    const wx = (x: number) => (x - this.camX) * S;
    const wy = (y: number) => y * S + this.sway * S;

    this.drawScenery(wx, wy);

    // static car interior
    ctx.drawImage(
      this.world.staticLayer,
      0,
      0,
      this.world.staticLayer.width,
      this.world.staticLayer.height,
      wx(0),
      wy(0),
      COLS * TILE * S,
      ROWS * TILE * S
    );

    this.drawWindowLight(wx, wy);
    this.drawEntities(wx, wy);
    this.drawParticles(wx, wy);
    this.drawLiving(wx, wy);
    this.drawLampLight(wx, wy);
    this.drawGlassSheen(wx, wy);
    if (this.rainOn) this.drawRain(wx, wy);
    this.drawVignette();
  }

  private drawScenery(wx: (n: number) => number, wy: (n: number) => number) {
    const { ctx } = this;
    const S = this.S;
    const bandTop = wy(WINDOW_BAND_Y);
    const bandH = WINDOW_BAND_H * S;
    ctx.save();
    ctx.beginPath();
    ctx.rect(wx(0) - 2, bandTop - 1, COLS * TILE * S + 4, bandH + 2);
    ctx.clip();
    const { sky, layers } = this.world.scenery;
    const skyW = sky.width * S;
    let skyOff = ((this.trainDist * 0.02) % sky.width) * S;
    for (let x = wx(0) - skyOff - skyW; x < this.viewW; x += skyW) {
      ctx.drawImage(sky, x, bandTop, skyW, bandH);
    }
    for (const layer of layers) {
      const lw = layer.canvas.width * S;
      const off = ((this.trainDist * layer.factor) % layer.canvas.width) * S;
      for (let x = wx(0) - off - lw; x < this.viewW; x += lw) {
        ctx.drawImage(layer.canvas, x, bandTop + (layer.factor >= 1 ? 0 : (1 - layer.factor) * 6 * S), lw, bandH);
      }
    }
    // shooting star
    if (this.shoot) {
      const f = Math.max(0, this.shoot.life / 0.9);
      const sx = this.shoot.x;
      const sy = bandTop + this.shoot.y * bandH;
      const len = 26 * S * f;
      const grad = ctx.createLinearGradient(sx, sy, sx + len, sy - len * 0.3);
      grad.addColorStop(0, `rgba(255,240,200,${(0.9 * f).toFixed(3)})`);
      grad.addColorStop(1, "rgba(255,240,200,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(1, S * 0.5);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + len, sy - len * 0.3);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,250,230,${(0.95 * f).toFixed(3)})`;
      ctx.fillRect(sx - S * 0.5, sy - S * 0.5, S, S);
    }
    ctx.restore();
  }

  private drawWindowLight(wx: (n: number) => number, wy: (n: number) => number) {
    const { ctx } = this;
    const S = this.S;
    ctx.fillStyle = "rgba(150,165,215,0.07)";
    for (const [x0, x1] of this.world.windowSpans) {
      const X = wx(x0 * TILE + 4);
      const W = (x1 - x0 + 1) * TILE * S - 8 * S;
      const top = wy(4 * TILE);
      ctx.beginPath();
      ctx.moveTo(X, top);
      ctx.lineTo(X + W, top);
      ctx.lineTo(X + W - 14 * S, wy(8.6 * TILE));
      ctx.lineTo(X - 14 * S, wy(8.6 * TILE));
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawEntities(wx: (n: number) => number, wy: (n: number) => number) {
    const { ctx } = this;
    const S = this.S;
    const sorted = [...this.players.values()].sort((a, b) => a.pos.y - b.pos.y);
    for (const p of sorted) {
      const sheet = this.sheets.get(p.id);
      if (!sheet) continue;
      const sx = wx(p.pos.x);
      const sy = wy(p.pos.y);
      if (sx < -40 || sx > this.viewW + 40) continue;

      // shadow
      ctx.fillStyle = "rgba(16,7,4,0.32)";
      ctx.beginPath();
      ctx.ellipse(sx, sy + 1 * S, 5 * S, 2 * S, 0, 0, Math.PI * 2);
      ctx.fill();

      const row = p.dir === "down" ? 0 : p.dir === "up" ? 1 : 2;
      let col: number;
      if (p.moving) col = 2 + (Math.floor(this.animAcc.get(p.id) ?? 0) % 4);
      else col = Math.floor(this.time * 1.4 + p.pos.y) % 2 === 0 ? 0 : 1;

      ctx.save();
      ctx.translate(sx, sy);
      if (p.dir === "left") ctx.scale(-1, 1);
      ctx.drawImage(sheet, col * 16, row * 16, 16, 16, -8 * S, -15 * S, 16 * S, 16 * S);
      ctx.restore();

      // blink overlay
      const blink = this.blinkSeeds.get(p.id) ?? { next: this.time + 2 + rnd() * 4, until: 0 };
      if (this.time > blink.next) {
        blink.until = this.time + 0.13;
        blink.next = this.time + 2.5 + rnd() * 4;
      }
      this.blinkSeeds.set(p.id, blink);
      const eyes = EYE_SPOTS[p.dir] ?? [];
      if (this.time < blink.until && p.dir !== "up") {
        const pal = "#e0b088";
        for (const [ex, ey] of eyes) {
          const ox = p.dir === "left" ? 15 - ex : ex;
          ctx.fillStyle = pal;
          ctx.fillRect(sx + (ox - 8) * S, sy + (ey - 15) * S, S, S);
        }
      }

      this.drawOverhead(p, sx, sy, S);
    }
  }

  private drawOverhead(p: PlayerState, sx: number, sy: number, S: number) {
    const { ctx } = this;
    const topY = sy - 15 * S;

    // status: book icon while studying
    if (p.seatId) {
      const bob = Math.sin(this.time * 2.4 + p.pos.x) * 1.5 * S;
      const icon = getIcon("book");
      const isz = 10 * S * 0.85;
      ctx.drawImage(icon, sx - isz / 2, topY - 14 * S + bob - isz, isz, isz);
    }

    // emote bubble
    if (p.emote && this.time < p.emote.until) {
      const age = p.emote.until - this.time;
      const scale = age > 1.9 ? (2.2 - age) / 0.3 : 1;
      const bw = 13 * S * scale;
      const bh = 12 * S * scale;
      const bx = sx + 4 * S;
      const by = topY - (p.seatId ? 58 : 26) * S;
      ctx.fillStyle = "#f4e7d3";
      ctx.fillRect(bx - bw / 2, by - bh / 2, bw, bh);
      ctx.fillStyle = "#0d0705";
      ctx.fillRect(bx - bw / 2 - S * 0.7, by - bh / 2 - S * 0.7, bw + 1.4 * S, bh + 1.4 * S);
      ctx.fillStyle = "#f4e7d3";
      ctx.fillRect(bx - bw / 2, by - bh / 2, bw, bh);
      ctx.fillRect(bx - 2 * S, by + bh / 2 - S, 3 * S, 2.4 * S);
      const icon = getIcon(p.emote.kind);
      const isz = 8 * S * scale;
      ctx.drawImage(icon, bx - isz / 2, by - isz / 2, isz, isz);
    }

    // name tag
    const fontSize = Math.max(9, 4.6 * S);
    ctx.font = `${fontSize}px VT323, monospace`;
    ctx.textAlign = "center";
    const label = p.name;
    const tw = ctx.measureText(label).width;
    const tagY = topY - (p.seatId ? 33 : 6) * S;
    ctx.fillStyle = "rgba(13,7,5,0.72)";
    ctx.fillRect(sx - tw / 2 - 3 * S, tagY - fontSize + 1, tw + 6 * S, fontSize + 2 * S);
    ctx.fillStyle = p.isBot ? "#e8d5b5" : "#ffd489";
    ctx.fillText(label, sx, tagY + 1.4 * S);
    // you-marker
    if (!p.isBot) {
      ctx.fillStyle = "#f2a33c";
      ctx.fillRect(sx - tw / 2 - 3 * S, tagY - fontSize + 1, 1.2 * S, fontSize + 2 * S);
      ctx.fillRect(sx + tw / 2 + 1.8 * S, tagY - fontSize + 1, 1.2 * S, fontSize + 2 * S);
    }

    // seated hint for the local player
    if (!p.isBot && p.seatId) {
      const a = 0.75 + Math.sin(this.time * 4) * 0.25;
      ctx.globalAlpha = a;
      ctx.font = `${fontSize * 0.9}px VT323, monospace`;
      const ht = "E · stand up";
      const hw = ctx.measureText(ht).width;
      const hy = tagY - fontSize - 2 * S;
      ctx.fillStyle = "rgba(13,7,5,0.78)";
      ctx.fillRect(sx - hw / 2 - 2.5 * S, hy - fontSize * 0.9, hw + 5 * S, fontSize + 1.5 * S);
      ctx.fillStyle = "#f2a33c";
      ctx.fillText(ht, sx, hy);
      ctx.globalAlpha = 1;
    }
  }

  private drawParticles(wx: (n: number) => number, wy: (n: number) => number) {
    const { ctx } = this;
    const S = this.S;
    for (const pt of this.particles) {
      const x = wx(pt.x);
      const y = wy(pt.y);
      if (x < -10 || x > this.viewW + 10) continue;
      if (pt.kind === "dust") {
        const a = 0.16 + 0.2 * Math.sin((pt.life / pt.maxLife) * Math.PI);
        ctx.fillStyle = `rgba(255,226,170,${a.toFixed(3)})`;
        ctx.fillRect(x, y, Math.max(1, S * 0.8), Math.max(1, S * 0.8));
      } else if (pt.kind === "steam") {
        const f = 1 - pt.life / pt.maxLife;
        ctx.fillStyle = `rgba(244,231,211,${(0.34 * f).toFixed(3)})`;
        const s = (1 + pt.life * 1.4) * S;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      } else {
        const f = 1 - pt.life / pt.maxLife;
        ctx.fillStyle = `rgba(255,209,138,${(0.9 * f).toFixed(3)})`;
        ctx.fillRect(x, y, 1.6 * S, 1.6 * S);
      }
    }

    // sit prompt bubble above the nearest free seat
    if (this.nearSeat) {
      const seat = this.nearSeat;
      const x = wx(seat.tileX * TILE + 8);
      const y = wy(seat.tileY * TILE) - 6 * S + Math.sin(this.time * 5) * 1.5 * S;
      const fontSize = Math.max(10, 5 * S);
      ctx.font = `${fontSize}px VT323, monospace`;
      const text = "E · sit down";
      const tw = ctx.measureText(text).width;
      ctx.textAlign = "center";
      ctx.fillStyle = "#0d0705";
      ctx.fillRect(x - tw / 2 - 4 * S, y - fontSize - 2 * S, tw + 8 * S, fontSize + 6 * S);
      ctx.fillStyle = "#f2a33c";
      ctx.fillRect(x - tw / 2 - 4 * S, y - fontSize - 2 * S, tw + 8 * S, 1.2 * S);
      ctx.fillStyle = "#f4e7d3";
      ctx.fillText(text, x, y - 1 * S);
      ctx.fillStyle = "#f2a33c";
      ctx.fillRect(x - 1.5 * S, y + 2.4 * S, 3 * S, 3 * S);
    }
  }

  private drawLampLight(wx: (n: number) => number, wy: (n: number) => number) {
    const { ctx } = this;
    const S = this.S;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const lamp of this.world.lamps) {
      const cx = wx(lamp.x * TILE + 8);
      if (cx < -140 || cx > this.viewW + 140) continue;
      const flicker = 0.9 + Math.sin(this.time * 9 + lamp.x * 3) * 0.05 + Math.sin(this.time * 23 + lamp.x) * 0.03;
      const cy = wy(2 * TILE);
      const r = 62 * S * flicker;
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
      grad.addColorStop(0, "rgba(255,196,110,0.20)");
      grad.addColorStop(0.5, "rgba(255,170,80,0.08)");
      grad.addColorStop(1, "rgba(255,170,80,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(cx - r, cy - r * 0.4, r * 2, r * 1.6);
    }
    // warm ambient wash
    ctx.fillStyle = "rgba(255,178,96,0.045)";
    ctx.fillRect(0, 0, this.viewW, this.viewH);
    ctx.restore();
    // dusk-dark edges top & bottom
    const gTop = ctx.createLinearGradient(0, 0, 0, this.viewH * 0.24);
    gTop.addColorStop(0, "rgba(24,10,24,0.26)");
    gTop.addColorStop(1, "rgba(24,10,24,0)");
    ctx.fillStyle = gTop;
    ctx.fillRect(0, 0, this.viewW, this.viewH * 0.24);
    const gBot = ctx.createLinearGradient(0, this.viewH * 0.8, 0, this.viewH);
    gBot.addColorStop(0, "rgba(24,10,24,0)");
    gBot.addColorStop(1, "rgba(24,10,24,0.3)");
    ctx.fillStyle = gBot;
    ctx.fillRect(0, this.viewH * 0.8, this.viewW, this.viewH * 0.2);
  }

  private drawRain(wx: (n: number) => number, wy: (n: number) => number) {
    const { ctx } = this;
    const S = this.S;
    ctx.save();
    ctx.beginPath();
    ctx.rect(wx(0), wy(WINDOW_BAND_Y), COLS * TILE * S, WINDOW_BAND_H * S);
    ctx.clip();
    ctx.strokeStyle = "rgba(200,215,240,0.32)";
    ctx.lineWidth = Math.max(1, S * 0.4);
    ctx.beginPath();
    for (const d of this.raindrops) {
      const x = wx(d.x);
      const y = wy(d.y);
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2.4 * S, y + 5 * S);
    }
    ctx.stroke();
    ctx.restore();
  }

  private plantTiles: Array<{ x: number; y: number }> | null = null;

  /* hanging sign, wall clock hands, swaying plant fronds */
  private drawLiving(wx: (n: number) => number, wy: (n: number) => number) {
    const { ctx } = this;
    const S = this.S;

    // ---- wall clock (real time, smooth second hand) ----
    {
      const cx = wx(CLOCK.x);
      const cy = wy(CLOCK.y);
      if (cx > -40 && cx < this.viewW + 40) {
        const d = new Date();
        const sec = d.getSeconds() + d.getMilliseconds() / 1000;
        const min = d.getMinutes() + sec / 60;
        const hr = (d.getHours() % 12) + min / 60;
        const hand = (ang: number, len: number, wdt: number, col: string) => {
          ctx.strokeStyle = col;
          ctx.lineWidth = Math.max(1, wdt * S);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.sin(ang) * len * S, cy - Math.cos(ang) * len * S);
          ctx.stroke();
        };
        hand((hr / 12) * Math.PI * 2, 4.5, 1.1, "#3a2418");
        hand((min / 60) * Math.PI * 2, 6.2, 0.8, "#3a2418");
        hand((sec / 60) * Math.PI * 2, 6.8, 0.35, "#c9564a");
        ctx.fillStyle = "#c9564a";
        ctx.fillRect(cx - S, cy - S, 2 * S, 2 * S);
        // glass glint
        ctx.fillStyle = "rgba(255,240,210,0.16)";
        ctx.fillRect(cx - 5 * S, cy - 6 * S, 3 * S, 2 * S);
      }
    }

    // ---- hanging "QUIET CAR" sign ----
    {
      const ax = wx(HANG_SIGN_X);
      if (ax > -80 && ax < this.viewW + 80) {
        const swing = Math.sin(this.time * 0.85) * 0.045 + Math.sin(this.time * 2.3) * 0.012;
        const pivotY = wy(15);
        ctx.save();
        ctx.translate(ax, pivotY);
        ctx.rotate(swing);
        const glow = 0.5 + Math.sin(this.time * 3.1) * 0.12;
        ctx.strokeStyle = "#17101a";
        ctx.lineWidth = Math.max(1, 0.6 * S);
        ctx.beginPath();
        ctx.moveTo(-14 * S, 0);
        ctx.lineTo(-14 * S, 10 * S);
        ctx.moveTo(14 * S, 0);
        ctx.lineTo(14 * S, 10 * S);
        ctx.stroke();
        // board
        ctx.fillStyle = "#2c1a12";
        ctx.fillRect(-24 * S, 9 * S, 48 * S, 14 * S);
        ctx.fillStyle = "#3d2517";
        ctx.fillRect(-23 * S, 10 * S, 46 * S, 12 * S);
        ctx.fillStyle = `rgba(217,164,65,${(0.55 + glow * 0.3).toFixed(3)})`;
        ctx.fillRect(-23 * S, 10 * S, 46 * S, 1 * S);
        ctx.font = `${Math.max(7, 4.2 * S)}px VT323, monospace`;
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(255,214,138,${(0.72 + glow * 0.28).toFixed(3)})`;
        ctx.fillText("Q U I E T  C A R", 0, 19.5 * S);
        ctx.restore();
      }
    }

    // ---- swaying plant fronds over static pots ----
    {
      if (!this.plantTiles) {
        this.plantTiles = [];
        for (let y = 0; y < ROWS; y++)
          for (let x = 0; x < COLS; x++) if (this.world.grid[y][x] === "p") this.plantTiles.push({ x, y });
      }
      for (const t of this.plantTiles) {
        const px = wx(t.x * TILE);
        if (px < -20 || px > this.viewW + 20) continue;
        const py = wy(t.y * TILE);
        const s1 = Math.sin(this.time * 1.7 + t.x) * 1.4 * S;
        const s2 = Math.sin(this.time * 2.3 + t.x * 2) * 1.1 * S;
        ctx.fillStyle = "#8fae86";
        ctx.fillRect(px + 6 * S + s1, py + 1 * S, S, 3 * S);
        ctx.fillRect(px + 10 * S + s2, py + 2 * S, S, 2 * S);
        ctx.fillStyle = "#6f8f6a";
        ctx.fillRect(px + 3 * S - s1 * 0.6, py + 3 * S, S, 3 * S);
        ctx.fillRect(px + 12 * S - s2 * 0.6, py + 3 * S, S, 2 * S);
      }
    }
  }

  /* drifting sheen across the window glass */
  private drawGlassSheen(wx: (n: number) => number, wy: (n: number) => number) {
    const { ctx } = this;
    const S = this.S;
    ctx.save();
    ctx.beginPath();
    ctx.rect(wx(0), wy(WINDOW_BAND_Y), COLS * TILE * S, WINDOW_BAND_H * S);
    ctx.clip();
    // slow sweeping light band
    const sweep = ((this.time * 26) % (this.viewW + 300)) - 150;
    const grad = ctx.createLinearGradient(sweep, 0, sweep + 120 * S, 0);
    grad.addColorStop(0, "rgba(255,235,200,0)");
    grad.addColorStop(0.5, "rgba(255,235,200,0.09)");
    grad.addColorStop(1, "rgba(255,235,200,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(sweep - 60 * S, wy(WINDOW_BAND_Y), 240 * S, WINDOW_BAND_H * S);
    // static diagonal reflections per pane
    ctx.strokeStyle = "rgba(244,231,211,0.08)";
    ctx.lineWidth = Math.max(1, 1.2 * S);
    for (const [x0, x1] of this.world.windowSpans) {
      const X = wx(x0 * TILE);
      const Y = wy(WINDOW_BAND_Y + 2);
      const H2 = (WINDOW_BAND_H - 4) * S;
      ctx.beginPath();
      ctx.moveTo(X + 12 * S, Y);
      ctx.lineTo(X + 4 * S, Y + H2);
      ctx.moveTo(X + 20 * S, Y);
      ctx.lineTo(X + 12 * S, Y + H2);
      ctx.stroke();
      void x1;
    }
    ctx.restore();
  }

  private drawVignette() {
    const { ctx } = this;
    // warm cinematic grade
    const warm = ctx.createLinearGradient(0, 0, 0, this.viewH * 0.5);
    warm.addColorStop(0, "rgba(255,170,90,0.05)");
    warm.addColorStop(1, "rgba(255,170,90,0)");
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, this.viewW, this.viewH * 0.5);
    const cool = ctx.createLinearGradient(0, this.viewH * 0.62, 0, this.viewH);
    cool.addColorStop(0, "rgba(46,74,110,0)");
    cool.addColorStop(1, "rgba(46,74,110,0.12)");
    ctx.fillStyle = cool;
    ctx.fillRect(0, this.viewH * 0.62, this.viewW, this.viewH * 0.38);

    const grad = ctx.createRadialGradient(
      this.viewW / 2,
      this.viewH / 2,
      Math.min(this.viewW, this.viewH) * 0.42,
      this.viewW / 2,
      this.viewH / 2,
      Math.max(this.viewW, this.viewH) * 0.78
    );
    grad.addColorStop(0, "rgba(10,4,8,0)");
    grad.addColorStop(1, "rgba(10,4,8,0.42)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.viewW, this.viewH);
  }
}
