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
import { Sparkles, Download, Wand2, RotateCcw } from "lucide-react";
import { Uploader } from "./Uploader";
import { FrameCard } from "./FrameCard";
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
              <button
                onClick={reset}
                className="inline-flex items-center gap-1.5 border border-foreground/30 px-3 py-2 text-xs uppercase tracking-[0.18em] transition hover:bg-accent"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            )}
            <button
              onClick={doExport}
              disabled={!hasGenerated || totalCount === 0}
              className="inline-flex items-center gap-1.5 bg-foreground px-4 py-2 text-xs uppercase tracking-[0.18em] text-background transition hover:bg-foreground/85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-10">
        {/* Hero / context */}
        <section className="mb-12 grid gap-8 md:grid-cols-[1.2fr_1fr] md:gap-12">
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
              Upload screenshots, photos, or mockups. Drag to reorder. Add one prompt about
              what you're trying to show. We'll write titles, captions, and an intro & ending —
              all editable.
            </p>
          </div>

          <div className="border border-foreground/20 bg-card p-6">
            <label className="font-display text-xs uppercase tracking-[0.22em] text-muted-foreground">
              The prompt
            </label>
            <p className="mt-1 font-display text-2xl leading-tight">
              What are you trying to show?
            </p>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
              placeholder="e.g. The redesign of our checkout flow, from the original problem to the final shipped screens."
              className="mt-4 w-full resize-none border-b border-foreground/30 bg-transparent pb-2 text-sm leading-relaxed outline-none transition focus:border-foreground"
            />

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
              <Toggle label="Intro frame" checked={includeIntro} onChange={setIncludeIntro} />
              <Toggle label="Ending takeaway" checked={includeOutro} onChange={setIncludeOutro} />
            </div>

            <button
              onClick={generate}
              disabled={!canGenerate}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-foreground px-4 py-3 text-sm font-medium tracking-wide text-background transition hover:bg-foreground/85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Wand2 className="h-4 w-4" />
              {hasGenerated ? "Regenerate story" : "Generate story"}
            </button>
            {!canGenerate && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Add at least one image below to begin.
              </p>
            )}
          </div>
        </section>

        <div className="rule mb-10" />

        {/* Frames area */}
        {frames.length === 0 ? (
          <Uploader onFiles={addFiles} />
        ) : (
          <section>
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
                    : "Drag to reorder. Add more, then generate."}
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