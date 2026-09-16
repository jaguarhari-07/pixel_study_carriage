import { useEffect, useMemo, useRef, useState } from "react";
import { buildSheet, convertToSpriteSheet, SKINS, SWATCHES } from "../game/sprites";
import type { Accessory, Gender, Identity } from "../game/types";

/* ---------------- live sprite preview ---------------- */

function AvatarPreview({ identity }: { identity: Identity }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const swatch = SWATCHES.find((s) => s.id === identity.sweater) ?? SWATCHES[0];
  const skin = SKINS[(identity.name.length + 2) % SKINS.length];
  const hair = ["#3a2a24", "#241d24", "#5a3a2a", "#7a4a3a"][(identity.name.length + 1) % 4];
  
  // For custom skin, we need to handle it asynchronously
  const [customSheet, setCustomSheet] = useState<HTMLCanvasElement | undefined>();
  
  useEffect(() => {
    if (identity.skinImage) {
      convertToSpriteSheet(identity.skinImage).then(setCustomSheet);
    } else {
      setCustomSheet(undefined);
    }
  }, [identity.skinImage]);
  
  const sheet = useMemo(
    () => buildSheet(swatch.c, swatch.hat, skin, hair, identity.accessory, identity.gender, customSheet),
    [swatch, skin, hair, identity.accessory, identity.gender, customSheet]
  );

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    let raf = 0;
    let t0 = performance.now();
    const loop = (t: number) => {
      const el = (t - t0) / 130;
      const col = 2 + (Math.floor(el) % 4);
      g.clearRect(0, 0, 96, 96);
      g.fillStyle = "rgba(20,10,6,0.35)";
      g.beginPath();
      g.ellipse(48, 86, 26, 7, 0, 0, Math.PI * 2);
      g.fill();
      const grad = g.createRadialGradient(48, 50, 4, 48, 50, 46);
      grad.addColorStop(0, "rgba(20,173,255,0.14)");
      grad.addColorStop(1, "rgba(20,173,255,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 96, 96);
      g.drawImage(sheet, col * 16, 0, 16, 16, 12, 8, 72, 72);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sheet]);

  return <canvas ref={ref} width={96} height={96} className="h-24 w-24 [image-rendering:pixelated]" aria-label="Your traveler" />;
}

/* ---------------- split-flap word ---------------- */

function FlapWord({ word, delay = 0, size = "md" }: { word: string; delay?: number; size?: "md" | "lg" }) {
  return (
    <span className="inline-flex gap-[3px]">
      {word.split("").map((ch, i) =>
        ch === " " ? (
          <span key={i} className={size === "lg" ? "w-3" : "w-2"} />
        ) : (
          <span
            key={i}
            className={`nes-flap nes-flap-flip ${size === "lg" ? "h-10 w-8 text-2xl md:h-14 md:w-11 md:text-4xl" : "h-8 w-6 text-lg md:h-10 md:w-8 md:text-2xl"}`}
            style={{ animationDelay: `${delay + i * 70}ms` }}
          >
            {ch}
          </span>
        )
      )}
    </span>
  );
}

/* ---------------- sparkle ---------------- */

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

/* ---------------- scenery silhouettes ---------------- */

function Hills({ className, dark }: { className?: string; dark?: boolean }) {
  const fill = dark ? "#020617" : "#1e1b4b";
  const hut = dark ? "#a3e635" : "#14adff";
  return (
    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className={`h-full w-1/2 shrink-0 ${className ?? ""}`}>
      <polygon points="0,120 0,70 90,52 180,72 260,40 360,68 470,48 560,74 640,56 760,80 850,50 960,72 1060,58 1200,76 1200,120" fill={fill} />
      <rect x="300" y="66" width="26" height="20" fill={dark ? "#0a1020" : "#312e81"} />
      <rect x="306" y="72" width="6" height="6" fill={hut} />
      <rect x="316" y="72" width="4" height="6" fill={hut} />
      <rect x="880" y="70" width="22" height="18" fill={dark ? "#0a1020" : "#312e81"} />
      <rect x="886" y="76" width="5" height="5" fill={hut} />
      <rect x="150" y="40" width="3" height="46" fill={dark ? "#0a1020" : "#1e1b4b"} />
      <rect x="143" y="44" width="17" height="2" fill={dark ? "#0a1020" : "#1e1b4b"} />
      <rect x="700" y="46" width="3" height="40" fill={dark ? "#0a1020" : "#1e1b4b"} />
      <rect x="693" y="50" width="17" height="2" fill={dark ? "#0a1020" : "#1e1b4b"} />
    </svg>
  );
}

