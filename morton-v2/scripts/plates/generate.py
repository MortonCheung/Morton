#!/usr/bin/env python3
"""
MORTON V2 · Phase 1 · original material plates
=============================================

Eight procedurally generated, gallery-lit material studies used as the image
slots of the editorial styleframes. 100% original: no third-party imagery,
no reference-site assets, no AI image model. Everything is synthesised from
numpy / Pillow fields.

Design rules encoded here
-------------------------
* warm neutral palette, low saturation, no coloured gradients, no neon
* even, soft gallery lighting; NO radial vignette / NO centre darkening
* macro material fields are shaded from a height field (raking light, micro
  AO, specular reserved for lacquer) instead of being drawn as flat patterns
* at least three spatial strategies: macro material fields, ink diffusion,
  and photographed geometric objects (lacquer slab, folded paper screen)
* sRGB, RGB (no alpha), PNG with embedded sRGB ICC profile

Usage
-----
    python3 scripts/plates/generate.py              # all plates + contact sheet + PLATES.json
    python3 scripts/plates/generate.py --only p01   # one plate (for iteration)
    python3 scripts/plates/generate.py --no-contact # skip the contact sheet

Runtime target: < 2 min on an 8 GB laptop.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import time
from datetime import datetime, timezone

import numpy as np
from PIL import Image, ImageCms, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

# --------------------------------------------------------------------------
# paths / constants
# --------------------------------------------------------------------------

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT_DIR = os.path.join(ROOT, "public", "assets", "plates")
PLATES_JSON = os.path.join(OUT_DIR, "PLATES.json")
CONTACT_SHEET = os.path.join(OUT_DIR, "contact-sheet.png")

SRGB_PROFILE = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()

# warm neutral register (sRGB hex)
PAPER = "#F2EFE8"
PAPER_SHADE = "#DDD5C7"
GREY_BROWN = "#B9B0A3"
WARM_GREY = "#8E877C"
CHARCOAL = "#1B1A18"
BRICK = "#896D55"

T0 = time.time()


def log(msg: str) -> None:
    print(f"[{time.time() - T0:6.1f}s] {msg}", flush=True)


# --------------------------------------------------------------------------
# colour / image basics
# --------------------------------------------------------------------------


def srgb_to_linear(c):
    c = np.asarray(c, dtype=np.float64)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(c):
    c = np.clip(np.asarray(c, dtype=np.float64), 0.0, 1.0)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * (c ** (1 / 2.4)) - 0.055)


def hex_lin(h: str) -> np.ndarray:
    h = h.lstrip("#")
    rgb = np.array([int(h[i : i + 2], 16) for i in (0, 2, 4)], dtype=np.float64) / 255.0
    return srgb_to_linear(rgb)


def mix(a, b, t):
    return a * (1.0 - t) + b * t


def norm01(x):
    x = np.asarray(x, dtype=np.float32)
    lo, hi = np.percentile(x, 0.5), np.percentile(x, 99.5)
    return np.clip((x - lo) / max(hi - lo, 1e-6), 0, 1)


def save_png(arr: np.ndarray, filename: str) -> str:
    """arr: float sRGB in [0,1], shape (H,W,3). Saves 8-bit RGB PNG + sRGB ICC."""
    a = np.clip(arr, 0.0, 1.0)
    # TPDF grain at ~0.8/255 avoids banding without looking digital
    rng = np.random.default_rng(abs(hash(filename)) % (2**32))
    a = a + rng.uniform(-0.7, 0.7, a.shape) / 255.0
    a = np.clip(a, 0.0, 1.0)
    img = Image.fromarray((a * 255.0 + 0.5).astype(np.uint8), "RGB")
    path = os.path.join(OUT_DIR, filename)
    img.save(path, format="PNG", optimize=True, icc_profile=SRGB_PROFILE)
    log(f"wrote {filename}  {img.size[0]}x{img.size[1]}  {os.path.getsize(path)/1e6:.2f} MB")
    return path


def resize_float(arr: np.ndarray, w: int, h: int) -> np.ndarray:
    """High quality float32 resize through Pillow (F mode)."""
    out = []
    for c in range(arr.shape[2]):
        ch = arr[..., c].astype(np.float32)
        im = Image.fromarray(ch, mode="F").resize((w, h), Image.LANCZOS)
        out.append(np.asarray(im, dtype=np.float32))
    return np.stack(out, axis=-1)


# --------------------------------------------------------------------------
# procedural fields
# --------------------------------------------------------------------------


def spectral_noise(
    h: int,
    w: int,
    *,
    beta: float = 2.0,
    seed: int = 0,
    stretch: tuple[float, float] = (1.0, 1.0),
    angle: float = 0.0,
    fmin: float = 0.0,
    fmax: float = 0.45,
) -> np.ndarray:
    """FFT fractal noise, zero mean unit std. `stretch` elongates structures:
    stretch=(12,1) elongates along x. `angle` in radians rotates that direction.
    kwargs are frequencies in cycles/pixel."""
    rng = np.random.default_rng(seed)
    white = rng.standard_normal((h, w)).astype(np.float32)
    F = np.fft.rfft2(white)
    ky = np.fft.fftfreq(h)[:, None].astype(np.float32)
    kx = np.fft.rfftfreq(w)[None, :].astype(np.float32)
    ca, sa = math.cos(angle), math.sin(angle)
    kp = kx * ca + ky * sa
    kq = -kx * sa + ky * ca
    k = np.sqrt((kp / stretch[0]) ** 2 + (kq / stretch[1]) ** 2)
    k[0, 0] = 1e-6
    amp = np.power(k, -beta / 2.0)
    if fmin > 0:
        amp *= 1.0 - np.exp(-((k / fmin) ** 2))
    if fmax > 0:
        amp *= np.exp(-((k / fmax) ** 2))
    amp[0, 0] = 0.0
    out = np.fft.irfft2(F * amp, s=(h, w)).astype(np.float32)
    out -= out.mean()
    out /= out.std() + 1e-6
    return out


def fbm(h, w, seed=0, beta=2.2, octaves=1, **kw):
    """One spectral field; kept for naming clarity."""
    return spectral_noise(h, w, beta=beta, seed=seed, **kw)


def gauss(x, sigma):
    return ndimage.gaussian_filter(x.astype(np.float32), sigma, mode="reflect")


def normal_from_height(height: np.ndarray, scale: float = 1.0):
    gy, gx = np.gradient(height.astype(np.float32) * scale)
    inv = 1.0 / np.sqrt(gx * gx + gy * gy + 1.0)
    return -gx * inv, -gy * inv, inv


def shade(
    height,
    light,
    albedo,
    *,
    ambient=0.80,
    diffuse=0.28,
    spec=0.0,
    shininess=24.0,
    height_scale=1.0,
    fill=None,
):
    """Lambert + optional specular on a height field. albedo (H,W,3) linear.
    light: (lx, ly, lz) pointing from surface toward light, z toward viewer."""
    nx, ny, nz = normal_from_height(height, height_scale)
    L = np.asarray(light, dtype=np.float32)
    L = L / (np.linalg.norm(L) + 1e-6)
    lam = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0.0, 1.0)
    lightfield = ambient + diffuse * lam
    if fill is not None:
        # very soft frontal fill (large softbox), no vignette
        lightfield = lightfield + fill
    out = albedo * lightfield[..., None]
    if spec > 0:
        H = L + np.array([0, 0, 1], dtype=np.float32)
        H /= np.linalg.norm(H) + 1e-6
        specular = np.clip(nx * H[0] + ny * H[1] + nz * H[2], 0, 1) ** shininess
        out = out + spec * specular[..., None] * np.array([1.0, 0.97, 0.92])
    return out


def add_grain_srgb(img: np.ndarray, amount=1.2, seed=0, chroma=0.3) -> np.ndarray:
    rng = np.random.default_rng(seed)
    mono = rng.standard_normal(img.shape[:2]).astype(np.float32)
    mono = gauss(mono, 0.55)
    mono /= mono.std() + 1e-6
    out = img + (mono * amount / 255.0)[..., None]
    if chroma > 0:
        for c in range(3):
            ch = rng.standard_normal(img.shape[:2]).astype(np.float32)
            out[..., c] += gauss(ch, 0.7) / (ch.std() + 1e-6) * (amount * chroma / 255.0)
    return np.clip(out, 0, 1)


def soft_light_gradient(h, w, vertical=0.012, horizontal=0.0, seed=0):
    """Gentle photographic falloff, never a radial vignette."""
    y = np.linspace(-1, 1, h, dtype=np.float32)[:, None]
    x = np.linspace(-1, 1, w, dtype=np.float32)[None, :]
    g = 1.0 + vertical * y + horizontal * x
    mottle = spectral_noise(h, w, beta=2.8, seed=seed, fmax=0.01)
    return (g * (1.0 + 0.006 * mottle)).astype(np.float32)


def paper_fibers(w, h, seed=0, density=5200, strong=False):
    """Draw fine individual paper fibres onto a float32 multiplicative field.
    Returns (H,W) float32 around 1.0. Render at 2x for clean sub-pixel lines."""
    rng = np.random.default_rng(seed)
    canvas = Image.new("L", (w, h), 128)
    d = ImageDraw.Draw(canvas)
    scale = w / 1200.0
    for _ in range(int(density * (w * h) / (1200 * 1500))):
        x = rng.uniform(-40, w + 40)
        y = rng.uniform(-40, h + 40)
        ang = rng.normal(0.0, 0.55)  # machine direction +-32 deg
        length = rng.gamma(2.2, 36.0) * scale
        wob = rng.normal(0, 5.0) * scale
        x2 = x + math.cos(ang) * length + math.sin(ang) * wob
        y2 = y + math.sin(ang) * length - math.cos(ang) * wob
        width = max(1, int(round(rng.uniform(0.7, 2.1) * scale)))
        val = int(128 + rng.choice([-1, 1]) * rng.uniform(6, 26))
        d.line([(x, y), (x2, y2)], fill=val, width=width)
    # optional longer, heavier fibre bundles
    if strong:
        for _ in range(int(90 * (w * h) / (1200 * 1500))):
            x = rng.uniform(-60, w + 60)
            y = rng.uniform(-60, h + 60)
            ang = rng.normal(0.0, 0.25)
            length = rng.uniform(120, 420) * scale
            x2 = x + math.cos(ang) * length
            y2 = y + math.sin(ang) * length
            d.line([(x, y), (x2, y2)], fill=int(128 + rng.uniform(3, 10)), width=max(2, int(2.2 * scale)))
    arr = np.asarray(canvas, dtype=np.float32) / 255.0
    arr = gauss(arr, 0.6 * scale)
    return 1.0 + (arr - 0.5) * 0.16


def crease_height(w, h, *, seed=0, vertical=True, pos=0.42, amp=0.035, width=0.030, depth=0.55, tilt=0.0):
    """A soft, slightly wavering fold: Gaussian groove + thin raised lip."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    if vertical:
        u = (xx - (pos * w + tilt * (yy - h / 2))) / w
        v = yy / h
        wave = amp * np.sin(v * 2.1 * math.pi + 0.7) + 0.4 * amp * np.sin(v * 5.3 * math.pi + 2.0)
        d = (u - wave) * w
    else:
        u = (yy - (pos * h + tilt * (xx - w / 2))) / h
        v = xx / w
        wave = amp * np.sin(v * 2.4 * math.pi + 1.3) + 0.35 * amp * np.sin(v * 6.1 * math.pi)
        d = (u - wave) * h
    ww = width * w
    groove = -depth * np.exp(-((d / ww) ** 2))
    lip = 0.14 * depth * np.exp(-(((d - ww * 0.55) / (ww * 0.22)) ** 2))
    return (groove + lip).astype(np.float32)


