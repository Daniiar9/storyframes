import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { Sparkles, Download, Wand2, RotateCcw, ArrowUp, Pencil, X } from "lucide-react";
import { Uploader } from "./Uploader";
import { FrameCard } from "./FrameCard";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  exportStory,
  nextSuggestion,
  uid,
  type Frame,
} from "@/lib/storyframes";

export function StoryEditor() {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [context, setContext] = useState("");
  const [includeIntro, setIncludeIntro] = useState(true);
  const [includeOutro, setIncludeOutro] = useState(true);
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [hasGenerated, setHasGenerated] = useState(false);
  const [promptOpen, setPromptOpen] = useState(true);

  const imageFrames = frames.filter((f) => f.kind === "image");

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      frames.forEach((f) => f.imageUrl && URL.revokeObjectURL(f.imageUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addFiles(files: File[]) {
    const newOnes: Frame[] = files.map((file) => ({
      id: uid(),
      kind: "image",
      imageUrl: URL.createObjectURL(file),
      fileName: file.name,
      title: file.name.replace(/\.[^.]+$/, ""),
      caption: "",
      generated: false,
    }));
    setFrames((prev) => {
      // Insert before outro if present
      const outroIdx = prev.findIndex((f) => f.kind === "outro");
      if (outroIdx === -1) return [...prev, ...newOnes];
      return [...prev.slice(0, outroIdx), ...newOnes, ...prev.slice(outroIdx)];
    });
  }

  function patchFrame(id: string, patch: Partial<Frame>) {
    setFrames((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeFrame(id: string) {
    setFrames((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.imageUrl) URL.revokeObjectURL(target.imageUrl);
      return prev.filter((f) => f.id !== id);
    });
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setFrames((prev) => {
      const from = prev.findIndex((f) => f.id === active.id);
      const to = prev.findIndex((f) => f.id === over.id);
      if (from === -1 || to === -1) return prev;
      return arrayMove(prev, from, to);
    });
  }

  async function generate() {
    // Build a fresh ordered list with optional intro/outro
    const base: Frame[] = [];
    if (includeIntro) {
      base.push({
        id: uid(),
        kind: "intro",
        title: "",
        caption: "",
        generated: false,
      });
    }
    base.push(...imageFrames.map((f) => ({ ...f, title: "", caption: "", generated: false })));
    if (includeOutro) {
      base.push({
        id: uid(),
        kind: "outro",
        title: "",
        caption: "",
        generated: false,
      });
    }
    setFrames(base);
    setGenerating(new Set(base.map((f) => f.id)));
    setHasGenerated(true);
    setPromptOpen(false);

    // Stagger reveal for nice UX
    for (let i = 0; i < base.length; i++) {
      const f = base[i];
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 380));
      const sug = nextSuggestion(context, f.kind, i);
      setFrames((prev) =>
        prev.map((p) => (p.id === f.id ? { ...p, ...sug, generated: true } : p))
      );
      setGenerating((prev) => {
        const next = new Set(prev);
        next.delete(f.id);
        return next;
      });
    }
  }

  function regenerateOne(id: string) {
    setGenerating((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setFrames((prev) => {
        const idx = prev.findIndex((p) => p.id === id);
        if (idx === -1) return prev;
        const f = prev[idx];
        const sug = nextSuggestion(context, f.kind, idx + Math.floor(Math.random() * 7));
        return prev.map((p) => (p.id === id ? { ...p, ...sug } : p));
      });
      setGenerating((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 500);
  }

  function reset() {
    frames.forEach((f) => f.imageUrl && URL.revokeObjectURL(f.imageUrl));
    setFrames([]);
    setContext("");
    setHasGenerated(false);
    setPromptOpen(true);
  }

  function doExport() {
    const text = exportStory(frames, context);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "storyframes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  const canGenerate = imageFrames.length > 0;
  const totalCount = frames.length;

  const headerStats = useMemo(() => {
    if (!totalCount) return "No frames yet";
    return `${imageFrames.length} image${imageFrames.length === 1 ? "" : "s"} · ${totalCount} frame${totalCount === 1 ? "" : "s"}`;
  }, [imageFrames.length, totalCount]);

  return (
    <TooltipProvider delayDuration={200}>
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-foreground/15 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-xl tracking-tight">StoryFrames</span>
            <span className="hidden text-xs uppercase tracking-[0.25em] text-muted-foreground sm:inline">
              an editorial story builder
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground md:inline">{headerStats}</span>
            {hasGenerated && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-1.5 border border-foreground/30 px-3 py-2 text-xs uppercase tracking-[0.18em] transition hover:bg-accent"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                  </button>
                </TooltipTrigger>
                <TooltipContent>Clear all frames and start over</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={doExport}
                  disabled={!hasGenerated || totalCount === 0}
                  className="inline-flex items-center gap-1.5 bg-foreground px-4 py-2 text-xs uppercase tracking-[0.18em] text-background transition hover:bg-foreground/85 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" /> Export story
                </button>
              </TooltipTrigger>
              <TooltipContent>Download the ordered story as a text file</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>

      <main
        className={`mx-auto max-w-[1400px] px-6 py-10 ${
          frames.length > 0 && (!hasGenerated || promptOpen) ? "pb-44" : ""
        }`}
      >
        {/* Stage 1 — empty: hero + uploader, NO prompt yet */}
        {frames.length === 0 ? (
          <section className="space-y-10">
            <div className="space-y-5">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Issue №01 — A Story Builder
              </p>
              <h1 className="font-display text-5xl leading-[0.95] md:text-6xl">
                Turn a folder of images
                <br />
                into a <em className="italic text-foreground/70">clean ordered story.</em>
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
                Start by dropping in your images. Once they're here, you'll tell us what
                you're trying to show — and we'll write titles, captions, and an intro &
                ending you can edit.
              </p>
              <ol className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                <li><span className="text-foreground">01</span> Upload images</li>
                <li className="text-foreground/30">·</li>
                <li><span className="text-foreground/40">02</span> Describe the story</li>
                <li className="text-foreground/30">·</li>
                <li><span className="text-foreground/40">03</span> Generate & edit</li>
              </ol>
            </div>
            <Uploader onFiles={addFiles} />
          </section>
        ) : (
          <section>
            {hasGenerated && !promptOpen && (
              <PromptChip
                context={context}
                onEdit={() => setPromptOpen(true)}
                onRegenerate={generate}
              />
            )}
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="font-display text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  The Frames
                </p>
                <h2 className="mt-1 font-display text-2xl">
                  {hasGenerated ? "Your story, in order" : "Your uploads"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {hasGenerated
                    ? "Drag to reorder. Click any title or caption to edit."
                    : "Drag to reorder. Add more — then describe your story below."}
                </p>
              </div>
              {hasGenerated && (
                <span className="hidden items-center gap-1.5 text-xs text-muted-foreground md:inline-flex">
                  <Sparkles className="h-3.5 w-3.5" /> AI suggestions are editable
                </span>
              )}
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={frames.map((f) => f.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {frames.map((f, i) => (
                    <FrameCard
                      key={f.id}
                      frame={f}
                      index={i}
                      onChange={(p) => patchFrame(f.id, p)}
                      onRemove={() => removeFrame(f.id)}
                      onRegenerate={() => regenerateOne(f.id)}
                      loading={generating.has(f.id)}
                    />
                  ))}
                  <Uploader onFiles={addFiles} variant="compact" />
                </div>
              </SortableContext>
            </DndContext>
          </section>
        )}

        <footer className="mt-20 flex flex-col items-start justify-between gap-2 border-t border-foreground/15 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>StoryFrames — a quiet way to sequence images.</span>
          <span className="font-display tracking-[0.2em]">№01 · 2026</span>
        </footer>
      </main>

      {/* Stage 2/3 — sticky chat-like prompt bar at bottom, only after uploads */}
      {frames.length > 0 && (!hasGenerated || promptOpen) && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-foreground/15 bg-background/95 backdrop-blur">
          <div className="mx-auto max-w-[1400px] px-6 py-4">
            {hasGenerated && (
              <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                <span>Edit prompt</span>
                <button
                  onClick={() => setPromptOpen(false)}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  <X className="h-3 w-3" /> Close
                </button>
              </div>
            )}
            <PromptBar
              context={context}
              setContext={setContext}
              includeIntro={includeIntro}
              setIncludeIntro={setIncludeIntro}
              includeOutro={includeOutro}
              setIncludeOutro={setIncludeOutro}
              onGenerate={() => {
                generate();
              }}
              canGenerate={canGenerate}
              hasGenerated={hasGenerated}
              imagesCount={imageFrames.length}
            />
          </div>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}

function PromptChip({
  context,
  onEdit,
  onRegenerate,
}: {
  context: string;
  onEdit: () => void;
  onRegenerate: () => void;
}) {
  return (
    <div className="mb-6 flex items-center gap-3 border border-foreground/15 bg-card px-4 py-3">
      <span className="hidden text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:inline">
        Prompt
      </span>
      <span className="hidden h-4 w-px bg-foreground/15 sm:inline-block" />
      <p className="flex-1 truncate text-sm italic text-foreground/80">
        {context.trim() ? `"${context.trim()}"` : <span className="not-italic text-muted-foreground">No prompt provided</span>}
      </p>
      <button
        onClick={onEdit}
        className="inline-flex items-center gap-1.5 border border-foreground/25 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.18em] transition hover:bg-accent"
      >
        <Pencil className="h-3 w-3" /> Edit
      </button>
      <button
        onClick={onRegenerate}
        className="inline-flex items-center gap-1.5 bg-foreground px-2.5 py-1.5 text-[10px] uppercase tracking-[0.18em] text-background transition hover:bg-foreground/85"
      >
        <Wand2 className="h-3 w-3" /> Regenerate
      </button>
    </div>
  );
}

function PromptBar({
  context,
  setContext,
  includeIntro,
  setIncludeIntro,
  includeOutro,
  setIncludeOutro,
  onGenerate,
  canGenerate,
  hasGenerated,
  imagesCount,
}: {
  context: string;
  setContext: (v: string) => void;
  includeIntro: boolean;
  setIncludeIntro: (v: boolean) => void;
  includeOutro: boolean;
  setIncludeOutro: (v: boolean) => void;
  onGenerate: () => void;
  canGenerate: boolean;
  hasGenerated: boolean;
  imagesCount: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-3 rounded-md border border-foreground/25 bg-card p-3 focus-within:border-foreground">
        <div className="flex-1">
          <label className="block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            What are you trying to show?
          </label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={1}
            autoFocus={!hasGenerated}
            placeholder={`Describe your story — e.g. the redesign of our checkout, from problem to shipped screens. (${imagesCount} image${imagesCount === 1 ? "" : "s"} ready)`}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canGenerate) {
                e.preventDefault();
                onGenerate();
              }
            }}
            className="mt-1 max-h-40 min-h-[28px] w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70"
          />
        </div>
        <button
          onClick={onGenerate}
          disabled={!canGenerate}
          title={hasGenerated ? "Regenerate story" : "Generate story"}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center bg-foreground text-background transition hover:bg-foreground/85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {hasGenerated ? <Wand2 className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <Toggle label="Intro frame" checked={includeIntro} onChange={setIncludeIntro} />
          <Toggle label="Ending takeaway" checked={includeOutro} onChange={setIncludeOutro} />
        </div>
        <span className="hidden sm:inline">
          {hasGenerated ? "Edit prompt and regenerate anytime" : "⌘/Ctrl + Enter to generate"}
        </span>
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2">
      <span
        onClick={() => onChange(!checked)}
        className={`relative h-4 w-7 rounded-full border transition ${
          checked ? "border-foreground bg-foreground" : "border-foreground/40 bg-transparent"
        }`}
      >
        <span
          className={`absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full transition-all ${
            checked ? "left-3.5 bg-background" : "left-0.5 bg-foreground/60"
          }`}
        />
      </span>
      <span className="uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
    </label>
  );
}