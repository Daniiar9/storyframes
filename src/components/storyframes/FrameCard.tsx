import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  Frame,
  FocusPoint,
  MotionIntensity,
  MotionPreset,
} from "@/lib/storyframes";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMotionPick } from "./MotionPickContext";

interface Props {
  frame: Frame;
  index: number;
  onChange: (patch: Partial<Frame>) => void;
  onRemove: () => void;
  onRegenerate: () => void;
  loading?: boolean;
}

export function FrameCard({ frame, index, onChange, onRemove, onRegenerate, loading }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: frame.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const preset: MotionPreset = frame.motionPreset ?? "zoom_in";
  const intensity: MotionIntensity = frame.motionIntensity ?? "subtle";
  const focusPoint: FocusPoint = frame.focusPoint ?? "center";
  const hasCustomFocus = frame.focusX != null && frame.focusY != null;

  const [previewKey, setPreviewKey] = useState(0);
  const imgWrapRef = useRef<HTMLDivElement>(null);
  const { armed, applyTo } = useMotionPick();
  const isPickable = !!armed && !!frame.imageUrl;

  // Re-trigger the in-card preview animation whenever motion settings change
  useEffect(() => {
    if (!frame.imageUrl) return;
    setPreviewKey((k) => k + 1);
  }, [preset, intensity, focusPoint, frame.focusX, frame.focusY, frame.imageUrl]);

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!armed || !imgWrapRef.current) return;
    if (armed.kind === "customFocus") {
      const rect = imgWrapRef.current.getBoundingClientRect();
      const x = clamp01((e.clientX - rect.left) / rect.width);
      const y = clamp01((e.clientY - rect.top) / rect.height);
      applyTo(frame.id, { focusX: x, focusY: y });
    } else {
      applyTo(frame.id);
    }
  }

  function clearFocus(e: React.MouseEvent) {
    e.stopPropagation();
    onChange({ focusX: undefined, focusY: undefined });
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col bg-card transition ${
        isPickable ? "ring-1 ring-foreground/30 hover:ring-foreground" : ""
      }`}
    >
      {/* number + drag */}
      <div className="flex items-center justify-between border-b border-foreground/15 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="font-display text-xs tracking-[0.2em] text-muted-foreground">
            {String(index + 1).padStart(2, "0")}
          </span>
          {frame.kind !== "image" && (
            <span className="border border-foreground/40 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.18em]">
              {frame.kind}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onRegenerate}
                aria-label="Regenerate this frame"
                className="flex h-7 w-7 items-center justify-center text-muted-foreground transition hover:text-foreground"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Regenerate title & caption</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                {...attributes}
                {...listeners}
                aria-label="Drag to reorder"
                className="flex h-7 w-7 cursor-grab items-center justify-center text-muted-foreground transition hover:text-foreground active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Drag to reorder</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onRemove}
                aria-label="Remove frame"
                className="flex h-7 w-7 items-center justify-center text-muted-foreground transition hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Remove this frame</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* image / placeholder */}
      <div
        ref={imgWrapRef}
        data-no-dnd
        onClick={frame.imageUrl ? handleImageClick : undefined}
        className={`group/img relative aspect-[4/3] w-full overflow-hidden bg-secondary ${
          isPickable ? "cursor-crosshair" : ""
        }`}
      >
        {frame.imageUrl ? (
          <img
            key={previewKey}
            src={frame.imageUrl}
            alt={frame.title}
            draggable={false}
            style={getPreviewTransform(preset, intensity, focusPoint, frame.focusX, frame.focusY)}
            className="h-full w-full object-cover [animation:framePreview_1500ms_ease-in-out_1] motion-reduce:!animate-none"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-display text-5xl text-foreground/40">
              {frame.kind === "intro" ? "Intro" : "End"}
            </span>
          </div>
        )}

        {/* focus marker (custom point) */}
        {frame.imageUrl && hasCustomFocus && (
          <>
            <FocusMarker x={frame.focusX!} y={frame.focusY!} />
            <button
              type="button"
              onClick={clearFocus}
              aria-label="Clear focus point"
              className="absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center border border-foreground/30 bg-background/85 text-foreground/70 transition hover:text-foreground"
              title="Clear focus point"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </>
        )}
      </div>

      {/* editable text */}
      <div className="flex flex-1 flex-col gap-2 px-4 py-4">
        <InlineEdit
          value={frame.title}
          onChange={(title) => onChange({ title })}
          placeholder="Title"
          className="font-display text-lg leading-tight"
          loading={loading}
        />
        <InlineEdit
          value={frame.caption}
          onChange={(caption) => onChange({ caption })}
          placeholder="Short caption…"
          className="text-sm leading-relaxed text-muted-foreground"
          multiline
          loading={loading}
        />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/*  Motion section                                                       */
/* --------------------------------------------------------------------- */

const PRESET_LABEL: Record<MotionPreset, string> = {
  none: "Static",
  zoom_in: "Zoom in",
  zoom_out: "Zoom out",
  pan_left: "Pan left",
  pan_right: "Pan right",
  pan_up: "Pan up",
  pan_down: "Pan down",
  focus_zoom: "Focus zoom",
};

const FOCUS_LABEL: Record<FocusPoint, string> = {
  center: "Center",
  top: "Top",
  bottom: "Bottom",
  left: "Left",
  right: "Right",
};

function MotionSection({
  open,
  onToggle,
  preset,
  intensity,
  focusPoint,
  hasCustomFocus,
  onPreset,
  onIntensity,
  onFocusPoint,
  onResetFocus,
}: {
  open: boolean;
  onToggle: () => void;
  preset: MotionPreset;
  intensity: MotionIntensity;
  focusPoint: FocusPoint;
  hasCustomFocus: boolean;
  onPreset: (p: MotionPreset) => void;
  onIntensity: (i: MotionIntensity) => void;
  onFocusPoint: (fp: FocusPoint) => void;
  onResetFocus: () => void;
}) {
  const isPan = preset.startsWith("pan_");
  const summary =
    preset === "none"
      ? "Static"
      : `${PRESET_LABEL[preset]} · ${cap(intensity)} · ${
          hasCustomFocus ? "Custom focus" : FOCUS_LABEL[focusPoint]
        }`;

  return (
    <div className="border-t border-foreground/15">
      <button
        type="button"
        onClick={onToggle}
        className="group/motion flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-accent/40"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Motion
          </span>
          <span className="truncate text-xs text-foreground/80">{summary}</span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-foreground/10 px-4 py-4">
          {/* Motion */}
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Motion
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Pill active={preset === "none"} onClick={() => onPreset("none")}>None</Pill>
              <Pill active={preset === "zoom_in"} onClick={() => onPreset("zoom_in")}>Zoom in</Pill>
              <Pill active={preset === "zoom_out"} onClick={() => onPreset("zoom_out")}>Zoom out</Pill>
              <Pill active={isPan} onClick={() => onPreset("pan_right")}>Pan</Pill>
              <Pill active={preset === "focus_zoom"} onClick={() => onPreset("focus_zoom")}>Focus zoom</Pill>
            </div>

            {isPan && (
              <div className="flex items-center gap-2 pt-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Direction
                </span>
                <div className="flex gap-1">
                  <IconPill active={preset === "pan_left"} onClick={() => onPreset("pan_left")} label="Pan left">
                    <ArrowLeft className="h-3 w-3" />
                  </IconPill>
                  <IconPill active={preset === "pan_right"} onClick={() => onPreset("pan_right")} label="Pan right">
                    <ArrowRight className="h-3 w-3" />
                  </IconPill>
                  <IconPill active={preset === "pan_up"} onClick={() => onPreset("pan_up")} label="Pan up">
                    <ArrowUp className="h-3 w-3" />
                  </IconPill>
                  <IconPill active={preset === "pan_down"} onClick={() => onPreset("pan_down")} label="Pan down">
                    <ArrowDown className="h-3 w-3" />
                  </IconPill>
                </div>
              </div>
            )}
          </div>

          {/* Intensity */}
          {preset !== "none" && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Intensity
              </p>
              <div className="flex gap-1.5">
                <Pill active={intensity === "subtle"} onClick={() => onIntensity("subtle")}>Subtle</Pill>
                <Pill active={intensity === "medium"} onClick={() => onIntensity("medium")}>Medium</Pill>
                <Pill active={intensity === "strong"} onClick={() => onIntensity("strong")}>Strong</Pill>
              </div>
            </div>
          )}

          {/* Focus */}
          {preset !== "none" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Focus
                </p>
                {hasCustomFocus && (
                  <button
                    onClick={onResetFocus}
                    className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground underline-offset-2 transition hover:text-foreground hover:underline"
                  >
                    Reset focus
                  </button>
                )}
              </div>
              <div className="flex gap-1">
                {(["left", "top", "center", "bottom", "right"] as FocusPoint[]).map((fp) => (
                  <FocusPill
                    key={fp}
                    point={fp}
                    active={!hasCustomFocus && focusPoint === fp}
                    onClick={() => onFocusPoint(fp)}
                  />
                ))}
              </div>
              {preset === "focus_zoom" && !hasCustomFocus && (
                <p className="pt-1 text-[10px] italic text-muted-foreground">
                  Or click the image above to pick a custom point.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-2.5 py-1 text-[11px] tracking-wide transition ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-foreground/25 text-foreground/80 hover:border-foreground/60"
      }`}
    >
      {children}
    </button>
  );
}

