import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Frame } from "@/lib/storyframes";

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative flex flex-col bg-card"
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
          <button
            onClick={onRegenerate}
            title="Regenerate"
            className="flex h-7 w-7 items-center justify-center text-muted-foreground transition hover:text-foreground"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
          <button
            {...attributes}
            {...listeners}
            title="Drag to reorder"
            className="flex h-7 w-7 cursor-grab items-center justify-center text-muted-foreground transition hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <button
            onClick={onRemove}
            title="Remove"
            className="flex h-7 w-7 items-center justify-center text-muted-foreground transition hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* image / placeholder */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
        {frame.imageUrl ? (
          <img
            src={frame.imageUrl}
            alt={frame.title}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-display text-5xl text-foreground/40">
              {frame.kind === "intro" ? "Intro" : "End"}
            </span>
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
      <div className={`${className} animate-pulse`}>
        <div className="h-3 w-3/4 bg-foreground/10" />
        {multiline && <div className="mt-2 h-3 w-1/2 bg-foreground/10" />}
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
      className={`${className} cursor-text border-b border-transparent text-left transition hover:border-foreground/30`}
    >
      {value || <span className="text-muted-foreground/60">{placeholder}</span>}
    </button>
  );
}