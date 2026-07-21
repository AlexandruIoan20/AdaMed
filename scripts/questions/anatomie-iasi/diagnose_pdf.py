# diagnose_colors.py
import sys
import fitz

doc = fitz.open(sys.argv[1])

for pn in range(min(3, len(doc))):
    page = doc[pn]
    print(f"\n── Pagina {pn + 1} ──")
    colors_found = {}

    for block in page.get_text("dict")["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block["lines"]:
            for span in line["spans"]:
                c = span["color"]
                if c not in colors_found:
                    r = (c >> 16) & 0xFF
                    g = (c >> 8) & 0xFF
                    b = c & 0xFF
                    colors_found[c] = (r, g, b)
                    print(f"  color={c:>10} RGB({r:>3},{g:>3},{b:>3})  | {span['text'][:50]!r}")