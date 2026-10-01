import { useEffect, useRef, useState } from "react";
import BoardingPass from "./components/BoardingPass";
import PomodoroCard from "./components/PomodoroCard";
import TodoPanel from "./components/TodoPanel";
import { EmoteBar, KeysLegend, PresenceList, SoundDock, TouchPad } from "./components/Dock";
import LobbyBrowser from "./components/LobbyBrowser";
import CreateLobbyModal from "./components/CreateLobbyModal";
import WaitingRoom from "./components/WaitingRoom";
import { SoundKit } from "./game/audio";
import { Engine } from "./game/engine";
import { lobbyManager } from "./game/lobbyManager";
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

// App states
type AppState =
  | { kind: "onboarding" }
  | { kind: "lobby-browser" }
  | { kind: "lobby-create" }
  | { kind: "lobby-waiting"; lobbyId: string }
  | { kind: "in-game" };

/* NES-style pixel train icon */
function TrainMark() {
  return (
    <svg viewBox="0 0 24 16" className="h-8 w-12" shapeRendering="crispEdges" aria-hidden>
      <rect x="1" y="3" width="20" height="9" fill="#14adff" />
      <rect x="1" y="3" width="20" height="2" fill="#67d4ff" />
      <rect x="1" y="10" width="20" height="2" fill="#0c7cb8" />
      <rect x="3" y="5" width="4" height="4" fill="#0f172a" />
      <rect x="9" y="5" width="4" height="4" fill="#0f172a" />
      <rect x="15" y="5" width="4" height="4" fill="#0f172a" />
      <rect x="4" y="6" width="2" height="2" fill="#a3e635" />
      <rect x="10" y="6" width="2" height="2" fill="#a3e635" />
      <rect x="16" y="6" width="2" height="2" fill="#a3e635" />
      <rect x="2" y="12" width="4" height="3" fill="#0f172a" />
      <rect x="16" y="12" width="4" height="3" fill="#0f172a" />
      <rect x="21" y="6" width="2" height="4" fill="#fbbf24" />
      <rect x="0" y="15" width="24" height="1" fill="#020617" />
    </svg>
  );
}

/* Sparkle decoration */
function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={`sparkle ${className}`} shapeRendering="crispEdges" aria-hidden>
      <rect x="5" y="0" width="2" height="12" fill="currentColor" />
      <rect x="0" y="5" width="12" height="2" fill="currentColor" />
      <rect x="2" y="2" width="2" height="2" fill="currentColor" opacity="0.6" />
      <rect x="8" y="2" width="2" height="2" fill="currentColor" opacity="0.6" />
      <rect x="2" y="8" width="2" height="2" fill="currentColor" opacity="0.6" />
      <rect x="8" y="8" width="2" height="2" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

