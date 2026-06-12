"""
OG image generator — /api/v1/og/<slug>.png

Renders a 1200×630 PNG with the page title baked in, so LinkedIn / Twitter /
Slack / WhatsApp social previews look pro for each pillar article.

Static slug → preset mapping. Falls back to a generic preset on unknown
slugs. Result is cached aggressively (24 h public + 7 j stale-while-revalidate)
so the image is essentially a static asset after first hit.
"""
from __future__ import annotations

import io
import logging
from typing import Dict

from fastapi import APIRouter, HTTPException, Response

logger = logging.getLogger(__name__)
router = APIRouter()


# slug → (title, subtitle, accent_hex)
PRESETS: Dict[str, tuple[str, str, str]] = {
    "guide-csrd-pme":              ("Guide complet de la CSRD",   "pour les PME et ETI françaises",       "#10b981"),
    "guide-bilan-carbone":         ("Bilan carbone Scopes 1/2/3", "Méthode complète GHG Protocol",        "#3b82f6"),
    "guide-csddd":                 ("CSDDD — devoir de vigilance", "Audit fournisseurs supply chain",      "#8b5cf6"),
    "guide-scope3-fec":            ("Scope 3 par import FEC",      "Calculer son empreinte en 15 min",    "#3b82f6"),
    "guide-taxonomie":             ("Taxonomie UE en pratique",    "Aligner CapEx / OpEx pas à pas",      "#8b5cf6"),
    "omnibus-csrd":                ("Omnibus CSRD 2025",           "Ce qui change concrètement",          "#f59e0b"),
    "checklist-csrd":              ("Check-list CSRD gratuite",    "47 indicateurs ESRS prioritaires",    "#10b981"),
    "partenaires":                 ("Programme Partenaires",       "Jusqu'à 20 % de commission",          "#3b82f6"),
    "roadmap":                     ("Roadmap publique",            "Transparence sur notre direction",    "#8b5cf6"),
    "status":                      ("Statut de la plateforme",     "API · DB · Redis · temps réel",       "#10b981"),
    "_default":                    ("ESG Flow",                    "Plateforme ESG intelligente",         "#10b981"),
}


