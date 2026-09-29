// Renders the link grid, page nav, link editor and widgets from CONFIG
// (config.js). Link edits are posted to server.py, which writes them back
// into config.js.

const Widgets = {};

const PAGE_SLOTS = 20; // the 5 × 4 grid laid out in style.css
const ICON_CACHE_KEY = "hjemmelaget-icon-cache";

let pages = [];
let currentPage = 0;
let editMode = false;
let formSlot = null;

const $ = (id) => document.getElementById(id);

function button(text, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = text;
  btn.addEventListener("click", onClick);
  return btn;
}

// ---- Links -------------------------------------------------------------

// Every edit shows at once, then the whole grid is saved. A failed save
// leaves the edit on screen but not in config.js, so say so loudly.
function commit() {
  renderLinks();
  fetch("save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pages)
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(await res.text());
    })
    .catch((err) => {
      alert(`Couldn't save to config.js — is server.py running?\n\n${err.message}`);
    });
}

// Writing past the end of a page leaves holes, which JSON.stringify sends
// as null — the same way config.js marks an empty slot.
function setLink(slot, link) {
  pages[currentPage][slot] = link;
  commit();
}

function moveLink(from, to) {
  if (from === to) return;
  const page = pages[currentPage];
  [page[from], page[to]] = [page[to] || null, page[from] || null];
  commit();
}

function normalizeUrl(url) {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
}

// ---- Icons -------------------------------------------------------------

// Icon sources, best match first. Google's s2 service keys its cache on the
// registrable domain, so mail.google.com resolves to the generic Google "G"
// rather than the Gmail envelope the browser tab shows — it stays last as a
// fallback. The site's own /favicon.ico is what the tab actually uses, and
// icon.horse/favicone read <link rel="icon"> for sites that don't serve one
// at the legacy path. buildIcon walks the list until an image decodes.
function iconCandidates(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return [];
  }
  const host = u.hostname;
  const root = host.split(".").slice(-2).join(".");
  const list = [
    `${u.origin}/favicon.ico`,
    `https://icon.horse/icon/${host}`,
    `https://favicone.com/${host}?s=128`,
    `https://www.google.com/s2/favicons?domain=${host}&sz=64`
  ];
  if (root !== host) {
    list.push(`https://www.google.com/s2/favicons?domain=${root}&sz=64`);
  }
  return list;
}

// Which candidate worked for each link URL. Only a cache: losing it just
// means icons are looked up again.
function readIconCache() {
  try {
    return JSON.parse(localStorage.getItem(ICON_CACHE_KEY)) || {};
  } catch {
    return {};
  }
}

function rememberIcon(url, src) {
  const cache = readIconCache();
  if (cache[url] === src) return;
  cache[url] = src;
  localStorage.setItem(ICON_CACHE_KEY, JSON.stringify(cache));
}

function letterIcon(name) {
  const span = document.createElement("span");
  span.className = "letter-icon";
  span.textContent = (name || "?").trim().charAt(0).toUpperCase();
  return span;
}

