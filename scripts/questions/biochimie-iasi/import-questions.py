"""
Fiecare intrebare are 10 raspunsuri
Raspunsurile corecte au numarul intr-un cadran verde
Intrebarile pot avea una sau mai multe imagini

Exemplu:

<nr>. Intrebare
    <varianta raspuns> (<verde daca este corect>). <raspuns>
"""

import os, re, sys, json, logging, argparse
from pathlib import Path
from datetime import datetime

import fitz
import psycopg2
from psycopg2.extras import execute_batch
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level = logging.INFO,
    format = "%(asctime)s [%(levelname)s] %(message)s",
    handlers = [
        logging.FileHandler(f"import_{datetime.now().strftime('%Y%m%d-%H%M%S')}.log"),
        logging.StreamHandler()
    ],
)

log = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")
FACULTY_SUBJECT_ID = os.getenv("FACULTY_SUBJECT_ID")

R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME")
R2_PUBLIC_BASE_URL = os.getenv("R2_PUBLIC_BASE_URL")

HAS_R2 = all([R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASE_URL])

MIN_IMAGE_SIZE = 100

def get_highlight_recs (page: fitz.Page) -> list:
    return [
        annot.rect
        for annot in page.annots()
        if annot.type[0] == 8
    ]

def is_line_highlighted (line_rect: fitz.Rect, h_rects: list) -> bool:
    # True daca mijlocul vertical al unei linii se suprapune cu un highlight
    mid_y = (line_rect.y0 + line_rect.y1) / 2

    for h in h_rects:
        if h.y0 <= mid_y <= h.y1 and line_rect.x0 < h.x1 and line_rect.x1 > h.x0:
            return True

    return False


def get_x_treshold (lines: list) -> float:
    # Detecteaza cum se separa intrebarea de raspuns
        # -> Intrebarea incepe de la un x mai mic
        # -> Raspunsul incepe de la un x mai mare

    x0_vals = sorted({ round(l["x0"]) for l in lines if re.match(r'^\d+\.', l["text"])})

    if len(x0_vals) < 2:
        return 70.0

    # Gaseste cel mai mare gap intre valorile x (acolo este diferenta intrebare - raspuns)
    biggest_gap, treshold = 0, 70.0
    for i in range(len(x0_vals) - 1):
        gap = x0_vals[i + 1] - x0_vals[i]
        if gap > biggest_gap:
            biggest_gap = gap
            treshold = (x0_vals[i] + x0_vals[i + 1]) / 2

    return treshold

def extract_lines(page: fitz.Page, h_rects: list) -> list:
    # Extrage toate liniile de text cu pozitie si status de highlight

    lines = []
    for block in page.get_text("dict", sort = True)["blocks"]:
        if block.get("type") != 0:
            continue

        for line in block["lines"]:
            spans = line["spans"]
            if not spans:
                continue

            text = " ".join(s["text"] for s in spans).strip()
            if not text:
                continue

            x0 = min(s["bbox"][0] for s in spans)
            y0 = min(s["bbox"][1] for s in spans)
            x1 = max(s["bbox"][2] for s in spans)
            y1 = max(s["bbox"][3] for s in spans)

            rect = fitz.Rect(x0, y0, x1, y1)

            lines.append({
                "text": text,
                "x0": x0,
                "y0": y0,
                "rect": rect,
                "highlighted": is_line_highlighted(rect, h_rects)
            })
    return lines

def parse_page(page: fitz.Page) -> list:
    # Parseaza o pagina si returneaza lista de intrebari cu raspunsurile

    """

    Output:
      [
        {
          "number": 1,
          "text": "Referitor la cortizol:",
          "answers": [
            {"position": 1, "text": "Este un glucocorticoid", "is_correct": True},
            ...
          ]
        },
        ...
      ]
    """

    h_rects = get_highlight_recs(page)
    lines = extract_lines(page, h_rects)
    if not lines:
        return []

    x_tresh = get_x_treshold(lines)
    questions = []
    current_q = None

    for line in lines:
        text = line["text"]
        m = re.match(r'^(\d+)\.\s+(.+)', text) # n. <text>

        if not m:
            if current_q:
                if current_q["answers"]:
                    current_q["answers"][-1]["text"] += " " + text
                else:
                    current_q["text"] += " " + text
            continue

        num = int(m.group(1))
        body = m.group(2).strip()

        if line["x0"] < x_tresh:
            # Intrebare noua
            if current_q:
                questions.append(current_q)
            current_q = {
                "number": num,
                "text": body,
                "y": line["y0"],
                "answers": [],
                "images": []
            }
        else:
            # Raspuns la intrebarea curenta
            if current_q is not None:
                current_q["answers"].append({
                    "position": num,
                    "text": body,
                    "is_correct": line["highlighted"]
                })

    if current_q:
        questions.append(current_q)

    return questions

