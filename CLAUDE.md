# Sage — daily stretch app

A personal stretching/yoga app installed on the owner's iPhone as a home-screen web app.
The owner is not a developer: explain things simply, make the changes, test, and publish for them.

## Where it lives
- Live: https://adamregner.github.io/sage/ (GitHub Pages from `main`, root folder)
- Repo: https://github.com/adamregner/sage
- Plain HTML/CSS/JS, no build step. Main files: `js/app.js` (screens, session player),
  `js/poses.js` (pose database), `js/routine.js` (routine builder), `js/progress.js` (streaks/unlocks),
  `js/figure.js` (pose line drawings), `css/style.css`.

## Every change
1. Edit locally.
2. Run the tests: start `serve.ps1`, open `http://localhost:8080/tests/` (or headless Edge with
   `--dump-dom`); all checks must pass. The tests wipe that browser's saved app data.
3. Bump `VERSION` in `sw.js` — otherwise the installed iPhone app keeps serving the old version.
4. Commit and `git push` to `main`, then confirm the Pages build finished.

## Product rules
- Lumbar support and everyday flexibility are the focus; keep poses beginner-safe with easier options.
- Each pose starts with a "get into position" prep (45s beginner, 35s otherwise) that the owner can
  skip with "Start pose". Prep is on top of the chosen session length and doesn't count as stretching.
- A practice day counts after 5 minutes of stretching. Every 7 practice days (not necessarily
  consecutive) unlocks 2 advanced poses, in `unlock` order. Open question for the owner: keep this,
  require 7 days in a row, or use calendar weeks.
- Look: sage green, rounded, calm. Session screen uses an edge glow for breathing
  (green = inhale/exhale, warm sand = hold).
