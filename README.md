# Hjemmelaget forside

A personal browser homepage: a paged grid of link tiles and a Wikipedia Picture of the Day widget on a plain dark background. A tiny local Python server serves it and saves link edits made in the page straight into `config.js`.

No build step, no frameworks, no dependencies beyond the Python 3 that ships with macOS.

## Files

```
index.html          page structure
style.css           all styling
app.js              link grid, page nav, link editor, widget loader
config.js           your settings and links — the only file with personal content
server.py           serves this folder and writes link edits to config.js
widgets/            one self-contained file per widget
  wikipedia-potd.js
```

## Running it

To try it by hand, run this in the project folder and open <http://localhost:8765> (Ctrl+C stops it):

```bash
/usr/bin/python3 server.py
```

### Where the folder lives

The project lives in `~/Developer/Hjemmelaget forside`, with a symlink at `~/Documents/Repositories/Hjemmelaget forside` pointing to it, so it still shows up alongside the other repositories.

It can't physically live in `~/Documents`. macOS blocks background processes from reading protected folders (Documents, Desktop, Downloads, iCloud Drive), so a `python3` started by launchd fails with `Operation not permitted`. macOS judges a file by its real location, so the symlink doesn't trip this — as long as the LaunchAgent below points at the real path under `~/Developer`. (Giving `python3` Full Disk Access would also work, but grants every background Python script access to everything.)

To set it up on a new Mac, clone into `~/Developer` and create the symlink. Use `ln -s`, not Finder's *Make Alias*: Terminal and git don't follow Finder aliases.

```bash
ln -s ~/Developer/"Hjemmelaget forside" ~/Documents/Repositories/"Hjemmelaget forside"
```

### Start at login

A launchd agent starts the server at every login and restarts it if it crashes.

1. Create `~/Library/LaunchAgents/local.hjemmelaget-forside.plist` with the content below. Adjust the paths if your home folder or the project folder differ; the `server.py` path must be the real location, not the path through the symlink.

   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
     <key>Label</key>
     <string>local.hjemmelaget-forside</string>
     <key>ProgramArguments</key>
     <array>
       <string>/usr/bin/python3</string>
       <string>/Users/halvardhaga/Developer/Hjemmelaget forside/server.py</string>
     </array>
     <key>RunAtLoad</key>
     <true/>
     <key>KeepAlive</key>
     <true/>
     <key>StandardOutPath</key>
     <string>/Users/halvardhaga/Library/Logs/hjemmelaget-forside.log</string>
     <key>StandardErrorPath</key>
     <string>/Users/halvardhaga/Library/Logs/hjemmelaget-forside.log</string>
   </dict>
   </plist>
   ```

2. Load it (this also starts it now):

   ```bash
   launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/local.hjemmelaget-forside.plist
   ```

3. Open <http://localhost:8765>.

Changes to `index.html`, `style.css`, `app.js`, `config.js` or widgets need no restart — just reload the page. After changing `server.py`, restart it:

```bash
launchctl kickstart -k gui/$(id -u)/local.hjemmelaget-forside
```

To remove the agent, run the command below and delete the plist:

```bash
launchctl bootout gui/$(id -u)/local.hjemmelaget-forside
```

After editing the plist itself, run `bootout` and then `bootstrap` again — launchd only reads it when loading.

If the page doesn't load, check whether the server is running (a process ID in the first column means yes; `-` means no):

```bash
launchctl list | grep hjemmelaget
```

The log at `~/Library/Logs/hjemmelaget-forside.log` says why it stopped.

### Firefox

- **Homepage:** Settings → Home → *Homepage and new windows* → *Custom URLs* → `http://localhost:8765`
- **New tabs:** Firefox can't open a custom URL in new tabs by itself. Use a new-tab extension (e.g. *New Tab Override*) pointed at `http://localhost:8765`.

## Using the page

**Pages.** `‹ ● ○ ○ ›` under the grid switches pages: the arrows wrap around, the dots jump straight to a page, and the `←` / `→` keys do the same. A new tab always opens on page 1, so put your most-used links there. With a single page the nav is hidden.

