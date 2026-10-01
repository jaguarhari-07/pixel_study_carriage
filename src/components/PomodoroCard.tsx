import { useEffect, useMemo, useRef, useState } from "react";
import type { SoundKit } from "../game/audio";
import type { HudSnapshot } from "../game/types";

const PRESETS = [
  { id: "short", label: "15 / 3", f: 15, b: 3 },
  { id: "classic", label: "25 / 5", f: 25, b: 5 },
  { id: "deep", label: "50 / 10", f: 50, b: 10 },
];

function mmss(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}${String(s).padStart(2, "0")}`;
}

/* one split-flap tile */
function Tile({ ch, w }: { ch: string; w?: string }) {
  return (
    <span key={ch} className={`nes-flap nes-flap-flip ${w ?? "h-9 w-7 text-xl md:h-10 md:w-8 md:text-2xl"}`}>
      {ch}
    </span>
  );
}

/* NES-style pixel icons */
function BookIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 10 10" className={`h-4 w-4 ${className}`} shapeRendering="crispEdges">
      <rect x="1" y="2" width="8" height="6" fill="#0f172a" />
      <rect x="1" y="2" width="3" height="5" fill="#f8fafc" />
      <rect x="6" y="2" width="3" height="5" fill="#e2e8f0" />
      <rect x="4" y="2" width="2" height="5" fill="#0f172a" />
      <rect x="2" y="3" width="1" height="2" fill="#94a3b8" />
      <rect x="7" y="4" width="1" height="2" fill="#94a3b8" />
    </svg>
  );
}

export default function PomodoroCard({ sound, hud }: { sound: SoundKit; hud: HudSnapshot }) {
  const [presetId, setPresetId] = useState("classic");
  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[1];
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [left, setLeft] = useState(preset.f * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const audioRef = useRef(sound);
  audioRef.current = sound;

  useEffect(() => {
    if (!running) return;
    const iv = window.setInterval(() => {
      setLeft((l) => {
        if (l > 1) return l - 1;
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(iv);
  }, [running]);

  useEffect(() => {
    if (left !== 0 || !running) return;
    if (phase === "focus") {
      setSessions((s) => s + 1);
      setPhase("break");
      setLeft(preset.b * 60);
      audioRef.current.chime("break");
    } else {
      setPhase("focus");
      setLeft(preset.f * 60);
      audioRef.current.chime("focus");
    }
  }, [left, running, phase, preset]);

  const pick = (id: string) => {
    const p = PRESETS.find((x) => x.id === id)!;
    setPresetId(id);
    setPhase("focus");
    setLeft(p.f * 60);
    setRunning(false);
    sound.blip(620);
  };

  const toggle = () => {
    sound.blip(running ? 440 : 880);
    setRunning((r) => !r);
  };
  const reset = () => {
    sound.blip(330);
    setRunning(false);
    setPhase("focus");
    setLeft(preset.f * 60);
  };

  const total = (phase === "focus" ? preset.f : preset.b) * 60;
  const pct = Math.round(((total - left) / total) * 100);
  const digits = mmss(left);

  const boothLine = useMemo(() => {
    if (!hud.seated) return null;
    if (hud.partnerName && hud.partnerFocusLeft != null) {
      return `shared cycle w/ ${hud.partnerName} · ${mmss(Math.max(0, hud.partnerFocusLeft))}`;
    }
    return `booth ${hud.seatLabel ?? "—"} · ride solo, ring the bell`;
  }, [hud]);

  return (
    <div className="nes-card w-[248px] p-3 md:w-[268px]">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookIcon className="text-cyan" />
          <p className="font-display text-[10px] font-bold tracking-widest text-faded">FOCUS LINE</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className={`nes-led ${phase === "focus" && running ? "nes-led-pink nes-led-blink" : ""}`} />
            <span className="font-term text-sm leading-none text-muted">FOC</span>
          </span>
          <span className="flex items-center gap-1">
            <span className={`nes-led ${phase === "break" && running ? "nes-led-lime nes-led-blink" : ""}`} />
            <span className="font-term text-sm leading-none text-muted">BRK</span>
          </span>
        </div>
      </div>

      {/* split-flap time */}
      <div className="mt-2.5 flex items-center justify-center gap-[3px]">
        <Tile ch={digits[0]} />
        <Tile ch={digits[1]} />
        <span className={`font-display text-lg ${running ? "pulse-dot text-cyan" : "text-muted"}`}>:</span>
        <Tile ch={digits[2]} />
        <Tile ch={digits[3]} />
      </div>

      {/* departure-board status line */}
      <p className="mt-2 truncate border-4 border-navy bg-navy px-2 py-1 text-center font-term text-lg leading-none tracking-wider">
        <span className={phase === "focus" ? "text-pink" : "text-lime"}>
          {running ? (phase === "focus" ? "NOW DEPARTING · FOCUS" : "NOW DEPARTING · BREAK") : phase === "focus" ? "HELD AT PLATFORM · READY" : "HELD · BREAK READY"}
        </span>
        <span className="pulse-dot text-cyan">▮</span>
      </p>

      {/* route progress */}
      <div className="mt-2.5 px-0.5">
        <div className="relative h-[10px] border-4 border-navy bg-navy">
          <div
            className={`absolute inset-y-0 left-0 transition-all duration-500 ${phase === "focus" ? "bg-pink" : "bg-lime"}`}
            style={{ width: `${pct}%` }}
          />
          {[25, 50, 75].map((t) => (
            <span key={t} className="absolute top-0 h-full w-[2px] bg-navy" style={{ left: `${t}%` }} />
          ))}
        </div>
        <div className="mt-1 flex items-center justify-between font-term text-sm leading-none">
          <span className="text-faded">{pct}% of leg</span>
          <span className="text-cyan">{sessions} ride{sessions === 1 ? "" : "s"} done</span>
        </div>
      </div>

      {/* booth shared-cycle note */}
      {boothLine && (
        <p className="mt-2 border-t-4 border-dashed border-navy pt-1.5 font-term text-base leading-tight text-purple">
          ◆ {boothLine}
        </p>
      )}

      {/* controls */}
      <div className="mt-2.5 flex gap-2">
        <button onClick={toggle} className={`nes-btn flex-1 ${running ? "nes-btn-secondary" : "nes-btn-primary"}`}>
          {running ? "❚❚ HOLD" : "▸ START"}
        </button>
        <button onClick={reset} className="nes-btn nes-btn-secondary">
          ↺
        </button>
      </div>
      <div className="mt-2 flex gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => pick(p.id)}
            className={`nes-btn flex-1 ${presetId === p.id ? "nes-btn-lime" : "nes-btn-secondary"}`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
