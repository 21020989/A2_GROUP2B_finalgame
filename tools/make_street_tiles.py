"""
Draws the street tileset (level 3) for Hear No Evil.

Every tile is 32x32 RGBA, same as the mansion and courtyard sets, and the ones
that repeat across the ground (asphalt, verge, treeline) wrap seamlessly so a
field of them has no visible grid.

    python tools/make_street_tiles.py

The level is set at night, so the whole palette is darkened and pushed toward
blue against the daytime reference we worked from — the road reads as lit only
by the moon until a streetlamp is near.

ONE TILE HERE IS A PLACEHOLDER. streetlamp.png is a stand-in so the safe-zone
mechanic can be built and tested; the group is drawing the real one. Everything
else is final.

Written by us; no external art was traced or imported.
"""

import math
import os
import random

from PIL import Image

N = 32
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "images")

# --- palette ---------------------------------------------------------
# Night: low value, low saturation, everything biased a few points toward blue.
ASPHALT = [(78, 80, 88), (66, 68, 76), (56, 58, 66), (46, 48, 56), (38, 40, 47)]
PAINT = [(196, 198, 190), (162, 164, 158), (128, 130, 126)]
CONCRETE = [(120, 122, 126), (98, 100, 105), (78, 80, 86), (60, 62, 68)]
GRASS = [(58, 92, 54), (46, 76, 44), (36, 62, 36), (28, 50, 30), (20, 38, 24)]
GRASS_DRY = [(74, 82, 48), (58, 66, 40), (44, 50, 32)]
LEAF = [(44, 78, 46), (34, 62, 38), (26, 48, 30), (18, 36, 24), (12, 26, 18)]
DIRT = [(84, 68, 50), (68, 54, 40), (52, 42, 32), (38, 31, 24)]
IRON = [(96, 100, 108), (70, 74, 82), (48, 51, 58), (32, 34, 40)]
LAMP_WARM = (255, 214, 138)
OUTLINE = (12, 12, 16)


# --- helpers (same as the courtyard set) -----------------------------
def new(alpha=0):
    return Image.new("RGBA", (N, N), (0, 0, 0, alpha))


def shade(c, f):
    return tuple(max(0, min(255, int(v * f))) for v in c)


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def value_noise(seed, freq):
    """Smooth 0..1 field that wraps at the tile edge."""
    rnd = random.Random(seed)
    g = [[rnd.random() for _ in range(freq)] for _ in range(freq)]
    out = [[0.0] * N for _ in range(N)]
    for y in range(N):
        fy = y * freq / N
        y0, y1 = int(fy) % freq, (int(fy) + 1) % freq
        ty = fy - int(fy)
        ty = ty * ty * (3 - 2 * ty)
        for x in range(N):
            fx = x * freq / N
            x0, x1 = int(fx) % freq, (int(fx) + 1) % freq
            tx = fx - int(fx)
            tx = tx * tx * (3 - 2 * tx)
            a = g[y0][x0] * (1 - tx) + g[y0][x1] * tx
            b = g[y1][x0] * (1 - tx) + g[y1][x1] * tx
            out[y][x] = a * (1 - ty) + b * ty
    return out


def outline_alpha(img, colour=OUTLINE):
    """1px dark border around opaque pixels — matches the other tilesets."""
    px = img.load()
    edge = []
    for y in range(N):
        for x in range(N):
            if px[x, y][3] > 0:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < N and 0 <= ny < N and px[nx, ny][3] > 200:
                    edge.append((x, y))
                    break
    for x, y in edge:
        px[x, y] = colour + (255,)
    return img


# --- road ------------------------------------------------------------
def asphalt(seed=7, wear=0.0):
    """Grainy tarmac. Two noise octaves so it reads as aggregate, not static."""
    img = new(255)
    px = img.load()
    coarse = value_noise(seed, 4)
    fine = value_noise(seed + 1, 16)
    rnd = random.Random(seed + 2)
    for y in range(N):
        for x in range(N):
            v = coarse[y][x] * 0.6 + fine[y][x] * 0.4
            idx = min(len(ASPHALT) - 1, int(v * len(ASPHALT)))
            c = ASPHALT[idx]
            if wear:
                c = mix(c, ASPHALT[0], wear * fine[y][x])
            # scattered lighter chips of aggregate
            if rnd.random() < 0.05:
                c = shade(c, 1.25)
            elif rnd.random() < 0.04:
                c = shade(c, 0.82)
            px[x, y] = c + (255,)
    return img


