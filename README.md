# Storyteller Studio

A personal demo / experiment project built with Lovable. It explores a small
"StoryFrames" UX for uploading images and adding zoom/pan motion to them.
Intended as a portfolio / sandbox — not a production app.

## Tech stack

- React 19 + TypeScript
- TanStack Start (Router + SSR) on Vite 7
- Tailwind CSS v4 + shadcn/ui
- Deploys to Cloudflare Workers via Wrangler

## Getting started

```bash
bun install      # or: npm install
bun run dev      # start the dev server
bun run build    # production build
bun run preview  # preview the production build
```

Then open the URL printed in the terminal (usually http://localhost:5173).

## Environment variables

This project does **not** require any secrets to run locally. There are no
API keys, database URLs, or backend credentials in the codebase.

If you fork it and add integrations later, copy `.env.example` to `.env.local`
and fill in your own values. `.env*` files are gitignored.

## License

Personal/demo use. No license has been chosen yet — if you want to reuse the
code, please open an issue or contact the author first.

## Notes

- This repo is a personal experiment; expect rough edges.
- No real secrets are committed. See `.env.example` for the (currently empty)
  shape of environment variables.