**Editing links.** Click **Edit links** under the grid:

- **Add** — click an empty dashed `+` slot, fill in Name, URL and optionally Icon URL, and Save.
- **Edit** — click a tile (or its ✎).
- **Remove** — click the × on a tile, or Delete in its form.
- **Reorder** — drag a tile onto another tile to swap them, or onto an empty slot to move it there. Dragging works within the current page; to move a link to another page, add it again there (or move its line in `config.js`).

Click **Done** to leave edit mode. A URL typed without a scheme gets `https://` in front.

Every change is saved to `config.js` immediately. If a save fails (usually because the server isn't running), an alert says so: the change stays on screen but is not in `config.js`, and disappears on the next reload. With two homepage tabs open, the last one to save wins — edit in a freshly opened tab.

**Icons.** Each tile finds the site's own favicon automatically, trying in order the site's `/favicon.ico`, icon.horse, favicone.com and Google's favicon service. Icons smaller than 32px are only used if nothing sharper turns up, and if nothing loads at all the tile shows the first letter of its name. Set **Icon URL** on a link to override the automatic choice. The winning source for each link is cached in the browser's `localStorage`; that's only a cache, so clearing it just means icons are looked up again.

Opening `index.html` directly as a file (`file://`) also works, but read-only: every edit fails to save.

## `config.js`

```js
// Hjemmelaget forside settings. See README.md for what each field does.
// Strict JSON from here on: server.py rewrites "pages" when you edit links.
const CONFIG = {
  "background": "#141414",
  "widgets": ["wikipedia-potd"],
  "pages": [
    [
      {"name": "Gmail", "url": "https://mail.google.com"},
      null,
      {"name": "GitHub", "url": "https://github.com", "iconUrl": "https://example.com/github.png"}
    ],
    [],
    []
  ]
};
```

- **`background`** — any CSS colour.
- **`widgets`** — widget ids to show, top to bottom. Remove an id to turn that widget off.
- **`pages`** — one array per 5×4 page, holding its 20 slots left to right, top to bottom. `null` is an empty slot, and empty slots at the end are left out. Each link has `name`, `url` and an optional `iconUrl`. Add a page by adding `[]`; deleting a page's array deletes its links.

The page edits `pages` for you, so hand-editing is mainly for the other fields. Everything after `const CONFIG = ` must be strict JSON — quoted keys, no comments, no trailing commas — because `server.py` reads it with Python's `json` module. A syntax error makes the page show "Failed to load config.js", and saves fail until it's fixed. Comment lines above `const CONFIG = ` are kept as they are; the object itself is rewritten in the layout shown above on every save.

## How it works

`index.html` loads `config.js` as a plain script, which defines the global `CONFIG`, and then `app.js`, which renders the grid, the page nav and the widgets. Only the current page of the grid is in the DOM. `config.js` is a script rather than a `.json` file so the page renders without a `fetch`, which also keeps the read-only `file://` fallback working.

`server.py` uses only the Python standard library. It serves this folder on `127.0.0.1:8765` with caching turned off, so a new tab always shows `config.js` as it is on disk. Its only write endpoint, `POST /save`, takes the full `pages` array as JSON, swaps it into `config.js`, and writes the file atomically (temp file, then rename) so it is never left half-written.

The server listens on `127.0.0.1` only, so no other machine can reach it. It doesn't check where requests come from, so a website open in the same browser could in principle send a save request and change your links. That is the worst case: the server serves nothing outside this folder and writes nothing but `config.js`.

## Adding a widget

1. Create `widgets/<id>.js` that registers itself:

   ```js
   Widgets["<id>"] = {
     async render(container) {
       // fill `container` with the widget's DOM
     }
   };
   ```

2. Add `"<id>"` to `widgets` in `config.js`.

`app.js` loads `widgets/<id>.js` and calls `render()` with an empty box styled by `.widget`; `index.html` needs no changes. The `.widget-title`, `.widget-image` and `.widget-caption` classes in `style.css` keep widgets looking alike. `widgets/wikipedia-potd.js` is the reference: it fetches the day's featured image from Wikipedia's public API and renders the image with its caption.
