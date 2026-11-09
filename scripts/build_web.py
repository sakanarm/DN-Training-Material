"""Build the standalone web version of DA Training Academy (Firebase Hosting).

The claude.ai Artifact (index.html + *.js) stays exactly as it is. This script
wraps the same page and scripts with web/auth.js (sign-in, registration, HR
approval, user management) and the Firebase compat SDK, and writes a ready-to-
deploy Firebase project:

    dist-web/
      firebase.json      hosting + firestore rules
      .firebaserc        default project (from web/site.json)
      firestore.rules    web/firestore.rules with the admin e-mails filled in
      public/            index.html, scripts, auth.css, img/

Usage:
    python scripts/build_web.py              # build dist-web/ from web/site.json
    python scripts/build_web.py --serve      # build, then serve public/ on :18766
    python scripts/build_web.py --fake --serve
        # local demo with an in-browser fake Firebase (web/dev/fake-firebase.js),
        # built into .preview-web/ so it can never be deployed by mistake

Deploy (see web/README.md):  cd dist-web  &&  firebase deploy
"""
import argparse
import functools
import hashlib
import http.server
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
OUT_REAL = ROOT / "dist-web"
OUT_FAKE = ROOT / ".preview-web"
PORT = 18766
SDK = "https://www.gstatic.com/firebasejs/10.12.2/"
SDK_FILES = ["firebase-app-compat.js", "firebase-auth-compat.js", "firebase-firestore-compat.js"]
CONFIG_KEYS = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"]
EMAIL_RE = re.compile(r"^[^\s@\"']+@[^\s@\"']+\.[^\s@\"']+$")


def fail(msg):
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def load_site(fake):
    path = WEB / "site.json"
    if not path.exists():
        path = WEB / "site.example.json"
        print("warning: web/site.json not found, using web/site.example.json "
              "(copy it to web/site.json and fill in the Firebase config)")
    try:
        site = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        fail(f"cannot read {path.name}: {e}")
    fb = site.get("firebase") or {}
    fb = {k: str(fb.get(k) or "").strip() for k in CONFIG_KEYS}
    admins = [str(a).strip().lower() for a in site.get("admins") or [] if str(a).strip()]
    bad = [a for a in admins if not EMAIL_RE.match(a)]
    if bad:
        fail(f"admins has invalid e-mail(s): {', '.join(bad)}")
    branches = [str(b).strip()[:60] for b in site.get("branches") or [] if str(b).strip()]
    if fake:
        # the fake SDK ignores these, but auth.js needs apiKey + projectId to start
        fb["apiKey"] = fb["apiKey"] or "fake-api-key"
        fb["projectId"] = fb["projectId"] or "demo-da-academy"
        fb["authDomain"] = fb["authDomain"] or f'{fb["projectId"]}.firebaseapp.com'
    else:
        missing = [k for k in ("apiKey", "authDomain", "projectId", "appId") if not fb[k]]
        if missing:
            print(f"warning: web/site.json is missing firebase {', '.join(missing)}; "
                  "the page will show the setup screen until they are filled in")
        if not admins:
            print("warning: no admins in web/site.json; nobody can approve the first users")
    return {"firebase": fb, "admins": admins, "branches": branches, "useEmulators": bool(site.get("useEmulators"))}


def short_hash(path):
    return hashlib.sha1(path.read_bytes()).hexdigest()[:10]


def page_parts():
    page = (ROOT / "index.html").read_text(encoding="utf-8")
    title = re.search(r"<title>(.*?)</title>", page, re.S)
    style = re.search(r"<style>(.*?)</style>", page, re.S)
    scripts = re.findall(r'<script src="([^"]+)"></script>', page)
    if not (title and style and scripts):
        fail("index.html no longer has the expected <title>, <style> and <script src> tags")
    return title.group(1).strip(), style.group(1), scripts


