import { NextResponse } from "next/server";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const incomingFrameSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  imageDataUrl: z.string().startsWith("data:image/"),
});

const storyRequestSchema = z.object({
  context: z.string().min(1),
  frames: z.array(incomingFrameSchema).min(1).max(12),
});

const generatedStorySchema = z.object({
  introFrame: z
    .object({
      title: z.string().min(1).max(80),
      caption: z.string().min(1).max(180),
    })
    .nullable(),
  frames: z.array(
    z.object({
      id: z.string(),
      title: z.string().min(1).max(80),
      caption: z.string().min(1).max(180),
    }),
  ),
  outroFrame: z
    .object({
      title: z.string().min(1).max(80),
      caption: z.string().min(1).max(180),
    })
    .nullable(),
});

function fallbackStory(payload: z.infer<typeof storyRequestSchema>, note?: string) {
  const context = payload.context.trim();

  return {
    source: "local-fallback",
    note,
    story: {
      introFrame: {
        title: "What this story shows",
        caption: context,
      },
      frames: payload.frames.map((frame, index) => ({
        id: frame.id,
        title: `Frame ${index + 1}`,
        caption: `A key step in the story: ${frame.fileName.replace(/\.[^/.]+$/, "")}.`,
      })),
      outroFrame: {
        title: "Main takeaway",
        caption: "The ordered images now form a clear before-to-after visual story.",
      },
    },
  };
}

export async function POST(request: Request) {
  const parsed = storyRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Upload at least one image and add a context prompt." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      fallbackStory(parsed.data, "Set OPENAI_API_KEY to generate image-aware titles and captions."),
    );
  }

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-5.2";
  const content: Array<
    | { type: "input_text"; text: string }
    | { type: "input_image"; image_url: string; detail: "low" | "high" | "auto" }
  > = [
    {
      type: "input_text",
      text: [
        `Global context: ${parsed.data.context}`,
        "Create a concise visual story from these ordered screenshots/images.",
        "Return one title and one short caption per image, preserving each id exactly.",
        "Use introFrame and outroFrame only when they add clarity.",
      ].join("\n"),
    },
  ];

  parsed.data.frames.forEach((frame, index) => {
    content.push({
      type: "input_text",
      text: `Image ${index + 1}; id=${frame.id}; fileName=${frame.fileName}`,
    });
    content.push({
      type: "input_image",
      image_url: frame.imageDataUrl,
      detail: "low",
    });
  });

  try {
    const response = await openai.responses.parse({
      model,
      input: [
        {
          role: "system",
          content:
            "You are StoryFrames, a product-minded visual narrator. Write clear, specific titles and captions for a sequence of uploaded screenshots or images. Avoid hype, avoid generic video-editor language, and keep each caption easy to read on a frame.",
        },
        {
          role: "user",
          content,
        },
      ],
      text: {
        format: zodTextFormat(generatedStorySchema, "generated_story"),
      },
    });

    const story = response.output_parsed;
    if (!story) {
      return NextResponse.json(fallbackStory(parsed.data, "The model returned no structured story."));
    }

    return NextResponse.json({
      source: "openai",
      model,
      story: {
        introFrame: story.introFrame,
        frames: parsed.data.frames.map((frame, index) => {
          const generated = story.frames.find((item) => item.id === frame.id) ?? story.frames[index];
          return {
            id: frame.id,
            title: generated?.title || `Frame ${index + 1}`,
            caption: generated?.caption || "A relevant moment in the visual sequence.",
          };
        }),
        outroFrame: story.outroFrame,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      fallbackStory(parsed.data, "OpenAI generation failed. Check the server console for details."),
      { status: 200 },
    );
  }
}