const ACCESSORIES: Array<{ id: Accessory; label: string }> = [
  { id: "none", label: "Bare-headed" },
  { id: "beanie", label: "Beanie" },
  { id: "scarf", label: "Scarf" },
];

const GENDERS: Array<{ id: Gender; label: string; icon: string }> = [
  { id: "female", label: "Female", icon: "♀" },
  { id: "male", label: "Male", icon: "♂" },
];

export default function BoardingPass({ initial, onBoard }: { initial: Identity | null; onBoard: (id: Identity) => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [sweater, setSweater] = useState(initial?.sweater ?? "ember");
  const [accessory, setAccessory] = useState<Accessory>(initial?.accessory ?? "none");
  const [gender, setGender] = useState<Gender>(initial?.gender ?? "female");
  const [skinImage, setSkinImage] = useState<string | undefined>(initial?.skinImage);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const serial = useMemo(() => `NOX-${Math.floor(1000 + Math.random() * 9000)}`, []);
  const identity: Identity = { name: name.trim(), sweater, accessory, gender, skinImage };
  const canBoard = name.trim().length > 0;

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setSkinImage(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const removeCustomSkin = () => {
    setSkinImage(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="board-sky absolute inset-0 z-40 overflow-hidden">
      {/* ambient night */}
      <div className="stars-layer" />
      <div className="train-streak" style={{ bottom: "30%" }} />
      <div className="absolute bottom-0 left-0 h-[24%] w-full">
        <div className="hills-drift-slow flex h-full w-[200%]">
          <Hills />
          <Hills />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 h-[13%] w-full">
        <div className="hills-drift flex h-full w-[200%]">
          <Hills dark />
          <Hills dark />
        </div>
      </div>
      {/* semaphore signal */}
      <div className="absolute bottom-[13%] right-[10%] hidden md:block">
        <div className="mx-auto h-2 w-2 border-2 border-navy bg-[#0f172a]">
          <div className="nes-led-blink h-full w-full bg-pink" />
        </div>
        <div className="mx-auto h-16 w-1 bg-[#0f172a]" />
      </div>

      <div className="relative z-10 flex h-full items-center justify-center overflow-y-auto p-4 md:p-8">
        <div className="grid w-full max-w-5xl items-center gap-8 md:grid-cols-[1.05fr_1fr]">
          {/* left: the departure board */}
          <div className="rise-in hidden select-none md:block" style={{ animationDelay: "80ms" }}>
            <p className="font-term text-xl tracking-[0.3em] text-cyan">
              <Sparkle className="inline h-4 w-4 text-pink sparkle-delay-1" />
              {" "}— NOW BOARDING —{" "}
              <Sparkle className="inline h-4 w-4 text-amber sparkle-delay-2" />
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <FlapWord word="NIGHT OWL" size="lg" delay={200} />
              <FlapWord word="EXPRESS" size="lg" delay={750} />
            </div>
            <div className="mt-5 inline-flex items-center gap-3 border-4 border-navy bg-slate px-4 py-2 shadow-[0_0_0_4px_#020617,0_0_0_8px_#14adff]">
              <span className="nes-led nes-led-cyan nes-led-blink" />
              <span className="font-term text-2xl leading-none text-cyan">CAR 7 · QUIET STUDY COUPE</span>
            </div>
            <p className="mt-5 max-w-sm font-body text-sm leading-relaxed text-faded">
              A pixel train that never arrives, full of people who never look up. Wander the aisle, claim a booth,
              and let the pomodoro bells do the announcing. <span className="text-pink">⋆˙⟡</span>
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-muted">
              <span className="font-term text-lg"><span className="nes-key mr-1.5">W A S D</span> wander</span>
              <span className="font-term text-lg"><span className="nes-key mr-1.5">E</span> sit</span>
              <span className="font-term text-lg"><span className="nes-key mr-1.5">G</span> wave</span>
            </div>
          </div>

          {/* right: the ticket */}
          <div className="rise-in mx-auto w-full max-w-md" style={{ animationDelay: "220ms" }}>
            <div className="ticket relative w-full p-0">
              {/* mobile title */}
              <div className="border-b-[3px] border-dashed border-[#0f172a33] px-5 pb-3 pt-4 md:hidden">
                <div className="flex flex-col gap-1.5">
                  <FlapWord word="NIGHT OWL" delay={150} />
                  <FlapWord word="EXPRESS" delay={600} />
                </div>
              </div>

              <div className="flex">
                {/* main stub */}
                <div className="min-w-0 flex-1 px-5 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-[10px] font-bold tracking-widest text-cyan">BOARDING PASS · NOX 7</p>
                    <Sparkle className="h-4 w-4 text-pink" />
                  </div>

                  <div className="mt-4 flex items-end gap-3">
                    <div className="min-w-0 flex-1">
                      <label className="font-body text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
                        Passenger
                      </label>
                      <input
                        className="ticket-input mt-1 w-full text-3xl leading-none"
                        maxLength={12}
                        placeholder="your name…"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && canBoard) onBoard(identity);
                        }}
                        autoFocus
                      />
                    </div>
                    <div className="shrink-0 border-4 border-navy bg-navydeep p-1">
                      <AvatarPreview identity={identity} />
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="font-body text-[10px] font-bold uppercase tracking-[0.22em] text-muted">Sweater</p>
                    <div className="mt-1.5 flex gap-2">
                      {SWATCHES.map((s) => (
                        <button
                          key={s.id}
                          title={s.label}
                          className={`swatch-btn h-8 w-8 ${sweater === s.id ? "swatch-on" : ""}`}
                          style={{ background: s.c }}
                          onClick={() => setSweater(s.id)}
                        />
                      ))}
                    </div>
                  </div>

              <div className="mt-3.5">
                <p className="font-body text-[10px] font-bold uppercase tracking-[0.22em] text-muted">Accessory</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {ACCESSORIES.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setAccessory(a.id)}
                      className={`nes-btn nes-btn-sm ${
                        accessory === a.id ? "nes-btn-primary" : "nes-btn-secondary"
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3.5">
                <p className="font-body text-[10px] font-bold uppercase tracking-[0.22em] text-muted">Character</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {GENDERS.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setGender(g.id)}
                      className={`nes-btn nes-btn-sm ${
                        gender === g.id ? "nes-btn-accent" : "nes-btn-secondary"
                      }`}
                    >
                      <span className="mr-1">{g.icon}</span>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Skin Upload */}
              <div className="mt-3.5">
                <p className="font-body text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
                  Custom Skin (Optional)
                </p>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-lg border-4 border-dashed p-4 transition-all ${
                    isDragging
                      ? "border-cyan bg-cyan/10"
                      : skinImage
                      ? "border-lime bg-lime/5"
                      : "border-muted/40 bg-navydeep/30 hover:border-cyan/60 hover:bg-cyan/5"
                  }`}
                >
                  {skinImage ? (
                    <>
                      <img
                        src={skinImage}
                        alt="Custom skin preview"
                        className="mb-2 h-16 w-16 [image-rendering:pixelated]"
                      />
                      <p className="text-center font-term text-sm text-lime">
                        ✓ Custom skin loaded!
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCustomSkin();
                        }}
                        className="nes-btn nes-btn-sm nes-btn-secondary mt-2"
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="mb-2 text-4xl">📤</div>
                      <p className="text-center font-term text-sm text-cream">
                        Drop pixel art here or click to upload
                      </p>
                      <p className="mt-1 text-center font-term text-xs text-muted">
                        16×16 or 96×48 PNG recommended
                      </p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </div>
              </div>
                  <div className="mt-5 flex items-center gap-3">
                    <button
                      disabled={!canBoard}
                      onClick={() => onBoard(identity)}
                      className={`nes-btn flex-1 ${canBoard ? "nes-btn-accent" : "nes-btn-secondary opacity-40"} disabled:cursor-not-allowed`}
                    >
                      ▸ BOARD THE TRAIN
                    </button>
                  </div>
                  {!canBoard && (
                    <p className="mt-1.5 text-right font-term text-base leading-none text-pink">punch in a name first ↑</p>
                  )}
                </div>

                {/* perforation */}
                <div className="perf-edge w-3 shrink-0 self-stretch" />

                {/* tear-off stub */}
                <div className="hidden w-24 shrink-0 flex-col items-center justify-between px-2 py-4 sm:flex">
                  <p className="font-display text-[10px] font-bold tracking-widest text-cyan" style={{ writingMode: "vertical-rl" }}>
                    FOCUS NIGHT
                  </p>
                  <div className="stamp text-[10px] leading-tight">
                    COZY
                    <br />
                    CLASS
                  </div>
                  <div className="w-full">
                    <div className="barcode h-12 w-full" />
                    <p className="mt-1 text-center font-term text-sm leading-none text-muted">{serial}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* platform footnote */}
      <p className="absolute bottom-3 left-0 right-0 z-10 text-center font-term text-lg leading-none text-faded">
        no accounts · no microphones · just quiet company on the 23:40 to Focus <Sparkle className="inline h-3 w-3 text-purple" />
      </p>
    </div>
  );
}
