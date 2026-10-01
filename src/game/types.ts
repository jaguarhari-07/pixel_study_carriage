/* Shared types for the pixel study-car engine.
   The player table is keyed by id and kept transport-agnostic so a
   WebSocket / realtime sync layer can be dropped in later without
   touching movement, seating or rendering code. */

export type Dir = "down" | "up" | "left" | "right";
export type EmoteKind = "wave" | "coffee" | "heart" | "music";
export type Accessory = "none" | "beanie" | "scarf";
export type Gender = "male" | "female";

export interface Identity {
  name: string;
  sweater: string; // hex color key
  accessory: Accessory;
  gender: Gender;
  skinImage?: string; // base64 data URL of uploaded skin image
}

export interface Vec {
  x: number;
  y: number;
}

export type PlayerStatus = "walking" | "idle" | "studying";

export interface PlayerState {
  id: string;
  name: string;
  sweater: string;
  accessory: Accessory;
  pos: Vec; // foot anchor, world px (16px tile space)
  dir: Dir;
  moving: boolean;
  seatId: string | null;
  status: PlayerStatus;
  isBot: boolean;
  emote: { kind: EmoteKind; until: number } | null;
}

export interface SeatDef {
  id: string;
  booth: number; // 1-based
  side: "A" | "B";
  tileX: number;
  tileY: number;
  standX: number; // tile where you stand to use it
  standY: number;
  facing: Dir; // direction avatar faces while seated
}

export interface LampDef {
  x: number; // tile
  y: number;
}

export interface PassengerHud {
  name: string;
  color: string;
  activity: string;
  isYou: boolean;
}

export interface HudSnapshot {
  boarded: boolean;
  seated: boolean;
  seatLabel: string | null;
  partnerName: string | null;
  partnerFocusLeft: number | null; // seconds left on booth-shared focus cycle
  passengers: PassengerHud[];
  nearSeatId: string | null;
}

export interface BoothCycle {
  booth: number;
  mode: "focus" | "break";
  endsAt: number; // ms timestamp
}