# --------------------------------------------------------------------------
# p01 · paper / fibre / creases / folded corner (physical event)
# --------------------------------------------------------------------------


def draw_fibres(w, h, seed=0, density=8000, long_strands=180):
    """Return a float32 deviation field in [-1,1] of drawn paper fibres."""
    rng = np.random.default_rng(seed)
    canvas = Image.new("L", (w, h), 128)
    d = ImageDraw.Draw(canvas)
    scale = w / 1200.0
    for _ in range(int(density * (w * h) / (1200 * 1500))):
        x = rng.uniform(-40, w + 40)
        y = rng.uniform(-40, h + 40)
        ang = rng.normal(0.0, 0.5)
        length = rng.gamma(2.0, 24.0) * scale
        wob = rng.normal(0, 3.5) * scale
        x2 = x + math.cos(ang) * length + math.sin(ang) * wob
        y2 = y + math.sin(ang) * length - math.cos(ang) * wob
        width = max(1, int(round(rng.uniform(0.8, 2.0) * scale)))
        sign = 1 if rng.random() < 0.45 else -1
        val = int(128 + sign * rng.uniform(10, 40))
        d.line([(x, y), (x2, y2)], fill=val, width=width)
    for _ in range(int(long_strands * (w * h) / (1200 * 1500))):
        x = rng.uniform(-80, w + 80)
        y = rng.uniform(-80, h + 80)
        ang = rng.normal(0.0, 0.20)
        length = rng.uniform(200, 640) * scale
        x2 = x + math.cos(ang) * length
        y2 = y + math.sin(ang) * length
        d.line([(x, y), (x2, y2)], fill=int(128 + rng.choice([-1, 1]) * rng.uniform(4, 11)),
               width=max(2, int(1.7 * scale)))
    arr = np.asarray(canvas, dtype=np.float32) / 255.0
    arr = gauss(arr, 0.5 * scale)
    arr = (arr - 0.5) * 2.0
    arr /= max(arr.std(), 1e-6)
    return np.clip(arr * 0.58, -1.0, 1.0).astype(np.float32)


def poly_mask(w, h, pts, blur=0.0):
    im = Image.new("L", (w, h), 0)
    ImageDraw.Draw(im).polygon([(float(x), float(y)) for x, y in pts], fill=255)
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(im, dtype=np.float32) / 255.0


def line_mask(w, h, p0, p1, width=2.0, blur=0.0):
    im = Image.new("L", (w, h), 0)
    ImageDraw.Draw(im).line([(float(p0[0]), float(p0[1])), (float(p1[0]), float(p1[1]))],
                            fill=255, width=max(1, int(round(width))))
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(im, dtype=np.float32) / 255.0


def _reflect(p, a, b):
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    t = ((p[0] - ax) * dx + (p[1] - ay) * dy) / (dx * dx + dy * dy)
    proj = (ax + t * dx, ay + t * dy)
    return (2 * proj[0] - p[0], 2 * proj[1] - p[1]), proj


def _rot(p, c, ang):
    x, y = p[0] - c[0], p[1] - c[1]
    ca, sa = math.cos(ang), math.sin(ang)
    return (c[0] + x * ca - y * sa, c[1] + x * sa + y * ca)


def render_p01(w=1200, h=1500):
    """Macro paper study: a large sheet with a single strong diagonal fold.
    Raking light from the upper left makes the two sides of the fold separate
    tonally; compressed fibres read as a thin crease with a real contact
    shadow. No vignette, no decorative gradient."""
    S = 2
    W, H = w * S, h * S
    ctr = (W / 2.0, H / 2.0)
    ANG = math.radians(-2.6)
    base = hex_lin("#F1EDE5")

    # ---------------------------------------------------------------- albedo
    broad = spectral_noise(H, W, beta=3.1, seed=1101, fmax=0.008)
    tooth = spectral_noise(H, W, beta=0.85, seed=1102, fmax=0.5)
    fibres = draw_fibres(W, H, seed=1110, density=8600)

    albedo = base[None, None, :] * (1.0 + 0.012 * broad)[..., None]
    albedo = albedo * (1.0 + 0.014 * tooth)[..., None]
    albedo = albedo * (1.0 + 0.044 * fibres)[..., None]
    albedo = albedo * (1.0 + 0.012 * fibres[..., None] * np.array([0.55, 0.1, -0.35]))

    # ---------------------------------------------------------------- height
    micro = spectral_noise(H, W, beta=1.15, seed=1120, stretch=(15, 1), angle=math.radians(6), fmax=0.4)
    micro += 0.62 * spectral_noise(H, W, beta=1.2, seed=1121, stretch=(11, 1), angle=math.radians(-57), fmax=0.4)
    cockle = spectral_noise(H, W, beta=2.9, seed=1122, fmax=0.01)
    yn, xn = np.mgrid[0:H, 0:W].astype(np.float32)
    xnc, ync = xn / W, yn / H
    wave = 120.0 * np.sin(2 * math.pi * (0.58 * xnc + 0.34 * ync) + 0.9) \
         + 55.0 * np.sin(2 * math.pi * (0.24 * xnc - 0.40 * ync) + 2.0)
    height = 0.40 * micro + 0.20 * cockle + 1.65 * fibres + 0.35 * wave

    # ------------------------------------------- single strong diagonal fold
    P0 = _rot((0.255 * W, -0.08 * H), ctr, ANG)
    P1 = _rot((0.700 * W, 1.08 * H), ctr, ANG)
    dx, dy = P1[0] - P0[0], P1[1] - P0[1]
    ll = math.hypot(dx, dy)
    nx, ny = -dy / ll, dx / ll          # unit normal, points to one side
    d = (xn - P0[0]) * nx + (yn - P0[1]) * ny
    along0 = (xn * dx / ll + yn * dy / ll) / H
    d = d + 0.0105 * W * np.sin(along0 * 1.75 * math.pi + 0.55) \
          + 0.0042 * W * np.sin(along0 * 4.1 * math.pi + 2.2)
    rr = 0.010 * W
    # rounded tent: a ridge along the fold line, sides falling away
    height += -0.42 * (np.sqrt(d * d + rr * rr) - rr)
    # compressed crease line + a slight lip on both sides
    height -= 1.15 * np.exp(-((d / (0.0022 * W)) ** 2))
    height += 0.32 * np.exp(-(((np.abs(d) - 0.0055 * W) / (0.0022 * W)) ** 2))
    # tiny wrinkles branching off the fold, mostly on the shadow side
    for k, (off, wid, amp, ph) in enumerate([(0.055, 0.018, 0.55, 0.8), (0.115, 0.011, 0.32, 2.4),
                                             (-0.075, 0.014, 0.30, 1.7)]):
        dd = (d - off * W) / (wid * W)
        vv = (xn * dx / ll + yn * dy / ll) / H
        env = 0.55 + 0.45 * np.sin(vv * (8.0 + k * 3.1) * math.pi + ph)
        height += amp * env * np.exp(-((dd / 1.7) ** 2)) * 3.0
        height -= amp * 2.0 * env * np.exp(-((dd / 0.45) ** 2))

    # ---------------------------------------------------------------- shading
    light = (-0.56, -0.33, 0.76)
    img = shade(height, light, albedo, ambient=0.700, diffuse=0.245, spec=0.010,
                shininess=16.0, height_scale=1.0)
    # soft-box falloff: monotonic, directional, never a radial vignette
    ramp = (1.0 + 0.215 * (0.5 - xnc) + 0.105 * (0.5 - ync))
    img *= ramp[..., None]

    # the two planes of the folded sheet separate tonally
    along = (xn * dx / ll + yn * dy / ll) / H
    side = np.tanh(-d / (0.11 * W))
    img *= (1.0 + 0.038 * side)[..., None]

    # the fold: a real shadow gap on the dark flank + a luminous compressed edge
    shadow_band = np.clip((d / W - 0.003) / 0.045, 0, 1)
    shadow_band = np.clip(np.sin(np.pi * np.clip(shadow_band, 0, 1)), 0, 1) ** 0.7 * (d > 0)
    img *= (1.0 - 0.22 * shadow_band)[..., None]
    d_wob = d - 0.0011 * W * np.sin(along * 37.0 * math.pi + 1.9) - 0.0007 * W * np.sin(along * 91.0 * math.pi + 0.4)
    crease_dark = np.exp(-((d_wob / (0.0030 * W)) ** 2))
    crease_dark *= 0.60 + 0.40 * np.sin(along * 9.0 * math.pi + 1.2)
    img *= (1.0 - 0.22 * crease_dark)[..., None]
    # broken fibres catching light along the compressed edge
    sparkle_src = spectral_noise(H, W, beta=0.4, seed=1188, fmax=0.5)
    sparkle = np.clip((sparkle_src - 2.2) * 0.5, 0, 1) * np.exp(-((d_wob / (0.006 * W)) ** 2))
    img += (0.035 * sparkle)[..., None] * albedo
    lip = np.exp(-(((d + 0.0060 * W) / (0.0038 * W)) ** 2))
    img += (0.048 * lip)[..., None] * albedo
    lift = np.exp(-(((d + 0.055 * W) / (0.075 * W)) ** 2))
    img += (0.014 * lift)[..., None] * albedo

    # a light warm shift in the shadow side (light falloff, not a colour cast)
    warmth = np.clip(1.0 - ramp, 0, 1)[..., None]
    img = img * (1.0 - 0.12 * warmth * np.array([0.0, 0.35, 0.75]))

    # ---------------------------------------------------------------- output
    img = np.clip(img, 0.0, None)
    out = linear_to_srgb(img)
    out = add_grain_srgb(out, amount=0.9, seed=1131, chroma=0.28)
    out = resize_float(out, w, h)
    return out



