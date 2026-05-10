import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  X,
  Sparkles,
  Pencil,
  ZoomIn,
  ZoomOut,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Crosshair,
  Check,
  RotateCcw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Frame, PanDir, ZoomDir } from "@/lib/storyframes";
import { hasMotion, hasRenderableMotion, motionStyle } from "@/lib/storyframes";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";

interface Props {
  frame: Frame;
  index: number;
  onChange: (patch: Partial<Frame>) => void;
  onRemove: () => void;
  onRegenerate: () => void;
  onApplyToAll: (patch: Partial<Frame>) => void;
  loading?: boolean;
}

export function FrameCard({
  frame,
  index,
  onChange,
  onRemove,
  onRegenerate,
  onApplyToAll,
  loading,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: frame.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const zoom: ZoomDir = frame.motionZoom ?? "none";
  const pan: PanDir = frame.motionPan ?? "none";
  const intensity = frame.motionIntensity ?? 50;
  const hasFocus = frame.focusX != null && frame.focusY != null;
  const motionOn = hasMotion(frame);
  const previewMotionOn = hasRenderableMotion(frame);

  const [editing, setEditing] = useState(false);
  const [appliedAt, setAppliedAt] = useState(0);
  const awaitingFocus = editing && zoom !== "none" && !hasFocus;
  const justApplied = appliedAt > 0 && Date.now() - appliedAt < 1500;
  useEffect(() => {
    if (!appliedAt) return;
    const t = setTimeout(() => setAppliedAt(0), 1500);
    return () => clearTimeout(t);
  }, [appliedAt]);

  const imgWrapRef = useRef<HTMLDivElement>(null);
  const dotDragRef = useRef(false);

  function stopFocusDrag() {
    dotDragRef.current = false;
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePointerEnd = () => stopFocusDrag();
    window.addEventListener("pointerup", handlePointerEnd, true);
    window.addEventListener("pointercancel", handlePointerEnd, true);
    window.addEventListener("blur", handlePointerEnd);
    return () => {
      window.removeEventListener("pointerup", handlePointerEnd, true);
      window.removeEventListener("pointercancel", handlePointerEnd, true);
      window.removeEventListener("blur", handlePointerEnd);
    };
  }, []);

  function setFocusFromEvent(e: React.PointerEvent | PointerEvent) {
    if (!imgWrapRef.current) return;
    const rect = imgWrapRef.current.getBoundingClientRect();
    const x = clamp01((e.clientX - rect.left) / rect.width);
    const y = clamp01((e.clientY - rect.top) / rect.height);
    onChange({ focusX: x, focusY: y });
  }
  function onImagePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!editing || zoom === "none" || e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-no-dot]")) return;
    dotDragRef.current = true;
    setFocusFromEvent(e);
  }
  function onImagePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dotDragRef.current || (typeof e.buttons === "number" && e.buttons === 0)) return;
    setFocusFromEvent(e);
  }
  function onImagePointerUp() {
    if (!dotDragRef.current) return;
    stopFocusDrag();
  }

  function resetMotion() {
    onChange({
      motionZoom: "none",
      motionPan: "none",
      motionIntensity: 50,
      focusX: undefined,
      focusY: undefined,
    });
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col bg-card transition ${
        editing
          ? "ring-2 ring-primary shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_18%,transparent)]"
          : ""
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
          {motionOn && (
            <span className="inline-flex items-center gap-1 bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-primary">
              {zoom !== "none" && <span>{zoom === "in" ? "Zoom in" : "Zoom out"}</span>}
              {zoom !== "none" && pan !== "none" && <span>·</span>}
              {pan !== "none" && <span>Pan {arrow(pan)}</span>}
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
        onPointerDown={onImagePointerDown}
        onPointerMove={onImagePointerMove}
        onPointerUp={onImagePointerUp}
        onPointerCancel={onImagePointerUp}
        className={`group/img relative aspect-[4/3] w-full overflow-hidden bg-secondary ${
          awaitingFocus ? "cursor-crosshair" : ""
        }`}
      >
        {frame.imageUrl ? (
          <img
            src={frame.imageUrl}
            alt={frame.title}
            draggable={false}
            style={motionStyle(frame)}
            className={`h-full w-full object-cover ${previewMotionOn ? "frame-preview-anim" : ""}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-display text-5xl text-foreground/40">
              {frame.kind === "intro" ? "Intro" : "End"}
            </span>
          </div>
        )}

        {/* focus dot */}
        {frame.imageUrl && hasFocus && (zoom !== "none" || editing) && (
          <FocusMarker x={frame.focusX!} y={frame.focusY!} pulse={editing} />
        )}

        {/* Edit button — bottom right */}
        {frame.imageUrl && (
          <Popover open={editing} onOpenChange={setEditing}>
            <PopoverTrigger asChild>
              <button
                type="button"
                data-no-dot
                aria-label="Edit motion"
                className={`absolute bottom-3 right-3 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] shadow-[0_4px_12px_rgba(0,0,0,0.18)] transition ${
                  editing
                    ? "bg-primary text-primary-foreground"
                    : "bg-background/95 text-foreground hover:bg-background"
                }`}
              >
                <Pencil className="h-3 w-3" />
                {motionOn ? "Edit motion" : "Edit"}
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="right"
              align="start"
              sideOffset={12}
              collisionPadding={16}
              className="w-80 p-0"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onPointerDownOutside={(e) => {
                // Don't close when clicking the image of the same card —
                // that click is for setting the focus point.
                if (imgWrapRef.current?.contains(e.target as Node)) {
                  e.preventDefault();
                }
              }}
              onInteractOutside={(e) => {
                if (imgWrapRef.current?.contains(e.target as Node)) {
                  e.preventDefault();
                }
              }}
            >
              <div className="border-b border-foreground/15 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  Motion · Frame {String(index + 1).padStart(2, "0")}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Combine a zoom and a pan. Click on the image to set a focus point.
                </p>
              </div>

              <Section label="Zoom">
                <div className="grid grid-cols-3 gap-1">
                  <Pill active={zoom === "none"} onClick={() => onChange({ motionZoom: "none" })}>
                    None
                  </Pill>
                  <Pill
                    active={zoom === "in"}
                    onClick={() => onChange({ motionZoom: "in", focusX: undefined, focusY: undefined })}
                  >
                    <ZoomIn className="h-3 w-3" /> In
                  </Pill>
                  <Pill
                    active={zoom === "out"}
                    onClick={() => onChange({ motionZoom: "out", focusX: undefined, focusY: undefined })}
                  >
                    <ZoomOut className="h-3 w-3" /> Out
                  </Pill>
                </div>
              </Section>

              <Section label="Pan">
                <div className="grid grid-cols-5 gap-1">
                  <Pill active={pan === "none"} onClick={() => onChange({ motionPan: "none" })}>
                    —
                  </Pill>
                  <Pill active={pan === "left"} onClick={() => onChange({ motionPan: "left" })}>
                    <ArrowLeft className="h-3 w-3" />
                  </Pill>
                  <Pill active={pan === "right"} onClick={() => onChange({ motionPan: "right" })}>
                    <ArrowRight className="h-3 w-3" />
                  </Pill>
                  <Pill active={pan === "up"} onClick={() => onChange({ motionPan: "up" })}>
                    <ArrowUp className="h-3 w-3" />
                  </Pill>
                  <Pill active={pan === "down"} onClick={() => onChange({ motionPan: "down" })}>
                    <ArrowDown className="h-3 w-3" />
                  </Pill>
                </div>
              </Section>

              <Section label={`Intensity · ${intensity}`}>
                <div className={motionOn ? "" : "opacity-30"}>
                  <Slider
                    value={[intensity]}
                    min={0}
                    max={100}
                    step={1}
                    disabled={!motionOn}
                    onValueChange={([v]) => onChange({ motionIntensity: v })}
                  />
                  <div className="mt-1 flex justify-between text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                    <span>Subtle</span>
                    <span>Medium</span>
                    <span>Strong</span>
                  </div>
                </div>
              </Section>

              {zoom !== "none" && (
                <div className="border-t border-foreground/15 px-3 py-2">
                  <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    <Crosshair className="h-3 w-3" />
                    {hasFocus ? "Focus set — drag dot on image" : `Click on image to target zoom ${zoom}`}
                  </p>
                  {hasFocus && (
                    <button
                      type="button"
                      onClick={() => onChange({ focusX: undefined, focusY: undefined })}
                      className="mt-1 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    >
                      Clear focus point
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 border-t border-foreground/15 p-2">
                <button
                  type="button"
                  onClick={resetMotion}
                  className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onApplyToAll({
                        motionZoom: zoom,
                        motionPan: pan,
                        motionIntensity: intensity,
                      });
                      setAppliedAt(Date.now());
                    }}
                    className={`text-[10px] uppercase tracking-[0.18em] transition ${
                      justApplied ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {justApplied ? "Applied to all ✓" : "Apply to all"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="inline-flex items-center gap-1 bg-primary px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-primary-foreground transition hover:bg-primary/85"
                  >
                    <Check className="h-3 w-3" /> Done
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
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

function arrow(p: PanDir) {
  return p === "left" ? "←" : p === "right" ? "→" : p === "up" ? "↑" : p === "down" ? "↓" : "";
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-foreground/15 px-3 py-2.5 first:border-t-0">
      <p className="mb-1.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      {children}
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
      className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] uppercase tracking-[0.16em] transition ${
        active
          ? "bg-primary text-primary-foreground"
          : "border border-foreground/20 text-foreground hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

function FocusMarker({ x, y, pulse }: { x: number; y: number; pulse?: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-10"
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <span className="absolute left-1/2 top-1/2 h-px w-4 -translate-x-1/2 -translate-y-1/2 bg-primary" />
      <span className="absolute left-1/2 top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-primary" />
      <span
        className={`block h-3 w-3 rounded-full border-2 border-primary bg-background ${
          pulse ? "[animation:focusPulse_240ms_ease-out_1]" : ""
        }`}
      />
    </div>
  );
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

interface InlineEditProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
  multiline?: boolean;
  loading?: boolean;
}

function InlineEdit({
  value,
  onChange,
  placeholder,
  className,
  multiline,
  loading,
}: InlineEditProps) {
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
      <div
        className={`${className} animate-pulse space-y-2`}
        aria-busy="true"
        aria-label="Generating"
      >
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