function FlapClock({ clock }: { clock: string }) {
  const chars = clock.split("");
  return (
    <span className="flex items-center gap-[2px]">
      {chars.map((ch, i) =>
        ch === ":" ? (
          <span key={i} className="pulse-dot font-display text-base leading-none text-cyan">
            :
          </span>
        ) : (
          <span key={`${i}-${ch}`} className="nes-flap nes-flap-flip h-7 w-5 text-sm md:h-8 md:w-6 md:text-base">
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
  const [todoOpen, setTodoOpen] = useState(false);
  const [clock, setClock] = useState("--:--");

  // Unified state machine
  const initialAppState = (): AppState => {
    if (!identity) return { kind: "onboarding" };
    // Check if we were in a lobby
    const currentLobby = lobbyManager.getCurrentLobby();
    if (currentLobby) {
      if (currentLobby.status === "in-progress") return { kind: "in-game" };
      return { kind: "lobby-waiting", lobbyId: currentLobby.id };
    }
    return { kind: "lobby-browser" };
  };

  const [appState, setAppState] = useState<AppState>(initialAppState);

  if (!soundRef.current) soundRef.current = new SoundKit();
  const sound = soundRef.current;

  // Initialize engine only when in-game
  useEffect(() => {
    if (appState.kind !== "in-game") {
      // Clean up engine if leaving game
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
      return;
    }

    // Small delay to ensure canvas is mounted
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const engine = new Engine(canvas);
      engineRef.current = engine;
      engine.onHud = setHud;

      // If we have identity, board the player
      if (identity) {
        engine.board(identity).catch((err) => {
          console.error("Failed to board:", err);
        });
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [appState.kind, identity]);

  // Clock
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    };
    tick();
    const iv = window.setInterval(tick, 1000);
    return () => window.clearInterval(iv);
  }, []);

  // ---------- Handlers ----------

  const handleBoard = async (id: Identity) => {
    setIdentity(id);
    try {
      localStorage.setItem(IDENTITY_KEY, JSON.stringify(id));
    } catch {
      /* ignore */
    }
    sound.init();
    sound.chime("focus");

    // If we're in-game, board the engine
    if (appState.kind === "in-game" && engineRef.current) {
      await engineRef.current.board(id);
    } else {
      // Otherwise go to lobby browser
      setAppState({ kind: "lobby-browser" });
    }
  };

  const handleEmote = (k: EmoteKind) => {
    sound.blip(700);
    engineRef.current?.emote(k);
  };

  const handleCreateLobby = () => {
    setAppState({ kind: "lobby-create" });
  };

  const handleLobbyCreated = (lobbyId: string) => {
    setAppState({ kind: "lobby-waiting", lobbyId });
  };

  const handleJoinLobby = (lobbyId: string) => {
    if (!identity) {
      alert("Please create your character first!");
      setAppState({ kind: "onboarding" });
      return;
    }

    const lobby = lobbyManager.getLobby(lobbyId);
    if (!lobby) {
      alert("Lobby not found");
      return;
    }

    const playerName = identity.name;
    const avatar = identity.sweater;

    try {
      lobbyManager.joinLobby(lobbyId, playerName, avatar);
      setAppState({ kind: "lobby-waiting", lobbyId });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to join lobby");
    }
  };

  const handleLeaveLobby = () => {
    lobbyManager.leaveLobby();
    setAppState({ kind: "lobby-browser" });
  };

  const handleStartGame = () => {
    setAppState({ kind: "in-game" });
  };

  const handleBackToLobby = () => {
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
    setAppState({ kind: "lobby-browser" });
  };

  const handleCancelCreate = () => {
    setAppState({ kind: "lobby-browser" });
  };

  // ---------- Render ----------

  const isInGame = appState.kind === "in-game";
  const showGameCanvas = isInGame;

  return (
    <div className="flex h-screen flex-col bg-navy text-cream">
      {/* ---------- header ---------- */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b-4 border-navy bg-slate px-3 shadow-[0_4px_20px_rgba(0,0,0,0.5)] md:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <TrainMark />
          <div className="min-w-0 leading-none">
            <h1 className="flex items-center gap-1.5 truncate font-display text-base font-bold tracking-wide md:text-xl">
              <span className="text-gradient-cyan">NIGHT OWL</span>
              <span className="text-pink">EXPRESS</span>
              <Sparkle className="h-3 w-3 text-amber" />
            </h1>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.28em] text-muted">
              virtual study room · car 7
            </p>
          </div>
        </div>

        {/* ticker */}
        <div className="relative hidden min-w-0 flex-1 overflow-hidden border-4 border-navy bg-navydeep px-0 py-1.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] lg:block">
          <span className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-navy to-transparent" />
          <span className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-navy to-transparent" />
          <div className="marquee-track">
            <span className="flicker pr-8 font-term text-2xl leading-none tracking-wider text-cyan">
              CAR 7 · QUIET STUDY COUPE ✦ NEXT STOP — DEEP WORK ✦ PLEASE KEEP POMODOROS TO A DULL ROAR ✦ WAVE AT YOUR NEIGHBOUR · KEY G ✦ ARRIVAL — WHENEVER YOU'RE DONE ✦{" "}
            </span>
            <span className="flicker pr-8 font-term text-2xl leading-none tracking-wider text-cyan" aria-hidden>
              CAR 7 · QUIET STUDY COUPE ✦ NEXT STOP — DEEP WORK ✦ PLEASE KEEP POMODOROS TO A DULL ROAR ✦ WAVE AT YOUR NEIGHBOUR · KEY G ✦ ARRIVAL — WHENEVER YOU'RE DONE ✦
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          {hud.seated && (
            <span className="nes-chip nes-chip-lime hidden items-center gap-1.5 sm:flex">
              <span className="nes-led nes-led-lime nes-led-blink" />
              FOCUS · {hud.seatLabel}
            </span>
          )}
          <span className="nes-chip hidden sm:block">
            <span className="nes-led nes-led-cyan" />
            {identity ? identity.name.toUpperCase() : "GUEST"}
          </span>
          <FlapClock clock={clock} />
        </div>
      </header>

      {/* ---------- main content ---------- */}
      <main className="relative min-h-0 flex-1 overflow-hidden">
        {/* ONBOARDING: Boarding pass */}
        {appState.kind === "onboarding" && (
          <div className="h-full">
            <BoardingPass initial={identity} onBoard={handleBoard} />
          </div>
        )}

        {/* LOBBY BROWSER */}
        {appState.kind === "lobby-browser" && (
          <div className="h-full">
            <LobbyBrowser onCreateLobby={handleCreateLobby} onJoinLobby={handleJoinLobby} />
          </div>
        )}

        {/* LOBBY CREATE MODAL */}
        {appState.kind === "lobby-create" && (
          <div className="h-full">
            <LobbyBrowser onCreateLobby={handleCreateLobby} onJoinLobby={handleJoinLobby} />
            <CreateLobbyModal onClose={handleCancelCreate} onCreated={handleLobbyCreated} />
          </div>
        )}

        {/* LOBBY WAITING ROOM */}
        {appState.kind === "lobby-waiting" && (
          <div className="h-full">
            <WaitingRoom lobbyId={appState.lobbyId} onStart={handleStartGame} onLeave={handleLeaveLobby} />
          </div>
        )}

        {/* IN-GAME: Train car */}
        {showGameCanvas && (
          <div className="h-full p-2.5 md:p-3.5">
            <div className={`room-frame scanlines relative h-full w-full overflow-hidden bg-navy ${hud.seated ? "focused" : ""}`}>
              <canvas ref={canvasRef} className="absolute inset-0" />

              {/* overlays */}
              <div className={`absolute top-2.5 z-20 transition-all duration-300 md:top-3 ${todoOpen ? "right-[288px]" : "right-2.5 md:right-3"}`}>
                <PomodoroCard sound={sound} hud={hud} />
              </div>

              <div className="absolute bottom-2.5 left-2.5 z-20 hidden sm:block md:bottom-3 md:left-3">
                <PresenceList hud={hud} />
              </div>

              <div className="absolute bottom-2.5 right-2.5 z-20 flex flex-col items-end gap-2 md:bottom-3 md:right-3">
                <EmoteBar onEmote={handleEmote} />
                <SoundDock sound={sound} onRain={(on) => engineRef.current?.setRain(on)} />
              </div>

              <TouchPad engine={engineRef} />

              <TodoPanel sound={sound} open={todoOpen} onToggle={() => setTodoOpen((o) => !o)} />

              {/* Back to lobby button */}
              <button
                onClick={handleBackToLobby}
                className="nes-btn nes-btn-secondary absolute left-2.5 top-2.5 z-30 md:left-3 md:top-3"
              >
                ← LOBBY
              </button>

              {/* Boarding pass overlay if not yet boarded */}
              {!hud.boarded && <BoardingPass initial={identity} onBoard={handleBoard} />}
            </div>
          </div>
        )}
      </main>

      {/* ---------- footer ---------- */}
      <footer className="flex h-11 shrink-0 items-center justify-between gap-4 border-t-4 border-navy bg-slate px-3 md:px-5">
        <KeysLegend />
        <p className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-muted sm:block">
          sprites & sound synthesized in-browser · your manifest never leaves this seat
        </p>
        <p className="flex items-center gap-1.5 font-term text-base leading-none">
          signal: <span className="nes-led nes-led-lime" /> <span className="text-lime">cozy</span>
        </p>
      </footer>
    </div>
  );
}