# --------------------------------------------------------------------------
# p02 · plaster wall / painted surface with a peeled edge
# --------------------------------------------------------------------------


def render_p02(w=1800, h=1200):
    """Plaster wall, two planes meeting at a corner: the upper-left light cuts a
    hard bright edge, the return plane falls into a deep warm shadow. Trowel
    texture, pits, one small chipped patch. Mid key."""
    S = 2
    W, H = w * S, h * S
    yn, xn = np.mgrid[0:H, 0:W].astype(np.float32)
    xnc, ync = xn / W, yn / H
    rng = np.random.default_rng(2201)

    base = hex_lin("#CBC1B2")
    substrate = hex_lin("#A79A87")

    # ------------------------------------------------------ the corner line
    fine = ndimage.gaussian_filter1d(rng.standard_normal(H).astype(np.float32), 2.0)
    fine = (fine - fine.mean()) / (fine.std() + 1e-6)
    xc = (0.640 * W
          + 0.020 * H * np.tan(math.radians(2.2)) * (ync - 0.5)
          + 0.0002 * W * fine[:, None])
    dist = xn - xc
    right = np.clip(0.5 + dist / (1.4 * S), 0, 1)   # 1 on the return plane
    left = 1.0 - right
    # rounded plaster corner: a few pixels of bevel
    bevel = np.exp(-((dist / (3.0 * S)) ** 2))

    # ------------------------------------------------------- plaster relief
    coarse = spectral_noise(H, W, beta=2.0, seed=2202, fmax=0.12)
    trowel = spectral_noise(H, W, beta=1.55, seed=2203, stretch=(9, 1), angle=math.radians(18), fmax=0.2)
    trowel2 = spectral_noise(H, W, beta=1.6, seed=2204, stretch=(7, 1), angle=math.radians(-56), fmax=0.2)
    # broad trowel swipes: long, shallow bands
    swipes = np.zeros((H, W), dtype=np.float32)
    for (x0, y0), (x1, y1), sig in [((0.02, 0.18), (0.60, 0.08), 0.025),
                                    ((0.05, 0.56), (0.62, 0.44), 0.030),
                                    ((0.03, 0.86), (0.61, 0.96), 0.022)]:
        m = line_mask(W, H, (x0 * W, y0 * H), (x1 * W, y1 * H), width=4 * S, blur=sig * W)
        swipes += m
    height = 0.62 * coarse + 0.24 * trowel + 0.18 * trowel2 + 0.55 * swipes
    # aggregate pits / stipple
    pits = spectral_noise(H, W, beta=0.5, seed=2205, fmax=0.5)
    pits = np.clip((pits - 1.55) * 0.5, 0, 1)
    stipple = spectral_noise(H, W, beta=0.4, seed=2206, fmax=0.5)
    height -= 0.55 * pits
    height += 0.10 * stipple

    albedo = base[None, None, :] * (1.0 + 0.018 * spectral_noise(H, W, beta=2.7, seed=2210, fmax=0.03))[..., None]
    # sparse aggregate
    agg = np.clip((spectral_noise(H, W, beta=0.4, seed=2211, fmax=0.5) - 2.0) * 1.1, 0, 1)
    albedo = albedo * (1.0 - 0.15 * agg)[..., None]
    albedo = albedo * (1.0 + 0.05 * pits)[..., None]

    # --------------------------------------------------- trowel repair tone
    patch = np.exp(-(((xn - 0.30 * W) / (0.17 * W)) ** 2 + ((yn - 0.66 * H) / (0.20 * H)) ** 2))
    patch *= np.clip(0.55 + 0.45 * spectral_noise(H, W, beta=2.2, seed=2218, fmax=0.04), 0, 1)
    albedo = albedo * (1.0 + 0.015 * patch[..., None])
    height += 0.12 * patch

    # ------------------------------------------------------------- lighting
    # two analytic plane normals (left face = wall plane, right = return)
    nL = (0.0, 0.0, 1.0)
    nR = (0.94, 0.0, 0.34)
    L = np.asarray([-0.56, -0.31, 0.77], dtype=np.float32)
    L = L / np.linalg.norm(L)
    nx_h, ny_h, nz_h = normal_from_height(height, 1.0)
    lamL = np.clip(nL[2] + 0.95 * ny_h - 0.45 * nx_h, 0, 1)
    lamR = np.clip(nR[0] * L[0] + nR[1] * L[1] + nR[2] * L[2] + 0.55 * ny_h - 0.25 * nx_h, 0, 1)
    lam = lamL * (1 - right) + lamR * right
    lightfield = 0.455 + 0.545 * lam
    # the return plane falls away toward the right edge + a bounce near the corner
    lightfield *= (1.0 - 0.22 * right * np.clip((xnc - 0.64) / 0.36, 0, 1))
    lightfield *= (1.0 + 0.05 * bevel)
    img = albedo * lightfield[..., None]
    img *= (1.0 + 0.045 * (0.5 - xnc) + 0.025 * (0.5 - ync))[..., None]
    ridge = swipes - gauss(swipes, 18.0 * S)
    img *= (1.0 + 0.050 * ridge)[..., None]
    img *= (1.0 + 0.012 * spectral_noise(H, W, beta=2.4, seed=2230, fmax=0.03)[..., None] * np.array([1.0, 0.4, -0.2]))

    # corner AO + a fine bright bevel on the lit side
    img *= (1.0 - 0.10 * np.exp(-(((dist + 5.0 * S) / (11.0 * S)) ** 2)))[..., None]
    img += (0.035 * np.exp(-(((dist + 2.0 * S) / (1.4 * S)) ** 2)))[..., None] * albedo
    img *= (1.0 - 0.16 * np.exp(-(((dist) / (1.6 * S)) ** 2)))[..., None]


    # very fine plaster dust grain
    dust = np.clip((spectral_noise(H, W, beta=0.35, seed=2222, fmax=0.5) - 1.6) * 0.5, 0, 1)
    img *= (1.0 - 0.06 * dust)[..., None]

    out = linear_to_srgb(img)
    out = add_grain_srgb(out, amount=0.9, seed=2215, chroma=0.3)
    out = resize_float(out, w, h)
    return out


# --------------------------------------------------------------------------
# p03 · ink bloom / dye diffusion on paper
# --------------------------------------------------------------------------


