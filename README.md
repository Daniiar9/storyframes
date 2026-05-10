# StoryFrames

StoryFrames is a local-first web app for turning uploaded screenshots/images into a simple ordered visual story. It is intentionally a story builder, not a timeline editor.

## What works

- Upload 3-8 images, or any small image sequence.
- Add more images with the plus button.
- Drag thumbnails to reorder the story.
- Add one global context prompt.
- Generate image-aware titles and captions with the OpenAI API.
- Edit generated frame titles and captions inline.
- Preview the ordered story with the Remotion Player.
- Export simple PNG frames in the browser.
- Render and download a basic MP4 through a local Remotion server route.

## What is not implemented yet

- Auth, payments, database persistence, teams, collaboration, voiceover, and a complex timeline editor.
- Background rendering queue or cloud rendering.
- Persistent saved projects after a browser refresh.
- Advanced export controls such as custom aspect ratios, audio, themes, and duration controls.

## Setup

```bash
npm install
```

Create `.env.local`:

```bash
OPENAI_API_KEY=your_api_key_here
# Optional; defaults to gpt-5.2
OPENAI_MODEL=gpt-5.2
```

Start the local app:

```bash
npm run dev
```

Open:

[http://localhost:3000](http://localhost:3000)

## Remotion

The Remotion composition lives in `src/remotion`. The editor passes final ordered frames and captions as plain props, so the rendering layer can be replaced later.

To inspect the composition directly:

```bash
npm run remotion:studio
```
