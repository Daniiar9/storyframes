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

export const DEFAULT_MOTION_PRESET: MotionPreset = "zoom_in";
export const DEFAULT_MOTION_INTENSITY: MotionIntensity = "subtle";
export const DEFAULT_FOCUS_POINT: FocusPoint = "center";

export const motionScaleByIntensity: Record<MotionIntensity, number> = {
  subtle: 1.04,
  medium: 1.08,
  strong: 1.12,
};

export function getFrameMotion(frame: StoryFrame) {
  return {
    motionPreset: frame.motionPreset ?? DEFAULT_MOTION_PRESET,
    motionIntensity: frame.motionIntensity ?? DEFAULT_MOTION_INTENSITY,
    focusPoint: frame.focusPoint ?? DEFAULT_FOCUS_POINT,
    focusX: frame.focusX,
    focusY: frame.focusY,
  };
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