def render_p03(w=1200, h=1200):
    S = 2
    W, H = w * S, h * S
    yn, xn = np.mgrid[0:H, 0:W].astype(np.float32)
    xnc, ync = xn / W, yn / H

    paper = hex_lin("#F3F0E7")
    ink_col = hex_lin("#2A211A")
    wash_col = hex_lin("#5C4A39")

    # paper ground with fibre relief
    fibres = draw_fibres(W, H, seed=3101, density=6200)
    mottle = spectral_noise(H, W, beta=2.8, seed=3102, fmax=0.012)
    albedo = paper[None, None, :] * (1.0 + 0.030 * fibres)[..., None]
    albedo = albedo * (1.0 + 0.014 * mottle)[..., None]
    h_paper = 1.35 * fibres + 0.30 * spectral_noise(H, W, beta=1.2, seed=3103, stretch=(14, 1),
                                                    angle=math.radians(8), fmax=0.4)
    img = shade(h_paper, (-0.42, -0.30, 0.85), albedo, ambient=0.80, diffuse=0.17, height_scale=1.0)
    img *= (1.0 + 0.075 * (0.5 - xnc) + 0.040 * (0.5 - ync))[..., None]

    # --------------------------------------------------------- ink geometry
    warp1 = spectral_noise(H, W, beta=2.3, seed=3110, fmax=0.025)
    warp2 = spectral_noise(H, W, beta=2.3, seed=3111, fmax=0.025)
    wx = xn + 42.0 * S * warp1
    wy = yn + 42.0 * S * warp2
    edge_n = spectral_noise(H, W, beta=1.4, seed=3112, fmax=0.09)
    edge_fine = spectral_noise(H, W, beta=0.9, seed=3113, fmax=0.35)

    blobs = [(0.300, 0.420, 0.400, 1.00),
             (0.140, 0.720, 0.300, 1.00),
             (0.540, 0.190, 0.240, 0.94),
             (0.690, 0.640, 0.070, 0.82),
             (0.760, 0.320, 0.018, 0.75),
             (0.800, 0.560, 0.011, 0.70),
             (0.250, 0.900, 0.020, 0.65)]
    dens = np.zeros((H, W), dtype=np.float32)
    for cx, cy, r, wgt in blobs:
        dd = np.sqrt((wx - cx * W) ** 2 + (wy - cy * H) ** 2) / (r * W)
        dd = dd * (1.0 + 0.085 * edge_n) + 0.006 * edge_fine
        b = np.clip((1.03 - dd) / 0.055, 0, 1)
        b = b * b * (3.0 - 2.0 * b)  # smootherstep-ish
        dens = np.maximum(dens, b * wgt)
    dens = np.clip(dens, 0, 1)

    # coffee-ring / pigment accumulation near the wet edge
    ring = np.exp(-(((dens - 0.55) / 0.10) ** 2))
    # dry-brush break-up along the boundary, following the paper fibres
    edge_zone = np.exp(-((dens - 0.48) / 0.20) ** 2)
    dry_n = spectral_noise(H, W, beta=0.7, seed=3116, stretch=(1.0, 7.0),
                          angle=math.radians(57), fmax=0.45)
    dry = np.clip((dry_n + 0.25) * 1.1, 0, 1)
    dens = np.clip(dens * (1.0 - 0.30 * edge_zone * dry), 0, 1)
    # a few tiny dry flecks just outside the wash
    fleck = spectral_noise(H, W, beta=0.35, seed=3117, fmax=0.5)
    fl = np.clip((fleck - 2.15) * 1.2, 0, 1) * np.exp(-((dens - 0.05) / 0.10) ** 2)
    dens = np.clip(dens + 0.35 * fl, 0, 1)

    # granulation: pigment settles into the paper tooth
    gran = spectral_noise(H, W, beta=0.8, seed=3114, fmax=0.4)
    dens = np.clip(dens * (0.980 + 0.030 * gran), 0, 1)
    # ghost of a dilute wash outside the main bloom
    halo = np.clip(np.exp(-(((dens - 0.16) / 0.16) ** 2)) * 0.10, 0, 1)
    alpha = np.clip(dens + halo, 0, 1)

    # ink tone: near-black in the dense core, warm wash at the fringe
    tone = np.clip(dens * 1.10, 0, 1)[..., None]
    pigment = ink_col[None, None, :] * tone + wash_col[None, None, :] * (1 - tone)
    # the paper tooth shows through the pigment
    pigment = pigment * (0.94 + 0.08 * fibres[..., None])
    img = img * (1.0 - alpha[..., None]) + pigment * alpha[..., None]

    # wet sheen on the upper-left rim + a very faint ring highlight
    sheen = ring * np.clip(-(wx - 0.365 * W) / (0.245 * W), 0, 1) * np.clip(-(wy - 0.47 * H) / (0.245 * H), 0, 1)
    img += (0.035 * sheen)[..., None] * np.array([1.0, 0.96, 0.9], dtype=np.float32)

    # darken the very edge slightly (surface tension)
    img *= (1.0 - 0.18 * ring * dens)[..., None]

    out = linear_to_srgb(img)
    out = add_grain_srgb(out, amount=0.9, seed=3115, chroma=0.25)
    out = resize_float(out, w, h)
    return out


# --------------------------------------------------------------------------
# p04 · linen weave with a soft fold and its shadow
# --------------------------------------------------------------------------


def render_p04(w=1200, h=1500):
    S = 2
    W, H = w * S, h * S
    yn, xn = np.mgrid[0:H, 0:W].astype(np.float32)
    xnc, ync = xn / W, yn / H
    rng = np.random.default_rng(4401)

    period = 5.0 * S
    xw = xn + 2.2 * S * np.sin(ync * 2 * math.pi * 13 + 0.7) + 0.9 * S * np.sin(ync * 2 * math.pi * 37 + 2.1)
    yw = yn + 1.8 * S * np.sin(xnc * 2 * math.pi * 11 + 1.3) + 0.7 * S * np.sin(xnc * 2 * math.pi * 41 + 0.2)
    iu = np.floor(xw / period).astype(np.int32)
    iv = np.floor(yw / period).astype(np.int32)
    fu = xw / period - iu
    fv = yw / period - iv
    iu_c = np.clip(iu, 0, int(W / period) + 2)
    iv_c = np.clip(iv, 0, int(H / period) + 2)
    amp_u = 0.82 + 0.32 * rng.random(int(W / period) + 4)
    amp_v = 0.82 + 0.32 * rng.random(int(H / period) + 4)
    tone_u = rng.normal(0, 1, int(W / period) + 4).astype(np.float32)
    tone_v = rng.normal(0, 1, int(H / period) + 4).astype(np.float32)

    def bump(f):
        return np.clip(np.cos(2 * math.pi * f), 0, 1) ** 0.62

    warp = bump(fu) * amp_u[iu_c]
    weft = bump(fv) * amp_v[iv_c]
    parity = (iu + iv) & 1
    top = np.where(parity == 0, warp, weft).astype(np.float32)
    bot = np.where(parity == 0, weft, warp).astype(np.float32)
    height = 0.55 * top + 0.50 * bot + 0.03
    slub = 1.0 + 0.16 * spectral_noise(H, W, beta=2.8, seed=4402, fmax=0.012)
    height *= slub
    height += 0.10 * spectral_noise(H, W, beta=1.0, seed=4403, fmax=0.5)

    # soft diagonal fold + drape
    P0 = (0.330 * W, -0.06 * H)
    P1 = (0.690 * W, 1.06 * H)
    dx, dy = P1[0] - P0[0], P1[1] - P0[1]
    ll = math.hypot(dx, dy)
    nx, ny = -dy / ll, dx / ll
    d = (xn - P0[0]) * nx + (yn - P0[1]) * ny
    along = (xn * dx / ll + yn * dy / ll) / H
    d = d + 0.009 * W * np.sin(along * 2.1 * math.pi + 0.5)
    height += -0.13 * (np.sqrt(d * d + (0.060 * W) ** 2) - 0.060 * W)
    height -= 0.55 * np.exp(-((d / (0.008 * W)) ** 2))
    height += 0.35 * np.sin(2 * math.pi * (0.35 * xnc + 0.55 * ync) + 1.2)
    height += 0.20 * np.sin(2 * math.pi * (0.62 * xnc - 0.42 * ync) + 2.4)

    # alpha / tone per thread
    base = hex_lin("#CFC5B4")
    tu = 1.0 + 0.045 * tone_u[iu_c]
    tv = 1.0 + 0.040 * tone_v[iv_c]
    tone = np.where(parity == 0, tu, tv).astype(np.float32)
    albedo = base[None, None, :] * tone[..., None]
    albedo = albedo * (0.94 + 0.08 * top)[..., None]
    albedo = albedo * (1.0 - 0.08 * (1.0 - np.clip(top, 0, 1)))[..., None]
    albedo = albedo * (1.0 + 0.020 * slub)[..., None]
    # a faint warm tint in the deeper interstices
    albedo = albedo * (1.0 - 0.02 * (1.0 - top)[..., None] * np.array([0.0, 0.4, 0.8]))

    light = (-0.48, -0.36, 0.80)
    img = shade(height, light, albedo, ambient=0.800, diffuse=0.150, spec=0.0, height_scale=1.0)
    img *= (1.0 + 0.140 * (0.5 - xnc) + 0.060 * (0.5 - ync))[..., None]

    # fold shading: a soft valley, a shadow on one side, a catch-light on the ridge
    img *= (1.0 - 0.12 * np.exp(-(((d + 0.012 * W) / (0.040 * W)) ** 2)))[..., None]
    img *= (1.0 - 0.24 * np.exp(-(((d - 0.004 * W) / (0.010 * W)) ** 2)) * (d > 0))[..., None]
    img += (0.018 * np.exp(-(((d + 0.010 * W) / (0.010 * W)) ** 2)))[..., None] * albedo

    # loose fibres lying on the cloth
    fl = draw_fibres(W, H, seed=4404, density=1400)
    img *= (1.0 + 0.055 * fl)[..., None]

    # warm shadow shift
    warmth = (xnc * 0.5 + ync * 0.5)[..., None]
    img = img * (1.0 - 0.05 * warmth * np.array([0.0, 0.3, 0.7]))

    out = linear_to_srgb(img)
    out = add_grain_srgb(out, amount=0.9, seed=4405, chroma=0.3)
    out = resize_float(out, w, h)
    return out


# --------------------------------------------------------------------------
# p05 · sand / fine granular stone with a pebble
# --------------------------------------------------------------------------