function buildIcon(link) {
  const img = document.createElement("img");
  img.alt = "";
  img.loading = "lazy";

  // An explicit iconUrl is a deliberate choice — never second-guess it.
  if (link.iconUrl) {
    img.src = link.iconUrl;
    return img;
  }

  const candidates = iconCandidates(link.url);
  if (!candidates.length) return letterIcon(link.name);

  // Try whatever worked last time first, so a resolved link costs one request.
  const cached = readIconCache()[link.url];
  const queue = cached
    ? [cached, ...candidates.filter((c) => c !== cached)]
    : candidates;

  const MIN_PX = 32;
  let i = 0;
  let timer = null;
  let best = null;
  let settled = false;

  function attempt() {
    // Some hosts accept the connection and then never answer, which fires
    // neither load nor error — without a timeout the tile stays blank.
    timer = setTimeout(advance, 2500);
    img.src = queue[i];
  }

  function settle(src) {
    settled = true;
    clearTimeout(timer);
    if (img.src !== src) img.src = src;
    rememberIcon(link.url, src);
  }

  function advance() {
    clearTimeout(timer);
    i += 1;
    if (i < queue.length) {
      attempt();
      return;
    }
    if (best) {
      settle(best.src);
      return;
    }
    img.replaceWith(letterIcon(link.name));
  }

  img.addEventListener("error", () => {
    if (!settled) advance();
  });
  img.addEventListener("load", () => {
    if (settled) return;
    clearTimeout(timer);
    // A 16px legacy .ico is the right logo but looks soft on a 40px tile,
    // so hold onto it and keep looking for a sharper copy of the same icon.
    // naturalWidth 0 means a scalable SVG — that upscales fine, so take it.
    const w = img.naturalWidth;
    if (!w || w >= MIN_PX) {
      settle(img.src);
      return;
    }
    if (!best || w > best.w) best = { src: img.src, w };
    advance();
  });
  attempt();
  return img;
}

// ---- Grid --------------------------------------------------------------

function attachDropTarget(el, slot) {
  el.addEventListener("dragover", (e) => {
    if (!editMode) return;
    e.preventDefault();
    el.classList.add("drag-over");
  });
  el.addEventListener("dragleave", () => el.classList.remove("drag-over"));
  el.addEventListener("drop", (e) => {
    if (!editMode) return;
    e.preventDefault();
    el.classList.remove("drag-over");
    const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (!Number.isNaN(from)) moveLink(from, slot);
  });
}

function buildTile(link, slot) {
  const wrap = document.createElement("div");
  wrap.className = "tile-slot";
  wrap.draggable = editMode;

  const a = document.createElement("a");
  a.className = "tile";
  a.href = link.url;
  const label = document.createElement("span");
  label.textContent = link.name;
  a.append(buildIcon(link), label);
  a.addEventListener("click", (e) => {
    if (!editMode) return;
    e.preventDefault();
    openLinkForm(link, slot);
  });

  const controls = document.createElement("div");
  controls.className = "tile-controls";
  controls.append(
    button("✎", () => openLinkForm(link, slot)),
    button("×", () => setLink(slot, null))
  );

  wrap.append(a, controls);
  wrap.addEventListener("dragstart", (e) => {
    if (!editMode) return;
    e.dataTransfer.setData("text/plain", String(slot));
    e.dataTransfer.effectAllowed = "move";
  });
  attachDropTarget(wrap, slot);
  return wrap;
}

function buildEmptySlot(slot) {
  const wrap = document.createElement("div");
  wrap.className = "tile-slot empty";
  const add = button("+", () => openLinkForm(null, slot));
  add.className = "add-btn";
  wrap.append(add);
  attachDropTarget(wrap, slot);
  return wrap;
}

// Only the current page is in the DOM, so drag-and-drop is confined to it
// for free — there are no drop targets on the pages you cannot see.
function renderLinks() {
  const grid = $("links");
  grid.classList.toggle("edit-mode", editMode);
  grid.replaceChildren();
  const page = pages[currentPage];
  for (let slot = 0; slot < PAGE_SLOTS; slot++) {
    grid.append(page[slot] ? buildTile(page[slot], slot) : buildEmptySlot(slot));
  }
  renderPageNav();
}

// ---- Page nav ----------------------------------------------------------

function goToPage(page) {
  const next = ((page % pages.length) + pages.length) % pages.length;
  if (next === currentPage) return;
  currentPage = next;
  renderLinks();
}

