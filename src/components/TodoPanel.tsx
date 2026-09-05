import { useEffect, useState } from "react";
import type { SoundKit } from "../game/audio";

interface Task {
  id: number;
  text: string;
  done: boolean;
}

const LS_KEY = "nightowl.todos.v1";

function load(): Task[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as Task[];
  } catch {
    /* storage unavailable */
  }
  return [
    { id: 1, text: "Read 10 pages", done: false },
    { id: 2, text: "Draft outline", done: true },
    { id: 3, text: "Review flashcards", done: false },
  ];
}

interface Props {
  sound: SoundKit;
  open: boolean;
  onToggle: () => void;
}

export default function TodoPanel({ sound, open, onToggle }: Props) {
  const [tasks, setTasks] = useState<Task[]>(load);
  const [text, setText] = useState("");
  const [justDone, setJustDone] = useState<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(tasks));
    } catch {
      /* storage unavailable */
    }
  }, [tasks]);

  const add = () => {
    const t = text.trim();
    if (!t) return;
    setTasks((ts) => [...ts, { id: Date.now(), text: t, done: false }]);
    setText("");
    sound.blip(740);
  };

  const toggle = (id: number) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    const task = tasks.find((t) => t.id === id);
    if (task && !task.done) {
      sound.blip(980);
      setJustDone(id);
      window.setTimeout(() => setJustDone(null), 700);
    } else {
      sound.blip(420);
    }
  };

  const remove = (id: number) => {
    setTasks((ts) => ts.filter((t) => t.id !== id));
    sound.blip(320);
  };

  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <>
      {/* tab handle */}
      <button
        onClick={onToggle}
        className={`px-btn px-btn-ghost absolute top-1/2 z-30 flex -translate-y-1/2 items-center gap-1 px-1.5 py-3 text-lg transition-all duration-300 ${
          open ? "right-[276px]" : "right-0"
        }`}
        title="To-do list"
      >
        <span className="font-display [writing-mode:vertical-rl]">TO-DO</span>
        <span>{open ? "»" : "«"}</span>
      </button>

      <aside
        className={`absolute top-0 bottom-0 right-0 z-20 w-[276px] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="px-panel-dark flex h-full flex-col border-l-2">
          <div className="border-b-2 border-[#0d0705] bg-[#2b1b14] px-4 py-2.5">
            <p className="font-display text-xl leading-none text-[#f2a33c]">PASSENGER TO-DO</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-[#8a6a4a]">saved to this seat · {done}/{tasks.length} done</p>
          </div>

          <div className="flex gap-1.5 border-b-2 border-[#0d0705] p-2.5">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Add a task…"
              maxLength={60}
              className="px-inset min-w-0 flex-1 px-2.5 py-1.5 font-display text-lg text-[#f4e7d3] outline-none placeholder:text-[#6d452c] focus:shadow-[inset_0_0_0_2px_#f2a33c]"
            />
            <button onClick={add} className="px-btn px-2.5 text-xl" aria-label="Add task">
              +
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
            {tasks.length === 0 && (
              <p className="mt-6 text-center text-xs text-[#8a6a4a]">
                Nothing here. Add one small task —
                <br />
                small tasks love train rides.
              </p>
            )}
            <ul className="space-y-1.5">
              {tasks.map((t) => (
                <li
                  key={t.id}
                  className={`group flex items-center gap-2 border-2 border-[#0d0705] bg-[#241611] px-2 py-1.5 transition-all duration-200 ${
                    justDone === t.id ? "-translate-y-0.5 bg-[#3a4a2c]" : ""
                  } ${t.done ? "opacity-60" : ""}`}
                >
                  <button
                    onClick={() => toggle(t.id)}
                    aria-label={t.done ? "Mark as not done" : "Mark as done"}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 border-[#0d0705] transition-colors ${
                      t.done ? "bg-[#7fa07a]" : "bg-[#170d09] group-hover:bg-[#2b1b14]"
                    }`}
                  >
                    {t.done && (
                      <svg viewBox="0 0 10 10" className="h-3 w-3">
                        <path d="M1.5 5.5 L4 8 L8.5 2" fill="none" stroke="#140d0a" strokeWidth="2" />
                      </svg>
                    )}
                  </button>
                  <span
                    className={`min-w-0 flex-1 text-[13px] leading-snug ${
                      t.done ? "text-[#8a6a4a] line-through" : "text-[#e8d5b5]"
                    }`}
                  >
                    {t.text}
                  </span>
                  <button
                    onClick={() => remove(t.id)}
                    aria-label="Delete task"
                    className="shrink-0 px-1 font-display text-lg leading-none text-[#6d452c] opacity-0 transition-opacity hover:text-[#e26d6d] group-hover:opacity-100"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t-2 border-[#0d0705] p-2.5">
            <div className="px-inset h-4 overflow-hidden">
              <div
                className="h-full bg-[#7fa07a] transition-all duration-500"
                style={{ width: `${pct}%`, boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.25), inset 0 2px 0 rgba(255,255,255,0.2)" }}
              />
            </div>
            <p className="font-display mt-1 text-right text-base leading-none text-[#a8886a]">
              {pct === 100 && tasks.length > 0 ? "All clear — window's all yours ✦" : `${pct}% of the way there`}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
