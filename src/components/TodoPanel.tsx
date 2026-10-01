import { useEffect, useMemo, useState } from "react";
import type { SoundKit } from "../game/audio";

const KEY = "nightowl.manifest.v1";

interface Task {
  id: number;
  text: string;
  done: boolean;
}

const SEED: Task[] = [
  { id: 1, text: "open the reading", done: true },
  { id: 2, text: "one pomodoro, no phone", done: false },
  { id: 3, text: "wave at a stranger (G)", done: false },
];

function load(): Task[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Task[];
  } catch {
    /* ignore */
  }
  return SEED;
}

export default function TodoPanel({ sound, open, onToggle }: { sound: SoundKit; open: boolean; onToggle: () => void }) {
  const [tasks, setTasks] = useState<Task[]>(load);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(tasks));
    } catch {
      /* ignore */
    }
  }, [tasks]);

  const doneCount = tasks.filter((t) => t.done).length;
  const stops = Math.max(tasks.length, 1);

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setTasks((ts) => [...ts, { id: Date.now(), text, done: false }]);
    setDraft("");
    sound.blip(760);
  };
  const toggle = (id: number) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    const t = tasks.find((x) => x.id === id);
    sound.blip(t && !t.done ? 980 : 420);
  };
  const remove = (id: number) => {
    setTasks((ts) => ts.filter((t) => t.id !== id));
    sound.blip(300);
  };
  const clearDone = () => {
    setTasks((ts) => ts.filter((t) => !t.done));
    sound.blip(360);
  };

  return (
    <>
      {/* drawer */}
      <aside
        className={`nes-card absolute bottom-2 right-0 top-2 z-30 flex w-[276px] flex-col transition-transform duration-300 ease-out md:bottom-3 md:top-3 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b-4 border-navy px-3 py-2.5">
          <div>
            <p className="font-display text-[10px] font-bold tracking-widest text-cyan">TRIP MANIFEST</p>
            <p className="font-term text-base leading-none text-faded">tasks for this ride</p>
          </div>
          <button onClick={onToggle} className="nes-btn nes-btn-secondary nes-btn-sm" aria-label="Close manifest">
            ▸
          </button>
        </div>

        {/* route progress */}
        <div className="px-3 pt-3">
          <div className="relative flex items-center">
            <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 bg-navy" />
            <div
              className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 bg-cyan transition-all duration-500"
              style={{ width: `${(doneCount / stops) * 100}%` }}
            />
            {tasks.map((t) => (
              <span
                key={t.id}
                className={`relative z-10 h-2.5 w-2.5 flex-1 border-2 border-navy ${t.done ? "bg-cyan" : "bg-navydeep"}`}
                style={{ marginLeft: "-1px" }}
              />
            ))}
            {tasks.length === 0 && <span className="relative z-10 h-2.5 w-2.5 border-2 border-navy bg-navydeep" />}
          </div>
          <p className="mt-1.5 font-term text-base leading-none text-faded">
            <span className="text-cyan">{doneCount}</span> / {tasks.length} stops made
          </p>
        </div>

        {/* input */}
        <div className="flex gap-2 px-3 pt-2.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="next stop…"
            maxLength={42}
            className="nes-inset min-w-0 flex-1 px-2 py-1.5 font-term text-lg leading-none text-cream placeholder:text-muted"
          />
          <button onClick={add} className="nes-btn nes-btn-primary nes-btn-sm" aria-label="Add task">
            +
          </button>
        </div>

        {/* list */}
        <ul className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-2">
          {tasks.map((t) => (
            <li key={t.id} className="todo-row group flex items-center gap-2 border-2 border-transparent px-1 py-1">
              <button
                onClick={() => toggle(t.id)}
                aria-label={t.done ? "Mark as not done" : "Mark as done"}
                className={`swatch-btn h-5 w-5 shrink-0 ${t.done ? "bg-cyan" : "bg-navydeep"}`}
              >
                {t.done && (
                  <svg viewBox="0 0 8 8" className="h-full w-full" shapeRendering="crispEdges">
                    <rect x="1" y="4" width="2" height="2" fill="#020617" />
                    <rect x="3" y="5" width="2" height="2" fill="#020617" />
                    <rect x="5" y="2" width="2" height="2" fill="#020617" />
                  </svg>
                )}
              </button>
              <span className={`done-toggle min-w-0 flex-1 font-body text-[13px] leading-snug ${t.done ? "done-label text-faded" : "text-cream"}`}>
                {t.text}
              </span>
              <button
                onClick={() => remove(t.id)}
                className="hidden shrink-0 font-term text-lg leading-none text-faded hover:text-pink group-hover:block"
                aria-label="Remove task"
              >
                ×
              </button>
            </li>
          ))}
          {tasks.length === 0 && (
            <li className="px-1 py-4 text-center font-term text-xl leading-tight text-faded">
              a blank manifest.
              <br />
              the ride is the reward.
            </li>
          )}
        </ul>

        <div className="flex items-center justify-between border-t-4 border-navy px-3 py-2">
          <button onClick={clearDone} className="font-term text-base leading-none text-faded hover:text-cyan">
            drop done stops
          </button>
          <p className="font-term text-base leading-none text-muted">saved in this seat</p>
        </div>
      </aside>

      {/* tab handle */}
      <button
        onClick={onToggle}
        className={`nes-btn nes-btn-secondary absolute left-2 top-2 z-30 flex items-center gap-2 transition-all duration-300 md:left-3 md:top-3 ${
          open ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
        aria-label="Open manifest"
      >
        <span className="nes-led nes-led-cyan" />
        <span className="font-display text-[10px] font-bold tracking-widest text-cyan">MANIFEST</span>
        <span className="nes-chip nes-chip-cyan">
          {tasks.length - doneCount}
        </span>
      </button>
    </>
  );
}