def road_dash():
    """Asphalt carrying one segment of the centre line.

    The road runs left to right, so the dash is a horizontal bar. A dash tile
    followed by plain asphalt tiles gives the broken line.
    """
    img = asphalt(11)
    px = img.load()
    grain = value_noise(31, 8)
    for y in range(14, 18):
        for x in range(N):
            # worn paint: thinner and patchier toward the ends of the segment
            edge = min(x, N - 1 - x) / 6.0
            keep = min(1.0, edge) * (0.55 + 0.45 * grain[y][x])
            if keep < 0.28:
                continue
            base = PAINT[0] if 15 <= y <= 16 else PAINT[1]
            px[x, y] = mix(px[x, y][:3], base, keep) + (255,)
    return img


def road_edge():
    """Asphalt with the solid white edge line along its top.

    Drawn once and rotated 180 degrees by the renderer for the far verge, the
    same trick the wall set uses, so only one tile is needed for both sides.
    """
    img = asphalt(13)
    px = img.load()
    grain = value_noise(37, 8)
    for y in range(2, 5):
        for x in range(N):
            keep = 0.6 + 0.4 * grain[y][x]
            base = PAINT[0] if y == 3 else PAINT[1]
            px[x, y] = mix(px[x, y][:3], base, keep) + (255,)
    # a little grit gathering against the line
    for x in range(N):
        if grain[6][x] > 0.62:
            px[x, 5] = shade(px[x, 5][:3], 0.9) + (255,)
    return img


def kerb():
    """Concrete strip between road and verge. Symmetric top to bottom so the
    same tile serves either side of the carriageway."""
    img = new(255)
    px = img.load()
    grain = value_noise(41, 10)
    for y in range(N):
        # bright along the middle, darker at both edges where it meets road/grass
        d = abs(y - (N - 1) / 2) / ((N - 1) / 2)
        idx = int(d * (len(CONCRETE) - 1) + grain[y][0] * 0.6)
        idx = max(0, min(len(CONCRETE) - 1, idx))
        for x in range(N):
            v = grain[y][x]
            c = CONCRETE[max(0, min(len(CONCRETE) - 1, idx + (1 if v > 0.72 else 0)))]
            if v < 0.12:
                c = shade(c, 0.86)  # chips and cracks
            px[x, y] = c + (255,)
    # expansion joints every 16px, wrapping
    for x in (0, 16):
        for y in range(N):
            px[x, y] = shade(px[x, y][:3], 0.62) + (255,)
    return img


# --- verge -----------------------------------------------------------
def verge(seed=3, dry=0.0, tuft=0):
    """Night grass. Wraps; no blade crosses the tile edge unbroken."""
    img = new(255)
    px = img.load()
    coarse = value_noise(seed, 3)
    fine = value_noise(seed + 5, 12)
    rnd = random.Random(seed + 9)
    for y in range(N):
        for x in range(N):
            v = coarse[y][x] * 0.65 + fine[y][x] * 0.35
            pal = GRASS
            if dry and fine[y][x] > 1.0 - dry:
                pal = GRASS_DRY
            idx = min(len(pal) - 1, int(v * len(pal)))
            px[x, y] = pal[idx] + (255,)
    # short blades, drawn as 2-3px verticals so they read at 40px on screen
    for _ in range(18 + tuft * 22):
        bx = rnd.randrange(N)
        by = rnd.randrange(N)
        h = rnd.choice((2, 3, 3, 4))
        c = shade(GRASS[rnd.randrange(2)], 1.0 + rnd.random() * 0.2)
        for i in range(h):
            yy = (by - i) % N
            px[bx, yy] = c + (255,)
    return img


def bush():
    """Low shrub on the verge. Solid — it blocks the player and the vampire."""
    img = new(0)
    px = img.load()
    rnd = random.Random(77)
    blobs = [(10, 12, 8), (21, 14, 7), (15, 21, 8), (24, 22, 5), (7, 21, 5)]
    for cx, cy, r in blobs:
        for y in range(N):
            for x in range(N):
                d = math.hypot(x - cx, y - cy)
                if d > r + rnd.random() * 1.4 - 0.7:
                    continue
                t = d / max(1e-6, r)
                idx = min(len(LEAF) - 1, int(t * 3) + (1 if rnd.random() < 0.3 else 0))
                px[x, y] = LEAF[idx] + (255,)
    # a few lighter leaves catching what moonlight there is
    for _ in range(26):
        x, y = rnd.randrange(N), rnd.randrange(N)
        if px[x, y][3] > 0:
            px[x, y] = shade(LEAF[0], 1.25) + (255,)
    return outline_alpha(img)


