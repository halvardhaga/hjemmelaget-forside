# Hjemmelaget forside

A local, static homepage for Firefox: background colour, a grid of link tiles, and small widgets (starting with Wikipedia's Picture of the Day). No build step, no server, no dependencies — just open `index.html`.

## Use as your Firefox homepage / new tab

Set your homepage (or a new-tab redirect extension) to:

```
file:///path/to/Hjemmelaget forside/index.html
```

## Pages

The grid is paged: `‹ ● ○ ○ ›` under the grid moves between them. Click an arrow, click a dot to jump straight to a page, or press `←` / `→`. The arrows wrap around, so `‹` from page 1 lands on the last page.

A new tab always opens on page 1 — the current page is deliberately not remembered, so the first grid you see is always the same one. Put your most-used links there.

Set how many pages you get with `pages` in `config.js` (see below).

## Adding, removing, and reordering links

Each page is a fixed 5×4 grid (20 slots). Click **Edit links** at the bottom of the grid to enter edit mode:

- **Add** — click any empty dashed `+` slot, fill in name/URL/icon, Save.
- **Edit** — click the ✎ on a tile, change the fields, Save.
- **Remove** — click the × on a tile, or open it and click Delete.
- **Reorder** — drag a tile onto another slot to swap them, or onto an empty slot to move it there. Dragging works within a page only; to move a link to another page, delete it and add it again there.

Edit mode stays on while you page around, so you can edit any page without leaving it. Click **Done** to leave edit mode. Changes save immediately — no file editing, no reload needed.

Under the hood, these edits are stored in your browser's `localStorage` for this page, keyed to slot position — one global sequence across all pages, so page 1 owns slots 0–19, page 2 owns 20–39, and so on (an empty slot is simply not rendered, so the grid stays fixed instead of reflowing). Clearing site data for this page (or opening it in a different browser/profile) resets it — see below.

## `config.js` — background, widgets, and the initial link seed

Open `config.js` and edit the `CONFIG` object:

```js
const CONFIG = {
  background: "#0d0d0d",
  pages: 3,
  widgets: ["wikipedia-potd"],
  links: [
    { name: "Gmail", url: "https://mail.google.com" },
    { name: "GitHub", url: "https://github.com" },
    { name: "Example", url: "https://example.com", icon: "🔧" }
  ]
};
```

- **`background`** — any CSS colour value.
- **`pages`** — how many 5×4 grids you get. With `1`, the page nav disappears entirely.

  **Lowering this number deletes links.** Anything sitting on a page that no longer exists is dropped from `localStorage` the next time the page loads — going 3 → 2 permanently removes whatever was on page 3. Raising the number is always safe. (If `pages` is missing or not a positive integer, nothing is deleted: the page count is derived from the links you already have and a warning is logged to the console.)
- **`links`** — only used to *seed* the grid the very first time the page loads in a browser (up to `pages × 20` entries, in order, filling page 1 first). After that, the in-page editor above is the source of truth and this array is ignored — editing it won't change anything unless you clear `localStorage` for this page first.
- **`widgets`** — array of widget ids to show, in order. Remove an id to turn a widget off — no code changes needed.

Save the file and reload the page (`Cmd+R`) to see `background`/`widgets` changes.

### Why `config.js` instead of `config.json`?

Firefox blocks `fetch()` between local `file://` documents (each local file is treated as its own opaque origin), so `fetch('config.json')` fails with a CORS error when the page is opened via `file://`. Loading `config.js` as a plain `<script>` tag sidesteps this — script tags aren't subject to that restriction — while keeping the config in a separate, easily-edited file.

## Adding a new widget

1. Create `widgets/<id>.js`. It must register itself:

   ```js
   Widgets["<id>"] = {
     async render(container) {
       // populate `container` with the widget's DOM
     }
   };
   ```

2. Add `"<id>"` to the `widgets` array in `config.js`.

That's it — `index.html` injects `widgets/<id>.js` and calls `.render()` automatically. No changes to `index.html` are needed.

The included `widgets/wikipedia-potd.js` is a reference implementation: it fetches the day's featured image from Wikipedia's public REST API (`en.wikipedia.org/api/rest_v1/feed/featured/...`, which sends CORS headers allowing cross-origin/file:// access) and renders an image + caption.

## Files

- `index.html` — structure + inline script that renders links and loads widgets.
- `style.css` — background and grid layout.
- `config.js` — background colour, links, enabled widgets (edit this to customize).
- `widgets/` — one self-contained file per widget.
