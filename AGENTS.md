# AGENTS.md

## Cursor Cloud specific instructions

This repository is a **self-contained static website** (vanilla HTML/CSS/JS) — the interactive CPO diagram rendered on an HTML5 canvas. Key facts for developing here:

- **No dependencies, no build step, no package manager.** There is no `package.json`, no lockfile, and no bundler. Nothing needs to be installed to develop or run it. The update script is intentionally a no-op.
- **Entry point:** `index.html` (loads `styles.css` and `app.js`). All diagram data and logic live in `app.js`; there are no network/API calls.
- **Run it (dev):** serve the repo root with any static file server, e.g. `python3 -m http.server 8000`, then open `http://localhost:8000/index.html`. Opening `index.html` via `file://` also works since there are no fetch/CORS dependencies.
- **No lint or test tooling exists** in this repo. Don't go looking for `npm test`/lint scripts — verification is manual in the browser (click canvas blocks to open the details panel; use the search box to filter/highlight elements).
- A harmless `404 favicon.ico` appears in the browser console; it does not affect functionality.
- **Deployment:** `.github/workflows/pages.yml` publishes the repo root to GitHub Pages on push to `main`.
- The `canva/` folder is static export assets + docs (Canva import), not a runnable service.