# PARSE IMAGES

def extract_images_with_positions(doc: fitz.Document, page: fitz.Page) -> list:
    """
    Extrage imaginile relevante de pe pagină.

    Filtrare:
      - Deduplicare după xref (aceeași imagine apare de 2 ori în PDF)
      - Ignoră imagini mici (sub MIN_IMAGE_SIZE px) — logo-uri, iconițe
      - Păstrează poziția y a celei mai mari plasări (imaginea principală)
    """

    seen_xrefs = set()
    images = []

    for img_info in page.get_images(full = True):
        xref = img_info[0]

        # Deduplicare - acelasi xref apare de doua ori
        if xref in seen_xrefs:
            continue

        seen_xrefs.add(xref)

        try:
            raw = doc.extract_image(xref)
        except Exception as e:
            log.warning(f"   Nu s-a putut extrage imaginea xref = {xref}: {e}")
            continue

        w = raw.get("width", 0)
        h = raw.get("height", 0)

        if w < MIN_IMAGE_SIZE or h < MIN_IMAGE_SIZE:
            log.debug(f"   Imagine ignorata: {w}x{h}px (prea mica)")
            continue

        rects = page.get_image_rects(xref)
        if not rects:
            continue

        main_rect = max(rects, key = lambda r: (r.x1 - r.x0) * (r.y1 - r.y0))

        images.append({
            "xref": xref,
            "bytes": raw["image"],
            "ext": raw.get("ext", "png"),
            "width": w,
            "height": h,
            "y": main_rect.y0
        })

    return images

def associate_images_to_questions(questions: list, images: list):
    """
    Leagă fiecare imagine de întrebarea cea mai apropiată deasupra ei.

    Logică: imaginea aparține întrebării cu y-ul cel mai mare
    care e totuși mai mic decât y-ul imaginii.

    Exemplu:
      y=43   Întrebarea 5             ← cea mai apropiată deasupra imaginii
      y=314  [imagine]       ← se asociază cu Întrebarea 5
      y=580  Întrebarea 6
    """

    for img in images:
        img_y = img["y"]

        best_q = None
        best_q_y = -1

        for q in questions:
            q_y = q.get("y", 0)
            if q_y < img_y and q_y > best_q_y:
                best_q = q
                best_q_y = q_y

        if best_q is not None:
            best_q["images"].append(img)
            log.debug(f"   Imagine y = {img_y:.0f} -> Q{best_q['number']} (y={best_q_y:.0f}")
        else:
            log.warning(f"    Imagine y={img_y:.0f} nu s-a putut asocia cu nicio intrebare")

# R2 UPLOAD

def make_r2_client():
    import boto3
    from botocore.client import Config

    return boto3.client(
        "s3",
        endpoint_url = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id = R2_ACCESS_KEY_ID,
        aws_secret_access_key = R2_SECRET_ACCESS_KEY,
        config = Config(signature_version="s3v4"),
        region_name = "auto",
    )

def upload_to_r2 (r2, img_bytes: bytes, ext: str, key: str) -> str:
    """Uploadează imaginea în R2 și returnează URL-ul public."""

    content_type = "image/jpeg" if img_bytes[:2] == b"\xff\xd8" else "image/png"
    r2.put_object(
        Bucket = R2_BUCKET_NAME,
        Key = key,
        Body = img_bytes,
        ContentType = content_type,
    )

    return f"{R2_PUBLIC_BASE_URL}/{key}"

# DATABASE

def db_insert_question(cursor, text: str) -> str:
    cursor.execute(
        "INSERT INTO questions (faculty_subject_id, text) VALUES (%s,%s) RETURNING id", (FACULTY_SUBJECT_ID, text)
    )

    return str(cursor.fetchone()[0])

def db_insert_question_image(cursor, question_id: str, key: str, url: str, order: int):
    cursor.execute(
        """INSERT INTO question_images (question_id, image_key, image_url, display_order)
           VALUES (%s, %s, %s, %s)""",
        (question_id, key, url, order),
    )

def db_insert_answer(cursor, question_id: str, answers: list):
    execute_batch(
        cursor,
        "INSERT INTO answers (question_id, text, is_correct, position) VALUES (%s, %s, %s, %s)",
        [(question_id, a["text"], a["is_correct"], a["position"]) for a in answers]
    )

# CHECKPOINT - verificari pentru reluare

