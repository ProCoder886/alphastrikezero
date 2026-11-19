"""Build script for ALPHA STRIKE ZERO.

python build.py           -> index.html (~1.3 MB): libraries and game code inlined, assets loaded as plain binary
                             files from src/assets. Open it through any web server: VS Code Live Server, a host
                             like Y8, or `python build.py serve` (/index.html). Loads in seconds.
python build.py offline   -> alpha-strike-zero-offline.html: everything (assets too, base64) in one file that
                             opens straight from disk (file://). ~67 MB, slow to load; not for Live Server, whose
                             reload-script injection rescans a page that size for minutes.
python build.py serve     -> development server on http://127.0.0.1:8765/ that runs the game straight from src/
                             (the page is generated per request, so edits show up on reload). Dev tools can POST
                             files to /save?name=<id>&ext=<json|png|jpg> and they land in tools/out/.
"""
import os, sys, json, base64, re

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")

VENDOR = ["three.min.js", "fflate.min.js", "meshopt_decoder.js", "GLTFLoader.js", "FBXLoader.js", "OBJLoader.js",
          "SkeletonUtils.js", "BufferGeometryUtils.js", "CopyShader.js", "LuminosityHighPassShader.js",
          "EffectComposer.js", "RenderPass.js", "ShaderPass.js", "UnrealBloomPass.js"]

# Order matters: later files use globals from earlier ones.
JS = ["globals.js", "audio.js", "renderer.js", "sky.js", "assets.js", "materials.js", "nav.js", "particles.js", "weapons.js",
      "player.js", "world.js", "maps_indoor.js", "maps_outdoor.js", "expand.js", "random_maps.js", "random_themes.js", "random_themes_out.js", "enemy.js", "units.js", "bulletcam.js", "nightvision.js", "pickup.js",
      "gunsmith.js", "gunsmith_fams.js", "gunsmith_fams2.js", "catalogue.js",
      "arsenal.js", "fparms.js", "viewmodel.js", "progression.js", "armory.js", "ui.js", "touch.js", "invwheel.js",
      "modes.js", "game.js", "main.js"]

# Binary assets embedded as data URIs (keys are paths relative to src/)
BINARY_DIRS = ["assets/characters", "assets/weapons", "assets/props", "assets/textures", "assets/fx", "assets/sky", "assets/uniforms", "assets/previews", "assets/ui"]
JSON_ASSETS = ["assets/audio/audio_pack.json", "assets/anims/soldier_anims.json"] + [
    "assets/audio/" + f for f in ("arsenal_audio.json", "arsenal_fire.json", "arsenal_reload.json", "arsenal_fx.json", "supplied_audio.json", "supplied_fire.json", "supplied_reload.json")
    if os.path.exists(os.path.join(SRC, "assets/audio", f))] + sorted(
    "assets/audio/music/" + f for f in os.listdir(os.path.join(SRC, "assets/audio/music")) if f.endswith(".json") and f != "manifest.json")

MIME = {".glb": "model/gltf-binary", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".fbx": "application/octet-stream", ".obj": "text/plain"}


def read(p):
    with open(p, "r", encoding="utf-8") as f:
        return f.read()


