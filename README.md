# BOUNDLESS NEON

An installable, offline-first web app for iPhone that runs and logs a 14-day training program on the gym floor, then repeats it in seasons. Dark 90s-neon UI, big tap targets, timestamp-accurate interval timers, and an on-device journal with progress charts.

**Live:** https://pokerbrainupgrade-a11y.github.io/boundless-neon/

Everything is stored on the device. No account, no backend, no analytics.

## Install on iPhone

1. Open the live URL in **Safari**.
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. Open it from the Home Screen once while online. After that it works in airplane mode.

The first launch asks about Prenatal Mode (on by default; it can be switched off in Settings) and then for a start date.

## What it does

- **Today** — the day's warm-up, main set, and cool-down with one-tap timers, a daily habit checklist, and a morning resting HR / HRV entry.
- **Schedule** — the 14-day grid, day previews, "shift remaining days +1" for a missed day, start-date editor, next season.
- **Moves** — every session, the Foundation sequences, 7-minute moves, super-slow patterns, and mobility stations with original line drawings, cues, and safety notes. Includes a Reference tab (protocols, rules, evidence flags) and the Prenatal override table.
- **Journal** — every logged session by season and day, editable.
- **Progress** — Tabata totals and per-round drop-off, super-slow seconds-to-failure and load, 5x4 HR per round, sauna minutes, stamina, cold dose, and resting HR/HRV, each with W1 vs W2 and season-vs-season views.
- **Timers** — Tabata, 5x4 VO2 max, sprints, 7-minute, super-slow (tempo metronome + failure button), cold shower cycle, cold immersion, sauna with a box-breathing pacer, hot-cold contrast, stamina with halfway and hydration alerts, simple countdowns, and steppers for Foundation, mobility, and decompression breathing. Cues are beeps plus a full-screen color flash; the screen stays awake while a timer runs.
- **Prenatal Mode** — conservative, trimester-aware modifications of the program (removed heat/cold/all-out work, swapped moves and positions, RPE targets instead of heart rate, a persistent "Stop if…" list). These are general modifications, not medical advice; a provider-clearance date is required before the first session.
- **Apple Health bridge** — pulls average and max heart rate for a session through an iOS Shortcut and the clipboard. See [docs/HEALTH_SHORTCUT.md](docs/HEALTH_SHORTCUT.md). Manual entry always works.

## Back up your journal

iOS can evict site data. The JSON export is the only backup.

1. **Settings → Backup → Export JSON.** On iPhone this opens the share sheet; choose **Save to Files**.
2. To restore on any device: **Settings → Import JSON**, pick the file, then choose **Merge** or **Replace**.

Today shows a reminder when the last export is more than 7 days old.

## Local development

```bash
npm install
npm run dev          # http://localhost:5173/boundless-neon/
npm test             # unit tests (Vitest)
npm run build        # verify program data + typecheck + production build
npm run test:e2e     # Playwright against the built app (run npm run build first)
npm run icons        # regenerate PNG icons from assets/icon.svg
```

- `npm run verify` checks the program data (`src/data/program.json`) against its schema and prints the day-by-day table.
- `#/dev/poses` shows a contact sheet of every line drawing ([docs/poses.png](docs/poses.png)).
- Deploys run from `.github/workflows/deploy.yml` on every push to `main`: unit tests → build → e2e → GitHub Pages.

## Stack

Vite, TypeScript, Preact + signals, `vite-plugin-pwa` (Workbox), Dexie (IndexedDB), Zod, Vitest, Playwright. Plain CSS with custom properties; self-hosted fonts via `@fontsource`. No UI kit, no chart library.

## Notes

- All day math uses the `America/Phoenix` calendar.
- Timers are timestamp-based and recompute their state when the app returns from the background.
- The iPhone silent switch mutes web audio; the color flash is the backup cue.
- Personal use. Not medical advice.
