import { useEffect, useRef, useState } from "react";
import BoardingPass from "./components/BoardingPass";
import PomodoroCard from "./components/PomodoroCard";
import TodoPanel from "./components/TodoPanel";
import { EmoteBar, KeysLegend, PresenceList, SoundDock, TouchPad } from "./components/Dock";
import { SoundKit } from "./game/audio";
import { Engine } from "./game/engine";
import type { EmoteKind, HudSnapshot, Identity } from "./game/types";

const IDENTITY_KEY = "nightowl.identity.v1";

const EMPTY_HUD: HudSnapshot = {
  boarded: false,
  seated: false,
  seatLabel: null,
  partnerName: null,
  partnerFocusLeft: null,
  passengers: [],
  nearSeatId: null,
};

function loadIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (raw) return JSON.parse(raw) as Identity;
  } catch {
    /* ignore */
  }
  return null;
}

function TrainMark() {
  return (
    <svg viewBox="0 0 24 16" className="h-8 w-12" shapeRendering="crispEdges" aria-hidden>
      <rect x="1" y="3" width="20" height="9" fill="#f2a33c" />
      <rect x="1" y="3" width="20" height="2" fill="#ffd489" />
      <rect x="1" y="10" width="20" height="2" fill="#b96f1e" />
      <rect x="3" y="5" width="4" height="4" fill="#31404e" />
      <rect x="9" y="5" width="4" height="4" fill="#31404e" />
      <rect x="15" y="5" width="4" height="4" fill="#31404e" />
      <rect x="4" y="6" width="2" height="2" fill="#7f95b5" />
      <rect x="10" y="6" width="2" height="2" fill="#7f95b5" />
      <rect x="16" y="6" width="2" height="2" fill="#7f95b5" />
      <rect x="2" y="12" width="4" height="3" fill="#3a241a" />
      <rect x="16" y="12" width="4" height="3" fill="#3a241a" />
      <rect x="21" y="6" width="2" height="4" fill="#d9a441" />
      <rect x="0" y="15" width="24" height="1" fill="#241a16" />
    </svg>
  );
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const soundRef = useRef<SoundKit | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(EMPTY_HUD);
  const [identity, setIdentity] = useState<Identity | null>(loadIdentity);
  const [boarded, setBoarded] = useState(false);
  const [todoOpen, setTodoOpen] = useState(false);
  const [clock, setClock] = useState("--:--");

  if (!soundRef.current) soundRef.current = new SoundKit();
  const sound = soundRef.current;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new Engine(canvas);
    engineRef.current = engine;
    engine.onHud = setHud;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const iv = window.setInterval(() => {
      const d = new Date();
      setClock(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    }, 1000);
    return () => window.clearInterval(iv);
  }, []);

  const handleBoard = (id: Identity) => {
    setIdentity(id);
    try {
      localStorage.setItem(IDENTITY_KEY, JSON.stringify(id));
    } catch {
      /* ignore */
    }
    sound.init();
    sound.blip(880);
    engineRef.current?.board(id);
    setBoarded(true);
  };

  const handleEmote = (k: EmoteKind) => {
    sound.blip(700);
    engineRef.current?.emote(k);
  };

  return (
    <div className="flex h-screen flex-col bg-coal text-creamsoda" style={{ fontFamily: "var(--font-body)" }}>
      {/* ---------- departure board header ---------- */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b-2 border-[#0d0705] bg-walnut px-3 md:px-5">
        <div className="flex items-center gap-2.5">
          <TrainMark />
          <div className="leading-none">
            <h1 className="font-display text-2xl leading-none text-amberglow md:text-3xl">NIGHT OWL EXPRESS</h1>
            <p className="mt-0.5 text-[9px] uppercase tracking-[0.28em] text-[#a8886a]">virtual study room · est. tonight</p>
          </div>
        </div>

        <div className="px-panel-dark hidden flex-1 items-center justify-center gap-3 px-4 py-1.5 lg:flex">
          <span className="h-2 w-2 bg-moss pulse-dot" />
          <p className="flicker marquee-glow font-display truncate text-2xl leading-none text-amberglow">
            CAR 7 · QUIET STUDY · NEXT STOP — FOCUS
          </p>
          <span className="h-2 w-2 bg-moss pulse-dot" />
        </div>

        <div className="flex items-center gap-2.5">
          {hud.seated && (
            <span className="px-chip hidden items-center gap-1.5 bg-[#3a4a2c] px-2 py-1 font-display text-base leading-none text-moss sm:flex">
              <svg viewBox="0 0 10 10" className="h-3 w-3" shapeRendering="crispEdges">
                <rect x="1" y="2" width="8" height="6" fill="currentColor" />
                <rect x="4" y="2" width="1" height="6" fill="#140d0a" />
              </svg>
              FOCUS MODE · {hud.seatLabel}
            </span>
          )}
          <span className="px-chip bg-[#2b1b14] px-2 py-1 font-display text-lg leading-none text-parchment">
            {hud.boarded ? `${hud.passengers.length} aboard` : "boarding…"}
          </span>
          <span className="px-chip bg-[#170d09] px-2 py-1 font-display text-2xl leading-none text-amberglow tabular-nums">{clock}</span>
        </div>
      </header>

      {/* ---------- the car ---------- */}
      <main className="relative min-h-0 flex-1 p-2.5 md:p-3.5">
        <div className={`room-frame scanlines relative h-full w-full overflow-hidden bg-coal ${hud.seated ? "focused" : ""}`}>
          <canvas ref={canvasRef} className="absolute inset-0" />

          {/* overlays */}
          <div className={`absolute top-2.5 z-20 transition-all duration-300 md:top-3 ${todoOpen ? "right-[288px]" : "right-2.5 md:right-3"}`}>
            {boarded && <PomodoroCard sound={sound} hud={hud} />}
          </div>

          <div className="absolute bottom-2.5 left-2.5 z-20 hidden sm:block md:bottom-3 md:left-3">
            <PresenceList hud={hud} />
          </div>

          <div className="absolute bottom-2.5 right-2.5 z-20 flex flex-col items-end gap-2 md:bottom-3 md:right-3">
            {boarded && (
              <>
                <EmoteBar onEmote={handleEmote} />
                <SoundDock sound={sound} onRain={(on) => engineRef.current?.setRain(on)} />
              </>
            )}
          </div>

          {boarded && <TouchPad engine={engineRef} />}

          <TodoPanel sound={sound} open={todoOpen} onToggle={() => setTodoOpen((o) => !o)} />

          {/* boarding ticket */}
          {!boarded && <BoardingPass initial={identity} onBoard={handleBoard} />}
        </div>
      </main>

      {/* ---------- platform strip ---------- */}
      <footer className="flex h-11 shrink-0 items-center justify-between gap-4 border-t-2 border-[#0d0705] bg-walnut px-3 md:px-5">
        <KeysLegend />
        <p className="hidden text-[10px] uppercase tracking-[0.2em] text-[#8a6a4a] sm:block">
          sprites &amp; sound synthesized in-browser · your to-dos never leave this seat
        </p>
        <p className="font-display text-base leading-none text-[#a8886a]">
          signal: <span className="text-moss">cozy ●</span>
        </p>
      </footer>
    </div>
  );
}
