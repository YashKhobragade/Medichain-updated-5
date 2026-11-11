"""
Generates the demo photos in public/samples/ — medicine boxes (one box and
one QR code per batch) on a shelf and on a table, with perspective, uneven light, blur and
JPEG noise so they behave like real phone photos.

    python make_samples.py
"""

from __future__ import annotations

import random
from pathlib import Path

import cv2
import numpy as np
import qrcode
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / "public" / "samples"
HOST = "https://medichain.demo"

# One batch = one box = one QR. (batch ID: product, units in the box, colour)
BATCHES = {
    "BAT-MED-001": ("Paracetamol 500mg", 240, (214, 92, 70)),
    "BAT-MED-002": ("Paracetamol 500mg", 300, (214, 92, 70)),
    "BAT-MED-003": ("Amoxicillin 250mg", 180, (70, 120, 200)),
    "BAT-MED-004": ("Metformin 500mg", 400, (90, 150, 140)),
    "BAT-MED-005": ("Amoxicillin 500mg", 200, (60, 100, 180)),
    "BAT-MED-006": ("Amoxicillin 500mg", 150, (60, 100, 180)),
    "BAT-MED-007": ("InsulinPen FlexiDose", 60, (80, 170, 180)),
    "BAT-MED-008": ("Azithromycin 500mg", 120, (230, 170, 60)),
    "BAT-MED-009": ("Cetirizine 10mg", 500, (120, 170, 90)),
    "BAT-MED-010": ("Omeprazole 20mg", 600, (200, 120, 150)),
    "BAT-MED-011": ("Ibuprofen 400mg", 250, (190, 90, 110)),
    "BAT-MED-012": ("Atorvastatin 10mg", 320, (150, 90, 170)),
    "BAT-MED-013": ("Ciprofloxacin 500mg", 200, (110, 110, 190)),
    "BAT-MED-014": ("Vitamin D3 Drops", 100, (225, 150, 70)),
    "BAT-MED-015": ("Vitamin D3 Drops", 80, (225, 150, 70)),
    "BAT-MED-016": ("Cetirizine 10mg", 150, (120, 170, 90)),
    "BAT-MED-SUS-001": ("Azithromycin 500mg", 100, (230, 170, 60)),
    "BAT-MED-099": ("Paracetamol 500mg", 200, (214, 92, 70)),  # not on the ledger
}


def font(size: int, bold=False):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    for base in ("/usr/share/fonts/truetype/dejavu/", "/Library/Fonts/", "C:/Windows/Fonts/"):
        try:
            return ImageFont.truetype(base + name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def qr_image(text: str, px: int) -> Image.Image:
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=2)
    q.add_data(text)
    q.make(fit=True)
    return q.make_image(fill_color="black", back_color="white").convert("RGB").resize((px, px), Image.NEAREST)


