import { useEffect, useRef, useState } from "react";
import { Plus, HelpCircle, List, ChevronRight, ChevronLeft, X } from "lucide-react";
import { useMotionPick, describeArmed, type ArmedValue } from "./MotionPickContext";
import type { Frame, FocusPoint, MotionIntensity, MotionPreset } from "@/lib/storyframes";

const POS_KEY = "storyframes.motionWidget.pos";
const HINT_KEY = "storyframes.motionWidget.hintShown";

type Screen =
  | { kind: "root" }
  | { kind: "motion" }
  | { kind: "pan" }
  | { kind: "intensity" }
  | { kind: "focus" }
  | { kind: "summary" };

export function MotionWidget({ frames, patch }: { frames: Frame[]; patch: (id: string, p: Partial<Frame>) => void }) {
  const { armed, arm, cancel, applyToAll } = useMotionPick();

  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>({ kind: "root" });
  const [showHint, setShowHint] = useState(false);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const wRef = useRef<HTMLDivElement>(null);

  // Initial position: bottom-right
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
    setPos({ x: w - 56 - 24, y: h - 240 - 24 });
  }, []);

  // First-use hint
  useEffect(() => {
    try {
      if (!localStorage.getItem(HINT_KEY)) setShowHint(true);
    } catch {}
  }, []);

  // Drag
  function onHandleDown(e: React.PointerEvent) {
    if (!wRef.current) return;
    const rect = wRef.current.getBoundingClientRect();
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onHandleMove(e: React.PointerEvent) {
    if (!dragRef.current || !wRef.current) return;
    const w = wRef.current.offsetWidth;
    const h = wRef.current.offsetHeight;
    const x = Math.max(8, Math.min(window.innerWidth - w - 8, e.clientX - dragRef.current.dx));
    const y = Math.max(8, Math.min(window.innerHeight - h - 8, e.clientY - dragRef.current.dy));
    setPos({ x, y });
  }
  function onHandleUp(e: React.PointerEvent) {
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

  function dismissHint() {
    setShowHint(false);
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {}
  }

  function selectAndArm(v: ArmedValue) {
    arm(v);
    setPopoverOpen(false);
    setScreen({ kind: "root" });
    dismissHint();
  }

  if (!pos) return null;

  return (
    <>
      {/* Pick-mode banner */}
      {armed && <PickBanner onCancel={cancel} onApplyAll={applyToAll} canApplyAll={armed.kind !== "customFocus"} text={describeArmed(armed)} />}

      <div
        ref={wRef}
        role="toolbar"
        aria-label="Motion controls"
        className="fixed z-50 flex w-14 flex-col border border-foreground/25 bg-card shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
        style={{ left: pos.x, top: pos.y }}
      >
        {/* Drag handle */}
        <div
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
          className="flex h-12 cursor-grab items-center justify-center border-b border-foreground/15 active:cursor-grabbing"
          title="Drag to move"
        >
          <span className="font-display text-base tracking-tight">SF</span>
        </div>

        {/* + button */}
        <div className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={popoverOpen}
            onClick={() => {
              setPopoverOpen((o) => !o);
              setScreen({ kind: "root" });
              dismissHint();
            }}
            className={`flex h-12 w-full items-center justify-center border-b border-foreground/15 transition ${
              popoverOpen ? "bg-foreground text-background" : "hover:bg-accent"
            }`}
          >
            <Plus className="h-4 w-4" />
          </button>
          {showHint && !popoverOpen && (
            <div className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap border border-foreground bg-foreground px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-background">
              Add motion to a frame
              <span className="absolute left-full top-1/2 -translate-y-1/2 border-y-4 border-l-4 border-y-transparent border-l-foreground" />
            </div>
          )}
          {popoverOpen && (
            <Popover
              screen={screen}
              setScreen={setScreen}
              onClose={() => setPopoverOpen(false)}
              onArm={selectAndArm}
              frames={frames}
              patch={patch}
            />
          )}
        </div>

        {/* Summary */}
        <button
          type="button"
          aria-label="Open motion summary"
          onClick={() => {
            setPopoverOpen(true);
            setScreen({ kind: "summary" });
            dismissHint();
          }}
          className="flex h-12 items-center justify-center border-b border-foreground/15 transition hover:bg-accent"
          title="Motion summary"
        >
          <List className="h-4 w-4 text-foreground/70" />
        </button>

        {/* Help */}
        <button
          type="button"
          aria-label="Help"
          className="flex h-12 items-center justify-center transition hover:bg-accent"
          title="Click + to add motion. Esc to cancel."
        >
          <HelpCircle className="h-4 w-4 text-foreground/50" />
        </button>
      </div>
    </>
  );
}

/* --------------------------------------------------------------------- */

function Popover({
  screen,
  setScreen,
  onClose,
  onArm,
  frames,
  patch,
}: {
  screen: Screen;
  setScreen: (s: Screen) => void;
  onClose: () => void;
  onArm: (v: ArmedValue) => void;
  frames: Frame[];
  patch: (id: string, p: Partial<Frame>) => void;
}) {
  // Position the popover to the LEFT of the widget
  return (
    <div
      role="menu"
      className="absolute right-full top-0 mr-2 w-64 border border-foreground/25 bg-card shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-foreground/15 px-3 py-2">
        {screen.kind === "root" ? (
          <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Add motion
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (screen.kind === "pan") setScreen({ kind: "motion" });
              else setScreen({ kind: "root" });
            }}
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-3 w-3" />
            Back
          </button>
        )}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {screen.kind === "root" && (
        <ul>
          <Row label="Motion" onClick={() => setScreen({ kind: "motion" })} />
          <Row label="Intensity" onClick={() => setScreen({ kind: "intensity" })} />
          <Row label="Focus" onClick={() => setScreen({ kind: "focus" })} />
        </ul>
      )}

      {screen.kind === "motion" && (
        <ul>
          <Leaf label="None" onClick={() => onArm({ kind: "preset", value: "none" })} />
          <Leaf label="Zoom in" onClick={() => onArm({ kind: "preset", value: "zoom_in" })} />
          <Leaf label="Zoom out" onClick={() => onArm({ kind: "preset", value: "zoom_out" })} />
          <Row label="Pan" onClick={() => setScreen({ kind: "pan" })} />
          <Leaf label="Focus zoom" onClick={() => onArm({ kind: "preset", value: "focus_zoom" })} />
        </ul>
      )}

      {screen.kind === "pan" && (
        <ul>
          <Leaf label="Pan left" onClick={() => onArm({ kind: "preset", value: "pan_left" })} />
          <Leaf label="Pan right" onClick={() => onArm({ kind: "preset", value: "pan_right" })} />
          <Leaf label="Pan up" onClick={() => onArm({ kind: "preset", value: "pan_up" })} />
          <Leaf label="Pan down" onClick={() => onArm({ kind: "preset", value: "pan_down" })} />
        </ul>
      )}

      {screen.kind === "intensity" && (
        <ul>
          {(["subtle", "medium", "strong"] as MotionIntensity[]).map((i) => (
            <Leaf key={i} label={cap(i)} onClick={() => onArm({ kind: "intensity", value: i })} />
          ))}
        </ul>
      )}

      {screen.kind === "focus" && (
        <ul>
          {(["center", "top", "bottom", "left", "right"] as FocusPoint[]).map((f) => (
            <Leaf key={f} label={cap(f)} onClick={() => onArm({ kind: "focus", value: f })} />
          ))}
          <Leaf label="Click image to set custom…" onClick={() => onArm({ kind: "customFocus" })} />
        </ul>
      )}

      {screen.kind === "summary" && <SummaryList frames={frames} patch={patch} />}
    </div>
  );
}