def ckpt_load(path: str) -> dict:
    p = Path(path)
    return json.loads(p.read_text()) if p.exists() else { "last_page": -1, "total": 0 }

def ckpt_save(path: str, last_page: int, total: int):
    Path(path).write_text(json.dumps({ "last_page": last_page, "total": total }))


# MAIN

def run (pdf_path: str, dry_run: bool = False, start_page: int | None = None):
    log.info(f"=== START | pdf  = {pdf_path} | dry_run = {dry_run} ===")

    if not DATABASE_URL or not FACULTY_SUBJECT_ID:
        log.error("Lipsesc DATABASE_URL sau FACULTY_SUBJECT_ID din .env")
        sys.exit(1)

    if not HAS_R2:
        log.warning("Credențiale R2 lipsă — imaginile NU vor fi uploadate")

    ckpt_path = Path(pdf_path).stem + ".checkpoint.json"
    ckpt = ckpt_load(ckpt_path)
    from_page = start_page if start_page is not None else ckpt["last_page"] + 1
    total = ckpt["total"]

    doc = fitz.open(pdf_path)
    conn = psycopg2.connect(DATABASE_URL) if not dry_run else None
    r2 = make_r2_client() if (HAS_R2 and not dry_run) else None
    log.info(f"Pagini PDF: {len(doc)} | Start de la pagina: { from_page + 1 }")

    try:
        for pn in range(from_page, len(doc)):
            page = doc[pn]
            log.info(f"--- Pagina {pn + 1} / {len(doc)} ---")

            questions = parse_page(page)

            if not questions:
                log.info(" pagina fara intrebari - sarim peste")
                ckpt_save(ckpt_path, pn, total)
                continue

            images = extract_images_with_positions(doc, page)
            if images:
                associate_images_to_questions(questions, images)
                log.info(f"  {len(images)} imagine(i) găsite pe pagină")

            n_answers = sum(len(q["answers"]) for q in questions)
            n_correct = sum(sum(1 for a in q["answers"] if a["is_correct"]) for q in questions)
            log.info(f" {len(questions)} Intrebari | {n_answers} raspunsuri | {n_correct} corecte")

            if dry_run:
                for q in questions:
                    c = sum(1 for a in q["answers"] if a["is_correct"])
                    log.info(f"  Q{q['number']:>3}: {q['text'][:65]!r}  [{len(q['answers'])} ans | {c} ✓]")

                    for a in q["answers"]:
                        mark = "✓" if a["is_correct"] else " "
                        log.info(f"       {mark} {a['position']:>2}. {a['text'][:60]}")

                ckpt_save(ckpt_path, pn, total)
                continue

            cursor = conn.cursor()
            for q in questions:
                try:
                    qid = db_insert_question(cursor, q["text"])

                    for idx, img in enumerate(q["images"]):
                        if not r2:
                            log.warning(f"    Q{q['number']} are imagine dar R2 nu e configurat")
                            break
                        key = (
                            f"questions/{FACULTY_SUBJECT_ID}/"
                            f"p{pn + 1}_q{q['number']}_i{idx}.{img['ext']}"
                        )
                        url = upload_to_r2(r2, img["bytes"], img["ext"], key)
                        db_insert_question_image(cursor, qid, key, url, idx)
                        log.info(f"    Q{q['number']} imagine {idx} → {url}")

                    db_insert_answer(cursor, qid, q["answers"])

                    total += 1

                    c = sum(1 for a in q["answers"] if a["is_correct"])
                    log.info(f"  ✓ Q{q['number']} → {qid}  ({c} corecte din {len(q['answers'])})")

                except Exception as e:
                    log.error(f"  ✗ Q{q['number']} eșuat: {e}")
                    conn.rollback()
                    cursor = conn.cursor()

            conn.commit()
            cursor.close()
            ckpt_save(ckpt_path, pn, total)
            log.info(f" Pagina salvata. Total insert pana acum: {total}")
    except KeyboardInterrupt:
        log.info("Intrerupt. Progresul e salvat in checkpoint.")
    finally:
        if conn:
            conn.close()
        doc.close()

    log.info(f"=== FINAL | {total} intrebari inserate ===")

if __name__ == "__main__":
    p = argparse.ArgumentParser(description="Import grile chimie PDF -> PostgreSQL")
    p.add_argument("pdf", help = "Calea catre fisierul PDF")
    p.add_argument("--dry-run", action = "store_true", help = "Parseaza si afiseaza totul fara sa scrie in DB")
    p.add_argument("--start-page", type = int, default = None, help = "Pagina de start (0 - indexed): suprascrie ckpt-ul")

    args = p.parse_args()
    run(args.pdf, dry_run = args.dry_run, start_page = args.start_page)