"use client";

/* eslint-disable @next/next/no-img-element */

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Download,
  Film,
  GripVertical,
  ImagePlus,
  Loader2,
  Plus,
  Sparkles,
  Upload,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ZoomIn,
  ZoomOut,
  Ban,
  Crosshair,
} from "lucide-react";
import type { MouseEvent } from "react";
import { useMemo, useState } from "react";
import { Player } from "@remotion/player";
import {
  DEFAULT_FOCUS_POINT,
  DEFAULT_MOTION_INTENSITY,
  DEFAULT_MOTION_PRESET,
  DEFAULT_PAN,
  DEFAULT_ZOOM,
  FocusPoint,
  getFrameMotion,
  getStoryDurationInFrames,
  hasFocusTarget,
  hasRenderableMotion,
  MotionIntensity,
  MotionPreset,
  Pan,
  StoryFrame,
  StoryProject,
  TextFrame,
  VIDEO_FPS,
  Zoom,
} from "@/lib/story";
import { StoryVideo } from "@/remotion/StoryVideo";

type GenerationResponse = {
  source: "openai" | "local-fallback";
  model?: string;
  note?: string;
  story: {
    introFrame: TextFrame | null;
    frames: Array<{ id: string; title: string; caption: string }>;
    outroFrame: TextFrame | null;
  };
};

const emptyStatus = "Upload images, order them, then generate the story.";
const UPLOAD_INPUT_ID = "storyframes-image-upload";

const motionPresetOptions: Array<{ value: MotionPreset; label: string }> = [
  { value: "none", label: "None" },
  { value: "zoom_in", label: "Zoom in" },
  { value: "zoom_out", label: "Zoom out" },
  { value: "pan_left", label: "Pan left" },
  { value: "pan_right", label: "Pan right" },
  { value: "pan_up", label: "Pan up" },
  { value: "pan_down", label: "Pan down" },
  { value: "focus_zoom", label: "Focus zoom" },
];

const motionIntensityOptions: Array<{ value: MotionIntensity; label: string }> = [
  { value: "subtle", label: "Subtle" },
  { value: "medium", label: "Medium" },
  { value: "strong", label: "Strong" },
];

function zoomToPreset(zoom: Zoom, pan: Pan, hasFocus: boolean): MotionPreset {
  if (zoom === "in") return hasFocus ? "focus_zoom" : "zoom_in";
  if (zoom === "out") return "zoom_out";
  if (pan === "left") return "pan_left";
  if (pan === "right") return "pan_right";
  if (pan === "up") return "pan_up";
  if (pan === "down") return "pan_down";
  return "none";
}

