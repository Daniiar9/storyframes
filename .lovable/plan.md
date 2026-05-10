## Floating Motion Widget — UX Plan

Goal: stop cluttering each FrameCard with motion/intensity/focus rows. Replace with a **single floating widget** (Frosted-style) that lives above the canvas, is draggable, and exposes everything through one `+` button.

---

### 1. When the widget appears

- Hidden in the empty state.
- Appears the moment the **first image is uploaded**.
- Stays visible through "uploaded" and "generated" stages.
- Default position: bottom-right of the frame grid, ~24px inset, above the PromptBar / PromptChip.
- Draggable anywhere in the viewport. Position persists in `localStorage`.
- It does NOT block adding more images — uploading more frames keeps the widget exactly where it was.

### 2. Anatomy (collapsed = default)

```text
 ┌──────┐
 │  F   │   ← brand mark (decorative, not a button)
 ├──────┤
 │  +   │   ← the only interactive icon
 ├──────┤
 │  ≡   │   ← "active motion summary" toggle (see §6)
 ├──────┤
 │  ?   │   ← help / shortcuts
 └──────┘
```

- 56px wide, vertical stack, hairline border, ivory bg, zero radius (Editorial Mono).
- Top "F" area is the **drag handle** (cursor-grab).
- The `+` is the single entry point for all motion editing. Everything else is secondary.

### 3. The `+` flow (one icon, three concepts)

Click `+` → a popover anchored to the widget opens with **three primary rows**, in this order:

```text
  MOTION       ▸
  INTENSITY    ▸
  FOCUS        ▸
```

Uppercase tracked labels, hairline dividers, no icons (keeps editorial feel). Each row has a chevron meaning "reveals sub-options."

Hovering / clicking a row swaps the popover content to that row's sub-options (push-navigation inside the same popover, with a small `← back` row at top). This avoids cascading menus that get clipped on small screens.

#### 3a. MOTION sub-options
Single column, one option per row:
- None
- Zoom in
- Zoom out
- Pan ▸  (reveals a 2nd push level: Left / Right / Up / Down)
- Focus zoom

#### 3b. INTENSITY sub-options
- Subtle
- Medium
- Strong

#### 3c. FOCUS sub-options
- Center
- Top / Bottom / Left / Right (5 rows)
- "Click image to set custom focus…" — selecting this closes the popover and enters **target-pick mode** (see §4).

Selecting any leaf option (except custom focus) goes straight to **target-pick mode** with the selection armed.

### 4. Target-pick mode (the "click to highlight" pattern from your reference)

After choosing a value, a small floating instruction chip appears near the cursor:

> "CLICK A FRAME TO APPLY MOTION: ZOOM IN" (or whatever was chosen)

- Frame cards get a subtle hover ring and a `cursor-crosshair`.
- Click any frame → value is written to that frame, brief 1.5s in-card preview plays, instruction chip fades out.
- Click the same chip's `×` or press `Esc` to cancel.
- For **custom focus**: clicking the frame's image registers the normalized x/y at click point and sets `motionPreset = focus_zoom`.
- A persistent secondary action in the chip: **"Apply to all frames"** — one click writes the value across every frame.

This replaces the per-card popover entirely.

### 5. What disappears from FrameCard

Remove from each card:
- The "Motion" summary row
- The expanded pills (preset / intensity / focus)
- Reset focus button (moves into the widget — see §6)

What **stays** on the card:
- Two-digit number, image, title, caption, regenerate, drag, remove
- The 1.5s preview animation when motion changes
- The crosshair marker when a custom focus point is set (still shown on the image, with a small `×` to clear it directly)

This gives back the editorial whitespace.

### 6. The `≡` summary panel (secondary)

Click `≡` on the widget → side panel slides out listing every frame:

```text
01  ZOOM IN · MEDIUM · CENTER       [reset]
02  PAN RIGHT · SUBTLE · —          [reset]
03  FOCUS ZOOM · STRONG · 0.42,0.71 [reset]
```

- Read-only overview + per-row "reset" + bulk "Reset all motion."
- Useful for power users; the 95% path is `+` → pick → click frame.

### 7. Empty / first-use guidance

- The first time the widget appears, show a one-time tooltip on `+`: "ADD MOTION TO A FRAME".
- Dismissed on first click; never shown again (persisted).

### 8. Accessibility & keyboard

- Widget is a `role="toolbar"`, `+` is a `<button aria-haspopup="menu">`.
- Popover items are `role="menuitem"`; arrow keys navigate, `→` enters submenu, `←` / `Esc` goes back.
- Target-pick mode: `Esc` cancels; `Tab` cycles through frames with Enter to apply.
- Reduced motion respects `prefers-reduced-motion: reduce` (preview loop disabled, instant apply).

### 9. Visual language (unchanged)

- Ivory bg, 1px hairline border, zero radius, drop shadow `0 8px 24px rgba(0,0,0,.08)`.
- Uppercase tracked labels (`tracking-[0.18em] text-[11px]`).
- Selected leaf marked with a small filled square `■` on the right (no checkmarks).

### 10. Out of scope (explicit non-goals)

- No timeline, no easing curves, no per-frame duration.
- No multi-select frame mode (use "Apply to all" instead).
- No widget docking modes / no minimize-to-tray.
- No saved motion presets / library.

---

### Technical notes (for implementation later)

- New component `src/components/storyframes/MotionWidget.tsx` — owns popover state, draggable position, target-pick mode.
- New context `MotionPickContext` exposing `{ armedValue, beginPick, applyTo(frameId), cancel }` so FrameCard can react to pick mode without prop drilling.
- Drag with pointer events (no extra dep); clamp to viewport.
- Strip motion UI from `FrameCard.tsx`; keep the data model in `src/lib/storyframes.ts` and the CSS preview keyframes in `src/styles.css` exactly as-is.
- Persist widget position in `localStorage` under `storyframes.motionWidget.pos`.

Confirm and I'll implement.
