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

/* one split-flap tile; remounts (and flips) only when its character changes */
function Tile({ ch, w }: { ch: string; w?: string }) {
  return (
    <span key={ch} className={`flap flap-flip ${w ?? "h-9 w-7 text-xl md:h-10 md:w-8 md:text-2xl"}`}>
      {ch}
    </span>
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

  // phase transition
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
    <div className="px-panel-dark w-[248px] p-3 md:w-[268px]">
      {/* header */}
      <div className="flex items-center justify-between">
        <p className="font-display text-[10px] font-bold tracking-widest text-fadedink">FOCUS LINE</p>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className={`led ${phase === "focus" && running ? "led-on-signal led-blink" : ""}`} />
            <span className="font-term text-sm leading-none text-[#a8886a]">FOC</span>
          </span>
          <span className="flex items-center gap-1">
            <span className={`led ${phase === "break" && running ? "led-on-moss led-blink" : ""}`} />
            <span className="font-term text-sm leading-none text-[#a8886a]">BRK</span>
          </span>
        </div>
      </div>

      {/* split-flap time */}
      <div className="mt-2.5 flex items-center justify-center gap-[3px]">
        <Tile ch={digits[0]} />
        <Tile ch={digits[1]} />
        <span className={`font-display text-lg text-amberglow ${running ? "pulse-dot" : ""}`}>:</span>
        <Tile ch={digits[2]} />
        <Tile ch={digits[3]} />
      </div>

      {/* departure-board status line */}
      <p className="mt-2 truncate border-2 border-black bg-coal px-2 py-1 text-center font-term text-lg leading-none tracking-wider">
        <span className={phase === "focus" ? "text-signalred" : "text-moss"}>
          {running ? (phase === "focus" ? "NOW DEPARTING · FOCUS" : "NOW DEPARTING · BREAK") : phase === "focus" ? "HELD AT PLATFORM · READY" : "HELD · BREAK READY"}
        </span>
        <span className="pulse-dot text-amberhi">▮</span>
      </p>

      {/* route progress */}
      <div className="mt-2.5 px-0.5">
        <div className="relative h-[10px] border-2 border-black bg-coal">
          <div
            className={`absolute inset-y-0 left-0 transition-all duration-500 ${phase === "focus" ? "bg-[#e0763c]" : "bg-[#5d8a5e]"}`}
            style={{ width: `${pct}%` }}
          />
          {/* station ticks */}
          {[25, 50, 75].map((t) => (
            <span key={t} className="absolute top-0 h-full w-[2px] bg-black/60" style={{ left: `${t}%` }} />
          ))}
        </div>
        <div className="mt-1 flex items-center justify-between font-term text-sm leading-none text-fadedink">
          <span>{pct}% of leg</span>
          <span className="text-amberglow">{sessions} ride{sessions === 1 ? "" : "s"} done</span>
        </div>
      </div>

      {/* booth shared-cycle note */}
      {boothLine && (
        <p className="mt-2 border-t-2 border-dashed border-[#3a241a] pt-1.5 font-term text-base leading-tight text-duskblue">
          ◆ {boothLine}
        </p>
      )}

      {/* controls */}
      <div className="mt-2.5 flex gap-2">
        <button onClick={toggle} className="px-btn flex-1 bg-[#e0763c] py-1.5 text-xl leading-none text-[#fff3e0]">
          {running ? "❚❚ HOLD" : "▸ START"}
        </button>
        <button onClick={reset} className="px-btn bg-[#3a241a] px-3 py-1.5 text-xl leading-none text-parchment">
          ↺
        </button>
      </div>
      <div className="mt-2 flex gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => pick(p.id)}
            className={`px-btn flex-1 py-1 text-base leading-none ${
              presetId === p.id ? "bg-[#f2a33c] text-coal" : "bg-[#2c1b12] text-fadedink"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
