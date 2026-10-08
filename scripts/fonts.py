"""Makes the app's static font files from the web's variable fonts.

React Native can't set a variable font's width axis, so each width and weight the app uses becomes its own static
TTF (docs/phase-0-plan.md, risks). The sources are the variable fonts the web client bundles (Fontsource), so the
phone draws exactly the web's faces. Both fonts are under the SIL Open Font License, which allows this.

    python -m venv .venv && .venv/Scripts/pip install fonttools brotli   (once; brotli reads woff2)
    .venv/Scripts/python scripts/fonts.py <path to the web client>

Writes assets/fonts/*.ttf and the licence files. src/theme/fonts.ts lists the same files.
"""

import shutil
import sys
from pathlib import Path

from fontTools.merge import Merger
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

OUT = Path(__file__).resolve().parent.parent / "assets" / "fonts"

# The subsets the web loads for Latin text: basic Latin, then accented and extended Latin.
SUBSETS = ["latin", "latin-ext"]

# (file name, Fontsource package, file prefix, width, weight)
INSTANCES = [
    # Archivo at its normal width: body, labels, buttons, and the "bold" (650) of headings in cards.
    ("Archivo-400", "archivo", "archivo", 100, 400),
    ("Archivo-500", "archivo", "archivo", 100, 500),
    ("Archivo-600", "archivo", "archivo", 100, 600),
    ("Archivo-650", "archivo", "archivo", 100, 650),
    # Widened for page titles and hero figures (the web's font-stretch 104–106%).
    ("ArchivoWide-650", "archivo", "archivo", 106, 650),
    # Martian Mono condensed to 78% for every figure, as the web's .mono.
    ("MartianMono-400", "martian-mono", "martian-mono", 78, 400),
    ("MartianMono-600", "martian-mono", "martian-mono", 78, 600),
]

LICENCES = {"archivo": "Archivo-OFL.txt", "martian-mono": "MartianMono-OFL.txt"}


def width_class(width: float) -> int:
    """OS/2 usWidthClass for a width in percent (OpenType's table of nine steps)."""
    steps = [50, 62.5, 75, 87.5, 100, 112.5, 125, 150, 200]
    return min(range(len(steps)), key=lambda i: abs(steps[i] - width)) + 1


def instance(source: Path, width: float, weight: int) -> TTFont:
    font = TTFont(source)
    static = instantiateVariableFont(font, {"wdth": width, "wght": weight})
    static.flavor = None
    return static


def rename(font: TTFont, name: str, width: float, weight: int) -> None:
    """Gives the instance its own family and PostScript name, so iOS registers every file separately."""
    family = name.replace("-", " ")
    table = font["name"]
    for record_id in (16, 17, 21, 22, 25):
        table.removeNames(nameID=record_id)
    table.setName(family, 1, 3, 1, 0x409)
    table.setName("Regular", 2, 3, 1, 0x409)
    table.setName(f"{name};static", 3, 3, 1, 0x409)
    table.setName(family, 4, 3, 1, 0x409)
    table.setName(name, 6, 3, 1, 0x409)
    # Only the Windows names are kept: they are the ones Android and iOS read.
    table.names = [n for n in table.names if n.platformID == 3]

    os2 = font["OS/2"]
    os2.usWeightClass = weight
    os2.usWidthClass = width_class(width)
    os2.fsSelection = (os2.fsSelection & ~0b1100001) | 0b1000000  # not italic or bold; regular
    font["head"].macStyle = 0


def build(web_client: Path) -> None:
    fontsource = web_client / "node_modules" / "@fontsource-variable"
    OUT.mkdir(parents=True, exist_ok=True)
    work = OUT / ".work"
    work.mkdir(exist_ok=True)
    try:
        for name, package, prefix, width, weight in INSTANCES:
            parts = []
            for subset in SUBSETS:
                source = fontsource / package / "files" / f"{prefix}-{subset}-standard-normal.woff2"
                part = work / f"{name}-{subset}.ttf"
                instance(source, width, weight).save(part)
                parts.append(str(part))
            merged = Merger().merge(parts)
            rename(merged, name, width, weight)
            target = OUT / f"{name}.ttf"
            merged.save(target)
            print(f"{target.name}: {target.stat().st_size // 1024} KB")
    finally:
        shutil.rmtree(work)

    for package, licence in LICENCES.items():
        shutil.copyfile(fontsource / package / "LICENSE", OUT / licence)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Usage: python scripts/fonts.py <path to the web client>")
    build(Path(sys.argv[1]))