def page(scripts, flags):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#0a0e13">
<title>ALPHA STRIKE ZERO</title>
<script>{flags}</script>
<style>
{read(os.path.join(SRC, "styles.css"))}
{read(os.path.join(SRC, "responsive.css"))}
{read(os.path.join(SRC, "menu.css"))}
</style>
</head>
<body>
{read(os.path.join(SRC, "layout.html"))}
{scripts}
</body>
</html>
"""


def asset_files():
    # recursive: assets/weapons holds the finish skins and surface maps in sub-folders
    files = []
    for d in BINARY_DIRS:
        for base, dirs, names in os.walk(os.path.join(SRC, d)):
            dirs.sort()
            rel = os.path.relpath(base, SRC).replace(os.sep, "/")
            files += [rel + "/" + n for n in sorted(names)]
    return files


def code_scripts():
    parts = [f"<script>\n{read(os.path.join(SRC, 'vendor', v))}\n</script>" for v in VENDOR]
    code = "\n".join(f"// --- {j} ---\n{read(os.path.join(SRC, 'js', j))}" for j in JS)
    parts.append(f"<script>\n{code}\n</script>")
    return parts


def build_web():
    # assets stay as files under src/assets: the browser fetches them in parallel, binary, cached
    out = page("\n".join(code_scripts()), "window.ASZ_BUILD = 'web';")
    with open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8") as f:
        f.write(out)
    total = sum(os.path.getsize(os.path.join(SRC, rel)) for rel in asset_files() + JSON_ASSETS)
    print(f"Built index.html ({len(out) / 1048576:.1f} MB; loads {total / 1048576:.1f} MB of assets from src/assets)")


def build_offline():
    data = ["window.ASSET_DATA = {};", "window.ASSET_JSON = {};"]
    total = 0
    for rel in asset_files():
        with open(os.path.join(SRC, rel), "rb") as f:
            raw = f.read()
        total += len(raw)
        mime = MIME.get(os.path.splitext(rel)[1].lower(), "application/octet-stream")
        data.append(f"window.ASSET_DATA[{json.dumps(rel)}] = 'data:{mime};base64,{base64.b64encode(raw).decode('ascii')}';")
    for rel in JSON_ASSETS:
        txt = read(os.path.join(SRC, rel))
        json.loads(txt)  # validate
        total += len(txt)
        data.append(f"window.ASSET_JSON[{json.dumps(rel)}] = {txt};")
    parts = code_scripts()
    parts.insert(len(parts) - 1, "<script>\n" + "\n".join(data) + "\n</script>")
    out = page("\n".join(parts), "window.ASZ_BUILD = 'offline';")
    name = "alpha-strike-zero-offline.html"
    with open(os.path.join(ROOT, name), "w", encoding="utf-8") as f:
        f.write(out)
    print(f"Built {name} ({len(out) / 1048576:.1f} MB, {total / 1048576:.1f} MB of assets)")


def dev_page():
    scripts = "\n".join(f'<script src="src/vendor/{v}"></script>' for v in VENDOR)
    # cache-busting query so edited sources are always re-fetched
    scripts += "\n" + "\n".join(f'<script src="src/js/{j}?v={int(os.path.getmtime(os.path.join(SRC, "js", j)))}"></script>' for j in JS)
    scripts += '\n<script src="tools/browser_weapon_test.js"></script>'
    return page(scripts, "window.ASZ_BUILD = 'dev'; window.ASZ_DEV = true;")


def serve(port=8765):
    from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
    from urllib.parse import urlparse, parse_qs
    out_dir = os.path.join(ROOT, "tools", "out")

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=ROOT, **k)

        def log_message(self, *a):
            pass

        def end_headers(self):
            self.send_header("Cache-Control", "no-store")
            super().end_headers()

        def do_GET(self):
            if urlparse(self.path).path == "/":  # /index.html serves the built release
                body = dev_page().encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            super().do_GET()

        def do_POST(self):
            q = parse_qs(urlparse(self.path).query)
            name, ext = q.get("name", [""])[0], q.get("ext", ["json"])[0]
            if urlparse(self.path).path != "/save" or not re.fullmatch(r"[a-z0-9_]+", name) or ext not in ("json", "png", "jpg"):
                self.send_response(400)
                self.end_headers()
                return
            body = self.rfile.read(int(self.headers["Content-Length"]))
            if ext in ("png", "jpg"):
                body = base64.b64decode(body.split(b",", 1)[1])
            os.makedirs(out_dir, exist_ok=True)
            with open(os.path.join(out_dir, name + "." + ext), "wb") as f:
                f.write(body)
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"ok")

    print(f"Dev server: http://127.0.0.1:{port}/")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "serve":
        serve(int(sys.argv[2]) if len(sys.argv) > 2 else 8765)
    elif len(sys.argv) > 1 and sys.argv[1] == "offline":
        build_offline()
    else:
        build_web()
