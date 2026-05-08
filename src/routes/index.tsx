import { createFileRoute } from "@tanstack/react-router";
import { StoryEditor } from "@/components/storyframes/StoryEditor";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "StoryFrames — Turn images into an ordered story" },
      {
        name: "description",
        content:
          "Upload images, reorder them, and let StoryFrames write titles, captions, and an intro & ending — all editable.",
      },
    ],
  }),
});

function Index() {
  return <StoryEditor />;
}
