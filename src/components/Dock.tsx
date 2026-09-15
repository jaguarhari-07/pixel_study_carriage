import { useMemo, useState, type RefObject } from "react";
import type { Engine } from "../game/engine";
import type { SoundKit } from "../game/audio";
import type { EmoteKind, HudSnapshot } from "../game/types";
import { getIcon } from "../game/sprites";

/* ---------------- sound console ---------------- */

const LAYERS = [
  { id: "rumble" as const, label: "RAILS", desc: "track rumble" },
  { id: "rain" as const, label: "RAIN", desc: "on the roof" },
  { id: "hum" as const, label: "CAFÉ", desc: "distant hum" },
];

export function SoundDock({ sound, onRain }: { sound: SoundKit; onRain: (on: boolean) => void }) {
  const [on, setOn] = useState({ rumble: false, rain: false, hum: false });
  const [muted, setMuted] = useState(false);

  const flip = (id: "rumble" | "rain" | "hum") => {
    sound.init();
    const next = !on[id];
    setOn((o) => ({ ...o, [id]: next }));
    sound.setLayer(id, next);
    if (id === "rain") onRain(next);
    sound.blip(next ? 840 : 420);
  };
  const mute = () => {
    sound.init();
    const next = !muted;
    setMuted(next);
    sound.setMuted(next);
    if (!next) sound.blip(660);
  };

  return (
    <div className="nes-card-dark flex items-center gap-2 p-2">
      <span className="hidden pl-1 font-display text-[9px] font-bold tracking-widest text-faded md:block" style={{ writingMode: "vertical-rl" }}>
        AMBIENCE
      </span>
      {LAYERS.map((l) => (
        <button key={l.id} onClick={() => flip(l.id)} className="console-switch flex flex-col items-center gap-1 px-1.5 py-1" title={l.desc}>
          <span className={`nes-led ${on[l.id] ? (l.id === "rain" ? "nes-led-lime" : "nes-led-cyan") : ""} ${on[l.id] ? "nes-led-blink" : ""}`} />
          <span className={`font-term text-base leading-none ${on[l.id] ? "text-cyan" : "text-faded"}`}>{l.label}</span>
          {/* chunky rocker */}
          <span className={`h-3.5 w-6 border-2 border-navy ${on[l.id] ? "bg-pink" : "bg-navydeep"}`}>
            <span className={`block h-1.5 w-2 bg-navy/50 ${on[l.id] ? "ml-2" : "ml-0"}`} />
          </span>
        </button>
      ))}
      <button onClick={mute} className="console-switch ml-1 flex flex-col items-center gap-1 border-l-4 border-navy px-2 py-1" title="Master mute">
        <span className={`nes-led ${muted ? "nes-led-pink" : ""}`} />
        <span className={`font-term text-base leading-none ${muted ? "text-pink" : "text-faded"}`}>
          {muted ? "MUTED" : "SOUND"}
        </span>
        <span className={`h-3.5 w-6 border-2 border-navy ${muted ? "bg-signal" : "bg-lime"}`} />
      </button>
    </div>
  );
}

/* ---------------- emote keycaps ---------------- */

const EMOTES: Array<{ kind: EmoteKind; key: string; label: string }> = [
  { kind: "wave", key: "G", label: "Wave" },
  { kind: "coffee", key: "1", label: "Tea" },
  { kind: "heart", key: "2", label: "Heart" },
  { kind: "music", key: "3", label: "Hum" },
];