function IconPill({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={`flex h-6 w-6 items-center justify-center border transition ${
            active
              ? "border-foreground bg-foreground text-background"
              : "border-foreground/25 text-foreground/70 hover:border-foreground/60"
          }`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function FocusPill({
  point,
  active,
  onClick,
}: {
  point: FocusPoint;
  active: boolean;
  onClick: () => void;
}) {
  // dot position inside the 24x24 pill
  const pos: Record<FocusPoint, { left: string; top: string }> = {
    center: { left: "50%", top: "50%" },
    top: { left: "50%", top: "20%" },
    bottom: { left: "50%", top: "80%" },
    left: { left: "20%", top: "50%" },
    right: { left: "80%", top: "50%" },
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Focus ${FOCUS_LABEL[point]}`}
          onClick={onClick}
          className={`relative h-6 w-6 border transition ${
            active
              ? "border-foreground bg-foreground/5"
              : "border-foreground/25 hover:border-foreground/60"
          }`}
        >
          <span
            className={`absolute h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full ${
              active ? "bg-foreground" : "bg-foreground/50"
            }`}
            style={pos[point]}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent>{FOCUS_LABEL[point]}</TooltipContent>
    </Tooltip>
  );
}

function FocusMarker({ x, y }: { x: number; y: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* crosshair */}
      <span className="absolute left-1/2 top-1/2 h-px w-4 -translate-x-1/2 -translate-y-1/2 bg-background/90 mix-blend-difference" />
      <span className="absolute left-1/2 top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-background/90 mix-blend-difference" />
      {/* ring */}
      <span className="block h-3 w-3 rounded-full border border-background/90 mix-blend-difference [animation:focusPulse_220ms_ease-out_1]" />
      {/* inner dot */}
      <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background/90 mix-blend-difference" />
    </div>
  );
}

/* --------------------------------------------------------------------- */
/*  Preview transform (visual-only — Remotion does the real thing)       */
/* --------------------------------------------------------------------- */

function intensityScale(i: MotionIntensity) {
  return i === "subtle" ? 1.04 : i === "medium" ? 1.08 : 1.12;
}

function focusOrigin(fp: FocusPoint, fx?: number, fy?: number) {
  if (fx != null && fy != null) return `${fx * 100}% ${fy * 100}%`;
  switch (fp) {
    case "top": return "50% 0%";
    case "bottom": return "50% 100%";
    case "left": return "0% 50%";
    case "right": return "100% 50%";
    default: return "50% 50%";
  }
}

function getPreviewTransform(
  preset: MotionPreset,
  intensity: MotionIntensity,
  fp: FocusPoint,
  fx?: number,
  fy?: number,
): React.CSSProperties {
  // CSS keyframes (defined in styles.css) read these custom props
  const scale = intensityScale(intensity);
  const origin = focusOrigin(fp, fx, fy);
  const style: React.CSSProperties & Record<string, string> = {
    transformOrigin: origin,
    ["--from-scale"]: "1",
    ["--to-scale"]: "1",
    ["--from-x"]: "0%",
    ["--to-x"]: "0%",
    ["--from-y"]: "0%",
    ["--to-y"]: "0%",
  };
  switch (preset) {
    case "none":
      break;
    case "zoom_in":
      style["--to-scale"] = String(scale);
      break;
    case "zoom_out":
      style["--from-scale"] = String(scale);
      break;
    case "pan_left":
      style["--from-x"] = "3%"; style["--to-x"] = "-3%"; style["--from-scale"] = String(scale); style["--to-scale"] = String(scale);
      break;
    case "pan_right":
      style["--from-x"] = "-3%"; style["--to-x"] = "3%"; style["--from-scale"] = String(scale); style["--to-scale"] = String(scale);
      break;
    case "pan_up":
      style["--from-y"] = "3%"; style["--to-y"] = "-3%"; style["--from-scale"] = String(scale); style["--to-scale"] = String(scale);
      break;
    case "pan_down":
      style["--from-y"] = "-3%"; style["--to-y"] = "3%"; style["--from-scale"] = String(scale); style["--to-scale"] = String(scale);
      break;
    case "focus_zoom":
      style["--to-scale"] = String(scale);
      break;
  }
  return style;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface InlineEditProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
  multiline?: boolean;
  loading?: boolean;
}

function InlineEdit({ value, onChange, placeholder, className, multiline, loading }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      if ("select" in ref.current) ref.current.select();
    }
  }, [editing]);

  function commit() {
    setEditing(false);
    if (draft !== value) onChange(draft);
  }

  if (loading) {
    return (
      <div className={`${className} animate-pulse space-y-2`} aria-busy="true" aria-label="Generating">
        <div className="h-3 w-3/4 bg-foreground/10" />
        {multiline && <div className="h-3 w-1/2 bg-foreground/10" />}
      </div>
    );
  }

  if (editing) {
    if (multiline) {
      return (
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDraft(value);
              setEditing(false);
            }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
          }}
          rows={3}
          className={`${className} w-full resize-none border-b border-foreground/40 bg-transparent outline-none focus:border-foreground`}
        />
      );
    }
    return (
      <input
        ref={ref as React.RefObject<HTMLInputElement>}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={`${className} w-full border-b border-foreground/40 bg-transparent outline-none focus:border-foreground`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Click to edit"
      className={`${className} group/edit cursor-text border-b border-dotted border-transparent text-left transition hover:border-foreground/60`}
    >
      {value || <span className="text-muted-foreground/60">{placeholder}</span>}
    </button>
  );
}