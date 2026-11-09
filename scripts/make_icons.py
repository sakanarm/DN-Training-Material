"""Make the app icons for the web version (installable PWA) from img/denta.png.

    python scripts/make_icons.py

Writes web/pwa/:
    icon-192.png, icon-512.png    rounded navy square with transparent corners ("any")
    icon-maskable-512.png         full-bleed navy, artwork inside the 80% safe circle (Android masks)
    apple-touch-icon.png          180x180 full-bleed navy, no transparency (iOS rounds it itself)

The icons are committed, so the build does not need Pillow. Run this again only when
the mascot changes. img/denta.png is only about 179x256 px, so the 512 icons upscale
it a little; swap in a larger transparent PNG of DENTA for sharper icons.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "web" / "pwa"
NAVY = (0, 45, 115, 255)       # #002D73
NAVY_2 = (47, 54, 143, 255)    # #2F368F
WHITE = (255, 255, 255, 255)
SS = 4                         # draw shapes at 4x, then downscale for smooth edges


def background(size, rounded):
    big = size * SS
    bg = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    # navy with a soft lighter glow from the top
    fill = Image.new("RGBA", (big, big), NAVY)
    glow = Image.new("L", (big, big), 0)
    ImageDraw.Draw(glow).ellipse((-big * 0.2, -big * 0.55, big * 1.2, big * 0.65), fill=110)
    glow = glow.filter(ImageFilter.GaussianBlur(big * 0.12))
    fill = Image.composite(Image.new("RGBA", (big, big), NAVY_2), fill, glow)
    mask = Image.new("L", (big, big), 0)
    if rounded:
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, big - 1, big - 1), round(big * 0.22), fill=255)
    else:
        mask.paste(255, (0, 0, big, big))
    bg.paste(fill, (0, 0), mask)
    return bg


def icon(size, rounded, disc, mascot):
    """disc and mascot are fractions of the icon size (disc diameter, mascot height)."""
    big = size * SS
    im = background(size, rounded)
    r = big * disc / 2
    c = big / 2
    ImageDraw.Draw(im).ellipse((c - r, c - r, c + r, c + r), fill=WHITE)
    im = im.resize((size, size), Image.LANCZOS)
    d = Image.open(ROOT / "img" / "denta.png").convert("RGBA")
    h = round(size * mascot)
    w = round(d.width * h / d.height)
    m = d.resize((w, h), Image.LANCZOS)
    if h > d.height:
        m = m.filter(ImageFilter.UnsharpMask(1.2, 60, 2))
    im.alpha_composite(m, ((size - w) // 2, round(size / 2 - h / 2 + size * 0.01)))
    return im


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    icon(192, True, 0.80, 0.63).save(OUT / "icon-192.png", optimize=True)
    icon(512, True, 0.80, 0.63).save(OUT / "icon-512.png", optimize=True)
    # maskable: keep the white disc inside the 80% safe circle
    icon(512, False, 0.76, 0.60).save(OUT / "icon-maskable-512.png", optimize=True)
    icon(180, False, 0.80, 0.63).convert("RGB").save(OUT / "apple-touch-icon.png", optimize=True)
    for p in sorted(OUT.glob("*.png")):
        print(f"wrote {p.relative_to(ROOT)} ({p.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
