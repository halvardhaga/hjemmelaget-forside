# Hjemmelaget forside — Architecture & Plan

## Goal
A local, static homepage for Firefox: static colour background, grid of link icons to frequently used sites, plus small widget(s). Start with only Wikipedia Picture of the Day, but might want to add others later. Minimalistic (aesthetically and technically), fully offline-capable, trivially editable.

## Architecture

Single folder, no build step, no server, no dependencies beyond the browser.

```
Repositories/Hjemmelaget forside/
├── index.html                    # structure + inline <script> that renders everything
├── style.css                     # background, grid layout
├── config.js                     # background colour, links, and which widgets to show
├── widgets/
│   ├── wikipedia-potd.js         # self-contained widget module
│   └── ...                       # drop new widget files here
├── README.md                     # human-facing guide: architecture, how to edit config, how to add a widget
└── project.md                    # this file
```

**Loading mechanism:** Firefox homepage/new-tab set to `file:///.../index.html`.

**Rendering flow:**
1. `index.html` loads `config.js` via `<script src>`, which defines a global `CONFIG` object with background colour, an initial link list, and enabled widget ids.
2. JS sets `document.body.style.backgroundColor = CONFIG.background`.
3. Links live in a fixed 5×4 grid (20 slots, `slot: 0-19`). On first run (empty `localStorage`), the grid is seeded from `CONFIG.links` in array order; after that, `CONFIG.links` is ignored and the grid is read from/written to `localStorage` — link management (add, edit, remove, reorder) happens entirely in the browser via an "Edit links" mode, no file editing required. A slot with no link renders nothing (`visibility: hidden`) so the grid stays fixed instead of reflowing.
4. Icon source per entry: default to favicon service (`https://www.google.com/s2/favicons?domain=<domain>&sz=64`) — pulls the site's own browser-tab icon automatically. Override with a custom `icon` field (emoji) if a favicon looks bad.
5. For each id in `config.widgets`, JS injects `<script src="widgets/<id>.js">`. Each widget file registers itself on load (e.g. `Widgets['wikipedia-potd'] = { render: async (container) => {...} }`). Once loaded, `index.html` calls `.render()` on a container element for that widget.

**Data format — `config.js`:**
```js
const CONFIG = {
  background: "#0d0d0d",
  widgets: ["wikipedia-potd"],
  links: [
    { name: "Gmail", url: "https://mail.google.com" },
    { name: "GitHub", url: "https://github.com" },
    { name: "Example", url: "https://example.com", icon: "🔧" }
  ]
};
```
- `links` here is only the seed used the very first time the page loads in a browser profile (up to 20 entries, in slot order 0, 1, 2, ...). Once the page has run once, all add/edit/remove/reorder happens via the in-page "Edit links" mode, stored in `localStorage` under `hjemmelaget-links` — editing this array afterwards has no effect.
- `icon` field optional; omitted = favicon auto-fetch.
- Toggling a widget = adding/removing its id from the `widgets` array. No code change needed to turn one on/off.
- Building a new widget = adding a new file to `widgets/` that registers under a chosen id, then adding that id to `config.js`.

**Widget contract:** each `widgets/<id>.js` file must register `Widgets['<id>'] = { render(container) }` where `render` is sync or async and populates `container` with the widget's DOM. This keeps widgets self-contained and swappable — no changes to `index.html` needed to add, remove, or replace one.

**Known risk (resolved):** confirmed during implementation that Firefox blocks `fetch()` between local `file://` documents (each local file is an opaque origin, so `fetch('config.json')` fails with a CORS error). Widget script injection via `<script src>` is unaffected — that restriction only applies to `fetch`/`XHR`. Fix applied: `config.json` → `config.js` exporting `const CONFIG = {...}`, loaded via `<script src="config.js">` instead of `fetch`. Keeps the "no server" and "separate, editable config file" goals intact.

## Plan
1. Scaffold `index.html` + `style.css` (grid layout, background driven by config).
2. Add `config.json` with real links and background colour.
3. Implement grid renderer + favicon icon logic.
4. Define the widget contract; implement `widgets/wikipedia-potd.js` as the first widget.
5. Implement widget loader in `index.html` (reads `config.widgets`, injects scripts, calls `render`).
6. Verify `file://` fetch + dynamic script injection work; apply fallback if not.
7. Write `README.md`: architecture overview, how to edit `config.json`, how to add/remove a widget.

## Explicitly out of scope (for now)
- Hosting / remote sync — local-machine only (link edits live in `localStorage`, tied to this browser profile and this exact `file://` path).
- Build tooling / frameworks.
- Exporting `localStorage` edits back into `config.js` — if you clear browser data for this page, it re-seeds from whatever `config.js` still says.