function SortableThumbnail({
  frame,
  index,
  selected,
  onSelect,
}: {
  frame: StoryFrame;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: frame.id,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      data-testid={`thumbnail-${index}`}
      onClick={onSelect}
      className={`group grid w-full cursor-pointer grid-cols-[34px_74px_1fr_22px] items-center gap-3 border p-2 text-left transition ${
        selected
          ? "border-stone-950 bg-[#f7f5ef] shadow-[inset_4px_0_0_#1c1917]"
          : "border-stone-300 bg-[#fbfaf6] hover:border-stone-950"
      } ${isDragging ? "opacity-60" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <span className="font-mono text-[11px] font-semibold text-stone-500">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="relative h-14 w-[74px] overflow-hidden border border-stone-300 bg-stone-200">
        <img src={frame.imageDataUrl} alt="" className="h-full w-full object-cover" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-mono text-[10px] uppercase text-stone-500">
          Frame
        </span>
        <span className="block truncate text-sm font-medium text-stone-950">
          {frame.title || frame.fileName}
        </span>
      </span>
      <span
        data-testid={`drag-handle-${index}`}
        className="flex h-8 w-6 cursor-grab items-center justify-center text-stone-400 transition group-hover:text-stone-950"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </span>
    </button>
  );
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function drawTextBlock(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/);
  let line = "";
  let currentY = y;

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && line) {
      context.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  });

  if (line) {
    context.fillText(line, x, currentY);
  }
}

function SelectField<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="block text-xs font-semibold text-stone-600" htmlFor={id}>
      {label}
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="mt-1 h-10 w-full cursor-pointer border border-stone-300 bg-white px-3 text-sm font-medium text-stone-900 outline-none transition focus:border-stone-950"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

async function readImageFile(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = reject;
    element.src = dataUrl;
  });

  const maxSide = 1800;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    return dataUrl;
  }
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

export default function Home() {
  const [frames, setFrames] = useState<StoryFrame[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contextPrompt, setContextPrompt] = useState("");
  const [introFrame, setIntroFrame] = useState<TextFrame | null>(null);
  const [outroFrame, setOutroFrame] = useState<TextFrame | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [status, setStatus] = useState(emptyStatus);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const story: StoryProject = useMemo(
    () => ({
      context: contextPrompt,
      frames,
      introFrame,
      outroFrame,
    }),
    [contextPrompt, frames, introFrame, outroFrame],
  );

  const selectedFrame = frames.find((frame) => frame.id === selectedId) ?? frames[0] ?? null;
  const durationInFrames = Math.max(getStoryDurationInFrames(story), VIDEO_FPS);
  const hasGeneratedStory =
    frames.some((frame) => frame.title.trim() || frame.caption.trim()) || Boolean(introFrame || outroFrame);

  async function handleFiles(files: FileList | File[]) {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) {
      return;
    }

    setStatus("Preparing images for the story board...");
    const newFrames = await Promise.all(
      imageFiles.map(async (file) => ({
        id: `${crypto.randomUUID()}`,
        fileName: file.name,
        imageDataUrl: await readImageFile(file),
        title: "",
        caption: "",
        motionPreset: DEFAULT_MOTION_PRESET,
        motionIntensity: DEFAULT_MOTION_INTENSITY,
        focusPoint: DEFAULT_FOCUS_POINT,
      })),
    );

    setFrames((current) => {
      const updated = [...current, ...newFrames];
      if (!selectedId && updated[0]) {
        setSelectedId(updated[0].id);
      }
      return updated;
    });
    setStatus(`${newFrames.length} image${newFrames.length === 1 ? "" : "s"} added.`);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    setFrames((current) => {
      const oldIndex = current.findIndex((frame) => frame.id === active.id);
      const newIndex = current.findIndex((frame) => frame.id === over.id);
      return arrayMove(current, oldIndex, newIndex);
    });
    setStatus("Story order updated.");
  }

  function updateFrame(id: string, patch: Partial<StoryFrame>) {
    setFrames((current) => current.map((frame) => (frame.id === id ? { ...frame, ...patch } : frame)));
  }

  function setCustomFocus(frame: StoryFrame, event: MouseEvent<HTMLImageElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const focusX = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const focusY = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));

    const motion = getFrameMotion(frame);
    updateFrame(frame.id, {
      focusX,
      focusY,
      motionPreset: zoomToPreset(motion.zoom === "none" ? "in" : motion.zoom, motion.pan, true),
      zoom: motion.zoom === "none" ? "in" : motion.zoom,
      motionIntensity: frame.motionIntensity ?? DEFAULT_MOTION_INTENSITY,
    });
    setStatus("Focus locked. Adjust zoom, pan, or intensity.");
  }

  function setZoom(frame: StoryFrame, zoom: Zoom) {
    const motion = getFrameMotion(frame);
    // Switching zoom direction always clears the previous focus so the
    // user explicitly retargets the area to zoom into/out of.
    const clearFocus = zoom !== "none" && zoom !== motion.zoom;
    updateFrame(frame.id, {
      zoom,
      motionPreset: zoomToPreset(zoom, motion.pan, !clearFocus && hasFocusTarget(frame)),
      ...(clearFocus ? { focusX: undefined, focusY: undefined } : null),
    });
    if (zoom !== "none") {
      setStatus(`Click on image to target zoom ${zoom}.`);
    } else {
      setStatus("Zoom cleared.");
    }
  }

  function setPan(frame: StoryFrame, pan: Pan) {
    const motion = getFrameMotion(frame);
    updateFrame(frame.id, {
      pan,
      motionPreset: zoomToPreset(motion.zoom, pan, hasFocusTarget(frame)),
    });
    setStatus(pan === "none" ? "Pan cleared." : `Pan set: ${pan}.`);
  }

  function setIntensity(frame: StoryFrame, motionIntensity: MotionIntensity) {
    updateFrame(frame.id, { motionIntensity });
  }

  async function generateStory() {
    if (!frames.length || !contextPrompt.trim()) {
      setStatus("Add images and a context prompt before generating.");
      return;
    }

    setIsGenerating(true);
    setStatus("Generating titles and captions...");
    try {
      const response = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: contextPrompt,
          frames: frames.map(({ id, fileName, imageDataUrl }) => ({ id, fileName, imageDataUrl })),
        }),
      });

      const data = (await response.json()) as GenerationResponse | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Story generation failed.");
      }

      setIntroFrame(data.story.introFrame);
      setOutroFrame(data.story.outroFrame);
      setFrames((current) =>
        current.map((frame) => {
          const generated = data.story.frames.find((item) => item.id === frame.id);
          return generated ? { ...frame, title: generated.title, caption: generated.caption } : frame;
        }),
      );
      setStatus(
        data.source === "openai"
          ? `Story generated${data.model ? ` with ${data.model}` : ""}.`
          : data.note || "Local draft story generated.",
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Story generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function exportPngFrames() {
    if (!frames.length) {
      return;
    }

    setIsExportingPng(true);
    setStatus("Exporting PNG frames...");
    const items: Array<{ title: string; caption: string; imageDataUrl?: string; fileName: string }> = [
      ...(introFrame ? [{ ...introFrame, fileName: "00-intro.png" }] : []),
      ...frames.map((frame, index) => ({
        title: frame.title || `Frame ${index + 1}`,
        caption: frame.caption || "",
        imageDataUrl: frame.imageDataUrl,
        fileName: `${String(index + 1).padStart(2, "0")}-${frame.title || "frame"}.png`.replace(
          /[^a-z0-9_.-]+/gi,
          "-",
        ),
      })),
      ...(outroFrame ? [{ ...outroFrame, fileName: `${String(frames.length + 1).padStart(2, "0")}-takeaway.png` }] : []),
    ];

    for (const item of items) {
      const canvas = document.createElement("canvas");
      canvas.width = 1920;
      canvas.height = 1080;
      const context = canvas.getContext("2d");
      if (!context) {
        continue;
      }

      context.fillStyle = "#f5f3ef";
      context.fillRect(0, 0, canvas.width, canvas.height);

      if (item.imageDataUrl) {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
          const element = new Image();
          element.onload = () => resolve(element);
          element.onerror = reject;
          element.src = item.imageDataUrl!;
        });
        const box = { x: 72, y: 72, width: 1120, height: 936 };
        const scale = Math.min(box.width / image.naturalWidth, box.height / image.naturalHeight);
        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;
        context.fillStyle = "#1d1f1e";
        context.fillRect(box.x, box.y, box.width, box.height);
        context.drawImage(image, box.x + (box.width - width) / 2, box.y + (box.height - height) / 2, width, height);
        context.fillStyle = "#151515";
        context.font = "700 64px Arial";
        drawTextBlock(context, item.title, 1270, 350, 520, 72);
        context.fillStyle = "#46433d";
        context.font = "400 34px Arial";
        drawTextBlock(context, item.caption, 1270, 560, 520, 46);
      } else {
        context.fillStyle = "#346766";
        context.font = "800 30px Arial";
        context.fillText("StoryFrames", 120, 230);
        context.fillStyle = "#151515";
        context.font = "800 88px Arial";
        drawTextBlock(context, item.title, 120, 390, 1280, 96);
        context.fillStyle = "#46433d";
        context.font = "400 40px Arial";
        drawTextBlock(context, item.caption, 120, 640, 1240, 54);
      }

      await new Promise<void>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            downloadBlob(blob, item.fileName);
          }
          resolve();
        }, "image/png");
      });
    }

    setIsExportingPng(false);
    setStatus("PNG frames exported.");
  }

  async function exportMp4() {
    if (!frames.length) {
      return;
    }

    setIsRendering(true);
    setStatus("Rendering MP4 with Remotion. This can take a moment locally...");
    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(story),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Remotion render failed.");
      }

      downloadBlob(await response.blob(), "storyframes.mp4");
      setStatus("MP4 exported.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "MP4 export failed.");
    } finally {
      setIsRendering(false);
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-[#f3f0e8] pb-40 text-stone-950 lg:grid-cols-[320px_minmax(0,1fr)_390px] lg:pb-28">
      <input
        id={UPLOAD_INPUT_ID}
        data-testid="image-upload-input"
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(event) => {
          if (event.target.files) {
            void handleFiles(event.target.files);
            event.target.value = "";
          }
        }}
      />

      <aside className="border-b border-stone-300 bg-[#ebe7dc] p-4 lg:border-b-0 lg:border-r">
        <div className="mb-5 border-b border-stone-300 pb-4">
          <div className="flex items-center justify-between">
          <div>
              <p className="font-mono text-[10px] font-semibold uppercase text-stone-500">
                Visual story builder
              </p>
              <h1 className="mt-1 text-2xl font-semibold">StoryFrames</h1>
          </div>
          <label
            htmlFor={UPLOAD_INPUT_ID}
            title="Add images"
            aria-label="Add images"
            data-testid="upload-add-more"
            className="flex h-10 w-10 cursor-pointer items-center justify-center border border-stone-950 bg-stone-950 text-white transition hover:bg-transparent hover:text-stone-950"
          >
            <Plus size={18} />
          </label>
          </div>
          <div className="mt-4 flex items-center justify-between font-mono text-[11px] uppercase text-stone-500">
            <span>Frames</span>
            <span>{String(frames.length).padStart(2, "0")}</span>
          </div>
        </div>

        {frames.length ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={frames.map((frame) => frame.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {frames.map((frame, index) => (
                  <SortableThumbnail
                    key={frame.id}
                    frame={frame}
                    index={index}
                    selected={selectedFrame?.id === frame.id}
                    onSelect={() => setSelectedId(frame.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <label
            htmlFor={UPLOAD_INPUT_ID}
            data-testid="upload-empty-rail"
            className="flex h-[520px] w-full cursor-pointer flex-col items-center justify-center gap-4 border border-dashed border-stone-400 bg-[#f7f5ef] p-6 text-center text-stone-700 transition hover:border-stone-950 hover:bg-[#fbfaf6]"
          >
            <Upload size={28} />
            <span className="font-mono text-[11px] font-semibold uppercase text-stone-500">
              Empty storyboard
            </span>
            <span className="max-w-48 text-sm leading-6">
              Upload images first. Then describe the story in the prompt bar and generate.
            </span>
          </label>
        )}
      </aside>

      <section className="flex min-h-[620px] flex-col border-b border-stone-300 bg-[#f3f0e8] p-4 lg:border-b-0 lg:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-stone-300 pb-4">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase text-stone-500">
              Preview
            </p>
            <h2 className="mt-1 text-3xl font-semibold">
              {introFrame?.title || selectedFrame?.title || "Build the ordered visual story"}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportPngFrames}
              disabled={!frames.length || isExportingPng}
              className="inline-flex h-10 cursor-pointer items-center gap-2 border border-stone-950 bg-transparent px-3 font-mono text-[11px] font-semibold uppercase transition hover:bg-stone-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isExportingPng ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              PNG
            </button>
            <button
              type="button"
              onClick={exportMp4}
              disabled={!frames.length || isRendering}
              className="inline-flex h-10 cursor-pointer items-center gap-2 border border-stone-950 bg-stone-950 px-3 font-mono text-[11px] font-semibold uppercase text-white transition hover:bg-transparent hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isRendering ? <Loader2 className="animate-spin" size={16} /> : <Film size={16} />}
              MP4
            </button>
          </div>
        </div>

        <div
          data-testid="drop-zone"
          className="flex flex-1 items-center justify-center border border-stone-300 bg-[#151515] p-3"
          onDrop={(event) => {
            event.preventDefault();
            void handleFiles(event.dataTransfer.files);
          }}
          onDragOver={(event) => event.preventDefault()}
        >
          {frames.length ? (
            <div data-testid="story-preview" className="w-full max-w-6xl overflow-hidden border border-stone-700 bg-black">
              <Player
                component={StoryVideo}
                inputProps={story}
                durationInFrames={durationInFrames}
                compositionWidth={1920}
                compositionHeight={1080}
                fps={VIDEO_FPS}
                acknowledgeRemotionLicense
                controls
                style={{ width: "100%", aspectRatio: "16 / 9" }}
              />
            </div>
          ) : (
            <label
              htmlFor={UPLOAD_INPUT_ID}
              data-testid="upload-empty-preview"
              className="flex h-full min-h-[520px] w-full cursor-pointer flex-col items-center justify-center gap-5 border border-dashed border-stone-600 p-8 text-stone-200 transition hover:border-stone-300"
            >
              <ImagePlus size={42} />
              <span className="font-mono text-[11px] font-semibold uppercase text-stone-400">
                No frames yet
              </span>
              <span className="max-w-sm text-center text-2xl font-semibold">
                Drop screenshots or images here
              </span>
              <span className="max-w-md text-center text-sm leading-6 text-stone-400">
                01 Upload images. 02 Describe what you are trying to show. 03 Generate the story.
              </span>
            </label>
          )}
        </div>

        <p className="mt-3 font-mono text-[11px] uppercase text-stone-500">{status}</p>
      </section>

      <aside className="border-t border-stone-300 bg-[#fbfaf6] p-4 lg:border-l lg:border-t-0 lg:p-5">
        <div className="mb-5 border-b border-stone-300 pb-4">
          <p className="font-mono text-[10px] font-semibold uppercase text-stone-500">
            Inspector
          </p>
          <h2 className="mt-1 text-xl font-semibold">
            {selectedFrame ? "Frame details" : "No frame selected"}
          </h2>
        </div>
        <div className="space-y-5">
          {selectedFrame ? (
            <section className="border border-stone-300 bg-[#f7f5ef] p-3">
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-stone-300 pb-3">
                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase text-stone-500">
                    Selected frame
                  </p>
                  <p className="truncate text-sm text-stone-700">{selectedFrame.fileName}</p>
                </div>
                <span className="font-mono text-lg font-semibold text-stone-950">
                  {String(Math.max(1, frames.findIndex((frame) => frame.id === selectedFrame.id) + 1)).padStart(2, "0")}
                </span>
              </div>
              {(() => {
                const motion = getFrameMotion(selectedFrame);
                const hasFocus = hasFocusTarget(selectedFrame);
                const awaitingFocus = motion.zoom !== "none" && !hasFocus;
                return (
                  <div className="mb-3">
                    <div className="relative overflow-hidden border border-stone-300 bg-stone-950">
                      <img
                        src={selectedFrame.imageDataUrl}
                        alt=""
                        data-testid="focus-image"
                        className={`block max-h-56 w-full object-contain ${
                          motion.zoom !== "none" ? "cursor-crosshair" : "cursor-default"
                        }`}
                        onClick={(event) => {
                          if (motion.zoom === "none") {
                            setStatus("Pick Zoom In or Out first, then click to target.");
                            return;
                          }
                          setCustomFocus(selectedFrame, event);
                        }}
                      />
                      {hasFocus ? (
                        <span
                          data-testid="focus-marker"
                          className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 border-2 border-white bg-[#346766]/60 shadow-[0_0_0_3px_rgba(52,103,102,0.3)]"
                          style={{ left: `${(selectedFrame.focusX ?? 0.5) * 100}%`, top: `${(selectedFrame.focusY ?? 0.5) * 100}%` }}
                        />
                      ) : null}
                      {awaitingFocus ? (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-stone-950/55">
                          <div className="flex items-center gap-2 border border-white bg-stone-950/80 px-3 py-2 font-mono text-[10px] font-semibold uppercase text-white">
                            <Crosshair size={14} />
                            Click on image to target zoom {motion.zoom}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="font-mono text-[10px] uppercase text-stone-500">
                        {motion.zoom === "none"
                          ? "Choose zoom in/out to target an area"
                          : hasFocus
                            ? "Focus locked"
                            : "Awaiting focus target"}
                      </p>
                      {hasFocus ? (
                        <button
                          type="button"
                          onClick={() => updateFrame(selectedFrame.id, { focusX: undefined, focusY: undefined })}
                          className="cursor-pointer font-mono text-[10px] font-semibold uppercase text-stone-950 underline underline-offset-4"
                        >
                          Reset focus
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })()}
              <label
                className="mb-1 block font-mono text-[10px] font-semibold uppercase text-stone-500"
                htmlFor="frame-title"
              >
                Title
              </label>
              <input
                id="frame-title"
                value={selectedFrame.title}
                onChange={(event) => updateFrame(selectedFrame.id, { title: event.target.value })}
                placeholder="Generated title appears here"
                className="mb-3 h-11 w-full border border-stone-300 bg-[#fbfaf6] px-3 text-sm outline-none transition focus:border-stone-950"
              />
              <label
                className="mb-1 block font-mono text-[10px] font-semibold uppercase text-stone-500"
                htmlFor="frame-caption"
              >
                Caption
              </label>
              <textarea
                id="frame-caption"
                value={selectedFrame.caption}
                onChange={(event) => updateFrame(selectedFrame.id, { caption: event.target.value })}
                placeholder="Generated caption appears here"
                className="min-h-24 w-full resize-none border border-stone-300 bg-[#fbfaf6] p-3 text-sm leading-6 outline-none transition focus:border-stone-950"
              />
              <MotionControls
                frame={selectedFrame}
                onSetZoom={(zoom) => setZoom(selectedFrame, zoom)}
                onSetPan={(pan) => setPan(selectedFrame, pan)}
                onSetIntensity={(intensity) => setIntensity(selectedFrame, intensity)}
              />
            </section>
          ) : (
            <section className="flex min-h-96 flex-col items-center justify-center border border-dashed border-stone-300 bg-[#f7f5ef] p-8 text-center">
              <p className="font-mono text-[10px] font-semibold uppercase text-stone-500">
                Waiting for frames
              </p>
              <p className="mt-3 max-w-52 text-sm leading-6 text-stone-600">
                Upload images, then select a frame to edit text and motion.
              </p>
            </section>
          )}

          <section className="space-y-3 border border-stone-300 bg-[#f7f5ef] p-3">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-[10px] font-semibold uppercase text-stone-500">
                Bookend frames
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIntroFrame(introFrame ? null : { title: "What this story shows", caption: contextPrompt });
                  setOutroFrame(outroFrame ? null : { title: "Main takeaway", caption: "" });
                }}
                className="cursor-pointer font-mono text-[10px] font-semibold uppercase text-stone-950 underline underline-offset-4"
              >
                {introFrame || outroFrame ? "Remove" : "Add"}
              </button>
            </div>
            {introFrame ? (
              <input
                value={introFrame.title}
                onChange={(event) => setIntroFrame({ ...introFrame, title: event.target.value })}
                className="h-10 w-full border border-stone-300 bg-[#fbfaf6] px-3 text-sm outline-none focus:border-stone-950"
              />
            ) : null}
            {outroFrame ? (
              <input
                value={outroFrame.title}
                onChange={(event) => setOutroFrame({ ...outroFrame, title: event.target.value })}
                className="h-10 w-full border border-stone-300 bg-[#fbfaf6] px-3 text-sm outline-none focus:border-stone-950"
              />
            ) : null}
          </section>
        </div>
      </aside>

      <section className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-950 bg-[#ebe7dc]/95 px-4 py-3 backdrop-blur lg:left-[320px] lg:right-[390px]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="mb-2 flex items-center gap-2">
              <span className="border border-stone-950 bg-[#f7f5ef] px-2 py-1 font-mono text-[10px] font-semibold uppercase text-stone-950">
                Prompt
              </span>
              <label htmlFor="context" className="font-mono text-[10px] uppercase text-stone-500">
                {hasGeneratedStory ? "Edit prompt and regenerate" : "What are you trying to show?"}
              </label>
            </div>
            <textarea
              id="context"
              value={contextPrompt}
              onChange={(event) => setContextPrompt(event.target.value)}
              placeholder="Example: show how the onboarding flow improves after the redesign"
              className="min-h-16 w-full resize-none border border-stone-950 bg-[#fbfaf6] p-3 text-sm leading-6 outline-none transition placeholder:text-stone-400 focus:bg-white"
            />
          </div>
          <button
            type="button"
            onClick={generateStory}
            disabled={!frames.length || !contextPrompt.trim() || isGenerating}
            className="inline-flex h-16 cursor-pointer items-center justify-center gap-2 border border-stone-950 bg-stone-950 px-5 font-mono text-[11px] font-semibold uppercase text-white transition hover:bg-transparent hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-45 lg:min-w-52"
          >
            {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
            {hasGeneratedStory ? "Regenerate story" : "Generate story"}
          </button>
        </div>
      </section>
    </main>
  );
}
