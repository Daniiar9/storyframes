import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type {
  FocusPoint,
  Frame,
  MotionIntensity,
  MotionPreset,
} from "@/lib/storyframes";

export type ArmedValue =
  | { kind: "preset"; value: MotionPreset }
  | { kind: "intensity"; value: MotionIntensity }
  | { kind: "focus"; value: FocusPoint }
  | { kind: "customFocus" };

interface Ctx {
  armed: ArmedValue | null;
  arm: (v: ArmedValue) => void;
  cancel: () => void;
  applyTo: (frameId: string, opts?: { focusX?: number; focusY?: number }) => void;
  applyToAll: () => void;
}

const MotionPickCtx = createContext<Ctx | null>(null);

export function MotionPickProvider({
  frames,
  patch,
  children,
}: {
  frames: Frame[];
  patch: (id: string, p: Partial<Frame>) => void;
  children: React.ReactNode;
}) {
  const [armed, setArmed] = useState<ArmedValue | null>(null);

  const arm = useCallback((v: ArmedValue) => setArmed(v), []);
  const cancel = useCallback(() => setArmed(null), []);

  const buildPatch = useCallback(
    (v: ArmedValue, opts?: { focusX?: number; focusY?: number }): Partial<Frame> => {
      switch (v.kind) {
        case "preset":
          return { motionPreset: v.value };
        case "intensity":
          return { motionIntensity: v.value };
        case "focus":
          return { focusPoint: v.value, focusX: undefined, focusY: undefined };
        case "customFocus":
          return {
            motionPreset: "focus_zoom",
            focusX: opts?.focusX,
            focusY: opts?.focusY,
          };
      }
    },
    [],
  );

  const applyTo = useCallback(
    (frameId: string, opts?: { focusX?: number; focusY?: number }) => {
      if (!armed) return;
      // For customFocus, require coordinates
      if (armed.kind === "customFocus" && (opts?.focusX == null || opts?.focusY == null)) {
        return;
      }
      patch(frameId, buildPatch(armed, opts));
      // Stay armed so users can apply to multiple frames quickly.
      // Esc or × to cancel.
    },
    [armed, patch, buildPatch],
  );

  const applyToAll = useCallback(() => {
    if (!armed || armed.kind === "customFocus") return;
    const p = buildPatch(armed);
    frames.forEach((f) => {
      if (f.imageUrl) patch(f.id, p);
    });
  }, [armed, frames, patch, buildPatch]);

  // Esc cancels
  useEffect(() => {
    if (!armed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setArmed(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [armed]);

  const value = useMemo(
    () => ({ armed, arm, cancel, applyTo, applyToAll }),
    [armed, arm, cancel, applyTo, applyToAll],
  );

  return <MotionPickCtx.Provider value={value}>{children}</MotionPickCtx.Provider>;
}

export function useMotionPick() {
  const ctx = useContext(MotionPickCtx);
  if (!ctx) throw new Error("useMotionPick must be used within MotionPickProvider");
  return ctx;
}

export function describeArmed(v: ArmedValue): string {
  switch (v.kind) {
    case "preset":
      return `Motion: ${PRESET[v.value]}`;
    case "intensity":
      return `Intensity: ${cap(v.value)}`;
    case "focus":
      return `Focus: ${cap(v.value)}`;
    case "customFocus":
      return "Click an image to set its focus point";
  }
}

const PRESET: Record<MotionPreset, string> = {
  none: "Static",
  zoom_in: "Zoom in",
  zoom_out: "Zoom out",
  pan_left: "Pan left",
  pan_right: "Pan right",
  pan_up: "Pan up",
  pan_down: "Pan down",
  focus_zoom: "Focus zoom",
};

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}