def render_p05(w=1920, h=1080):
    """Sand macro with wind ripples, visible grains and a low raking light that
    throws long micro-shadows. A single dark pebble anchors the frame at 66%;
    its cast shadow is the physical event. 16:9."""
    W, H = w, h
    yn, xn = np.mgrid[0:H, 0:W].astype(np.float32)
    xnc, ync = xn / W, yn / H
    rng = np.random.default_rng(5501)

    # ---------------------------------------------------- granular sand cells
    def grain_cells(cell, seed):
        r = np.random.default_rng(seed)
        nx, ny = int(W / cell) + 3, int(H / cell) + 3
        jx = r.uniform(-0.46, 0.46, (ny, nx)).astype(np.float32)
        jy = r.uniform(-0.46, 0.46, (ny, nx)).astype(np.float32)
        ci = np.floor(xn / cell).astype(np.int32) + 1
        cj = np.floor(yn / cell).astype(np.int32) + 1
        dmin = np.full((H, W), 1e9, dtype=np.float32)
        for oy in (-1, 0, 1):
            for ox in (-1, 0, 1):
                px = (ci + ox + jx[cj + oy, ci + ox]) * cell
                py = (cj + oy + jy[cj + oy, ci + ox]) * cell
                dd = (xn - px) ** 2 + (yn - py) ** 2
                dmin = np.minimum(dmin, dd)
        d = np.sqrt(dmin) / cell
        return np.clip(1.0 - d, 0, 1) ** 0.7

    g1 = grain_cells(9.0, 5502)
    g2 = grain_cells(19.0, 5503)
    fine = spectral_noise(H, W, beta=0.55, seed=5504, fmax=0.5)
    warp = spectral_noise(H, W, beta=2.4, seed=5505, fmax=0.008)
    ripple_raw = 0.5 + 0.5 * np.sin(2 * math.pi * (0.78 * xnc + 0.52 * ync) / 0.075 + 1.25 * warp)
    ripple = ripple_raw ** 2.4
    ripple2 = np.sin(2 * math.pi * (0.82 * xnc + 0.55 * ync) / 0.032 + 0.7 + 0.8 * warp)
    height = 2.6 * g1 + 1.1 * g2 + 16.0 * ripple + 1.6 * ripple2 + 0.35 * fine

    # sand albedo: warm, matte, sparse dark minerals
    base = hex_lin("#C7B79B")
    tone = 0.88 + 0.18 * g1 + 0.08 * g2 + 0.02 * ripple
    albedo = base[None, None, :] * tone[..., None]
    minerals = np.clip((spectral_noise(H, W, beta=0.45, seed=5506, fmax=0.5) - 2.1) * 1.2, 0, 1)
    albedo = albedo * (1.0 - 0.32 * minerals)[..., None]
    # tiny shell/quartz flecks
    fleck = np.clip((spectral_noise(H, W, beta=0.35, seed=5507, fmax=0.5) - 2.35) * 1.5, 0, 1)
    albedo = albedo * (1.0 + 0.35 * fleck)[..., None]

    # ------------------------------------------------------------- pebble
    cx, cy = 0.665 * W, 0.545 * H
    rx, ry = 0.090 * W, 0.060 * H
    warp_s = spectral_noise(H, W, beta=2.4, seed=5508, fmax=0.04)
    rr = np.sqrt(((xn - cx) / rx) ** 2 + ((yn - cy) / ry) ** 2) + 0.10 * warp_s
    stone = np.clip((1.0 - rr) / 0.07, 0, 1)
    stone = stone * stone * (3 - 2 * stone)
    dome = np.sqrt(np.clip(1.0 - np.clip(rr, 0, 1) ** 2, 0, 1))
    stone_h = dome * 105.0
    height = height * (1 - stone) + (height * 0.18 + stone_h) * stone
    # sand piles up against the pebble
    height += 2.2 * np.exp(-(((rr - 1.15) / 0.18) ** 2)) * (1 - stone)

    stone_speck = spectral_noise(H, W, beta=0.8, seed=5509, fmax=0.4)
    stone_alb = hex_lin("#6E6559")[None, None, :] * (1.0 + 0.06 * stone_speck)[..., None]
    stone_alb = stone_alb * (1.0 - 0.10 * minerals[..., None])
    albedo = albedo * (1 - stone[..., None]) + stone_alb * stone[..., None]

    # low raking light from the left: long grain shadows
    light = (-0.86, -0.22, 0.38)
    img = shade(height, light, albedo, ambient=0.560, diffuse=0.470, spec=0.045,
                shininess=30.0, height_scale=1.0)
    img *= (1.0 + 0.070 * (0.5 - xnc) + 0.040 * (0.5 - ync))[..., None]
    img += (0.035 * fleck * (1 - stone))[..., None] * np.array([1.0, 0.98, 0.92])

    # pebble cast shadow (long, low sun) + contact shadow
    sh = np.roll(np.roll(stone, int(0.060 * W), axis=1), int(0.024 * H), axis=0)
    sh = gauss(sh, 11.0)
    sh = np.clip(sh * 1.6, 0, 1)
    img *= (1.0 - 0.62 * sh * (1 - stone))[..., None]
    contact = np.clip(gauss(stone, 3.0) - stone, 0, 1)
    img *= (1.0 - 0.32 * contact)[..., None]

    out = linear_to_srgb(img)
    out = add_grain_srgb(out, amount=1.0, seed=5510, chroma=0.3)
    return out


# --------------------------------------------------------------------------
# p07 · folded paper spatial installation (hero plate)
# --------------------------------------------------------------------------


def _look_at(C, T, up=(0.0, 1.0, 0.0)):
    C = np.asarray(C, dtype=np.float64)
    T = np.asarray(T, dtype=np.float64)
    fwd = T - C
    fwd /= np.linalg.norm(fwd)
    right = np.cross(np.asarray(up, dtype=np.float64), fwd)
    right /= np.linalg.norm(right)
    up2 = np.cross(fwd, right)
    return C, right, up2, fwd


def _project(p, cam, fpx, W, H):
    C, right, up2, fwd = cam
    d = np.asarray(p, dtype=np.float64) - C
    z = float(d @ fwd)
    x = float(d @ right)
    y = float(d @ up2)
    return W * 0.5 + fpx * x / z, H * 0.5 - fpx * y / z, z


def _panel_shadow_points(quad, L):
    """Project the four 3-D corners of a vertical panel onto the floor (y=0)
    along the light direction; returns 2-D world points (x,z)."""
    out = []
    for (x, y, z) in quad:
        t = y / L[1]
        out.append((x - L[0] * t, z - L[2] * t))
    return out