function Row({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between border-b border-foreground/10 px-3 py-2.5 text-left text-[11px] uppercase tracking-[0.2em] transition hover:bg-accent last:border-b-0"
      >
        {label}
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
      </button>
    </li>
  );
}

function Leaf({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between border-b border-foreground/10 px-3 py-2.5 text-left text-xs transition hover:bg-accent last:border-b-0"
      >
        {label}
      </button>
    </li>
  );
}

function SummaryList({ frames, patch }: { frames: Frame[]; patch: (id: string, p: Partial<Frame>) => void }) {
  const PRESET: Record<MotionPreset, string> = {
    none: "Static",
    zoom_in: "Zoom in",
    zoom_out: "Zoom out",
    pan_left: "Pan left",
    pan_right: "Pan right",
    pan_up: "Pan up",
    pan_down: "Pan down",
    focus_zoom: "Focus zoom",
  };
  const visible = frames.filter((f) => f.imageUrl);
  function reset(id: string) {
    patch(id, {
      motionPreset: undefined,
      motionIntensity: undefined,
      focusPoint: undefined,
      focusX: undefined,
      focusY: undefined,
    });
  }
  function resetAll() {
    visible.forEach((f) => reset(f.id));
  }
  if (!visible.length) {
    return (
      <p className="px-3 py-4 text-center text-[11px] text-muted-foreground">
        Upload images to set motion.
      </p>
    );
  }
  return (
    <div className="max-h-[60vh] overflow-y-auto">
      <ul>
        {visible.map((f, i) => {
          const preset = f.motionPreset ?? "none";
          const intensity = f.motionIntensity;
          const hasCustom = f.focusX != null && f.focusY != null;
          return (
            <li
              key={f.id}
              className="flex items-center justify-between gap-2 border-b border-foreground/10 px-3 py-2 text-[11px]"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="font-display tracking-[0.2em] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="truncate">
                  {PRESET[preset]}
                  {preset !== "none" && intensity ? ` · ${cap(intensity)}` : ""}
                  {hasCustom ? " · custom" : ""}
                </span>
              </span>
              <button
                type="button"
                onClick={() => reset(f.id)}
                className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
              >
                Reset
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={resetAll}
        className="block w-full border-t border-foreground/15 px-3 py-2 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition hover:bg-accent hover:text-foreground"
      >
        Reset all motion
      </button>
    </div>
  );
}

function PickBanner({
  text,
  onCancel,
  onApplyAll,
  canApplyAll,
}: {
  text: string;
  onCancel: () => void;
  onApplyAll: () => void;
  canApplyAll: boolean;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center">
      <div className="pointer-events-auto inline-flex items-center gap-3 border border-foreground bg-background px-4 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Pick a frame
        </span>
        <span className="h-3 w-px bg-foreground/20" />
        <span className="text-xs">{text}</span>
        {canApplyAll && (
          <>
            <span className="h-3 w-px bg-foreground/20" />
            <button
              type="button"
              onClick={onApplyAll}
              className="text-[10px] uppercase tracking-[0.2em] underline-offset-2 hover:underline"
            >
              Apply to all
            </button>
          </>
        )}
        <button
          type="button"
          aria-label="Cancel"
          onClick={onCancel}
          className="ml-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}