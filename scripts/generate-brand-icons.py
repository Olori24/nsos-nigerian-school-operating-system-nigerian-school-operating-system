from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "client" / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

COLORS = {
    "ink": "#0b1715",
    "teal": "#0f5c4f",
    "mint": "#dff5e4",
    "mint_dark": "#b8dfc3",
    "paper": "#fffdf7",
    "gold": "#d8a64a",
}


def draw_mark(size: int) -> Image.Image:
    scale = 4
    canvas = Image.new("RGBA", (64 * scale, 64 * scale), COLORS["ink"])
    draw = ImageDraw.Draw(canvas)

    def box(values):
        return tuple(round(value * scale) for value in values)

    def width(value):
        return max(1, round(value * scale))

    def point(x, y):
        return (round(x * scale), round(y * scale))

    draw.rounded_rectangle(box((5, 5, 59, 59)), radius=13 * scale, fill=COLORS["teal"])
    draw.line([point(14, 27.5), point(32, 17), point(50, 27.5)], fill=COLORS["mint"], width=width(3.5), joint="curve")
    draw.line([point(16, 29), point(48, 29)], fill=COLORS["mint_dark"], width=width(2.5))
    for x in (17, 27, 37, 47):
        draw.line([point(x, 31), point(x, 49)], fill=COLORS["paper"], width=width(4))
    draw.line([point(14, 50), point(50, 50)], fill=COLORS["mint_dark"], width=width(3))
    draw.ellipse(box((46, 12, 52, 18)), fill=COLORS["gold"])
    return canvas.resize((size, size), Image.Resampling.LANCZOS)


for filename, size in (
    ("nsos-mark-16.png", 16),
    ("nsos-icon-32.png", 32),
    ("nsos-icon-180.png", 180),
    ("nsos-icon-192.png", 192),
    ("nsos-icon-512.png", 512),
):
    draw_mark(size).save(OUT / filename, "PNG", optimize=True)
