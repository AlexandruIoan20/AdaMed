"""
Rulează: python diagnose_pdf.py grile.pdf
Afișează informații despre imagini pe fiecare pagină din PDF.
"""

import sys
import fitz

def diagnose(pdf_path: str, pages_to_check: int = None):
    doc = fitz.open(pdf_path)
    total = len(doc)
    pages = pages_to_check or total

    print(f"\n=== PDF: {pdf_path} ===")
    print(f"Pagini totale: {total}\n")

    pages_with_images = []

    for pn in range(min(pages, total)):
        page = doc[pn]
        images = page.get_images(full=True)

        if not images:
            continue

        pages_with_images.append(pn + 1)
        print(f"{'─'*50}")
        print(f"PAGINA {pn + 1} — {len(images)} imagine(i)")
        print(f"{'─'*50}")

        for i, img_info in enumerate(images):
            xref = img_info[0]

            # Dimensiuni imagine
            try:
                raw = doc.extract_image(xref)
                w, h = raw.get("width", "?"), raw.get("height", "?")
                ext  = raw.get("ext", "?")
                size = len(raw.get("image", b"")) // 1024
            except Exception:
                w, h, ext, size = "?", "?", "?", "?"

            # Poziția pe pagină (unde e plasată)
            rects = page.get_image_rects(xref)
            for rect in rects:
                print(f"  Imaginea {i+1}:")
                print(f"    Dimensiune: {w}x{h}px, format={ext}, ~{size}KB")
                print(f"    Poziție pe pagină: y={rect.y0:.0f} → y={rect.y1:.0f}  "
                      f"(x={rect.x0:.0f} → x={rect.x1:.0f})")

        # Afișează și întrebările de pe pagina asta (după poziția y)
        print(f"\n  Întrebări detectate pe această pagină (după poziția y):")
        blocks = page.get_text("dict", sort=True)["blocks"]
        import re
        found_q = False
        for block in blocks:
            if block.get("type") != 0:
                continue
            for line in block["lines"]:
                spans = line["spans"]
                if not spans:
                    continue
                text = " ".join(s["text"] for s in spans).strip()
                x0 = min(s["bbox"][0] for s in spans)
                y0 = min(s["bbox"][1] for s in spans)
                if re.match(r'^\d+\.\s+\S', text) and x0 < 80:
                    print(f"    y={y0:.0f}  {text[:60]}")
                    found_q = True
        if not found_q:
            print("    (nicio întrebare detectată la nivelul x așteptat)")
        print()

    print(f"{'═'*50}")
    print(f"SUMAR: {len(pages_with_images)} pagini cu imagini din {pages} verificate")
    if pages_with_images:
        print(f"Paginile: {pages_with_images}")
    else:
        print("Nicio imagine găsită.")

    doc.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Folosire: python diagnose_pdf.py grile.pdf [nr_pagini_de_verificat]")
        sys.exit(1)

    pdf  = sys.argv[1]
    pgs  = int(sys.argv[2]) if len(sys.argv) > 2 else None
    diagnose(pdf, pgs)