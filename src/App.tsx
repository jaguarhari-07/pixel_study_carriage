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

const TICKER = [
  "CAR 7 · QUIET STUDY COUPE",
  "NEXT STOP — DEEP WORK",
  "PLEASE KEEP POMODOROS TO A DULL ROAR",
  "TEA & PASTRIES AT THE EAST CART",
  "WAVE AT YOUR NEIGHBOUR · KEY G",
  "ARRIVAL — WHENEVER YOU'RE DONE",
];

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
      <rect x="0" y="15" width="24" height="1" fill="#0d0705" />
    </svg>
  );
}

function FlapClock({ clock }: { clock: string }) {
  const chars = clock.split("");
  return (
    <span className="flex items-center gap-[2px]">
      {chars.map((ch, i) =>
        ch === ":" ? (
          <span key={i} className="pulse-dot font-display text-base leading-none text-amberglow">
            :
          </span>
        ) : (
          <span key={`${i}-${ch}`} className="flap flap-flip h-7 w-5 text-sm md:h-8 md:w-6 md:text-base">
            {ch}
          </span>
        )
      )}
    </span>
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
    const tick = () => {
      const d = new Date();
      setClock(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    };
    tick();
    const iv = window.setInterval(tick, 1000);
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
    sound.chime("focus");
    engineRef.current?.board(id);
    setBoarded(true);
  };

  const handleEmote = (k: EmoteKind) => {
    sound.blip(700);
    engineRef.current?.emote(k);
  };

  const tickerLine = TICKER.join("  ✦  ");

  return (
    <div className="flex h-screen flex-col bg-coal text-creamsoda">
      {/* ---------- departure board header ---------- */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b-[3px] border-black bg-walnut px-3 shadow-[0_4px_18px_rgba(0,0,0,0.5)] md:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <TrainMark />
          <div className="min-w-0 leading-none">
            <h1 className="truncate font-display text-base font-bold tracking-wide text-amberglow md:text-xl">
              NIGHT OWL <span className="text-amberhi">EXPRESS</span>
            </h1>
            <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.28em] text-fadedink">virtual study room · car 7</p>
          </div>
        </div>

        {/* ticker */}
        <div className="relative hidden min-w-0 flex-1 overflow-hidden border-2 border-black bg-[#140b07] px-0 py-1.5 shadow-[inset_0_2px_6px_rgba(0,0,0,0.8)] lg:block">
          <span className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[#140b07] to-transparent" />
          <span className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[#140b07] to-transparent" />
          <div className="marquee-track">
            <span className="flicker pr-8 font-term text-2xl leading-none tracking-wider text-amberhi">{tickerLine}  ✦  </span>
            <span className="flicker pr-8 font-term text-2xl leading-none tracking-wider text-amberhi" aria-hidden>
              {tickerLine}  ✦
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          {hud.seated && (
            <span className="px-chip hidden items-center gap-1.5 bg-[#3a4a2c] px-2 py-1.5 sm:flex">
              <span className="led led-on-amber led-blink" />
              <span className="font-display text-[10px] font-bold tracking-wider text-moss">FOCUS · {hud.seatLabel}</span>
            </span>
          )}
          <span className="px-chip hidden bg-[#2b1b14] px-2 py-1.5 sm:block">
            <span className="font-display text-[10px] font-bold tracking-wider text-parchment">
              {hud.boarded ? `${hud.passengers.length} ABOARD` : "BOARDING…"}
            </span>
          </span>
          <FlapClock clock={clock} />
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
      <footer className="flex h-11 shrink-0 items-center justify-between gap-4 border-t-[3px] border-black bg-walnut px-3 md:px-5">
        <KeysLegend />
        <p className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a6a4a] sm:block">
          sprites &amp; sound synthesized in-browser · your manifest never leaves this seat
        </p>
        <p className="flex items-center gap-1.5 font-term text-base leading-none text-fadedink">
          signal: <span className="led led-on-moss" /> <span className="text-moss">cozy</span>
        </p>
      </footer>
    </div>
  );
}
