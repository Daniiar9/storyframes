import { useEffect, useRef, useState } from "react";
import { Plus, X, HelpCircle, Crosshair, ChevronDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import type {
  Frame,
  MotionIntensity,
  MotionPreset,
} from "@/lib/storyframes";

const POS_KEY = "storyframes.motionWidget.pos";

const PRESET_LABEL: Record<MotionPreset, string> = {
  none: "Static",
  zoom_in: "Zoom in",
  zoom_out: "Zoom out",
  pan_left: "Pan ←",
  pan_right: "Pan →",
  pan_up: "Pan ↑",
  pan_down: "Pan ↓",
  focus_zoom: "Focus zoom",
};

const PRESETS: MotionPreset[] = [
  "none",
  "zoom_in",
  "zoom_out",
  "pan_left",
  "pan_right",
  "pan_up",
  "pan_down",
];
const INTENSITY_STEPS: MotionIntensity[] = ["subtle", "medium", "strong"];

interface Props {
  frames: Frame[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  selecting: boolean;
  setSelecting: (v: boolean) => void;
  patch: (id: string, p: Partial<Frame>) => void;
  applyToAll: (p: Partial<Frame>) => void;
}

export function MotionWidget({
  frames,
  selectedId,
  setSelectedId,
  selecting,
  setSelecting,
  patch,
  applyToAll,
}: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const movedRef = useRef(false);
  const wRef = useRef<HTMLDivElement>(null);

  const imageFrames = frames.filter((f) => f.imageUrl);
  const selected = selectedId ? frames.find((f) => f.id === selectedId) ?? null : null;
  const selectedIndex = selected ? frames.indexOf(selected) : -1;

  // Initial position
  useEffect(() => {
    try {
      const saved = localStorage.getItem(POS_KEY);
      if (saved) {
        setPos(JSON.parse(saved));
        return;
      }
    } catch {}
    const w = window.innerWidth;
    const h = window.innerHeight;
    setPos({ x: w - 72 - 24, y: h - 72 - 24 });
  }, []);

  // Esc cancels selection mode / deselects
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (selecting) setSelecting(false);
      else if (selectedId) setSelectedId(null);
      else if (open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selecting, selectedId, open, setSelecting, setSelectedId]);

  // Auto-expand when entering pick mode or a frame becomes selected
  useEffect(() => {
    if (selecting || selectedId) setOpen(true);
  }, [selecting, selectedId]);

  function onDragDown(e: React.PointerEvent) {
    if (!wRef.current) return;
    const rect = wRef.current.getBoundingClientRect();
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    movedRef.current = false;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onDragMove(e: React.PointerEvent) {
    if (!dragRef.current || !wRef.current) return;
    movedRef.current = true;
    const w = wRef.current.offsetWidth;
    const h = wRef.current.offsetHeight;
    const x = Math.max(8, Math.min(window.innerWidth - w - 8, e.clientX - dragRef.current.dx));
    const y = Math.max(8, Math.min(window.innerHeight - h - 8, e.clientY - dragRef.current.dy));
    setPos({ x, y });
  }
  function onDragUp(e: React.PointerEvent) {
    if (!dragRef.current) return;
    dragRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    if (pos) {
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(pos));
      } catch {}
    }
  }

  if (!pos) return null;

  const preset: MotionPreset = selected?.motionPreset ?? "none";
  const intensity: MotionIntensity = selected?.motionIntensity ?? "subtle";
  const focus: FocusPoint = selected?.focusPoint ?? "center";
  const hasCustom = selected?.focusX != null && selected?.focusY != null;

  const motionCount = imageFrames.filter(
    (f) => f.motionPreset && f.motionPreset !== "none",
  ).length;

  return (
    <>
      {/* Selection-mode banner */}
      {selecting && !selected && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center">
          <div className="pointer-events-auto inline-flex items-center gap-3 border border-foreground bg-background px-4 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Pick a frame
            </span>
            <span className="h-3 w-px bg-foreground/20" />
            <span className="text-xs">Click any image to edit its motion</span>
            <button
              type="button"
              aria-label="Cancel"
              onClick={() => setSelecting(false)}
              className="ml-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {!open ? (
        <div
          ref={wRef}
          className="fixed z-50 select-none"
          style={{ left: pos.x, top: pos.y }}
        >
          <button
            type="button"
            aria-label="Open motion controls"
            onPointerDown={onDragDown}
            onPointerMove={onDragMove}
            onPointerUp={(e) => {
              const moved = movedRef.current;
              onDragUp(e);
              if (!moved) setOpen(true);
            }}
            onPointerCancel={onDragUp}
            className="group relative flex h-14 w-14 cursor-grab items-center justify-center rounded-full bg-gradient-to-br from-foreground to-foreground/70 text-background shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition hover:scale-105 active:cursor-grabbing"
          >
            <span className="font-display text-lg tracking-[0.18em]">SF</span>
            {motionCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-background bg-card px-1 text-[10px] font-semibold text-foreground">
                {motionCount}
              </span>
            )}
          </button>
        </div>
      ) : (
      <div
        ref={wRef}
        role="region"
        aria-label="Motion controls"
        className="fixed z-50 w-80 border border-foreground/25 bg-card shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
        style={{ left: pos.x, top: pos.y }}
      >
        {/* Drag header */}
        <div
          onPointerDown={onDragDown}
          onPointerMove={onDragMove}
          onPointerUp={onDragUp}
          onPointerCancel={onDragUp}
          className="flex h-9 cursor-grab items-center justify-between border-b border-foreground/15 bg-background px-3 active:cursor-grabbing"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-foreground to-foreground/70 font-display text-[9px] tracking-[0.1em] text-background">
              SF
            </span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Motion
            </span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            {!selected && !selecting && (
              <button
                type="button"
                aria-label="Pick a frame"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelecting(true);
                }}
                disabled={imageFrames.length === 0}
                className="flex h-6 w-6 items-center justify-center transition hover:text-foreground disabled:opacity-30"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              aria-label="Help"
              onClick={(e) => {
                e.stopPropagation();
                setShowHelp((v) => !v);
              }}
              className="flex h-6 w-6 items-center justify-center transition hover:text-foreground"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Collapse"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
              className="flex h-6 w-6 items-center justify-center transition hover:text-foreground"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {showHelp && (
          <div className="border-b border-foreground/15 bg-secondary/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
            Click <span className="font-semibold text-foreground">+</span> to pick a frame, then
            choose its motion, intensity, and focus. Drag the dot on the image to set a custom
            focus point.
          </div>
        )}

        {/* Body */}
        {!selected ? (
          <EmptyState
            count={imageFrames.length}
            selecting={selecting}
            onPick={() => setSelecting(true)}
            onCancel={() => setSelecting(false)}
          />
        ) : (
          <SelectedPanel
            frame={selected}
            index={selectedIndex}
            preset={preset}
            intensity={intensity}
            focus={focus}
            hasCustom={hasCustom}
            patch={(p) => patch(selected.id, p)}
            applyToAll={applyToAll}
            onSwitch={() => {
              setSelectedId(null);
              setSelecting(true);
            }}
            onClose={() => setSelectedId(null)}
            onClearMotion={() =>
              patch(selected.id, {
                motionPreset: undefined,
                motionIntensity: undefined,
                focusPoint: undefined,
                focusX: undefined,
                focusY: undefined,
              })
            }
          />
        )}
      </div>
      )}
    </>
  );
}