def build_page(out_pub, site, fake):
    title, style, scripts = page_parts()
    v = lambda name: f"{name}?v={short_hash(out_pub / name)}"
    # the page only gets SHA-256 hashes of the admin e-mails, never the addresses;
    # firestore.rules (not served to browsers) holds the real list
    pub = {k: v for k, v in site.items() if k != "admins"}
    pub["adminHashes"] = [hashlib.sha256(a.encode("utf-8")).hexdigest() for a in site["admins"]]
    if fake:
        pub["admins"] = site["admins"]  # fake-firebase.js emulates the rules in the browser
    cfg = json.dumps(pub, ensure_ascii=False, indent=1).replace("</", "<\\/")
    (out_pub / "firebase-config.js").write_text(
        "/* สร้างโดย scripts/build_web.py จาก web/site.json · ค่า Firebase web config เป็นค่าสาธารณะ "
        "(ความปลอดภัยจริงอยู่ที่ firestore.rules) */\nwindow.DA_WEB = " + cfg + ";\n", encoding="utf-8")
    sdk = (['<script src="fake-firebase.js?v=' + short_hash(out_pub / "fake-firebase.js") + '"></script>'] if fake
           else [f'<script src="{SDK}{f}"></script>' for f in SDK_FILES])
    tags = sdk + [f'<script src="{v("firebase-config.js")}"></script>']
    tags += [f'<script src="{v(s)}"></script>' for s in scripts] + [f'<script src="{v("auth.js")}"></script>']
    html = f"""<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#002D73">
<meta name="description" content="ระบบฝึกอบรมผู้ช่วยทันตแพทย์ Smile Gallery Dental Clinic (ใช้ภายในคลินิก)">
<title>{title}</title>
<link rel="icon" type="image/png" href="img/denta.png">
<link rel="apple-touch-icon" href="img/denta.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai+Looped:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>{style}</style>
<link rel="stylesheet" href="{v("auth.css")}">
</head>
<body>
<div id="app"><div class="boot">กำลังโหลดระบบฝึกอบรม…</div></div>
<div id="toast" role="status" aria-live="polite"></div>
<noscript><p style="padding:24px;font-family:sans-serif">เปิด JavaScript ในเบราว์เซอร์ก่อนใช้งานระบบฝึกอบรม</p></noscript>
{chr(10).join(tags)}
<script>DA.auth.start()</script>
</body>
</html>
"""
    (out_pub / "index.html").write_text(html, encoding="utf-8")


def firebase_json():
    no_cache = [{"key": "Cache-Control", "value": "no-cache"}]
    return {
        "hosting": {
            "public": "public",
            "ignore": ["**/.*"],
            "headers": [
                {"source": "**", "headers": [
                    {"key": "X-Content-Type-Options", "value": "nosniff"},
                    {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"}]},
                {"source": "**/*.@(html|js|css)", "headers": no_cache},
                {"source": "/", "headers": no_cache},
                {"source": "img/**", "headers": [{"key": "Cache-Control", "value": "public, max-age=604800"}]},
            ],
        },
        # location: where firebase deploy creates the database if it is missing (Singapore, close to Thailand)
        "firestore": {"rules": "firestore.rules", "location": "asia-southeast1"},
    }


def build(fake):
    site = load_site(fake)
    out = OUT_FAKE if fake else OUT_REAL
    # empty the folder instead of deleting it: on Windows a shell sitting in it locks the folder itself
    if out.exists():
        for child in out.iterdir():
            shutil.rmtree(child) if child.is_dir() else child.unlink()
    pub = out / "public"
    pub.mkdir(parents=True)
    _, _, scripts = page_parts()
    for name in scripts:
        shutil.copy2(ROOT / name, pub / name)
    shutil.copy2(WEB / "auth.js", pub / "auth.js")
    shutil.copy2(WEB / "auth.css", pub / "auth.css")
    if fake:
        shutil.copy2(WEB / "dev" / "fake-firebase.js", pub / "fake-firebase.js")
    shutil.copytree(ROOT / "img", pub / "img")
    build_page(pub, site, fake)

    rules = (WEB / "firestore.rules").read_text(encoding="utf-8")
    if "__ADMINS__" not in rules:
        fail("web/firestore.rules has no __ADMINS__ placeholder")
    (out / "firestore.rules").write_text(rules.replace("__ADMINS__", json.dumps(site["admins"])), encoding="utf-8")
    if not fake:
        (out / "firebase.json").write_text(json.dumps(firebase_json(), indent=2) + "\n", encoding="utf-8")
        if site["firebase"]["projectId"]:
            (out / ".firebaserc").write_text(
                json.dumps({"projects": {"default": site["firebase"]["projectId"]}}, indent=2) + "\n", encoding="utf-8")
    print(f"built {out}" + (" (fake Firebase, local demo only)" if fake else ""))
    return pub


class NoStore(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


def serve(pub, fake):
    handler = functools.partial(NoStore, directory=str(pub))
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler) as httpd:
        # real Firebase sign-in only allows "localhost" (not 127.0.0.1) until you add it in the console
        print(f"serving http://{'127.0.0.1' if fake else 'localhost'}:{PORT}/")
        httpd.serve_forever()


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--fake", action="store_true", help="local demo with web/dev/fake-firebase.js (built into .preview-web/)")
    ap.add_argument("--serve", action="store_true", help=f"serve the build on port {PORT}")
    args = ap.parse_args()
    public = build(args.fake)
    if args.serve:
        serve(public, args.fake)
