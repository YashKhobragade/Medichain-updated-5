"""
MediChain inventory scanner — ML service
========================================

Finds and reads every QR code in a photo of medicine boxes.

It uses OpenCV's WeChat QR engine, which contains two small trained
neural networks (Caffe models in ./models):

  1. detect.caffemodel — a CNN *detector* that finds where QR codes are
  2. sr.caffemodel     — a *super-resolution* CNN that enlarges small or
                          blurry codes so the decoder can read them

Large photos are also scanned in overlapping tiles, so small codes far
from the camera still get enough pixels to be found.

Run:
    pip install -r requirements.txt
    python main.py            # serves http://localhost:8000

API:
    GET  /health  -> {"ok": true, "model": "wechat_qrcode"}
    POST /scan?mode=photo|live  (multipart field "image") ->
         {"width", "height", "codes": [{"text", "points": [[x,y] x4]}], "ms"}
"""

from __future__ import annotations

import os
import time
from pathlib import Path

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile

MODELS = Path(__file__).parent / "models"
MAX_SIDE = 4000          # downscale anything bigger than this first
LIVE_MAX_SIDE = 1920     # live camera frames: keep each scan fast
TILE_TRIGGER = 900       # tile photos whose long side is above this
TILE_TARGET = 1100       # small tiles are enlarged to about this size
MAX_UPLOAD = 15 * 1024 * 1024

app = FastAPI(title="MediChain scanner")


def load_detector():
    files = [MODELS / n for n in ("detect.prototxt", "detect.caffemodel", "sr.prototxt", "sr.caffemodel")]
    missing = [f.name for f in files if not f.exists()]
    if missing:
        raise RuntimeError(f"Model files missing from {MODELS}: {', '.join(missing)}")
    return cv2.wechat_qrcode_WeChatQRCode(*map(str, files))


detector = load_detector()


def _decode(img: np.ndarray, ox: int = 0, oy: int = 0, upscale: bool = False):
    """Run the CNN detector + decoder on one image (or tile)."""
    f = 1.0
    if upscale and max(img.shape[:2]) < TILE_TARGET:
        f = TILE_TARGET / max(img.shape[:2])
        img = cv2.resize(img, None, fx=f, fy=f, interpolation=cv2.INTER_CUBIC)
    texts, boxes = detector.detectAndDecode(img)
    found = []
    for text, pts in zip(texts, boxes):
        if not text:
            continue
        p = np.asarray(pts, dtype=float).reshape(-1, 2) / f + [ox, oy]
        found.append({"text": text, "points": p.round(1).tolist()})
    return found


def _centre(c):
    p = np.asarray(c["points"])
    return p.mean(axis=0), np.linalg.norm(p[0] - p[2])


def _merge(codes):
    """
    Tiles overlap, so the same physical code can be found twice.
    Two results are the same code only if the text matches AND they sit
    in the same place. Same text in different places is kept — that's
    exactly the 'copied box label' case the app needs to catch.
    """
    kept = []
    for c in codes:
        centre, size = _centre(c)
        duplicate = False
        for k in kept:
            if k["text"] != c["text"]:
                continue
            kc, ks = _centre(k)
            if np.linalg.norm(centre - kc) < 0.5 * max(size, ks):
                duplicate = True
                # keep the larger (usually more complete) detection
                if size > ks:
                    k["points"] = c["points"]
                break
        if not duplicate:
            kept.append(c)
    return kept


def scan(img: np.ndarray, live: bool = False):
    h, w = img.shape[:2]
    scale = 1.0
    limit = LIVE_MAX_SIDE if live else MAX_SIDE
    if max(h, w) > limit:
        scale = limit / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        h, w = img.shape[:2]

    codes = _decode(img)

    # Overlapping tiles: the detector works on a downscaled view of whatever
    # it's given, so small codes in a big photo are only found when each
    # part of the photo is looked at up close. About one tile per 1,000 px.
    if max(h, w) > TILE_TRIGGER:
        n = 2 if live else min(4, max(2, round(max(h, w) / 900)))
        th, tw = int(h / n * 1.35), int(w / n * 1.35)
        for i in range(n):
            for j in range(n):
                y = min(int(i * h / n), max(0, h - th))
                x = min(int(j * w / n), max(0, w - tw))
                codes += _decode(img[y:y + th, x:x + tw], x, y, upscale=True)

    codes = _merge(codes)
    if scale != 1.0:
        for c in codes:
            c["points"] = (np.asarray(c["points"]) / scale).round(1).tolist()
    return codes


@app.get("/health")
def health():
    return {"ok": True, "model": "wechat_qrcode", "opencv": cv2.__version__}


@app.post("/scan")
async def scan_endpoint(image: UploadFile = File(...), mode: str = "photo"):
    """mode=photo (default) for uploaded photos, mode=live for camera frames."""
    data = await image.read()
    if len(data) > MAX_UPLOAD:
        raise HTTPException(413, "Image is larger than 15 MB.")
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "Could not read that image. Use a JPG or PNG photo.")
    t = time.perf_counter()
    codes = scan(img, live=(mode == "live"))
    h, w = img.shape[:2]
    return {"width": w, "height": h, "codes": codes, "ms": round((time.perf_counter() - t) * 1000)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=os.environ.get("HOST", "127.0.0.1"), port=int(os.environ.get("PORT", "8000")))
