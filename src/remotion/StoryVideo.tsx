import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { CSSProperties, ReactNode } from "react";
import {
  BOOKEND_DURATION,
  FRAME_DURATION,
  FocusPoint,
  getFrameMotion,
  motionScaleByIntensity,
  StoryFrame,
  StoryProject,
  TextFrame,
} from "../lib/story";

const shell: CSSProperties = {
  background: "#f5f3ef",
  color: "#151515",
  fontFamily: "Inter, Arial, Helvetica, sans-serif",
};

function Bookend({ frame, label }: { frame: TextFrame; label: string }) {
  const currentFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({ frame: currentFrame, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill style={{ ...shell, justifyContent: "center", padding: 120 }}>
      <div
        style={{
          transform: `translateY(${interpolate(entrance, [0, 1], [28, 0])}px)`,
          opacity: entrance,
          maxWidth: 1180,
        }}
      >
        <div
          style={{
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 0,
            color: "#346766",
            marginBottom: 34,
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        <h1 style={{ fontSize: 86, lineHeight: 1, margin: 0, letterSpacing: 0 }}>{frame.title}</h1>
        <p style={{ fontSize: 38, lineHeight: 1.35, maxWidth: 980, marginTop: 34, color: "#42403b" }}>
          {frame.caption}
        </p>
      </div>
    </AbsoluteFill>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function focusPointToCoordinates(focusPoint: FocusPoint) {
  switch (focusPoint) {
    case "top":
      return { x: 0.5, y: 0.22 };
    case "bottom":
      return { x: 0.5, y: 0.78 };
    case "left":
      return { x: 0.24, y: 0.5 };
    case "right":
      return { x: 0.76, y: 0.5 };
    case "center":
    default:
      return { x: 0.5, y: 0.5 };
  }
}

function getMotionTransform(storyFrame: StoryFrame, currentFrame: number) {
  const { motionPreset, motionIntensity, focusPoint, focusX, focusY } = getFrameMotion(storyFrame);
  const progress = interpolate(currentFrame, [0, FRAME_DURATION], [0, 1], {
    extrapolateRight: "clamp",
  });
  const maxScale = motionScaleByIntensity[motionIntensity];
  const baseFocus = focusPointToCoordinates(focusPoint);
  const targetFocus = {
    x: clamp(focusX ?? baseFocus.x, 0, 1),
    y: clamp(focusY ?? baseFocus.y, 0, 1),
  };
  const origin = `${targetFocus.x * 100}% ${targetFocus.y * 100}%`;
  const panDistanceByIntensity = {
    subtle: 1.8,
    medium: 3,
    strong: 4.2,
  }[motionIntensity];

  if (motionPreset === "none") {
    return { transform: "translate3d(0, 0, 0) scale(1)", transformOrigin: origin };
  }

  if (motionPreset === "zoom_out") {
    const scale = interpolate(progress, [0, 1], [maxScale, 1]);
    return { transform: `translate3d(0, 0, 0) scale(${scale})`, transformOrigin: origin };
  }

  if (motionPreset === "pan_left" || motionPreset === "pan_right") {
    const start = motionPreset === "pan_left" ? panDistanceByIntensity : -panDistanceByIntensity;
    const end = -start;
    const translateX = interpolate(progress, [0, 1], [start, end]);
    return {
      transform: `translate3d(${translateX}%, 0, 0) scale(${Math.min(maxScale, 1.045)})`,
      transformOrigin: origin,
    };
  }

  if (motionPreset === "pan_up" || motionPreset === "pan_down") {
    const start = motionPreset === "pan_up" ? panDistanceByIntensity : -panDistanceByIntensity;
    const end = -start;
    const translateY = interpolate(progress, [0, 1], [start, end]);
    return {
      transform: `translate3d(0, ${translateY}%, 0) scale(${Math.min(maxScale, 1.045)})`,
      transformOrigin: origin,
    };
  }

  if (motionPreset === "focus_zoom") {
    const endScale = Math.min(maxScale, 1.1);
    const scale = interpolate(progress, [0, 1], [1, endScale]);
    const translateX = interpolate(progress, [0, 1], [0, clamp((0.5 - targetFocus.x) * 10, -4.5, 4.5)]);
    const translateY = interpolate(progress, [0, 1], [0, clamp((0.5 - targetFocus.y) * 10, -4.5, 4.5)]);
    return {
      transform: `translate3d(${translateX}%, ${translateY}%, 0) scale(${scale})`,
      transformOrigin: origin,
    };
  }

  const scale = interpolate(progress, [0, 1], [1, maxScale]);
  return { transform: `translate3d(0, 0, 0) scale(${scale})`, transformOrigin: origin };
}

function ImageFrame({ storyFrame, index }: { storyFrame: StoryFrame; index: number }) {
  const currentFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({ frame: currentFrame, fps, config: { damping: 20 } });
  const motion = getMotionTransform(storyFrame, currentFrame);

  return (
    <AbsoluteFill
      style={{
        ...shell,
        display: "grid",
        gridTemplateColumns: "1.32fr 0.68fr",
        gap: 0,
      }}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          background: "#1d1f1e",
          margin: 54,
          borderRadius: 8,
          boxShadow: "0 34px 80px rgba(32, 29, 24, 0.22)",
        }}
      >
        <Img
          src={storyFrame.imageDataUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            transform: motion.transform,
            transformOrigin: motion.transformOrigin,
          }}
        />
      </div>
      <aside
        style={{
          padding: "86px 80px 86px 36px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          opacity: entrance,
          transform: `translateX(${interpolate(entrance, [0, 1], [36, 0])}px)`,
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 800, color: "#346766", marginBottom: 28 }}>
          {String(index + 1).padStart(2, "0")}
        </div>
        <h2 style={{ fontSize: 62, lineHeight: 1.04, margin: 0, letterSpacing: 0 }}>{storyFrame.title}</h2>
        <p style={{ color: "#46433d", fontSize: 32, lineHeight: 1.34, marginTop: 30 }}>
          {storyFrame.caption}
        </p>
      </aside>
    </AbsoluteFill>
  );
}

export function StoryVideo(story: StoryProject) {
  let cursor = 0;
  const sequences: ReactNode[] = [];

  if (story.introFrame) {
    sequences.push(
      <Sequence key="intro" from={cursor} durationInFrames={BOOKEND_DURATION}>
        <Bookend frame={story.introFrame} label="Intro" />
      </Sequence>,
    );
    cursor += BOOKEND_DURATION;
  }

  story.frames.forEach((storyFrame, index) => {
    const from = cursor;
    cursor += FRAME_DURATION;
    sequences.push(
      <Sequence key={storyFrame.id} from={from} durationInFrames={FRAME_DURATION}>
        <ImageFrame storyFrame={storyFrame} index={index} />
      </Sequence>,
    );
  });

  if (story.outroFrame) {
    sequences.push(
      <Sequence key="outro" from={cursor} durationInFrames={BOOKEND_DURATION}>
        <Bookend frame={story.outroFrame} label="Takeaway" />
      </Sequence>,
    );
  }

  return <AbsoluteFill style={shell}>{sequences}</AbsoluteFill>;
}
