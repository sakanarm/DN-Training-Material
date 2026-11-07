"""Local preview for the DA Training Academy artifact.

index.html is written for the claude.ai Artifact tool, which adds the
<!doctype>/<html>/<head>/<body> skeleton at publish time. This script builds
that same skeleton into .preview/ (gitignored), copies the scripts and images
next to it, and serves it on http://127.0.0.1:8765.

    python scripts/preview.py            # build + serve
    python scripts/preview.py --build    # build only

Rebuild (restart) after editing files. Signed-in features (db, user, assets)
only work on the published artifact; locally the page falls back to
localStorage ("บันทึกในเครื่องนี้").
"""
import argparse
import functools
import http.server
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / ".preview"
PORT = 8765
HEAD = (
    '<!doctype html><html><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    '<link rel="icon" href="data:,">'
    "</head><body>"
)


def build():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    page = (ROOT / "index.html").read_text(encoding="utf-8")
    (OUT / "index.html").write_text(HEAD + page + "</body></html>", encoding="utf-8")
    for js in ROOT.glob("*.js"):
        shutil.copy2(js, OUT / js.name)
    shutil.copytree(ROOT / "img", OUT / "img")
    print(f"built {OUT}")


def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(OUT))
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler) as httpd:
        print(f"serving http://127.0.0.1:{PORT}/")
        httpd.serve_forever()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--build", action="store_true", help="build only, do not serve")
    args = ap.parse_args()
    build()
    if not args.build:
        serve()
