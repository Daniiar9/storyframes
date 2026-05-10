import { Composition } from "remotion";
import { getStoryDurationInFrames, makeEmptyStory, VIDEO_FPS } from "../lib/story";
import { StoryVideo } from "./StoryVideo";

export function RemotionRoot() {
  return (
    <Composition
      id="StoryFramesVideo"
      component={StoryVideo}
      durationInFrames={300}
      fps={VIDEO_FPS}
      width={1920}
      height={1080}
      defaultProps={makeEmptyStory()}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.max(getStoryDurationInFrames(props), VIDEO_FPS),
        fps: VIDEO_FPS,
        width: 1920,
        height: 1080,
      })}
    />
  );
}
