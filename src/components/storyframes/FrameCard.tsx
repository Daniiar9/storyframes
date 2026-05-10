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
import { FrameMotionMenu } from "./FrameMotionMenu";

interface Props {
  frame: Frame;
  index: number;
  onChange: (patch: Partial<Frame>) => void;
  onRemove: () => void;
  onRegenerate: () => void;
  loading?: boolean;
  onApplyToAll?: (patch: Partial<Frame>) => void;
}

export function FrameCard({ frame, index, onChange, onRemove, onRegenerate, loading, onApplyToAll }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: frame.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const preset: MotionPreset = frame.motionPreset ?? "none";
  const intensity: MotionIntensity = frame.motionIntensity ?? "subtle";
  const focusPoint: FocusPoint = frame.focusPoint ?? "center";
  const hasCustomFocus = frame.focusX != null && frame.focusY != null;

  const [previewKey, setPreviewKey] = useState(0);
  const [pickingFocus, setPickingFocus] = useState(false);
  const imgWrapRef = useRef<HTMLDivElement>(null);

  // Re-trigger the in-card preview animation whenever motion settings change
  useEffect(() => {
    if (!frame.imageUrl) return;
    setPreviewKey((k) => k + 1);
  }, [preset, intensity, focusPoint, frame.focusX, frame.focusY, frame.imageUrl]);

  // Esc cancels custom-focus pick mode
  useEffect(() => {
    if (!pickingFocus) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickingFocus(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickingFocus]);

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!pickingFocus || !imgWrapRef.current) return;
    const rect = imgWrapRef.current.getBoundingClientRect();
    const x = clamp01((e.clientX - rect.left) / rect.width);
    const y = clamp01((e.clientY - rect.top) / rect.height);
    onChange({
      motionPreset: preset === "none" ? "focus_zoom" : preset,
      focusX: x,
      focusY: y,
    });
    setPickingFocus(false);
  }

  function clearFocus(e: React.MouseEvent) {
    e.stopPropagation();
    onChange({ focusX: undefined, focusY: undefined });
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative flex flex-col bg-card transition"
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
          pickingFocus ? "cursor-crosshair ring-1 ring-foreground" : ""
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

        {/* Pick-mode hint */}
        {pickingFocus && frame.imageUrl && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-foreground/90 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-background">
            <span>Click to set focus</span>
            <span className="opacity-70">Esc to cancel</span>
          </div>
        )}

        {/* Inline motion menu — bottom-left of image */}
        {frame.imageUrl && (
          <div
            className={`pointer-events-none absolute bottom-2 left-2 z-10 transition ${
              pickingFocus
                ? "opacity-0"
                : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
            } ${preset !== "none" || hasCustomFocus ? "!opacity-100" : ""}`}
          >
            <FrameMotionMenu
              frame={frame}
              onChange={onChange}
              onApplyToAll={(p) => onApplyToAll?.(p)}
              onPickCustomFocus={() => setPickingFocus(true)}
              customFocusActive={pickingFocus}
            />
          </div>
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