def tree():
    """Dense canopy for the treeline that walls the level in. Fills the tile so
    a run of them reads as unbroken woodland rather than separate blobs."""
    img = new(255)
    px = img.load()
    coarse = value_noise(61, 3)
    fine = value_noise(67, 9)
    rnd = random.Random(83)
    for y in range(N):
        for x in range(N):
            v = coarse[y][x] * 0.6 + fine[y][x] * 0.4
            idx = min(len(LEAF) - 1, int(v * (len(LEAF) - 1)) + 1)
            px[x, y] = LEAF[idx] + (255,)
    # clumped highlights so the mass has depth
    for _ in range(40):
        cx, cy = rnd.randrange(N), rnd.randrange(N)
        r = rnd.choice((2, 2, 3))
        for y in range(cy - r, cy + r + 1):
            for x in range(cx - r, cx + r + 1):
                if math.hypot(x - cx, y - cy) <= r:
                    px[x % N, y % N] = shade(LEAF[1], 1.18) + (255,)
    return img


def dirt():
    """Worn patch where the grass has given up — bare ground by the roadside."""
    img = new(255)
    px = img.load()
    coarse = value_noise(91, 4)
    fine = value_noise(97, 14)
    rnd = random.Random(101)
    for y in range(N):
        for x in range(N):
            v = coarse[y][x] * 0.6 + fine[y][x] * 0.4
            idx = min(len(DIRT) - 1, int(v * len(DIRT)))
            c = DIRT[idx]
            if rnd.random() < 0.05:
                c = shade(c, 1.2)  # grit
            px[x, y] = c + (255,)
    # a little grass creeping back in at the margins
    for _ in range(22):
        x, y = rnd.randrange(N), rnd.randrange(N)
        px[x, y] = shade(GRASS[2], 0.95) + (255,)
    return img


# --- PLACEHOLDER -----------------------------------------------------
def streetlamp():
    """PLACEHOLDER. The group is drawing the real streetlamp.

    Deliberately plain: a dark iron column with a warm head, enough to read as a
    lamp and to sit correctly in the tile so the safe-zone mechanic can be built
    and tested against it. The pool of light on the ground is drawn by the game,
    not baked into this tile, so replacing this art changes nothing but the post.
    """
    img = new(0)
    px = img.load()

    # base plinth
    for y in range(26, 31):
        w = 5 - (y - 26) // 2
        for x in range(16 - w, 16 + w):
            px[x, y] = IRON[2 if (x + y) % 3 else 3] + (255,)

    # column
    for y in range(9, 27):
        for x in range(14, 18):
            c = IRON[0] if x == 14 else (IRON[1] if x < 17 else IRON[2])
            px[x, y] = c + (255,)

    # head
    for y in range(5, 10):
        half = 6 - abs(y - 7)
        for x in range(16 - half, 16 + half):
            px[x, y] = IRON[1 if y < 7 else 2] + (255,)

    # glowing bulb under the hood
    for y in range(8, 12):
        half = 4 - abs(y - 9)
        for x in range(16 - half, 16 + half):
            t = 1 - abs(x - 16) / 5.0
            px[x, y] = mix(LAMP_WARM, (255, 255, 236), t * 0.5) + (255,)

    return outline_alpha(img)


# --- build -----------------------------------------------------------
def main():
    tiles = {
        "roadasphalt": asphalt(7),
        "roaddash": road_dash(),
        "roadedge": road_edge(),
        "kerb": kerb(),
        "verge": verge(3),
        "vergetuft": verge(19, dry=0.25, tuft=1),
        "roadbush": bush(),
        "roadtree": tree(),
        "roaddirt": dirt(),
        "streetlamp": streetlamp(),
    }
    os.makedirs(OUT, exist_ok=True)
    for name, img in tiles.items():
        path = os.path.normpath(os.path.join(OUT, name + ".png"))
        img.save(path)
        print("wrote", os.path.basename(path), img.size)
    print("\nstreetlamp.png is a PLACEHOLDER — replace with the group's own art.")


if __name__ == "__main__":
    main()