/* --------------------------------------------------------------------- */

function EmptyState({
  count,
  selecting,
  onPick,
  onCancel,
}: {
  count: number;
  selecting: boolean;
  onPick: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Add motion to a single image — zoom, pan, or pick a focus point.
      </p>
      {selecting ? (
        <>
          <p className="text-[10px] uppercase tracking-[0.22em] text-foreground">
            Click an image to begin
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onPick}
          disabled={count === 0}
          className="inline-flex items-center gap-2 bg-foreground px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-background transition hover:bg-foreground/85 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Plus className="h-3.5 w-3.5" />
          Pick a frame
        </button>
      )}
    </div>
  );
}

function SelectedPanel({
  frame,
  index,
  preset,
  intensity,
  focus,
  hasCustom,
  patch,
  applyToAll,
  onSwitch,
  onClose,
  onClearMotion,
}: {
  frame: Frame;
  index: number;
  preset: MotionPreset;
  intensity: MotionIntensity;
  focus: FocusPoint;
  hasCustom: boolean | undefined;
  patch: (p: Partial<Frame>) => void;
  applyToAll: (p: Partial<Frame>) => void;
  onSwitch: () => void;
  onClose: () => void;
  onClearMotion: () => void;
}) {
  const [appliedAt, setAppliedAt] = useState(0);
  const justApplied = appliedAt > 0 && Date.now() - appliedAt < 1800;
  useEffect(() => {
    if (!appliedAt) return;
    const t = setTimeout(() => setAppliedAt(0), 1800);
    return () => clearTimeout(t);
  }, [appliedAt]);

  return (
    <div>
      {/* Selected frame chip */}
      <div className="flex items-center justify-between border-b border-foreground/15 bg-secondary px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-display text-[11px] tracking-[0.2em] text-muted-foreground">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="truncate text-[11px] uppercase tracking-[0.18em]">
            {frame.title || frame.fileName || "Frame"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSwitch}
            className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          >
            Switch
          </button>
          <button
            type="button"
            aria-label="Deselect"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <Section label="Motion">
        <div className="grid grid-cols-2 gap-1">
          {PRESETS.map((p) => (
            <Pill
              key={p}
              active={preset === p}
              onClick={() => patch({ motionPreset: p })}
            >
              {PRESET_LABEL[p]}
            </Pill>
          ))}
        </div>
      </Section>

      <Section label="Intensity">
        <div className="grid grid-cols-3 gap-1">
          {INTENSITIES.map((i) => (
            <Pill
              key={i}
              active={intensity === i}
              disabled={preset === "none"}
              onClick={() => patch({ motionIntensity: i })}
            >
              {cap(i)}
            </Pill>
          ))}
        </div>
      </Section>

      <Section label="Focus">
        <div className="grid grid-cols-3 gap-1">
          {FOCUSES.map((f) => (
            <Pill
              key={f}
              active={!hasCustom && focus === f}
              onClick={() =>
                patch({
                  focusPoint: f,
                  focusX: undefined,
                  focusY: undefined,
                })
              }
            >
              {cap(f)}
            </Pill>
          ))}
        </div>
        <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <Crosshair className="h-3 w-3" />
          {hasCustom ? "Custom point set — drag dot on image" : "Or drag the dot on the image"}
        </p>
        {hasCustom && (
          <button
            type="button"
            onClick={() => patch({ focusX: undefined, focusY: undefined })}
            className="mt-1 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Clear custom focus
          </button>
        )}
      </Section>

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-2 border-t border-foreground/15 p-2">
        <button
          type="button"
          onClick={onClearMotion}
          className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
        >
          Reset frame
        </button>
        <button
          type="button"
          onClick={() => {
            applyToAll({
              motionPreset: preset,
              motionIntensity: intensity,
              focusPoint: focus,
              focusX: undefined,
              focusY: undefined,
            });
            setAppliedAt(Date.now());
          }}
          className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] transition ${
            justApplied
              ? "bg-primary text-primary-foreground"
              : "bg-foreground text-background hover:bg-foreground/85"
          }`}
        >
          {justApplied ? "Applied ✓" : "Apply to all"}
        </button>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-foreground/15 p-3 last:border-b-0">
      <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function Pill({
  active,
  disabled,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`border px-2 py-1.5 text-[10px] uppercase tracking-[0.18em] transition ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-foreground/20 text-foreground/80 hover:border-foreground hover:text-foreground"
      } disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-foreground/20`}
    >
      {children}
    </button>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
