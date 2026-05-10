import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 300;

const storyFrameSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  imageDataUrl: z.string().startsWith("data:image/"),
  title: z.string(),
  caption: z.string(),
  motionPreset: z
    .enum(["none", "zoom_in", "zoom_out", "pan_left", "pan_right", "pan_up", "pan_down", "focus_zoom"])
    .optional(),
  motionIntensity: z.enum(["subtle", "medium", "strong"]).optional(),
  focusPoint: z.enum(["center", "top", "bottom", "left", "right"]).optional(),
  focusX: z.number().min(0).max(1).optional(),
  focusY: z.number().min(0).max(1).optional(),
});

const textFrameSchema = z
  .object({
    title: z.string(),
    caption: z.string(),
  })
  .nullable()
  .optional();

const renderRequestSchema = z.object({
  context: z.string(),
  frames: z.array(storyFrameSchema).min(1).max(12),
  introFrame: textFrameSchema,
  outroFrame: textFrameSchema,
});

export async function POST(request: Request) {
  const parsed = renderRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Render needs at least one completed story frame." }, { status: 400 });
  }

  const workdir = await mkdtemp(path.join(tmpdir(), "storyframes-"));
  const outputLocation = path.join(workdir, "storyframes.mp4");

  try {
    const serveUrl = await bundle({
      entryPoint: path.join(process.cwd(), "src", "remotion", "index.ts"),
    });

    const composition = await selectComposition({
      serveUrl,
      id: "StoryFramesVideo",
      inputProps: parsed.data,
    });

    await renderMedia({
      serveUrl,
      composition,
      codec: "h264",
      outputLocation,
      inputProps: parsed.data,
    });

    const video = await readFile(outputLocation);
    return new Response(video, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="storyframes.mp4"',
        "Content-Length": String(video.byteLength),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          "Remotion render failed. The editor still supports preview and PNG frame export; check the server console for render details.",
      },
      { status: 500 },
    );
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
}
