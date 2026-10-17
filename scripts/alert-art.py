"""Draws each mod's notification art: a round logo and a wide hero picture.

   python scripts/alert-art.py plugins
"""
import math
import os
import random
import sys

from PIL import Image, ImageDraw, ImageFilter

root = sys.argv[1]  # .../plugins
S = 4  # draw big, shrink for smooth edges


def hexc(h, a=255):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


def save(img, size, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.resize(size, Image.LANCZOS).save(path)


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(4))


def vgrad(w, h, top, bottom):
    img = Image.new('RGBA', (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        d.line([(0, y), (w, y)], fill=mix(top, bottom, y / max(1, h - 1)))
    return img


# ═══ RPG: pixel art, night camp, gold ═══
def rpg():
    out = f'{root}/pixel-activity/images'
    # logo: a pixel sword on a dark tile with a gold rim, drawn on a 16-cell grid
    px = 8
    logo = Image.new('RGBA', (16 * px, 16 * px), hexc('#1C1A24'))
    d = ImageDraw.Draw(logo)
    gold, steel, shine, grip = hexc('#E0B84A'), hexc('#C9D1DC'), hexc('#FFFFFF'), hexc('#7A4234')
    cells = {}
    for i in range(3, 11):  # blade along the diagonal
        cells[(i, 14 - i)] = steel
        cells[(i + 1, 14 - i)] = steel
    for i in range(3, 10):
        cells[(i + 1, 13 - i)] = shine
    for c in [(2, 11), (3, 12), (4, 13), (5, 12), (4, 11), (3, 10)]:
        cells[c] = gold  # guard
    for c in [(2, 13), (1, 14)]:
        cells[c] = grip
    cells[(0, 15)] = gold
    for (x, y), c in cells.items():
        d.rectangle([x * px, y * px, x * px + px - 1, y * px + px - 1], fill=c)
    d.rectangle([0, 0, 16 * px - 1, 16 * px - 1], outline=gold, width=px // 2)
    logo.resize((256, 256), Image.NEAREST).save(f'{out}/logo.png') if os.makedirs(out, exist_ok=True) is None else None

    # hero: night sky, stars, hills and a campfire, in chunky pixels
    W, H, p = 182, 90, 4
    hero = Image.new('RGBA', (W, H))
    d = ImageDraw.Draw(hero)
    for y in range(H):
        d.line([(0, y), (W, y)], fill=mix(hexc('#1B1B3A'), hexc('#3B2F5C'), y / H))
    rnd = random.Random(7)
    for _ in range(40):
        x, y = rnd.randrange(W), rnd.randrange(int(H * 0.55))
        d.point((x, y), fill=hexc('#FFFFFF', rnd.choice([150, 220, 255])))
    d.ellipse([146, 8, 158, 20], fill=hexc('#F2E8D5'))  # crescent moon
    d.ellipse([150, 6, 162, 18], fill=hexc('#22204A'))
    for x in range(W):  # hills
        y = int(62 + 6 * math.sin(x / 18) + 3 * math.sin(x / 7))
        d.line([(x, y), (x, H)], fill=hexc('#2C4A3A'))
    d.rectangle([0, 74, W, H], fill=hexc('#1F3329'))
    fx = 90  # campfire
    for dx, dy, c in [(-6, 0, '#7A4234'), (-3, 1, '#7A4234'), (3, 1, '#7A4234'), (6, 0, '#7A4234')]:
        d.rectangle([fx + dx - 2, 76 + dy, fx + dx + 2, 78 + dy], fill=hexc(c))
    flame = ['....y....', '...yoy...', '..yooOy..', '..oOOro..', '.oOrrrOo.', '.orRRRro.', '..rRRRr..']
    tone = {'y': '#FFE066', 'o': '#FFB347', 'O': '#FF8A3D', 'r': '#FF6B3D', 'R': '#E03131'}
    for j, row in enumerate(flame):
        for i, ch in enumerate(row):
            if ch in tone:
                d.point((fx - 4 + i, 68 + j), fill=hexc(tone[ch]))
    hero = hero.resize((W * p, H * p), Image.NEAREST)
    d = ImageDraw.Draw(hero)
    d.rectangle([0, 0, W * p - 1, H * p - 1], outline=hexc('#E0B84A'), width=6)
    hero.resize((728, 360), Image.NEAREST).save(f'{out}/hero.png')


# ═══ Calm: soft gradient, thin rings, a leaf in the accent ═══
ACCENTS = {'blue': '#8FA2F2', 'green': '#78C2A0', 'purple': '#B39BF3', 'orange': '#F2AE72', 'mono': '#A3A8B4'}


def calm():
    out = f'{root}/simple-dash/images'
    for name, acc in ACCENTS.items():
        n = 128 * S
        logo = Image.new('RGBA', (n, n), (0, 0, 0, 0))
        d = ImageDraw.Draw(logo)
        d.ellipse([0, 0, n - 1, n - 1], fill=mix(hexc(acc), hexc('#FFFFFF'), 0.75))
        d.ellipse([n * .18, n * .18, n * .82, n * .82], outline=hexc(acc), width=int(n * .03))
        # a leaf: two arcs and a midrib, thin line work
        c = hexc('#2B2D33')
        # a leaf from the lower left to the upper right: a pointed outline and its midrib
        a, b = (n * .30, n * .70), (n * .70, n * .30)
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        bulge = n * .16
        side = []
        for sgn in (1, -1):
            ctrl = (mx + sgn * bulge, my + sgn * bulge)
            pts = []
            for k in range(41):
                t = k / 40
                pts.append(((1 - t) ** 2 * a[0] + 2 * (1 - t) * t * ctrl[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * ctrl[1] + t * t * b[1]))
            side.append(pts)
        d.polygon(side[0] + side[1][::-1], fill=mix(hexc(acc), hexc('#FFFFFF'), 0.35))
        d.line(side[0], fill=c, width=int(n * .03), joint='curve')
        d.line(side[1], fill=c, width=int(n * .03), joint='curve')
        d.line([(n * .24, n * .76), b], fill=c, width=int(n * .028))
        save(logo, (256, 256), f'{out}/logo-{name}.png')

        W, H = 728 * 2, 360 * 2
        hero = vgrad(W, H, mix(hexc(acc), hexc('#FFFFFF'), 0.85), mix(hexc(acc), hexc('#FFFFFF'), 0.6))
        d = ImageDraw.Draw(hero)
        for i, (cx, r) in enumerate([(W * .25, 120), (W * .5, 150), (W * .75, 120)]):
            cy = H * .5
            d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=hexc('#FFFFFF', 220), width=10)
            d.arc([cx - r, cy - r, cx + r, cy + r], -90, -90 + 80 + i * 60, fill=hexc(acc), width=10)
        save(hero, (728, 360), f'{out}/hero-{name}.png')


# ═══ Journal: cream, a smiling sun, soft hills ═══
def journal():
    out = f'{root}/daily-journal/images'
    sun, deep, ink = hexc('#FFC94A'), hexc('#F7A928'), hexc('#2B2620')

    def face(d, cx, cy, r):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=deep)
        e = r * .1
        d.ellipse([cx - r * .35 - e, cy - r * .1 - e, cx - r * .35 + e, cy - r * .1 + e], fill=ink)
        d.ellipse([cx + r * .35 - e, cy - r * .1 - e, cx + r * .35 + e, cy - r * .1 + e], fill=ink)
        d.arc([cx - r * .3, cy - r * .15, cx + r * .3, cy + r * .4], 20, 160, fill=ink, width=max(2, int(r * .08)))
        for sx in (-1, 1):
            d.ellipse([cx + sx * r * .6 - r * .14, cy + r * .2 - r * .1, cx + sx * r * .6 + r * .14, cy + r * .2 + r * .1], fill=hexc('#FF8A80', 140))

    n = 128 * S
    logo = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(logo)
    d.ellipse([0, 0, n - 1, n - 1], fill=sun)
    for i in range(8):
        a = i * math.pi / 4
        d.line([(n / 2 + math.cos(a) * n * .33, n / 2 + math.sin(a) * n * .33), (n / 2 + math.cos(a) * n * .43, n / 2 + math.sin(a) * n * .43)], fill=deep, width=int(n * .05))
    face(d, n / 2, n / 2, n * .26)
    save(logo, (256, 256), f'{out}/logo.png')

    W, H = 728 * 2, 360 * 2
    hero = vgrad(W, H, hexc('#FFE7A3'), hexc('#FFC94A'))
    d = ImageDraw.Draw(hero)
    cx, cy, r = W * .74, H * .40, 110
    for i in range(12):
        a = i * math.pi / 6
        d.line([(cx + math.cos(a) * (r + 30), cy + math.sin(a) * (r + 30)), (cx + math.cos(a) * (r + 70), cy + math.sin(a) * (r + 70))], fill=deep, width=22)
    face(d, cx, cy, r)
    for k, (col, base) in enumerate([('#F5B53A', .70), ('#F28C38', .84)]):
        pts = [(x, H * base + 40 * math.sin(x / 160 + k * 2)) for x in range(0, W + 20, 20)]
        d.polygon(pts + [(W, H), (0, H)], fill=hexc(col, 200 if k == 0 else 160))
    for (x, y, rr, c) in [(W * .14, H * .30, 26, '#FFFFFF'), (W * .24, H * .22, 16, '#F6D6CF'), (W * .32, H * .36, 20, '#DDD7FB')]:
        d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=hexc(c))
    save(hero, (728, 360), f'{out}/hero.png')


rpg()
calm()
journal()
print('ok')
