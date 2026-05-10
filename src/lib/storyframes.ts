export type FrameKind = "intro" | "image" | "outro";

export type MotionPreset =
  | "none"
  | "zoom_in"
  | "zoom_out"
  | "pan_left"
  | "pan_right"
  | "pan_up"
  | "pan_down"
  | "focus_zoom";

export type MotionIntensity = "subtle" | "medium" | "strong";

export type FocusPoint = "center" | "top" | "bottom" | "left" | "right";

export interface Frame {
  id: string;
  kind: FrameKind;
  imageUrl?: string;
  fileName?: string;
  title: string;
  caption: string;
  generated: boolean;
  motionPreset?: MotionPreset;
  motionIntensity?: MotionIntensity;
  focusPoint?: FocusPoint;
  focusX?: number;
  focusY?: number;
}

const TITLE_POOL = [
  "The Opening Move",
  "Setting the Stage",
  "First Light",
  "A Quiet Pivot",
  "Where It Begins",
  "Behind the Curtain",
  "Small Decisions, Big Shifts",
  "Detail in Focus",
  "The Turning Point",
  "Held in Tension",
  "A Closer Look",
  "Threads Pulled Together",
  "Momentum Builds",
  "The Final Frame",
  "What Remains",
];

const CAPTION_POOL = [
  "An establishing beat — the moment before everything moves.",
  "Texture, scale, and quiet intent. The eye lingers here on purpose.",
  "A small shift in framing redirects the entire story.",
  "Context arrives quietly, then asks to be reread.",
  "What looks like a pause is actually a decision.",
  "Detail does the heavy lifting. Read it slowly.",
  "The composition tightens. Stakes become visible.",
  "A handoff between scenes — keep your attention here.",
  "The weight of what came before is now obvious.",
  "A clean closing note: nothing more is needed.",
];

let titleIdx = 0;
let captionIdx = 0;

export function nextSuggestion(context: string, kind: FrameKind, index: number) {
  const ctx = context.trim();
  if (kind === "intro") {
    return {
      title: ctx ? truncate(ctx, 40) : "An Introduction",
      caption: ctx
        ? `An opening frame for: ${truncate(ctx, 90)}.`
        : "A short opening to orient the reader before the story begins.",
    };
  }
  if (kind === "outro") {
    return {
      title: "The Takeaway",
      caption: ctx
        ? `What this all adds up to — ${truncate(ctx, 90)}.`
        : "A final beat. The point lands here.",
    };
  }
  const t = TITLE_POOL[(titleIdx + index) % TITLE_POOL.length];
  const c = CAPTION_POOL[(captionIdx + index) % CAPTION_POOL.length];
  titleIdx = (titleIdx + 1) % TITLE_POOL.length;
  captionIdx = (captionIdx + 1) % CAPTION_POOL.length;
  return { title: t, caption: c };
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function exportStory(frames: Frame[], context: string) {
  const lines: string[] = [];
  lines.push("STORYFRAMES");
  lines.push("===========");
  if (context.trim()) {
    lines.push("");
    lines.push(`Context: ${context.trim()}`);
  }
  lines.push("");
  frames.forEach((f, i) => {
    lines.push(`${String(i + 1).padStart(2, "0")}. ${f.title}`);
    if (f.fileName) lines.push(`    file: ${f.fileName}`);
    lines.push(`    ${f.caption}`);
    lines.push("");
  });
  return lines.join("\n");
}