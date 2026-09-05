import { useEffect, useState } from "react";
import type { SoundKit, SoundLayer } from "../game/audio";
import type { Engine } from "../game/engine";
import type { EmoteKind, HudSnapshot } from "../game/types";

/* ---------- tiny pixel-style SVG icons ---------- */
function IconWave() {
  return (
    <svg viewBox="0 0 10 10" className="h-4 w-4" shapeRendering="crispEdges">
      <rect x="4" y="2" width="4" height="5" fill="currentColor" />
      <rect x="3" y="3" width="1" height="3" fill="currentColor" />
      <rect x="8" y="3" width="1" height="3" fill="currentColor" />
      <rect x="4" y="1" width="1" height="1" fill="currentColor" />
      <rect x="7" y="1" width="1" height="1" fill="currentColor" />
      <rect x="4" y="7" width="4" height="2" fill="#5f7fae" />
      <rect x="1" y="2" width="1" height="1" fill="#f2c14e" />
      <rect x="9" y="1" width="1" height="1" fill="#f2c14e" />
    </svg>
  );
}
function IconCoffee() {
  return (
    <svg viewBox="0 0 10 10" className="h-4 w-4" shapeRendering="crispEdges">
      <rect x="2" y="4" width="6" height="5" fill="#e8d5b5" />
      <rect x="2" y="4" width="6" height="1" fill="#b98d5e" />
      <rect x="8" y="5" width="1" height="2" fill="#e8d5b5" />
      <rect x="1" y="9" width="8" height="1" fill="#c9a86e" />
      <rect x="3" y="2" width="1" height="1" fill="currentColor" />
      <rect x="4" y="1" width="1" height="1" fill="currentColor" />
      <rect x="5" y="2" width="1" height="1" fill="currentColor" />
      <rect x="3" y="6" width="4" height="2" fill="#8a5a34" />
    </svg>
  );
}
function IconHeart() {
  return (
    <svg viewBox="0 0 10 10" className="h-4 w-4" shapeRendering="crispEdges">
      <rect x="2" y="2" width="2" height="2" fill="currentColor" />
      <rect x="6" y="2" width="2" height="2" fill="currentColor" />
      <rect x="2" y="4" width="6" height="2" fill="currentColor" />
      <rect x="3" y="6" width="4" height="1" fill="currentColor" />
      <rect x="4" y="7" width="2" height="1" fill="#c9564a" />
    </svg>
  );
}
function IconMusic() {
  return (
    <svg viewBox="0 0 10 10" className="h-4 w-4" shapeRendering="crispEdges">
      <rect x="3" y="2" width="1" height="6" fill="currentColor" />
      <rect x="7" y="3" width="1" height="5" fill="currentColor" />
      <rect x="3" y="2" width="5" height="1" fill="currentColor" />
      <rect x="1" y="7" width="3" height="2" fill="#f2a33c" />
      <rect x="5" y="8" width="3" height="2" fill="#f2a33c" />
    </svg>
  );
}
function IconSpeaker({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 10 10" className="h-4 w-4" shapeRendering="crispEdges">
      <rect x="1" y="3" width="2" height="4" fill="currentColor" />
      <rect x="3" y="2" width="2" height="6" fill="currentColor" />
      <rect x="5" y="1" width="1" height="8" fill="currentColor" />
      {off ? (
        <>
          <rect x="6" y="3" width="1" height="1" fill="#e26d6d" />
          <rect x="7" y="4" width="1" height="1" fill="#e26d6d" />
          <rect x="8" y="5" width="1" height="1" fill="#e26d6d" />
          <rect x="7" y="6" width="1" height="1" fill="#e26d6d" />
          <rect x="6" y="7" width="1" height="1" fill="#e26d6d" />
          <rect x="8" y="3" width="1" height="1" fill="#e26d6d" />
          <rect x="6" y="5" width="1" height="1" fill="#e26d6d" />
        </>
      ) : (
        <>
          <rect x="7" y="3" width="1" height="4" fill="currentColor" />
          <rect x="8" y="2" width="1" height="6" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

/* ---------- sound dock ---------- */
const LAYERS: Array<{ id: SoundLayer; label: string }> = [
  { id: "rumble", label: "Rails" },
  { id: "rain", label: "Rain" },
  { id: "hum", label: "Café" },
];

export function SoundDock({
  sound,
  onRain,
}: {
  sound: SoundKit;
  onRain: (on: boolean) => void;
}) {
  const [active, setActive] = useState<Set<SoundLayer>>(new Set());
  const [muted, setMuted] = useState(false);

  const toggleLayer = (id: SoundLayer) => {
    const next = new Set(active);
    if (next.has(id)) {
      next.delete(id);
      sound.setLayer(id, false);
      if (id === "rain") onRain(false);
      sound.blip(420);
    } else {
      next.add(id);
      sound.setLayer(id, true);
      if (id === "rain") onRain(true);
      sound.blip(760);
    }
    setActive(next);
  };

  return (
    <div className="px-panel-dark flex items-center gap-1.5 p-1.5">
      <button
        onClick={() => {
          const m = !muted;
          setMuted(m);
          sound.setMuted(m);
        }}
        className={`px-chip flex h-8 w-8 items-center justify-center transition-colors ${
          muted ? "bg-[#3a241a] text-[#e26d6d]" : "bg-[#2b1b14] text-[#f2a33c] hover:bg-[#3a241a]"
        }`}
        title={muted ? "Unmute" : "Mute"}
      >
        <IconSpeaker off={muted} />
      </button>
      <span className="mx-0.5 h-6 w-0.5 bg-[#3a241a]" />
      {LAYERS.map((l) => (
        <button
          key={l.id}
          onClick={() => toggleLayer(l.id)}
          className={`px-chip px-2 py-1.5 font-display text-base leading-none transition-all ${
            active.has(l.id)
              ? "bg-[#f2a33c] text-[#241305] shadow-[inset_0_-2px_0_#b96f1e,0_2px_0_#0d0705]"
              : "bg-[#2b1b14] text-[#a8886a] hover:text-[#e8d5b5]"
          }`}
          title={`Toggle ${l.label.toLowerCase()} ambience`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- emote bar ---------- */
const EMOTES: Array<{ kind: EmoteKind; label: string; icon: () => React.ReactNode; key: string }> = [
  { kind: "wave", label: "Wave", icon: IconWave, key: "G" },
  { kind: "coffee", label: "Sip tea", icon: IconCoffee, key: "" },
  { kind: "heart", label: "Appreciate", icon: IconHeart, key: "" },
  { kind: "music", label: "Hum", icon: IconMusic, key: "" },
];

export function EmoteBar({ onEmote }: { onEmote: (k: EmoteKind) => void }) {
  return (
    <div className="px-panel-dark flex items-center gap-1.5 p-1.5">
      {EMOTES.map((e) => (
        <button
          key={e.kind}
          onClick={() => onEmote(e.kind)}
          title={e.label + (e.key ? ` (${e.key})` : "")}
          className="px-chip flex h-8 w-8 items-center justify-center bg-[#2b1b14] text-[#e8d5b5] transition-all hover:-translate-y-0.5 hover:bg-[#3a241a] hover:text-[#f2a33c] active:translate-y-0"
        >
          <e.icon />
        </button>
      ))}
    </div>
  );
}

/* ---------- presence list ---------- */
export function PresenceList({ hud }: { hud: HudSnapshot }) {
  if (!hud.boarded) return null;
  return (
    <div className="px-panel-dark w-56 p-2.5">
      <div className="flex items-center justify-between">
        <p className="font-display text-lg leading-none text-[#d9a441]">IN CAR 7</p>
        <span className="px-chip bg-[#2b1b14] px-1.5 py-0.5 font-display text-sm leading-none text-[#7fa07a]">
          {hud.passengers.length} aboard
        </span>
      </div>
      <ul className="mt-2 space-y-1">
        {hud.passengers.map((p) => (
          <li key={p.name} className={`flex items-center gap-2 px-1.5 py-1 ${p.isYou ? "bg-[#2b1b14]" : ""}`}>
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span
                className={`h-2.5 w-2.5 border border-[#0d0705] ${p.activity.startsWith("Studying") ? "pulse-dot" : ""}`}
                style={{ background: p.color }}
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className={`font-display truncate text-base leading-none ${p.isYou ? "text-[#ffd489]" : "text-[#e8d5b5]"}`}>
                {p.name}
                {p.isYou && <span className="ml-1 text-[#8a6a4a]">(you)</span>}
              </p>
              <p className="truncate text-[10px] leading-tight text-[#8a6a4a]">{p.activity}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- key legend ---------- */
export function KeysLegend() {
  const Key = ({ k }: { k: string }) => (
    <span className="px-chip inline-block min-w-[22px] bg-[#2b1b14] px-1 py-0.5 text-center font-display text-sm leading-none text-[#e8d5b5]">
      {k}
    </span>
  );
  return (
    <div className="px-panel-dark hidden items-center gap-3 px-3 py-2 md:flex">
      <span className="flex items-center gap-1">
        <Key k="W" />
        <Key k="A" />
        <Key k="S" />
        <Key k="D" />
        <span className="ml-1 text-[10px] uppercase tracking-wider text-[#8a6a4a]">walk</span>
      </span>
      <span className="flex items-center gap-1">
        <Key k="E" />
        <span className="ml-1 text-[10px] uppercase tracking-wider text-[#8a6a4a]">sit / stand</span>
      </span>
      <span className="flex items-center gap-1">
        <Key k="G" />
        <span className="ml-1 text-[10px] uppercase tracking-wider text-[#8a6a4a]">wave</span>
      </span>
    </div>
  );
}

/* ---------- touch controls ---------- */
export function TouchPad({ engine }: { engine: React.RefObject<Engine | null> }) {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
  }, []);
  if (!coarse) return null;

  const hold = (dir: "up" | "down" | "left" | "right") => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      engine.current?.setVirtualKey(dir, true);
    },
    onPointerUp: () => engine.current?.setVirtualKey(dir, false),
    onPointerLeave: () => engine.current?.setVirtualKey(dir, false),
    onPointerCancel: () => engine.current?.setVirtualKey(dir, false),
  });

  const PadBtn = ({ label, dir, className }: { label: string; dir: "up" | "down" | "left" | "right"; className: string }) => (
    <button
      {...hold(dir)}
      className={`px-btn px-btn-ghost absolute h-12 w-12 select-none text-2xl leading-none ${className}`}
      style={{ touchAction: "none" }}
    >
      {label}
    </button>
  );

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex items-end justify-between px-4">
      <div className="pointer-events-auto relative h-[152px] w-[152px]">
        <PadBtn label="▲" dir="up" className="left-[52px] top-0" />
        <PadBtn label="▼" dir="down" className="bottom-0 left-[52px]" />
        <PadBtn label="◀" dir="left" className="left-0 top-[52px]" />
        <PadBtn label="▶" dir="right" className="right-0 top-[52px]" />
      </div>
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            engine.current?.emote("wave");
          }}
          className="px-btn px-btn-dusk h-12 w-12 text-2xl"
          style={{ touchAction: "none" }}
        >
          <span className="flex justify-center"><IconWave /></span>
        </button>
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            engine.current?.virtualAction();
          }}
          className="px-btn h-16 w-16 text-3xl"
          style={{ touchAction: "none" }}
        >
          E
        </button>
      </div>
    </div>
  );
}
