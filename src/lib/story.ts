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

export type Zoom = "none" | "in" | "out";
export type Pan = "none" | "left" | "right" | "up" | "down";

export type StoryFrame = {
  id: string;
  fileName: string;
  imageDataUrl: string;
  title: string;
  caption: string;
  motionPreset?: MotionPreset;
  motionIntensity?: MotionIntensity;
  focusPoint?: FocusPoint;
  focusX?: number;
  focusY?: number;
  zoom?: Zoom;
  pan?: Pan;
};

export type TextFrame = {
  title: string;
  caption: string;
};

export type StoryProject = {
  context: string;
  frames: StoryFrame[];
  introFrame?: TextFrame | null;
  outroFrame?: TextFrame | null;
};

export const VIDEO_FPS = 30;
export const FRAME_DURATION = 120;
export const BOOKEND_DURATION = 90;

export const DEFAULT_MOTION_PRESET: MotionPreset = "none";
export const DEFAULT_MOTION_INTENSITY: MotionIntensity = "subtle";
export const DEFAULT_FOCUS_POINT: FocusPoint = "center";
export const DEFAULT_ZOOM: Zoom = "none";
export const DEFAULT_PAN: Pan = "none";

export const motionScaleByIntensity: Record<MotionIntensity, number> = {
  subtle: 1.04,
  medium: 1.08,
  strong: 1.12,
};

function deriveZoomPanFromPreset(preset: MotionPreset): { zoom: Zoom; pan: Pan } {
  switch (preset) {
    case "zoom_in":
    case "focus_zoom":
      return { zoom: "in", pan: "none" };
    case "zoom_out":
      return { zoom: "out", pan: "none" };
    case "pan_left":
      return { zoom: "none", pan: "left" };
    case "pan_right":
      return { zoom: "none", pan: "right" };
    case "pan_up":
      return { zoom: "none", pan: "up" };
    case "pan_down":
      return { zoom: "none", pan: "down" };
    case "none":
    default:
      return { zoom: "none", pan: "none" };
  }
}

export function getFrameMotion(frame: StoryFrame) {
  const derived = deriveZoomPanFromPreset(frame.motionPreset ?? DEFAULT_MOTION_PRESET);
  return {
    motionPreset: frame.motionPreset ?? DEFAULT_MOTION_PRESET,
    motionIntensity: frame.motionIntensity ?? DEFAULT_MOTION_INTENSITY,
    focusPoint: frame.focusPoint ?? DEFAULT_FOCUS_POINT,
    focusX: frame.focusX,
    focusY: frame.focusY,
    zoom: frame.zoom ?? derived.zoom,
    pan: frame.pan ?? derived.pan,
  };
}

export function hasFocusTarget(frame: StoryFrame) {
  return typeof frame.focusX === "number" && typeof frame.focusY === "number";
}

export function hasRenderableMotion(frame: StoryFrame) {
  const { zoom, pan } = getFrameMotion(frame);
  if (pan !== "none") return true;
  if (zoom !== "none" && hasFocusTarget(frame)) return true;
  return false;
}

export function getStoryDurationInFrames(story: Pick<StoryProject, "frames" | "introFrame" | "outroFrame">) {
  return (
    story.frames.length * FRAME_DURATION +
    (story.introFrame ? BOOKEND_DURATION : 0) +
    (story.outroFrame ? BOOKEND_DURATION : 0)
  );
}

export function makeEmptyStory(): StoryProject {
  return {
    context: "",
    frames: [],
    introFrame: null,
    outroFrame: null,
  };
}