def render_p07(w=1200, h=1800, deep=False):
    """A folded paper screen standing in a seamless warm-grey studio. Three
    planes, one continuous top silhouette, a long soft cast shadow. Rendered
    with a tiny perspective camera so the object has real volume, not a decal."""
    S = 2
    out_w, out_h = w, h
    W, H = w * S, h * S
    yn, xn = np.mgrid[0:H, 0:W].astype(np.float32)
    xnc, ync = xn / W, yn / H

    paper = hex_lin("#F2EFE7")
    if deep:
        wall_alb = hex_lin("#BBB1A1")
        floor_alb = hex_lin("#A59A89")
        light = np.asarray([-0.82, 0.42, -0.08], dtype=np.float64)
    else:
        wall_alb = hex_lin("#C4BCAE")
        floor_alb = hex_lin("#ADA393")
        light = np.asarray([-0.72, 0.56, -0.10], dtype=np.float64)
    light /= np.linalg.norm(light)

    # ------------------------------------------------------------- camera
    if deep:
        C = (0.0, 0.78, -3.72)
        T = (0.0, 0.70, 0.05)
    else:
        C = (0.0, 1.18, -4.50)
        T = (0.0, 0.84, 0.05)
    cam = _look_at(C, T)
    fpx = (H * 0.5) / math.tan(math.radians(32.0) * 0.5)

    # wall / floor junction behind the object
    y_h = _project((0.0, 0.0, 2.6), cam, fpx, W, H)[1]
    wall_mask = np.clip((y_h - yn) / (2.5 * S) + 0.5, 0, 1)
    floor_mask = 1.0 - wall_mask

    # ------------------------------------------------------- background
    bg_light = 0.94 + 0.070 * (0.5 - xnc) + 0.030 * (0.42 - ync)
    wall_img = wall_alb[None, None, :] * bg_light[..., None]
    floor_img = floor_alb[None, None, :] * (bg_light * 0.94 - 0.025 * ync)[..., None]
    bg = wall_img * wall_mask[..., None] + floor_img * floor_mask[..., None]
    # soft ambient line where the wall meets the floor
    bg *= (1.0 - 0.05 * np.exp(-((yn - y_h) / (18.0 * S)) ** 2))[..., None]
    # studio paper tooth, very fine
    bg_fib = draw_fibres(W, H, seed=7701, density=2200)
    bg *= (1.0 + 0.022 * bg_fib)[..., None]
    bg *= (1.0 + 0.016 * spectral_noise(H, W, beta=2.7, seed=7702, fmax=0.015)[..., None])

    img = bg.copy()

    # ------------------------------------------------------- object geometry
    fold_x = np.array([-0.46, -0.15, 0.16, 0.47], dtype=np.float64) - 0.22
    fold_z = np.array([0.22, -0.22, 0.22, -0.22], dtype=np.float64)
    heights = np.array([1.30, 1.44, 1.35, 1.47], dtype=np.float64)
    ang = math.radians(10.0)
    ca, sa = math.cos(ang), math.sin(ang)
    fx = fold_x * ca - fold_z * sa
    fz = fold_x * sa + fold_z * ca
    folds = [(fx[i], fz[i], heights[i]) for i in range(4)]
    NSTRIP = 12

    def panel_xz(i, u, yfac=1.0):
        x0, z0, h0 = folds[i]
        x1, z1, h1 = folds[i + 1]
        dx, dz = x1 - x0, z1 - z0
        ll = math.hypot(dx, dz)
        hnx, hnz = -dz / ll, dx / ll
        bow = (0.020 if i % 2 == 0 else -0.016) * math.sin(math.pi * u) * yfac
        return x0 + dx * u + hnx * bow, z0 + dz * u + hnz * bow

    def panel_h(i, u):
        h0 = folds[i][2]
        h1 = folds[i + 1][2]
        return h0 + (h1 - h0) * u - 0.022 * math.sin(math.pi * u)

    def strip_tone(i, u):
        eps = 1e-3
        xa, za = panel_xz(i, max(0.0, u - eps), 0.65)
        xb, zb = panel_xz(i, min(1.0, u + eps), 0.65)
        tu = np.array([xb - xa, 0.0, zb - za])
        tu /= (np.linalg.norm(tu) + 1e-9)
        n = np.cross(tu, np.array([0.0, 1.0, 0.0]))
        n /= (np.linalg.norm(n) + 1e-9)
        x, z = panel_xz(i, u, 0.65)
        mid = np.array([x, panel_h(i, u) * 0.5, z])
        if np.dot(n, np.asarray(C) - mid) < 0:
            n = -n
        lam = max(0.0, float(np.dot(n, light)))
        fill = max(0.0, float(np.dot(n, np.asarray([0.55, 0.42, -0.72]))))
        rim = max(0.0, float(np.dot(n, np.asarray([0.75, 0.35, -0.55]))))
        if deep:
            return 0.255 + 0.640 * lam + 0.055 * fill + 0.035 * rim
        return 0.390 + 0.485 * lam + 0.060 * fill + 0.030 * rim

    strips = []
    for i in range(3):
        for j in range(NSTRIP):
            u0 = j / NSTRIP
            u1 = (j + 1) / NSTRIP
            if j < NSTRIP - 1:
                u1 += 0.0035
            x0b, z0b = panel_xz(i, u0, 0.0)
            x1b, z1b = panel_xz(i, u1, 0.0)
            x0t, z0t = panel_xz(i, u0, 1.0)
            x1t, z1t = panel_xz(i, u1, 1.0)
            h0 = panel_h(i, u0)
            h1 = panel_h(i, u1)
            quad3 = [(x0b, 0.0, z0b), (x1b, 0.0, z1b), (x1t, h1, z1t), (x0t, h0, z0t)]
            pts = [_project(p, cam, fpx, W, H) for p in quad3]
            e1 = np.array([x0t - x0b, h0, z0t - z0b])
            e2 = np.array([x1b - x0b, 0.0, z1b - z0b])
            n = np.cross(e1, e2)
            n /= (np.linalg.norm(n) + 1e-9)
            mid = np.array([(x0b + x1b) * 0.5, h0 * 0.5, (z0b + z1b) * 0.5])
            if np.dot(n, np.asarray(C) - mid) < 0:
                n = -n
            strips.append(dict(pts=[(q[0], q[1]) for q in pts],
                               depth=sum(q[2] for q in pts) / 4.0,
                               tone=strip_tone(i, 0.5 * (u0 + u1)),
                               quad3=quad3))

    # ---------------------------------------------------- cast shadow (floor)
    shadow_mask = Image.new("L", (W, H), 0)
    sd = ImageDraw.Draw(shadow_mask)
    for i in range(3):
        x0, z0, h0 = folds[i]
        x1, z1, h1 = folds[i + 1]
        x0b, z0b = panel_xz(i, 0.0, 0.0)
        x1b, z1b = panel_xz(i, 1.0, 0.0)
        x0t, z0t = panel_xz(i, 0.0, 1.0)
        x1t, z1t = panel_xz(i, 1.0, 1.0)
        quad3 = [(x0b, 0.0, z0b), (x1b, 0.0, z1b), (x1t, h1, z1t), (x0t, h0, z0t)]
        sp = _panel_shadow_points(quad3, light)
        spts = [_project((x, 0.0, z), cam, fpx, W, H) for (x, z) in sp]
        sd.polygon([(q[0], q[1]) for q in spts], fill=255)
    shadow_arr = np.asarray(shadow_mask, dtype=np.float32) / 255.0
    shadow_soft = np.clip(gauss(shadow_arr, (6.0 if deep else 12.0) * S) * 1.35, 0, 1)
    shadow_mid = np.clip(gauss(shadow_arr, (2.0 if deep else 3.5) * S) * 1.30, 0, 1)
    img *= (1.0 - (0.34 if deep else 0.26) * shadow_soft)[..., None]
    img *= (1.0 - (0.40 if deep else 0.30) * shadow_mid)[..., None]

    # contact shadow along the base
    base_mask = Image.new("L", (W, H), 0)
    bd = ImageDraw.Draw(base_mask)
    for i in range(3):
        x0, z0, _ = folds[i]
        x1, z1, _ = folds[i + 1]
        p0 = _project((x0, 0.0, z0), cam, fpx, W, H)
        p1 = _project((x1, 0.0, z1), cam, fpx, W, H)
        bd.line([(p0[0], p0[1]), (p1[0], p1[1])], fill=255, width=int(7 * S))
    base_arr = gauss(np.asarray(base_mask, dtype=np.float32) / 255.0, 7.0 * S)
    img *= (1.0 - 0.42 * np.clip(base_arr * 1.4, 0, 1))[..., None]

    # ------------------------------------------------------------- object
    obj_mask = np.zeros((H, W), dtype=np.float32)
    for p in sorted(strips, key=lambda q: -q["depth"]):
        m = poly_mask(W, H, p["pts"], blur=0.55 * S)
        col = paper[None, None, :] * p["tone"]
        img = img * (1.0 - m[..., None]) + col * m[..., None]
        obj_mask = np.maximum(obj_mask, m)

    # paper fibre + a broad vertical light gradient on the planes
    obj_fib = draw_fibres(W, H, seed=7703, density=4200)
    obj_mottle = spectral_noise(H, W, beta=2.8, seed=7704, fmax=0.02)
    obj_tone = (1.0 + 0.042 * obj_fib + 0.014 * obj_mottle) * (1.0 + 0.075 * (0.45 - ync))
    img = img * (1.0 - obj_mask[..., None]) + (img * obj_tone[..., None]) * obj_mask[..., None]
    # faint paper cockle across the planes
    cockle = spectral_noise(H, W, beta=2.6, seed=7706, fmax=0.02)
    img = img * (1.0 - obj_mask[..., None]) + (img * (1.0 + 0.012 * cockle[..., None])) * obj_mask[..., None]

    # ambient occlusion at the fold lines and at the floor contact
    fold_lines = []
    for i in range(4):
        x0, z0, h0 = folds[i]
        a = _project((x0, 0.0, z0), cam, fpx, W, H)
        b = _project((x0, h0, z0), cam, fpx, W, H)
        fold_lines.append((a, b))
    ao = np.zeros((H, W), dtype=np.float32)
    for (a, b) in fold_lines:
        ao += line_mask(W, H, (a[0], a[1]), (b[0], b[1]), width=int(3 * S), blur=8.0 * S)
    img *= (1.0 - 0.075 * np.clip(ao, 0, 1) * obj_mask)[..., None]
    base_ao = np.clip(gauss(obj_mask, 16.0 * S) - obj_mask, 0, 1)
    img *= (1.0 - 0.085 * base_ao * obj_mask)[..., None]

    # cut edges: a curved top silhouette with real paper thickness
    edge_draw = np.zeros((H, W), dtype=np.float32)
    for i in range(3):
        n = 14
        prev = None
        for k in range(n + 1):
            u = k / n
            x, z = panel_xz(i, u, 1.0)
            h = panel_h(i, u)
            q = _project((x, h, z), cam, fpx, W, H)
            if prev is not None:
                edge_draw += line_mask(W, H, (prev[0], prev[1]), (q[0], q[1]),
                                       width=int(2 * S), blur=0.6 * S)
            prev = q
    img += (0.055 * np.clip(edge_draw, 0, 1))[..., None] * paper
    under = np.zeros((H, W), dtype=np.float32)
    for i in range(3):
        n = 14
        prev = None
        for k in range(n + 1):
            u = k / n
            x, z = panel_xz(i, u, 1.0)
            h = panel_h(i, u)
            q = _project((x, h, z), cam, fpx, W, H)
            if prev is not None:
                under += line_mask(W, H, (prev[0], prev[1] + 2.5 * S), (q[0], q[1] + 2.5 * S),
                                   width=int(1.5 * S), blur=0.6 * S)
            prev = q
    img *= (1.0 - 0.09 * np.clip(under, 0, 1))[..., None]

    # thin bright fold creases
    hi = np.zeros((H, W), dtype=np.float32)
    for (a, b) in fold_lines:
        hi += line_mask(W, H, (a[0], a[1]), (b[0], b[1]), width=int(1.4 * S), blur=0.6 * S)
    img += (0.024 * np.clip(hi, 0, 1) * obj_mask)[..., None] * paper

    # ------------------------------------------------------------- finish
    out = linear_to_srgb(img)
    out = add_grain_srgb(out, amount=0.9, seed=7705, chroma=0.3)
    out = resize_float(out, out_w, out_h)
    return out



# --------------------------------------------------------------------------
# p06 · dark lacquer / matte metal surface with a narrow strip highlight
# --------------------------------------------------------------------------


