import { useMemo, useState } from "react";
import { portraitDataURL, SKINS, SWATCHES } from "../game/sprites";
import type { Accessory, Identity } from "../game/types";

const ACCESSORIES: Array<{ id: Accessory; label: string }> = [
  { id: "none", label: "None" },
  { id: "beanie", label: "Beanie" },
  { id: "scarf", label: "Scarf" },
];

interface Props {
  initial: Identity | null;
  onBoard: (id: Identity) => void;
}

export default function BoardingPass({ initial, onBoard }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [sweater, setSweater] = useState(initial?.sweater ?? "ember");
  const [acc, setAcc] = useState<Accessory>(initial?.accessory ?? "beanie");
  const [leaving, setLeaving] = useState(false);

  const swatch = SWATCHES.find((s) => s.id === sweater) ?? SWATCHES[0];
  const portrait = useMemo(() => {
    const skin = SKINS[((name || "Traveler").length + 2) % SKINS.length];
    const hair = ["#3a2a24", "#241d24", "#5a3a2a", "#7a4a3a"][((name || "Traveler").length + 1) % 4];
    return portraitDataURL(swatch.c, swatch.hat, skin, hair, acc);
  }, [name, swatch, acc]);

  const board = () => {
    setLeaving(true);
    window.setTimeout(() => onBoard({ name: name.trim() || "Traveler", sweater, accessory: acc }), 340);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[rgba(16,9,6,0.82)] p-4">
      {/* ambient platform glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(60% 50% at 50% 40%, rgba(242,163,60,0.10), transparent 70%)" }}
      />
      <div
        className={`relative w-full max-w-md ${leaving ? "ticket-out" : "ticket-in"}`}
        style={{ transform: "rotate(-1.2deg)" }}
      >
        <div className="px-panel relative overflow-hidden">
          {/* header strip */}
          <div className="flex items-center justify-between border-b-2 border-[#0d0705] bg-[#f2a33c] px-5 py-2 text-[#241305]">
            <span className="font-display text-xl tracking-wide">NIGHT OWL EXPRESS</span>
            <span className="font-display text-lg">CAR 7</span>
          </div>

          <div className="flex">
            {/* main stub */}
            <div className="flex-1 px-5 py-4">
              <p className="font-display text-[#d9a441] text-lg leading-none marquee-glow">BOARDING PASS · QUIET STUDY CAR</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#a8886a]">
                Departs now · Arrives whenever your focus does
              </p>

              {/* portrait preview */}
              <div className="mt-4 flex items-center gap-4">
                <div className="px-inset flex h-20 w-20 items-center justify-center">
                  <img src={portrait} alt="your avatar" className="h-16 w-16 [image-rendering:pixelated]" />
                </div>
                <div className="flex-1">
                  <label className="block font-display text-lg text-[#e8d5b5]" htmlFor="pax-name">
                    Passenger name
                  </label>
                  <input
                    id="pax-name"
                    maxLength={12}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && board()}
                    placeholder="Traveler"
                    className="px-inset mt-1 w-full px-3 py-1.5 font-display text-2xl text-[#f4e7d3] outline-none placeholder:text-[#6d452c] focus:shadow-[inset_0_0_0_2px_#f2a33c]"
                    autoFocus
                  />
                </div>
              </div>

              {/* sweater color */}
              <div className="mt-4">
                <p className="font-display text-lg text-[#e8d5b5]">Sweater</p>
                <div className="mt-1.5 flex gap-2">
                  {SWATCHES.map((s) => (
                    <button
                      key={s.id}
                      title={s.label}
                      aria-label={s.label}
                      onClick={() => setSweater(s.id)}
                      className="h-8 w-8 border-2 border-[#0d0705] transition-transform hover:-translate-y-0.5"
                      style={{
                        background: s.c,
                        boxShadow:
                          sweater === s.id
                            ? "0 0 0 2px #f4e7d3, 0 0 0 4px #0d0705, 0 4px 10px rgba(242,163,60,0.35)"
                            : "inset 0 -3px 0 rgba(0,0,0,0.3), 0 2px 0 #0d0705",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* accessory */}
              <div className="mt-4">
                <p className="font-display text-lg text-[#e8d5b5]">Accessory</p>
                <div className="mt-1.5 flex gap-2">
                  {ACCESSORIES.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setAcc(a.id)}
                      className={`px-chip px-3 py-1 text-lg transition-colors ${
                        acc === a.id ? "bg-[#f2a33c] text-[#241305]" : "bg-[#2b1b14] text-[#c9a86e] hover:bg-[#3a241a]"
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={board} className="px-btn mt-5 w-full py-2 text-2xl">
                {initial ? "REBOARD THE TRAIN →" : "PUNCH TICKET & BOARD →"}
              </button>
              <p className="mt-2 text-center text-[11px] text-[#8a6a4a]">
                WASD / arrows to walk · E to sit · G to wave
              </p>
            </div>

            {/* perforated counterfoil */}
            <div className="perf-edge w-24 shrink-0 border-l-2 border-dashed border-[#4b2f1f] bg-[#1e1310] px-3 py-4 text-center">
              <p className="font-display text-lg leading-tight text-[#d9a441]">SEAT<br />CLASS</p>
              <p className="font-display mt-1 text-3xl text-[#f4e7d3]">FOCUS</p>
              <div className="barcode mx-auto mt-4 h-14 w-12 opacity-80" />
              <p className="mt-3 font-display text-base text-[#8a6a4a]">№ 0{Math.floor(Math.random() * 89) + 10}-C7</p>
              <p className="mt-1 text-[9px] uppercase tracking-widest text-[#6d452c]">Quiet car<br />keep whispers<br />whispered</p>
            </div>
          </div>
        </div>
        {/* under-glow */}
        <div className="absolute -inset-x-6 -bottom-8 -z-10 h-16 bg-[radial-gradient(50%_100%_at_50%_0%,rgba(242,163,60,0.16),transparent)]" />
      </div>
    </div>
  );
}
