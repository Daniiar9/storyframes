import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Crosshair, ChevronDown } from "lucide-react";
import type {
  FocusPoint,
  Frame,
  MotionIntensity,
  MotionPreset,
} from "@/lib/storyframes";

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
  "focus_zoom",
];

const INTENSITIES: MotionIntensity[] = ["subtle", "medium", "strong"];
const FOCUSES: FocusPoint[] = ["center", "top", "bottom", "left", "right"];

interface Props {
  frame: Frame;
  onChange: (patch: Partial<Frame>) => void;
  onApplyToAll: (patch: Partial<Frame>) => void;
  onPickCustomFocus: () => void;
  customFocusActive: boolean;
}

export function FrameMotionMenu({
  frame,
  onChange,
  onApplyToAll,
  onPickCustomFocus,
  customFocusActive,
}: Props) {
  const [open, setOpen] = useState(false);

  const preset: MotionPreset = frame.motionPreset ?? "none";
  const intensity: MotionIntensity = frame.motionIntensity ?? "subtle";
  const focus: FocusPoint = frame.focusPoint ?? "center";
  const hasCustom = frame.focusX != null && frame.focusY != null;
  const isActive = preset !== "none" || hasCustom;

  // Show summary chip
  const chipLabel = (() => {
    if (hasCustom) return "Focus · custom";
    if (preset === "none") return "Static";
    return `${PRESET_LABEL[preset]} · ${cap(intensity)}`;
  })();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Edit motion"
          className={`pointer-events-auto inline-flex items-center gap-1.5 border bg-background/95 px-2 py-1 text-[10px] uppercase tracking-[0.2em] backdrop-blur transition ${
            isActive
              ? "border-foreground text-foreground"
              : "border-foreground/30 text-foreground/70 hover:border-foreground hover:text-foreground"
          } ${customFocusActive ? "ring-1 ring-foreground" : ""}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
          {chipLabel}
          <ChevronDown className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={6}
        className="w-72 rounded-none border-foreground/25 bg-card p-0 text-foreground shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
      >
        {/* Motion */}
        <Section label="Motion">
          <div className="grid grid-cols-2 gap-1">
            {PRESETS.map((p) => (
              <Pill
                key={p}
                active={preset === p}
                onClick={() => onChange({ motionPreset: p })}
              >
                {PRESET_LABEL[p]}
              </Pill>
            ))}
          </div>
        </Section>

        {/* Intensity */}
        <Section label="Intensity">
          <div className="grid grid-cols-3 gap-1">
            {INTENSITIES.map((i) => (
              <Pill
                key={i}
                active={intensity === i}
                disabled={preset === "none"}
                onClick={() => onChange({ motionIntensity: i })}
              >
                {cap(i)}
              </Pill>
            ))}
          </div>
        </Section>

        {/* Focus */}
        <Section label="Focus">
          <div className="grid grid-cols-3 gap-1">
            {FOCUSES.map((f) => (
              <Pill
                key={f}
                active={!hasCustom && focus === f}
                onClick={() =>
                  onChange({
                    focusPoint: f,
                    focusX: undefined,
                    focusY: undefined,
                  })
                }
              >
                {cap(f)}
              </Pill>
            ))}
            <Pill
              active={hasCustom}
              onClick={() => {
                setOpen(false);
                onPickCustomFocus();
              }}
            >
              <span className="inline-flex items-center gap-1">
                <Crosshair className="h-3 w-3" />
                {hasCustom ? "Custom" : "Pick"}
              </span>
            </Pill>
          </div>
          {hasCustom && (
            <button
              type="button"
              onClick={() =>
                onChange({ focusX: undefined, focusY: undefined })
              }
              className="mt-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Clear custom focus
            </button>
          )}
        </Section>

        {/* Apply to all */}
        <div className="border-t border-foreground/15 p-2">
          <button
            type="button"
            onClick={() => {
              onApplyToAll({
                motionPreset: preset,
                motionIntensity: intensity,
                focusPoint: focus,
                // Don't propagate per-image custom coordinates
                focusX: undefined,
                focusY: undefined,
              });
              setOpen(false);
            }}
            className="w-full bg-foreground px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-background transition hover:bg-foreground/85"
          >
            Apply to all frames
          </button>
          <p className="mt-1.5 text-center text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            Per-image focus points are kept
          </p>
        </div>
      </PopoverContent>
    </Popover>
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