function renderPageNav() {
  const nav = $("page-nav");
  nav.classList.toggle("hidden", pages.length < 2);
  nav.replaceChildren();
  if (pages.length < 2) return;

  const prev = button("‹", () => goToPage(currentPage - 1));
  prev.className = "page-arrow";
  prev.setAttribute("aria-label", "Previous page");
  nav.append(prev);

  pages.forEach((_, p) => {
    const dot = button("", () => goToPage(p));
    dot.className = p === currentPage ? "page-dot active" : "page-dot";
    dot.setAttribute("aria-label", `Page ${p + 1}`);
    if (p === currentPage) dot.setAttribute("aria-current", "true");
    nav.append(dot);
  });

  const next = button("›", () => goToPage(currentPage + 1));
  next.className = "page-arrow";
  next.setAttribute("aria-label", "Next page");
  nav.append(next);
}

function initPageKeys() {
  document.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    // Leave the arrows alone while the link form is up or a field has focus.
    if (!$("link-modal").classList.contains("hidden")) return;
    if (/^(input|textarea|select)$/i.test(e.target.tagName)) return;
    goToPage(currentPage + (e.key === "ArrowRight" ? 1 : -1));
  });
}

// ---- Link editor -------------------------------------------------------

function openLinkForm(link, slot) {
  formSlot = slot;
  $("link-modal-title").textContent = link ? "Edit link" : "Add link";
  $("link-name").value = link ? link.name : "";
  $("link-url").value = link ? link.url : "";
  $("link-icon-url").value = (link && link.iconUrl) || "";
  $("link-delete").style.visibility = link ? "visible" : "hidden";
  $("link-modal").classList.remove("hidden");
  $("link-name").focus();
}

function closeLinkForm() {
  $("link-modal").classList.add("hidden");
  formSlot = null;
}

function initLinkForm() {
  $("link-cancel").addEventListener("click", closeLinkForm);
  $("link-modal").addEventListener("click", (e) => {
    if (e.target.id === "link-modal") closeLinkForm();
  });
  $("link-delete").addEventListener("click", () => {
    if (formSlot !== null) setLink(formSlot, null);
    closeLinkForm();
  });
  $("link-save").addEventListener("click", () => {
    const name = $("link-name").value.trim();
    const url = $("link-url").value.trim();
    const iconUrl = $("link-icon-url").value.trim();
    if (!name || !url) {
      alert("Name and URL are required.");
      return;
    }
    const link = { name, url: normalizeUrl(url) };
    if (iconUrl) link.iconUrl = normalizeUrl(iconUrl);
    setLink(formSlot, link);
    closeLinkForm();
  });
}

function initEditToggle() {
  const btn = $("edit-toggle");
  btn.addEventListener("click", () => {
    editMode = !editMode;
    btn.textContent = editMode ? "Done" : "Edit links";
    renderLinks();
  });
}

// ---- Widgets -----------------------------------------------------------

function loadWidgetScript(id) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `widgets/${id}.js`;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load widget script: ${id}`));
    document.head.append(script);
  });
}

async function renderWidgets() {
  const container = $("widgets");
  for (const id of CONFIG.widgets || []) {
    const box = document.createElement("div");
    box.className = "widget";
    box.id = `widget-${id}`;
    container.append(box);

    try {
      await loadWidgetScript(id);
      const widget = Widgets[id];
      if (widget && typeof widget.render === "function") {
        await widget.render(box);
      } else {
        box.textContent = `Widget "${id}" did not register correctly.`;
      }
    } catch (err) {
      box.textContent = `Widget "${id}" failed to load.`;
      console.error(err);
    }
  }
}

// ---- Start -------------------------------------------------------------

function init() {
  if (typeof CONFIG === "undefined") {
    throw new Error("CONFIG not found — is config.js loaded before app.js?");
  }
  document.body.style.backgroundColor = CONFIG.background || "#0d0d0d";
  pages = CONFIG.pages?.length ? CONFIG.pages : [[]];
  renderLinks();
  initEditToggle();
  initLinkForm();
  initPageKeys();
  renderWidgets();
}

try {
  init();
} catch (err) {
  console.error("Failed to initialize page", err);
  document.body.innerHTML =
    '<p style="color:#e8e8e8;font-family:sans-serif;padding:2rem;">Failed to load config.js — see console.</p>';
}