def render_p06(w=1800, h=1200):
    """Dark lacquer used as the Hero's right-hand field. One wide, soft strip
    highlight near the top (kept clear of the letter zone at y 40-64%); the
    whole panel has a slow 4-6 level illumination gradient; heavy fine dither so
    the large dark area cannot band. No second reflection, no mirror."""
    S = 2
    W, H = w * S, h * S
    yn, xn = np.mgrid[0:H, 0:W].astype(np.float32)
    xnc, ync = xn / W, yn / H

    und = spectral_noise(H, W, beta=2.9, seed=6601, fmax=0.008)
    und2 = spectral_noise(H, W, beta=2.3, seed=6602, fmax=0.03)
    mid = spectral_noise(H, W, beta=1.4, seed=6603, stretch=(1.2, 1.0), fmax=0.12)
    peel = spectral_noise(H, W, beta=0.9, seed=6604, fmax=0.5)

    # base radiance + a slow, physical one-directional light gradient
    base = 0.0228 + 0.0006 * mid + 0.0005 * peel
    grad = 0.0062 * (0.5 - xnc) + 0.0034 * (0.5 - ync) + 0.0016 * und
    base = np.clip(base + grad, 0.0175, None)
    base_rgb = base[..., None] * np.array([1.020, 0.985, 0.945], dtype=np.float32)

    # wide, flat-topped strip reflection, 4-5% of the frame height, soft ~10px
    # feather; centre sits at y ~ 25% so it never runs through the letters.
    yb = 0.250 * H + 0.006 * H * np.sin(2 * math.pi * xnc * 0.55 + 0.6) + 0.0015 * H * und
    half = 0.0225 * H
    feather = 0.0085 * H
    dist = np.abs(yn - yb)
    t = np.clip((dist - (half - feather)) / (2.0 * feather), 0, 1)
    edge = t * t * (3.0 - 2.0 * t)
    band_profile = 1.0 - edge
    band_amp = 0.198 * (1.0 + 0.030 * np.sin(2 * math.pi * xnc * 0.33 + 1.1) + 0.020 * peel)
    band = band_profile * band_amp
    band_rgb = band[..., None] * np.array([0.985, 0.930, 0.845], dtype=np.float32)

    # a very slight reflection of the room below the strip (not a second light)
    room = 0.0018 * np.exp(-((yn - 0.78 * H) / (0.20 * H)) ** 2)
    img = base_rgb + band_rgb + room[..., None]

    # orange-peel micro-specular inside the strip, restrained
    gy, gx = np.gradient(0.7 * mid + 0.3 * peel)
    inv = 1.0 / np.sqrt(gx * gx + gy * gy + 1.0)
    nx, ny, nz = -gx * inv, -gy * inv, inv
    L = np.asarray([-0.20, -0.95, 0.24], dtype=np.float32)
    L /= np.linalg.norm(L)
    Hv = L + np.asarray([0.0, 0.0, 1.0], dtype=np.float32)
    Hv /= np.linalg.norm(Hv)
    spec = np.clip(nx * Hv[0] + ny * Hv[1] + nz * Hv[2], 0, 1) ** 34
    img += (0.020 * spec * band_profile)[..., None] * np.array([1.0, 0.96, 0.90])

    out = linear_to_srgb(img)
    rng = np.random.default_rng(6605)
    dither = rng.uniform(-0.9, 0.9, out.shape).astype(np.float32) / 255.0
    out = np.clip(out + dither, 0, 1)
    out = add_grain_srgb(out, amount=0.55, seed=6606, chroma=0.15)
    out = resize_float(out, w, h)
    return out



# --------------------------------------------------------------------------
# p08 · wood end grain / growth rings with a drying check
# --------------------------------------------------------------------------


def render_p08(w=1200, h=1500):
    """Flat-sawn wood: long grain running across the board, a knot at 63% where
    the rings bunch up, and a drying check opening out of it. Not a full-screen
    ring pattern; mid-dark key."""
    S = 2
    W, H = w * S, h * S
    yn, xn = np.mgrid[0:H, 0:W].astype(np.float32)
    xnc, ync = xn / W, yn / H

    early = hex_lin("#A69378")
    late = hex_lin("#6E5B45")
    knot_col = hex_lin("#4E4030")
    kx, ky = 0.635 * W, 0.565 * H

    dk = np.sqrt((xn - kx) ** 2 + (yn - ky) ** 2)
    dkn = dk / (0.17 * W)
    knot_zone = np.exp(-(dkn ** 2))

    # long grain: gently waving lines along x, bent around the knot
    low = spectral_noise(H, W, beta=2.7, seed=8801, fmax=0.008)
    u = (ync
         + 0.010 * np.sin(2 * math.pi * xnc * 1.15 + 0.6)
         + 0.004 * np.sin(2 * math.pi * xnc * 3.3 + 2.0)
         + 0.006 * low
         + 0.014 * knot_zone)
    nlines = 15.0
    line = 0.5 + 0.5 * np.cos(2 * math.pi * u * nlines + 0.10 * spectral_noise(H, W, beta=2.2, seed=8802, fmax=0.02))
    grain = line ** 10

    albedo = early[None, None, :] * (1.0 - 0.14 * grain[..., None])
    albedo = albedo * (1.0 + 0.030 * spectral_noise(H, W, beta=2.5, seed=8803, fmax=0.012)[..., None])

    # local growth rings around the knot: the one dense ring area
    spacing = 0.016 * W
    phase = dk / spacing + 0.07 * spectral_noise(H, W, beta=2.8, seed=8804, fmax=0.01)
    c = 0.5 + 0.5 * np.cos(2 * math.pi * phase)
    rings = c ** 7
    albedo = albedo * (1.0 - 0.55 * rings[..., None] * knot_zone[..., None])
    # knot core
    core = np.exp(-((dk / (0.030 * W)) ** 2))
    albedo = albedo * (1.0 - 0.82 * core[..., None])
    albedo = albedo * (1.0 - 0.16 * knot_col[None, None, :] / late[None, None, :] * knot_zone[..., None])

    # open pores / ray flecks
    pores = spectral_noise(H, W, beta=0.55, seed=8805, fmax=0.5)
    pore = np.clip((pores - 1.65) * 0.75, 0, 1)
    albedo = albedo * (1.0 - 0.18 * pore)[..., None]
    ray = spectral_noise(H, W, beta=0.45, seed=8806, fmax=0.5)
    albedo = albedo * (1.0 + 0.045 * np.clip((ray - 1.85) * 0.8, 0, 1))[..., None]
    fib = spectral_noise(H, W, beta=1.0, seed=8810, stretch=(12, 1), angle=0.0, fmax=0.4)
    albedo = albedo * (1.0 + 0.030 * fib)[..., None]

    # drying check opening from the knot toward the lower right
    pts = [(kx + 0.01 * W, ky + 0.02 * H), (0.700 * W, 0.715 * H), (0.670 * W, 0.835 * H),
           (0.750 * W, 0.925 * H), (0.720 * W, 1.020 * H)]
    crack = np.zeros((H, W), dtype=np.float32)
    crack_hi = np.zeros((H, W), dtype=np.float32)
    widths = [5.0, 9.0, 12.0, 14.0]
    for i in range(len(pts) - 1):
        crack += line_mask(W, H, pts[i], pts[i + 1], width=int(widths[i] * S), blur=0.8 * S)
        crack_hi += line_mask(W, H, (pts[i][0] - 6 * S, pts[i][1]), (pts[i + 1][0] - 6 * S, pts[i + 1][1]),
                              width=int(2.5 * S), blur=0.8 * S)
    crack += line_mask(W, H, (0.700 * W, 0.715 * H), (0.630 * W, 0.760 * H), width=int(3.0 * S), blur=0.6 * S)
    crack_hi += line_mask(W, H, (0.697 * W, 0.715 * H), (0.627 * W, 0.760 * H), width=int(1.2 * S), blur=0.5 * S)

    height = 0.16 * grain + 0.22 * rings * knot_zone + 0.08 * pore + 0.30 * fib
    height -= 2.4 * crack
    img = shade(height, (-0.56, -0.31, 0.77), albedo, ambient=0.700, diffuse=0.300,
                spec=0.008, shininess=10.0, height_scale=1.0)
    img *= (1.0 + 0.120 * (0.5 - xnc) + 0.055 * (0.5 - ync))[..., None]

    # cavity: near-black, lit lip on the left, shadow cheek on the right
    img *= (1.0 - 0.82 * np.clip(crack, 0, 1))[..., None]
    img += (0.070 * np.clip(crack_hi, 0, 1))[..., None] * albedo
    cheek = gauss(np.roll(crack, 8 * S, axis=1), 5.0 * S)
    img *= (1.0 - 0.22 * cheek)[..., None]

    out = linear_to_srgb(img)
    out = add_grain_srgb(out, amount=0.9, seed=8808, chroma=0.3)
    out = resize_float(out, w, h)
    return out


# --------------------------------------------------------------------------
# registry
# --------------------------------------------------------------------------

PLATES = {
    "p01": dict(file="p01-paper-4x5.png", w=1200, h=1500, render=render_p01, ratio="4:5",
                subject="paper fibre / creases", zh="纸纤维 / 折痕"),
    "p02": dict(file="p02-plaster-3x2.png", w=1800, h=1200, render=render_p02, ratio="3:2",
                subject="plaster / painted wall", zh="石膏 / 粉刷墙面"),
    "p03": dict(file="p03-ink-1x1.png", w=1200, h=1200, render=render_p03, ratio="1:1",
                subject="ink bloom / dye diffusion", zh="墨晕 / 染料渗化"),
    "p04": dict(file="p04-linen-4x5.png", w=1200, h=1500, render=render_p04, ratio="4:5",
                subject="linen weave", zh="亚麻织物"),
    "p05": dict(file="p05-sand-16x9.png", w=1920, h=1080, render=render_p05, ratio="16:9",
                subject="sand / fine granular stone", zh="砂 / 细颗粒石材"),
    "p06": dict(file="p06-lacquer-3x2.png", w=1800, h=1200, render=render_p06, ratio="3:2",
                subject="dark lacquer / matte metal", zh="深色漆面 / 哑光金属"),
    "p07": dict(file="p07-fold-2x3.png", w=1200, h=1800, render=render_p07, ratio="2:3",
                subject="folded paper installation", zh="纸张折叠的空间装置"),
    "p07b": dict(file="p07b-fold-deep-2x3.png", w=1200, h=1800,
                 render=lambda w, h: render_p07(w, h, deep=True), ratio="2:3",
                 subject="folded paper installation (dramatic alternate)", zh="纸张折叠空间装置（戏剧版）"),
    "p08": dict(file="p08-grain-4x5.png", w=1200, h=1500, render=render_p08, ratio="4:5",
                subject="wood grain / growth rings", zh="木纹 / 年轮"),
}