def box(batch: str, w=440, h=330) -> Image.Image:
    name, units, colour = BATCHES[batch]
    img = Image.new("RGBA", (w + 30, h + 30), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    dark = tuple(int(c * 0.62) for c in colour)
    d.polygon([(w, 0), (w + 30, 20), (w + 30, h + 30), (w, h)], fill=dark)
    d.polygon([(0, h), (w, h), (w + 30, h + 30), (26, h + 30)], fill=tuple(int(c * 0.5) for c in colour))
    d.rectangle([0, 0, w, h], fill=colour)
    d.text((18, 14), name, font=font(28, True), fill=(255, 255, 255))
    d.text((18, 50), f"{units} units", font=font(19), fill=(255, 255, 255))
    lx, ly, lw, lh = 18, 88, w - 36, h - 106
    d.rectangle([lx, ly, lx + lw, ly + lh], fill=(250, 250, 248))
    img.paste(qr_image(f"{HOST}/verify/{batch}", lh - 16), (lx + 8, ly + 8))
    tx = lx + lh + 6
    d.text((tx, ly + 22), "MediChain", font=font(19, True), fill=(20, 120, 90))
    d.text((tx, ly + 56), batch, font=font(17), fill=(30, 30, 30))
    d.text((tx, ly + 90), "Scan to verify", font=font(15), fill=(90, 90, 90))
    return img


def photo_finish(img: np.ndarray, seed: int, warp=0.03) -> np.ndarray:
    rnd = np.random.default_rng(seed)
    h, w = img.shape[:2]
    # slight perspective, as if the phone isn't perfectly square-on
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    j = lambda: rnd.uniform(-warp, warp)
    dst = np.float32([[w * j(), h * j()], [w * (1 + j()), h * j()], [w * (1 + j()), h * (1 + j())], [w * j(), h * (1 + j())]])
    img = cv2.warpPerspective(img, cv2.getPerspectiveTransform(src, dst), (w, h), borderMode=cv2.BORDER_REPLICATE)
    # uneven lighting
    yy, xx = np.mgrid[0:h, 0:w]
    light = 0.82 + 0.28 * np.exp(-(((xx - w * 0.35) / (w * 0.7)) ** 2 + ((yy - h * 0.3) / (h * 0.8)) ** 2))
    img = np.clip(img.astype(np.float32) * light[..., None], 0, 255)
    img = cv2.GaussianBlur(img, (0, 0), 1.0)
    img = np.clip(img + rnd.normal(0, 5, img.shape), 0, 255).astype(np.uint8)
    return img


def shelf():
    W, H = 3000, 1900
    bg = Image.new("RGB", (W, H), (120, 104, 88))
    d = ImageDraw.Draw(bg)
    for i in range(0, H, 3):  # wood-ish grain
        v = 108 + int(14 * np.sin(i / 23.0)) + random.randint(-6, 6)
        d.line([(0, i), (W, i)], fill=(v, int(v * 0.86), int(v * 0.72)))
    rows = [
        ["BAT-MED-001", "BAT-MED-002", "BAT-MED-003", "BAT-MED-004", "BAT-MED-005"],
        ["BAT-MED-008", "BAT-MED-009", "BAT-MED-010", "BAT-MED-012", "BAT-MED-012"],  # same QR twice: a copy
        ["BAT-MED-016", "BAT-MED-007", "BAT-MED-SUS-001", "BAT-MED-011", "BAT-MED-099"],
    ]
    for r, y in zip(rows, [40, 650, 1260]):
        d.rectangle([0, y + 400, W, y + 450], fill=(70, 60, 52))  # plank
        x = 60
        for batch in r:
            b = box(batch).rotate(random.uniform(-3, 3), expand=True, resample=Image.BICUBIC)
            bg.paste(b, (x + random.randint(-10, 10), y + 40 + random.randint(-8, 8)), b)
            x += 585
    return photo_finish(cv2.cvtColor(np.array(bg), cv2.COLOR_RGB2BGR), 7)


def table():
    W, H = 2600, 1950
    bg = Image.new("RGB", (W, H), (196, 190, 180))
    d = ImageDraw.Draw(bg)
    for _ in range(4000):
        x, y = random.randint(0, W), random.randint(0, H)
        g = random.randint(180, 205)
        d.point((x, y), fill=(g, g - 4, g - 12))
    items = ["BAT-MED-001", "BAT-MED-005", "BAT-MED-010", "BAT-MED-013", "BAT-MED-014", "BAT-MED-006", "BAT-MED-003", "BAT-MED-015"]
    for i, batch in enumerate(items):
        r, c = divmod(i, 3)
        b = box(batch).rotate(random.uniform(-14, 14), expand=True, resample=Image.BICUBIC)
        bg.paste(b, (120 + c * 820 + random.randint(-30, 30), 120 + r * 600 + random.randint(-25, 25)), b)
    return photo_finish(cv2.cvtColor(np.array(bg), cv2.COLOR_RGB2BGR), 11, warp=0.05)


if __name__ == "__main__":
    random.seed(4)
    OUT.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(OUT / "pharmacy-shelf.jpg"), shelf(), [cv2.IMWRITE_JPEG_QUALITY, 86])
    cv2.imwrite(str(OUT / "delivery-table.jpg"), table(), [cv2.IMWRITE_JPEG_QUALITY, 86])
    print("Wrote", *sorted(p.name for p in OUT.glob("*.jpg")))