export function EmoteBar({ onEmote }: { onEmote: (k: EmoteKind) => void }) {
  const icons = useMemo(() => {
    const m = new Map<EmoteKind, string>();
    for (const e of EMOTES) m.set(e.kind, getIcon(e.kind).toDataURL());
    return m;
  }, []);
  return (
    <div className="nes-card-dark flex items-center gap-1.5 p-1.5">
      {EMOTES.map((e) => (
        <button
          key={e.kind}
          onClick={() => onEmote(e.kind)}
          title={`${e.label} (${e.key})`}
          className="console-switch relative flex h-10 w-10 flex-col items-center justify-center border-4 border-navy bg-slatehi shadow-[inset_-4px_-4px_0_0_#0f172a,inset_4px_4px_0_0_#475569,0_0_0_4px_#020617]"
        >
          <img src={icons.get(e.kind)} alt={e.label} className="h-5 w-5 [image-rendering:pixelated]" />
          <span className="absolute right-0 top-0 border-2 border-navy bg-navy px-0.5 font-term text-[11px] leading-tight text-cyan">{e.key}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------------- presence board ---------------- */

function MiniAvatar({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 8 8" className="h-4 w-4 shrink-0 border-2 border-navy" shapeRendering="crispEdges" style={{ background: "#0f172a" }}>
      <rect x="2" y="0" width="4" height="3" fill="#e0b088" />
      <rect x="2" y="0" width="4" height="1" fill="#3a2a24" />
      <rect x="1" y="3" width="6" height="4" fill={color} />
      <rect x="2" y="7" width="1" height="1" fill="#241a16" />
      <rect x="5" y="7" width="1" height="1" fill="#241a16" />
      <rect x="3" y="1" width="1" height="1" fill="#1d130f" />
      <rect x="5" y="1" width="1" height="1" fill="#1d130f" />
    </svg>
  );
}

export function PresenceList({ hud }: { hud: HudSnapshot }) {
  return (
    <div className="nes-card-dark max-w-[240px] p-2">
      <div className="flex items-center justify-between">
        <p className="font-display text-[9px] font-bold tracking-widest text-faded">PASSENGERS</p>
        <span className="nes-chip nes-chip-cyan">{hud.passengers.length}</span>
      </div>
      <ul className="mt-1.5 space-y-1">
        {hud.passengers.slice(0, 6).map((p) => {
          const studying = p.activity.toLowerCase().includes("stud");
          return (
            <li key={p.name} className={`flex items-center gap-2 border-2 border-transparent px-1 py-0.5 ${p.isYou ? "border-navy bg-slate" : ""}`}>
              <MiniAvatar color={p.color} />
              <span className={`min-w-0 flex-1 truncate font-term text-base leading-tight ${p.isYou ? "text-cyan" : "text-cream"}`}>
                {p.name}
                {p.isYou ? " (you)" : ""}
              </span>
              <span className="flex items-center gap-1">
                <span className={`nes-led ${studying ? "nes-led-cyan" : ""}`} />
                <span className="hidden w-16 truncate text-right font-term text-[13px] leading-none text-faded sm:block">{p.activity}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------------- key legend ---------------- */

export function KeysLegend() {
  const Key = ({ k }: { k: string }) => <span className="nes-key">{k}</span>;
  return (
    <div className="flex items-center gap-3 font-term text-base leading-none text-faded">
      <span className="flex items-center gap-1">
        <Key k="W" />
        <Key k="A" />
        <Key k="S" />
        <Key k="D" />
        <span className="ml-1 hidden sm:inline">wander</span>
      </span>
      <span className="flex items-center gap-1">
        <Key k="E" /> sit / stand
      </span>
      <span className="hidden items-center gap-1 md:flex">
        <Key k="G" /> wave
      </span>
    </div>
  );
}

/* ---------------- touch pad ---------------- */

export function TouchPad({ engine }: { engine: RefObject<Engine | null> }) {
  const [active, setActive] = useState(false);
  const hold = (dir: "up" | "down" | "left" | "right", down: boolean) => {
    engine.current?.setVirtualKey(dir, down);
    setActive(down);
  };
  const PadBtn = ({ dir, label, className }: { dir: "up" | "down" | "left" | "right"; label: string; className?: string }) => (
    <button
      className={`nes-btn nes-btn-secondary flex h-11 w-11 items-center justify-center text-xl leading-none ${className ?? ""}`}
      onPointerDown={(e) => {
        e.preventDefault();
        hold(dir, true);
      }}
      onPointerUp={() => hold(dir, false)}
      onPointerLeave={() => hold(dir, false)}
      onPointerCancel={() => hold(dir, false)}
      aria-label={`Move ${dir}`}
    >
      {label}
    </button>
  );
  return (
    <div className={`absolute bottom-3 left-3 z-20 flex items-end gap-3 sm:hidden ${active ? "opacity-90" : "opacity-70"}`}>
      <div className="grid grid-cols-3 gap-1">
        <span />
        <PadBtn dir="up" label="▲" />
        <span />
        <PadBtn dir="left" label="◀" />
        <PadBtn dir="down" label="▼" />
        <PadBtn dir="right" label="▶" />
      </div>
      <button
        className="nes-btn nes-btn-accent h-14 w-14 font-term text-xl leading-none"
        onPointerDown={(e) => {
          e.preventDefault();
          engine.current?.virtualAction();
        }}
      >
        E
      </button>
    </div>
  );
}
