export type FrameKind = "intro" | "image" | "outro";

export type ZoomDir = "none" | "in" | "out";
export type PanDir = "none" | "left" | "right" | "up" | "down";

export interface Frame {
  id: string;
  kind: FrameKind;
  imageUrl?: string;
  fileName?: string;
  title: string;
  caption: string;
  generated: boolean;
  motionZoom?: ZoomDir;
  motionPan?: PanDir;
  /** 0..100 — how strong the motion is */
  motionIntensity?: number;
  /** Custom focus point for zoom origin */
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

/* ------------------------------------------------------------------ */
/* Motion → CSS variables for the preview animation (loops via CSS)    */
/* ------------------------------------------------------------------ */

export function hasMotion(f: Pick<Frame, "motionZoom" | "motionPan">) {
  return (
    (f.motionZoom && f.motionZoom !== "none") ||
    (f.motionPan && f.motionPan !== "none")
  );
}

export function hasRenderableMotion(
  f: Pick<Frame, "motionZoom" | "motionPan" | "focusX" | "focusY">,
) {
  const hasFocus = f.focusX != null && f.focusY != null;
  return (
    (f.motionPan && f.motionPan !== "none") ||
    ((f.motionZoom && f.motionZoom !== "none") && hasFocus)
  );
}

export function motionStyle(f: Frame): React.CSSProperties {
  const zoom: ZoomDir = f.motionZoom ?? "none";
  const pan: PanDir = f.motionPan ?? "none";
  const i = Math.max(0, Math.min(100, f.motionIntensity ?? 50)) / 100;

  const hasFocus = f.focusX != null && f.focusY != null;
  const zoomDelta = 0.04 + i * 0.18; // 1.04 → 1.22

  // When a focus point is set, keep the image always zoomed in around it so
  // the focused area stays visible across the whole animation loop. The
  // animation just oscillates between a slightly-zoomed and more-zoomed
  // state, both anchored on the focus.
  const baseZoom = hasFocus && zoom !== "none" ? 1 + zoomDelta * 0.45 : 1;

  let fromScale = baseZoom, toScale = baseZoom;
  if (zoom === "in" && hasFocus) {
    fromScale = baseZoom;
    toScale = 1 + zoomDelta;
  } else if (zoom === "out" && hasFocus) {
    fromScale = 1 + zoomDelta;
    toScale = baseZoom;
  }

  // Pan amount — reduced when combined with a focus point so the camera
  // never drifts the focused area out of view.
  const panBase = 3 + i * 8; // 3 → 11 (%)
  const panAmount = hasFocus && zoom !== "none" ? panBase * 0.35 : panBase;
  const panDelta = panAmount.toFixed(2) + "%";
  const negPanDelta = (-panAmount).toFixed(2) + "%";

  // Pan arrow = camera direction. Camera panning left means content shifts
  // to the RIGHT in the frame (positive X translate on the image). Animate
  // symmetrically around 0 so the focus stays roughly centered.
  const half = (panAmount / 2).toFixed(2) + "%";
  const negHalf = (-panAmount / 2).toFixed(2) + "%";
  let fromX = "0%", toX = "0%", fromY = "0%", toY = "0%";
  if (pan === "left") { fromX = negHalf; toX = half; }
  else if (pan === "right") { fromX = half; toX = negHalf; }
  else if (pan === "up") { fromY = negHalf; toY = half; }
  else if (pan === "down") { fromY = half; toY = negHalf; }

  // If only panning (no zoom), keep a slight scale so edges don't reveal.
  if (zoom === "none" && pan !== "none") {
    fromScale = 1.08;
    toScale = 1.08;
  }

  // Suppress unused warning for the larger pan range when focus isn't set.
  void panDelta; void negPanDelta;

  const origin =
    f.focusX != null && f.focusY != null
      ? `${(f.focusX * 100).toFixed(2)}% ${(f.focusY * 100).toFixed(2)}%`
      : "50% 50%";

  return {
    transformOrigin: origin,
    ["--from-scale" as never]: String(fromScale),
    ["--to-scale" as never]: String(toScale),
    ["--from-x" as never]: fromX,
    ["--to-x" as never]: toX,
    ["--from-y" as never]: fromY,
    ["--to-y" as never]: toY,
  } as React.CSSProperties;
}
