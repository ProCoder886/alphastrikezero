"""Inventory the external weapon models and texture references without modifying them."""
from collections import Counter
from pathlib import Path
import json

ASSETS = Path(r"K:\Games 2026\Y8 Games 2026\Assets 2")
SOURCES = {
    "weapon_models": ASSETS / "Weapons Pack 2026" / "Indivdual Weapons FBX 2026",
    "gun_textures": ASSETS / "Gun Textures",
}
OUT = Path(__file__).resolve().parent / "out" / "supplied_asset_inventory.json"

inventory = {}
for kind, root in SOURCES.items():
    if not root.is_dir():
        raise FileNotFoundError(root)
    files = sorted((p for p in root.rglob("*") if p.is_file()), key=lambda p: str(p).lower())
    inventory[kind] = {
        "root": str(root),
        "count": len(files),
        "bytes": sum(p.stat().st_size for p in files),
        "extensions": dict(sorted(Counter(p.suffix.lower() for p in files).items())),
        "files": [{"path": str(p.relative_to(root)), "bytes": p.stat().st_size} for p in files],
    }

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(inventory, indent=2), encoding="utf-8")
for kind, info in inventory.items():
    print(f"{kind}: {info['count']} files, {info['bytes'] / 1_000_000_000:.2f} GB, {info['extensions']}")
print(OUT)
