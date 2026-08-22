from pathlib import Path

from PIL import Image

source = Path("/home/ubuntu/webdev-static-assets/nsos-app-icon.png")
target = Path("/home/ubuntu/nsos/client/public/icons")
target.mkdir(parents=True, exist_ok=True)

image = Image.open(source).convert("RGBA")
for filename, size in {
    "nsos-icon-32.png": 32,
    "nsos-icon-180.png": 180,
    "nsos-icon-192.png": 192,
    "nsos-icon-512.png": 512,
}.items():
    image.resize((size, size), Image.Resampling.LANCZOS).save(target / filename, format="PNG", optimize=True)
