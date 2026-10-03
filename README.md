# Sage · Daily Stretch

A calm 10–25 minute stretching and yoga routine for iPhone, focused on lumbar support and everyday flexibility.

- **78 poses** (46 beginner, 16 intermediate, 16 advanced), each with a line drawing, steps, an easier option, why it helps, and a breathing pattern
- **One tap to start**: *Start session* uses your saved length, focus and level. *Full Body · 25 min* is a one-tap head-to-toe routine that touches all 12 major areas (neck, shoulders, chest, spine, side body, low back, core, hips, glutes, quads, hamstrings, calves)
- **Session builder** (Edit): pick length (10/15/20/25 min), focus (full body, low back, hips, legs & hamstrings, shoulders & neck) and level
- **Advanced unlocks**: every 7 practice days (they don't need to be in a row) unlocks 2 hard poses. On the Advanced level, the newest two go into every session that week. All 16 are open after 8 practice weeks
- A practice day counts once you've stretched for **5 minutes** (skipping through doesn't count)
- **Hands-free session**: get-ready countdown → hold timer → automatic side switch → next pose
- **Breathing glow** around the screen edges: green grows on the inhale and fades on the exhale, and turns warm sand while you hold your breath
- Soft chimes, optional voice guidance and spoken breath cues
- Streaks, a calendar and session history, saved on the device
- Works offline once installed

## Try it on this PC

Double-click `index.html`, or run the local server (needed for offline mode):

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Then open http://localhost:8080. To run the tests, open http://localhost:8080/tests/ (they reset the app's saved data in that browser).

## Put it on your iPhone

The app has to be hosted over HTTPS to install. Any free static host works (GitHub Pages, Netlify, Cloudflare Pages): upload this whole folder as-is. No build step is needed.

1. Open the hosted link in **Safari** on your iPhone.
2. Tap **Share**, then **Add to Home Screen**.
3. Launch **Sage** from your home screen. It opens full-screen and works offline.

When you change files later, bump `VERSION` in `sw.js` so installed copies pick up the update.

## Files

| Path | What it is |
|---|---|
| `index.html` | App shell |
| `css/style.css` | All styling (light and dark mode) |
| `js/poses.js` | Pose database. Add or edit poses here |
| `js/figure.js` | Draws each pose as a line figure from joint angles |
| `js/routine.js` | Builds balanced routines that fit the chosen length (plus Full Body 25 coverage) |
| `js/progress.js` | Streaks, practice days and advanced unlocks |
| `tests/` | Automated test suite (`/tests/`) and phone previews (`/tests/preview.html?days=6&screens=home,done`) |
| `js/app.js` | Screens, session player, breathing glow, sound and progress |
| `sw.js`, `manifest.webmanifest`, `icons/` | Home-screen install and offline support |

Stretch to a comfortable edge, never into pain. If you have an injury or a back condition, check with a professional first.
