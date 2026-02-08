# Zach Martens — Paternity Leave Playground

## Who is Zach
- Product manager on paternity leave with daughter Zoey
- Using this site as a sandbox to learn coding and document experiments
- Email: zachdmartens@gmail.com
- LinkedIn: https://www.linkedin.com/in/zachmartens/
- GitHub: zmarten

## Project Overview
Static portfolio/playground site at **zachmartens.com**. No backend — everything runs client-side. Hosted on Cloudflare Pages with auto-deploy from GitHub on every push to `master`.

## Tech Stack
- HTML, CSS, JavaScript (no frameworks)
- Chart.js v4 (via CDN) for data visualization
- chartjs-plugin-annotation v3 (via CDN) for chart overlays
- Cloudflare Pages for hosting (wrangler.jsonc config)
- GitHub repo: zmarten/my-project
- Git credentials managed via `gh auth setup-git`

## Design System
Nature-inspired light theme defined in `design-system.md`. Key tokens:
- **Fonts**: Space Grotesk (headings), Inter (body), JetBrains Mono (code)
- **Colors**: forest green (#1a3a2e) headings, moss (#2d5a4a) primary, sage (#6b8f71) secondary, cloud white (#f7f9f8) background
- **Shadows**: soft natural shadows with green-tinted rgba
- **Components**: frosted glass navbar, soft-radius cards, dashed borders for placeholders
- Full reference in `design-system.md` — always follow it for new pages

## File Structure
```
my-project/
├── index.html                  — Main portfolio (hero, projects, about, contact)
├── styles.css                  — Portfolio styles (design system applied)
├── script.js                   — Portfolio JS (scroll animations, nav, filters)
├── design-system.md            — Design system reference doc
├── wrangler.jsonc              — Cloudflare Pages config (serves ./ as static)
├── CLAUDE.md                   — This file
└── projects/
    └── hr-compare/
        ├── index.html          — HR Compare app page
        ├── styles.css          — HR Compare styles (same design system)
        ├── app.js              — TCX parsing, Chart.js rendering, stats
        ├── convert.html        — Zach's tool to convert TCX → JSON
        └── workouts/
            ├── manifest.json   — Array of available workouts for dropdown
            └── *.json          — Individual workout data files
```

## How to Add a New Workout
1. Export TCX from Garmin Connect (gear icon → Export to TCX)
2. Open `projects/hr-compare/convert.html` in a browser
3. Enter workout name, select TCX file, click Convert
4. Copy JSON output → save as new file in `projects/hr-compare/workouts/`
5. Copy manifest entry → add to `manifest.json` array
6. `git add`, `git commit`, `git push` → auto-deploys

## How to Add a New Project to the Portfolio
1. Create a new folder under `projects/` (e.g., `projects/new-thing/`)
2. Add `index.html`, `styles.css`, and JS files — follow the design system
3. In the main `index.html`, add a project card inside `.project-grid`:
   - Set `data-category="code|product|learning"` for filter support
   - Link to `projects/new-thing/index.html`
4. Commit and push

## Deploy Workflow
```
Edit files → git add <files> → git commit -m "message" → git push origin master
```
Cloudflare Pages detects the push and deploys automatically (~60 seconds).

## Architecture Decisions
- **No backend**: All visitor data processing happens in-browser via FileReader + DOMParser. TCX files never leave the visitor's device. This is intentional for privacy and simplicity.
- **Workout data as JSON files in repo**: Zach's workouts are pre-committed JSON. No database needed. The tradeoff is manual conversion, but it's simple and free.
- **Privacy note**: HR Compare page explicitly tells visitors their data stays in-browser and is never uploaded.
- **CDN for libraries**: Chart.js and annotation plugin loaded via jsdelivr CDN. No npm/build step.

## Key Technical Patterns
- **TCX parsing**: Uses `DOMParser` with `getElementsByTagNameNS` (Garmin namespace: `http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2`). Must use namespace-aware methods or it silently returns nothing.
- **Time normalization**: Absolute timestamps converted to elapsed seconds from first trackpoint so workouts on different days can be overlaid.
- **Data resampling**: HR data is resampled to 30-second intervals with linear interpolation so two datasets align on a shared time axis.
- **Red zone**: Defined as 160+ bpm. Annotated on chart with shaded box + dashed line via chartjs-plugin-annotation.
- **Chart destruction**: Must call `chartInstance.destroy()` before re-rendering or Chart.js will stack canvases.

## Future Ideas (discussed but not built)
- **Automated Garmin pipeline**: GitHub Action + `garminconnect` Python library to auto-pull new workouts daily, convert to JSON, commit, and deploy
- **Database option**: Cloudflare D1 (simplest since already on CF) or Supabase (auto-generated API, no backend code needed)
- **Garmin official API**: Requires business developer approval, webhook endpoint, OAuth — more work but production-grade

## Conventions
- Commit messages: short summary line, optional detail paragraph, always include `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
- No npm, no build tools, no frameworks — keep it simple static files
- Always match the design system in `design-system.md` for new pages
- Test locally with `python -m http.server 8000` before pushing (needed for fetch/CORS to work)