def _render_png(title: str, subtitle: str, accent_hex: str) -> bytes:
    """Render a 1200x630 PNG with PIL — no external dependency beyond Pillow."""
    from PIL import Image, ImageDraw, ImageFont
    import os

    W, H = 1200, 630
    BG_TOP    = (12, 20, 36)        # #0c1424
    BG_BOTTOM = (15, 23, 42)        # #0f172a
    WHITE     = (255, 255, 255)
    GRAY      = (148, 163, 184)
    # Accent
    accent = tuple(int(accent_hex.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))

    img = Image.new('RGB', (W, H), BG_TOP)
    draw = ImageDraw.Draw(img)

    # Vertical gradient
    for y in range(H):
        ratio = y / H
        r = int(BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * ratio)
        g = int(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * ratio)
        b = int(BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * ratio)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # Accent ribbon (top)
    draw.rectangle([(0, 0), (W, 8)], fill=accent)

    # Accent decorative dots (bottom-right, subtle)
    for x in range(W - 200, W, 22):
        for y in range(H - 200, H, 22):
            dot_alpha = max(0, 1 - ((W - x) + (H - y)) / 400)
            if dot_alpha > 0.05:
                shade = tuple(int(c * dot_alpha + bg * (1 - dot_alpha)) for c, bg in zip(accent, BG_BOTTOM))
                draw.ellipse([(x - 2, y - 2), (x + 2, y + 2)], fill=shade)

    # Try to load nice fonts — multiple sources in priority order.
    # ReportLab ships Vera/Bitstream Vera Sans with TTL files in the wheel, so
    # we fall back to them inside the container (no system fonts installed).
    title_font = subtitle_font = brand_font = tag_font = None
    candidates = [
        # System paths (Debian/Ubuntu/Mac/Alpine)
        ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
         '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'),
        ('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
         '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'),
        ('/System/Library/Fonts/Helvetica.ttc',
         '/System/Library/Fonts/Helvetica.ttc'),
        # ReportLab bundled (works inside our prod container)
        (os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
            __import__('reportlab').__file__))), 'reportlab', 'fonts', 'VeraBd.ttf'),
         os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
            __import__('reportlab').__file__))), 'reportlab', 'fonts', 'Vera.ttf')),
        # Direct path (resolved once for prod)
        ('/usr/local/lib/python3.11/site-packages/reportlab/fonts/VeraBd.ttf',
         '/usr/local/lib/python3.11/site-packages/reportlab/fonts/Vera.ttf'),
    ]
    for bold_path, regular_path in candidates:
        try:
            if not (os.path.exists(bold_path) and os.path.exists(regular_path)):
                continue
            title_font    = ImageFont.truetype(bold_path,    76)
            subtitle_font = ImageFont.truetype(regular_path, 36)
            brand_font    = ImageFont.truetype(bold_path,    34)
            tag_font      = ImageFont.truetype(regular_path, 18)
            break
        except Exception:
            continue
    if not title_font:
        # Last-resort default font (tiny but won't crash)
        title_font = subtitle_font = brand_font = tag_font = ImageFont.load_default()

    # ── Top-left brand ────────────────────────────────────────────────────
    brand_y = 60
    draw.text((80, brand_y), "ESG", fill=WHITE, font=brand_font)
    # Measure "ESG " width to align "FLOW"
    try:
        bbox = draw.textbbox((80, brand_y), "ESG ", font=brand_font)
        esg_right = bbox[2]
    except Exception:
        esg_right = 80 + 90
    draw.text((esg_right, brand_y), "FLOW", fill=accent, font=brand_font)
    # Tag under brand
    draw.text((80, brand_y + 50), "DATA  ·  CARBON  ·  IMPACT", fill=GRAY, font=tag_font)

    # ── Main title (word-wrap to ~24 chars per line) ──────────────────────
    def wrap(text: str, max_w: int, font) -> list[str]:
        words = text.split()
        lines: list[str] = []
        cur = ""
        for w in words:
            test = (cur + " " + w).strip()
            try:
                bb = draw.textbbox((0, 0), test, font=font)
                width = bb[2] - bb[0]
            except Exception:
                width = len(test) * 30
            if width > max_w and cur:
                lines.append(cur)
                cur = w
            else:
                cur = test
        if cur:
            lines.append(cur)
        return lines

    title_lines = wrap(title, W - 160, title_font)
    sub_lines   = wrap(subtitle, W - 160, subtitle_font)

    # Vertical center the block
    line_h_title = 92
    line_h_sub   = 48
    total_h = len(title_lines) * line_h_title + 28 + len(sub_lines) * line_h_sub
    start_y = (H - total_h) // 2 + 20

    y = start_y
    for line in title_lines:
        draw.text((80, y), line, fill=WHITE, font=title_font)
        y += line_h_title
    y += 14
    for line in sub_lines:
        draw.text((80, y), line, fill=accent, font=subtitle_font)
        y += line_h_sub

    # ── Bottom strip: URL ─────────────────────────────────────────────────
    draw.text((80, H - 70), "greenconnect.cloud", fill=GRAY, font=tag_font)

    buf = io.BytesIO()
    img.save(buf, format='PNG', optimize=True)
    buf.seek(0)
    return buf.read()


@router.get("/og/{slug}.png", include_in_schema=False)
def og_image(slug: str) -> Response:
    """Return the 1200x630 PNG for a known slug. Cached aggressively."""
    if slug.endswith(".png"):
        slug = slug[:-4]
    preset = PRESETS.get(slug, PRESETS["_default"])
    try:
        png = _render_png(*preset)
    except Exception as exc:
        logger.exception("OG image rendering failed for %s: %s", slug, exc)
        raise HTTPException(status_code=500, detail="og render error")
    return Response(
        content=png,
        media_type="image/png",
        headers={
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
            "Vary": "Accept",
        },
    )
