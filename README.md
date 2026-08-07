# Hjemmelaget forside

A local, static homepage for Firefox: background colour, a grid of link tiles, and small widgets (starting with Wikipedia's Picture of the Day). No build step, no server, no dependencies — just open `index.html`.

## Use as your Firefox homepage / new tab

Set your homepage (or a new-tab redirect extension) to:

```
file:///path/to/Hjemmelaget forside/index.html
```

## Adding, removing, and reordering links

Links live in a fixed 5×4 grid (20 slots). Click **Edit links** at the bottom of the grid to enter edit mode:

- **Add** — click any empty dashed `+` slot, fill in name/URL/icon, Save.
- **Edit** — click the ✎ on a tile, change the fields, Save.
- **Remove** — click the × on a tile, or open it and click Delete.
- **Reorder** — drag a tile onto another slot to swap them, or onto an empty slot to move it there.

Click **Done** to leave edit mode. Changes save immediately — no file editing, no reload needed.

Under the hood, these edits are stored in your browser's `localStorage` for this page, keyed to slot position 0–19 (an empty slot is simply not rendered, so the grid stays fixed instead of reflowing). Clearing site data for this page (or opening it in a different browser/profile) resets it — see below.

## `config.js` — background, widgets, and the initial link seed

Open `config.js` and edit the `CONFIG` object:

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

- **`background`** — any CSS colour value.
- **`links`** — only used to *seed* the grid the very first time the page loads in a browser (up to the first 20 entries, in order). After that, the in-page editor above is the source of truth and this array is ignored — editing it won't change anything unless you clear `localStorage` for this page first.
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