ORDER = ["p01", "p02", "p03", "p04", "p05", "p06", "p07", "p07b", "p08"]



# --------------------------------------------------------------------------
# metadata / contact sheet / PLATES.json
# --------------------------------------------------------------------------

DECLARATION_ZH = "原创占位，非真实作品摄影。全部由本仓库脚本程序化生成，不含任何第三方图像素材。"
DECLARATION_EN = ("Original procedural placeholder artwork. Not a photograph of a real artwork or product. "
                  "No third-party imagery or reference-site assets were used.")

META = {
    "p01": dict(method="Directional paper macro: drawn micro-fibres + anisotropic relief, one soft diagonal fold with contact shadow, 2x supersampled.",
                usage=["secondary", "texture only"], tier="light"),
    "p02": dict(method="Plaster wall corner: two analytic planes lit from upper left, trowel/pit height field, 2x supersampled.",
                usage=["secondary", "mid-tone anchor"], tier="mid"),
    "p03": dict(method="Large ink wash with paper-fibre ground, warped diffusion edge, dry-brush break-up and sediment ring.",
                usage=["secondary", "detail"], tier="mid-dark"),
    "p04": dict(method="Linen weave height field (warp/weft, slubs, irregular thread spacing) plus one soft fold and cast shadow.",
                usage=["texture only", "secondary"], tier="mid"),
    "p05": dict(method="Sand: two-scale Voronoi grains, wind ripples and a low raking light; one pebble with a long cast shadow.",
                usage=["secondary", "wide banner"], tier="mid"),
    "p06": dict(method="Full-bleed matte lacquer: flat-topped strip reflection at y≈25%, orange-peel micro-specular, slow 4-6 level illumination gradient, heavy sub-LSB dither.",
                usage=["dark section", "hero background"], tier="dark"),
    "p07": dict(method="3D perspective folded paper screen (three planes, bowed strips, sagging top edge) with cast shadow and paper fibre.",
                usage=["hero", "secondary"], tier="mid-light"),
    "p07b": dict(method="Dramatic alternate of p07: lower camera, closer framing, longer/harder floor shadow, stronger facet contrast.",
                 usage=["hero"], tier="mid-light", alternate_of="p07"),
    "p08": dict(method="Flat-sawn wood: waving long grain, fibre/pore texture, a dense knot ring cluster and a drying check with cavity and lit lip.",
                usage=["secondary", "texture only"], tier="mid-dark"),
}

USAGE_LABEL = {
    "hero": "hero 主视觉",
    "secondary": "secondary 次级图",
    "dark section": "dark section 暗场底",
    "texture only": "texture only 纯纹理",
    "mid-tone anchor": "mid-tone anchor 中调锚点",
    "wide banner": "wide banner 横幅",
    "detail": "detail 细节图",
    "hero background": "hero background 主视觉背景",
}


def _plate_stats(path):
    im = Image.open(path).convert("RGB")
    a = np.asarray(im, dtype=np.float32)
    lum = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    return dict(width=im.size[0], height=im.size[1],
                mean=round(float(lum.mean()), 1), min=round(float(lum.min()), 1),
                max=round(float(lum.max()), 1), std=round(float(lum.std()), 1))


def write_plates_json():
    plates = []
    for pid in ORDER:
        spec = PLATES[pid]
        path = os.path.join(OUT_DIR, spec["file"])
        st = _plate_stats(path)
        meta = META[pid]
        plates.append({
            "id": pid,
            "file": spec["file"],
            "width": spec["w"],
            "height": spec["h"],
            "ratio": spec["ratio"],
            "semantics_zh": spec["zh"],
            "semantics_en": spec["subject"],
            "method": meta["method"],
            "brightness": {"mean_luma_rec709": st["mean"], "tier": meta["tier"]},
            "suggested_usage": [USAGE_LABEL[u] for u in meta["usage"]],
            "declaration": DECLARATION_ZH + " / " + DECLARATION_EN,
            **({"alternate_of": meta["alternate_of"]} if "alternate_of" in meta else {}),
        })
    doc = {
        "schema": "morton.plates/v1",
        "project": "MORTON V2",
        "phase": "Phase 1 · art direction",
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "generator": "scripts/plates/generate.py",
        "generation": "numpy + Pillow + scipy; no image model, no third-party imagery",
        "color": {"space": "sRGB", "profile": "embedded sRGB IEC61966-2.1", "alpha": False, "format": "PNG 8-bit"},
        "palette": [PAPER, "#B9B0A3", "#8E877C", CHARCOAL, "#896D55"],
        "declaration_zh": DECLARATION_ZH,
        "declaration_en": DECLARATION_EN,
        "plates": plates,
        "contact_sheet": "contact-sheet.png",
        "notes": "Placeholder material plates for the Phase 1 styleframes. They are not photographs of real artworks; replace with licensed project photography when available.",
    }
    with open(PLATES_JSON, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
    log(f"wrote {os.path.basename(PLATES_JSON)}")


def _font(size, bold=False):
    paths = [
        "/Library/Fonts/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for path in paths:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


def make_contact_sheet():
    """3x3 contact sheet, sorted bright -> dark, with quiet labels and the
    original-placeholder declaration."""
    items = []
    for pid in ORDER:
        spec = PLATES[pid]
        path = os.path.join(OUT_DIR, spec["file"])
        st = _plate_stats(path)
        items.append((pid, path, st))
    items.sort(key=lambda t: -t[2]["mean"])

    CW, CH = 2200, 1800
    canvas = Image.new("RGB", (CW, CH), (234, 229, 220))
    d = ImageDraw.Draw(canvas)
    ink = (43, 40, 35)
    muted = (110, 102, 91)
    hair = (211, 203, 191)

    d.text((64, 42), "MORTON V2  ·  ORIGINAL MATERIAL PLATES  ·  CONTACT SHEET", font=_font(26, True), fill=ink)
    d.text((64, 82), "sorted bright → dark   ·   sRGB   ·   100% procedural   ·   no third-party imagery",
           font=_font(15), fill=muted)

    margin_x, gutter = 64, 36
    cell_w = (CW - margin_x * 2 - gutter * 2) / 3.0
    img_h = 400
    row_h = 470
    top = 140

    for i, (pid, path, st) in enumerate(items):
        col, row = i % 3, i // 3
        x0 = margin_x + col * (cell_w + gutter)
        y0 = top + row * row_h
        im = Image.open(path).convert("RGB")
        scale = min(cell_w / im.width, img_h / im.height)
        nw, nh = max(1, int(im.width * scale)), max(1, int(im.height * scale))
        thumb = im.resize((nw, nh), Image.LANCZOS)
        px = x0 + (cell_w - nw) / 2.0
        py = y0 + (img_h - nh) / 2.0
        canvas.paste(thumb, (int(px), int(py)))
        d.rectangle([px - 0.5, py - 0.5, px + nw + 0.5, py + nh + 0.5], outline=hair, width=1)

        meta = META[pid]
        spec = PLATES[pid]
        label = f"{pid}  ·  {spec['zh']}"
        if "alternate" in meta["method"] or pid == "p07b":
            label += "  ·  ALT"
        d.text((x0, y0 + img_h + 14), label, font=_font(16, True), fill=ink)
        d.text((x0, y0 + img_h + 36),
               f"{spec['w']}×{spec['h']}   ·   mean {st['mean']:.0f}   ·   {meta['tier']}   ·   {', '.join(meta['usage'])}",
               font=_font(12), fill=muted)

    d.line([(64, 1668), (CW - 64, 1668)], fill=hair, width=1)
    d.text((64, 1690), "原创占位，非真实作品摄影。 / Original procedural placeholders — not photographs of real artworks or products.",
           font=_font(14), fill=muted)
    d.text((CW - 64 - 330, 1690), "MORTON V2 · Phase 1 · 2026", font=_font(13), fill=muted)

    canvas.save(CONTACT_SHEET, format="PNG", optimize=True, icc_profile=SRGB_PROFILE)
    log(f"wrote {os.path.basename(CONTACT_SHEET)}  {CW}x{CH}")


# --------------------------------------------------------------------------
# entry point
# --------------------------------------------------------------------------


def main():
    ap = argparse.ArgumentParser(description="Generate original MORTON V2 material plates")
    ap.add_argument("--only", default=None, help="comma separated plate ids, e.g. p01,p03")
    ap.add_argument("--no-contact", action="store_true", help="skip contact sheet")
    ap.add_argument("--no-json", action="store_true", help="skip PLATES.json")
    ap.add_argument("--list", action="store_true", help="list plate ids and sizes")
    args = ap.parse_args()

    os.makedirs(OUT_DIR, exist_ok=True)
    if args.list:
        for pid in ORDER:
            p = PLATES[pid]
            print(f"{pid}  {p['w']}x{p['h']}  {p['file']}  {p['subject']}")
        return

    ids = ORDER if not args.only else [s.strip() for s in args.only.split(",") if s.strip()]
    for pid in ids:
        if pid not in PLATES:
            raise SystemExit(f"unknown plate {pid!r}; available: {', '.join(ORDER)}")
        spec = PLATES[pid]
        log(f"render {pid} {spec['w']}x{spec['h']} ({spec['subject']})")
        arr = spec["render"](spec["w"], spec["h"])
        save_png(arr, spec["file"])

    if ids == ORDER:
        if not args.no_json:
            write_plates_json()
        if not args.no_contact:
            make_contact_sheet()

    log("done")


if __name__ == "__main__":
    main()
