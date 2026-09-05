import { useEffect, useRef, useState } from "react";
import type { SoundKit } from "../game/audio";
import type { HudSnapshot } from "../game/types";

const PRESETS = [
  { label: "15/3", focus: 15 * 60, brk: 3 * 60 },
  { label: "25/5", focus: 25 * 60, brk: 5 * 60 },
  { label: "50/10", focus: 50 * 60, brk: 10 * 60 },
];

interface Props {
  sound: SoundKit;
  hud: HudSnapshot;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export default function PomodoroCard({ sound, hud }: Props) {
  const [presetIdx, setPresetIdx] = useState(1);
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [left, setLeft] = useState(PRESETS[1].focus);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef(0);

  const total = phase === "focus" ? PRESETS[presetIdx].focus : PRESETS[presetIdx].brk;

  useEffect(() => {
    if (!running) return;
    const iv = window.setInterval(() => {
      setLeft((s) => {
        if (s > 1) return s - 1;
        // phase transition
        setPhase((ph) => {
          const next = ph === "focus" ? "break" : "focus";
          if (next === "break") {
            setSessions((n) => n + 1);
            sound.chime("break");
            setToast("Break time — stretch your legs");
          } else {
            sound.chime("focus");
            setToast("Back to it. Deep focus!");
          }
          window.clearTimeout(toastTimer.current);
          toastTimer.current = window.setTimeout(() => setToast(null), 2600);
          setLeft(next === "focus" ? PRESETS[presetIdx].focus : PRESETS[presetIdx].brk);
          return next;
        });
        return s;
      });
    }, 1000);
    return () => window.clearInterval(iv);
  }, [running, presetIdx, sound]);

  const switchPreset = (i: number) => {
    setPresetIdx(i);
    setPhase("focus");
    setLeft(PRESETS[i].focus);
    setRunning(false);
    sound.blip(660);
  };

  const toggle = () => {
    if (!running) sound.blip(880);
    setRunning((r) => !r);
  };

  const skip = () => {
    const next = phase === "focus" ? "break" : "focus";
    setPhase(next);
    setLeft(next === "focus" ? PRESETS[presetIdx].focus : PRESETS[presetIdx].brk);
    sound.blip(520);
  };

  const reset = () => {
    setPhase("focus");
    setLeft(PRESETS[presetIdx].focus);
    setRunning(false);
    sound.blip(440);
  };

  const pct = 1 - left / total;
  const ring = 2 * Math.PI * 26;
  const isFocus = phase === "focus";

  return (
    <div className="px-panel w-60 select-none p-3">
      <div className="flex items-center justify-between">
        <span className="font-display text-lg leading-none text-[#d9a441]">POMODORO</span>
        <div className="flex gap-1">
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => switchPreset(i)}
              className={`px-chip px-1.5 py-0.5 text-sm leading-none transition-colors ${
                i === presetIdx ? "bg-[#f2a33c] text-[#241305]" : "bg-[#2b1b14] text-[#a8886a] hover:text-[#e8d5b5]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3">
        {/* ring */}
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 60 60" className="h-16 w-16 -rotate-90">
            <circle cx="30" cy="30" r="26" fill="none" stroke="#170d09" strokeWidth="7" />
            <circle
              cx="30"
              cy="30"
              r="26"
              fill="none"
              stroke={isFocus ? "#f2a33c" : "#7fa07a"}
              strokeWidth="7"
              strokeDasharray={ring}
              strokeDashoffset={ring * (1 - pct)}
              style={{ transition: "stroke-dashoffset 1s linear, stroke 400ms ease" }}
            />
          </svg>
          <div
            className={`absolute inset-3 flex items-center justify-center border-2 border-[#0d0705] ${
              isFocus ? "bg-[#3a241a]" : "bg-[#2c3a2c]"
            }`}
          >
            <span className="font-display text-sm leading-none" style={{ color: isFocus ? "#f2a33c" : "#7fa07a" }}>
              {isFocus ? "FOCUS" : "BREAK"}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-display text-[42px] leading-none tracking-wide text-[#f4e7d3] tabular-nums">{fmt(left)}</div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.16em] text-[#a8886a]">sessions</span>
            <span className="flex gap-0.5">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="inline-block h-2 w-2 border border-[#0d0705]"
                  style={{ background: i < sessions % 4 || (sessions > 0 && sessions % 4 === 0 && i < 4 && sessions % 8 === 0) ? "#f2a33c" : "#2b1b14" }}
                />
              ))}
            </span>
            <span className="font-display ml-1 text-base leading-none text-[#d9a441]">×{sessions}</span>
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex gap-1.5">
        <button onClick={toggle} className={`px-btn flex-1 py-1 text-xl ${running ? "px-btn-ghost" : ""}`}>
          {running ? "❚❚ PAUSE" : "▶ START"}
        </button>
        <button onClick={skip} className="px-btn px-btn-dusk px-2 py-1 text-xl" title="Skip phase">
          »
        </button>
        <button onClick={reset} className="px-btn px-btn-ghost px-2 py-1 text-xl" title="Reset">
          ↺
        </button>
      </div>

      {/* study status */}
      <div className="px-inset mt-2.5 px-2 py-1.5">
        {hud.seated ? (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="pulse-dot absolute h-2 w-2 bg-[#f2a33c]" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-base leading-tight text-[#f2a33c]">FOCUS MODE · {hud.seatLabel}</p>
              {hud.partnerName ? (
                <p className="truncate text-[10px] text-[#a8886a]">
                  Studying with {hud.partnerName}
                  {hud.partnerFocusLeft !== null && ` · booth focus ${fmt(hud.partnerFocusLeft)}`}
                </p>
              ) : (
                <p className="text-[10px] text-[#a8886a]">The booth is all yours</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[10px] leading-snug text-[#8a6a4a]">
            {hud.boarded ? "Take a booth seat to enter focus mode — press E near a free chair." : "Preparing the car…"}
          </p>
        )}
      </div>

      {toast && (
        <div className="toast-pop pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap border-2 border-[#0d0705] bg-[#f2a33c] px-3 py-1 font-display text-base text-[#241305] shadow-[0_3px_0_#0d0705]">
          {toast}
        </div>
      )}
    </div>
  );
}
