"""Serve Hjemmelaget forside on http://localhost:8765 and save link edits.

Serves this folder to this Mac only. The one write it accepts is POST /save,
whose JSON body (the link grid) replaces "pages" in config.js. Standard
library only; see README.md for starting it at login.
"""

import json
import os
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORT = 8765
ROOT = Path(__file__).resolve().parent
CONFIG_FILE = ROOT / "config.js"
PREFIX = "const CONFIG = "

save_lock = threading.Lock()


def dumps(value):
    return json.dumps(value, ensure_ascii=False)


def format_pages(pages):
    out = []
    for page in pages:
        while page and page[-1] is None:  # trailing empty slots say nothing
            page.pop()
        links = ",\n".join(f"      {dumps(link)}" for link in page)
        out.append(f"    [\n{links}\n    ]" if page else "    []")
    return "[\n" + ",\n".join(out) + "\n  ]"


def format_config(config):
    """JSON with one link per line, so config.js reads like the grid."""
    fields = []
    for key, value in config.items():
        text = format_pages(value) if key == "pages" else dumps(value)
        fields.append(f"  {dumps(key)}: {text}")
    return "{\n" + ",\n".join(fields) + "\n}"


def save_pages(pages):
    """Swap `pages` into config.js, keeping its header and other settings."""
    with save_lock:
        header, found, body = CONFIG_FILE.read_text(encoding="utf-8").partition(PREFIX)
        if not found:
            raise ValueError(f'config.js must contain "{PREFIX}{{...}};"')
        config = json.loads(body.strip().rstrip(";"))
        config["pages"] = pages
        tmp = CONFIG_FILE.with_name("config.js.tmp")
        tmp.write_text(header + PREFIX + format_config(config) + ";\n", encoding="utf-8")
        os.replace(tmp, CONFIG_FILE)  # atomic, so config.js is never half-written


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        # A new tab must show config.js as it is on disk, never a cached copy.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        if self.path != "/save":
            self.send_error(404)
            return
        try:
            pages = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            if not (isinstance(pages, list) and all(isinstance(p, list) for p in pages)):
                raise ValueError("expected a list of pages")
            save_pages(pages)
        except Exception as err:
            print(f"Save failed: {err}", file=sys.stderr, flush=True)
            self.reply(500, str(err))
            return
        self.reply(200, "Saved")

    def reply(self, code, text):
        body = text.encode()
        self.send_response(code)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass  # a line per request is noise; save failures are printed above


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Hjemmelaget forside on http://localhost:{PORT}", flush=True)
    server.serve_forever()
