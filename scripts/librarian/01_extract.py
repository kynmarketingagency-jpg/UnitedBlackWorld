#!/usr/bin/env python3
"""
Librarian — Stage 1: extract text from every book PDF.

For each book in `resources` with a pdf_url, this:
  1. Downloads the PDF from R2
  2. Extracts text page-by-page with PyMuPDF
  3. Writes scripts/librarian/extracted/{resource_id}.json
  4. Updates librarian_books.status to 'extracted' (or 'failed')

It does NOT embed — that's stage 2 (02_embed.py).

Why two stages:
  - You can SEE progress (files appearing in extracted/)
  - Each book takes 1–5 seconds, so you know fast if something is wrong
  - Embedding can be retried without re-downloading 25 MB PDFs
  - You can spot-check text quality before committing to embeddings

Resume-safe: skips books whose JSON already exists on disk.

Usage:
    pip3 install -r scripts/librarian/requirements.txt
    export $(grep -v '^#' .env.local | grep -v '^$' | xargs)
    python3 scripts/librarian/01_extract.py            # extract everything
    python3 scripts/librarian/01_extract.py --limit 5  # test on 5 books
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

import requests

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SERVICE_KEY  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
if not SUPABASE_URL or not SERVICE_KEY:
    sys.exit("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.")

EXTRACT_DIR = Path(__file__).parent / "extracted"
EXTRACT_DIR.mkdir(exist_ok=True)

DOWNLOAD_TIMEOUT = 90

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ")

def sb_get(path: str, params: dict | None = None) -> list[dict]:
    r = requests.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=HEADERS, params=params or {})
    r.raise_for_status()
    return r.json()

def sb_upsert(path: str, row: dict, on_conflict: str) -> None:
    h = {**HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"}
    r = requests.post(f"{SUPABASE_URL}/rest/v1/{path}?on_conflict={on_conflict}",
                      headers=h, json=row)
    if r.status_code >= 300:
        print(f"    [warn] upsert {path} HTTP {r.status_code}: {r.text[:200]}", flush=True)


def extract_one(book: dict) -> dict:
    """Download + extract a single book. Returns a result dict."""
    rid    = book["id"]
    title  = (book.get("title") or "").strip()
    author = (book.get("author") or "").strip() or None
    url    = book["pdf_url"]

    out_path = EXTRACT_DIR / f"{rid}.json"
    if out_path.exists():
        return {"status": "already-on-disk", "path": str(out_path)}

    t0 = time.time()
    resp = requests.get(url, timeout=DOWNLOAD_TIMEOUT)
    if resp.status_code != 200:
        raise RuntimeError(f"download HTTP {resp.status_code}")
    dl_time = time.time() - t0
    size_mb = len(resp.content) / 1024 / 1024

    import fitz  # PyMuPDF
    t0 = time.time()
    doc = fitz.open(stream=resp.content, filetype="pdf")
    pages = [{"page_number": i + 1, "text": (page.get_text("text") or "").strip()}
             for i, page in enumerate(doc)]
    page_count = doc.page_count
    doc.close()
    ext_time = time.time() - t0

    total_chars = sum(len(p["text"]) for p in pages)
    if total_chars < 200:
        # Almost certainly a scanned PDF with no text layer.
        raise RuntimeError(f"no text layer (only {total_chars} chars from {page_count} pages — likely scanned)")

    payload = {
        "resource_id": rid,
        "title":  title,
        "author": author,
        "page_count":  page_count,
        "total_chars": total_chars,
        "extracted_at": now_iso(),
        "pages": pages,
    }
    tmp = out_path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False))
    tmp.rename(out_path)

    return {
        "status": "extracted",
        "size_mb": round(size_mb, 1),
        "pages": page_count,
        "chars": total_chars,
        "dl_time": round(dl_time, 1),
        "ext_time": round(ext_time, 1),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit",    type=int, default=None)
    ap.add_argument("--category", default=None)
    ap.add_argument("--id",       type=int, default=None,
                    help="Process a single resources.id (overrides other filters).")
    args = ap.parse_args()

    print(f"\nLibrarian — Stage 1: extract")
    print(f"  output dir: {EXTRACT_DIR}")
    if args.limit:    print(f"  limit:      {args.limit}")
    if args.category: print(f"  category:   {args.category}")
    if args.id:       print(f"  single id:  {args.id}")
    print()

    if args.id:
        books = sb_get("resources", {
            "select": "id,title,author,pdf_url",
            "id": f"eq.{args.id}",
        })
    else:
        params = {
            "select": "id,title,author,pdf_url",
            "pdf_url": "not.is.null",
            "order": "id.asc",
        }
        if args.category:
            params["category"] = f"eq.{args.category}"
        books = sb_get("resources", params)

    on_disk = {p.stem for p in EXTRACT_DIR.glob("*.json")}
    queue = [b for b in books if str(b["id"]) not in on_disk]
    if args.limit:
        queue = queue[: args.limit]

    print(f"  total candidates:  {len(books)}")
    print(f"  already extracted: {len(on_disk)}")
    print(f"  queued this run:   {len(queue)}\n")

    if not queue:
        print("Nothing to do.")
        return

    ok = fail = 0
    for i, book in enumerate(queue, 1):
        title = (book.get("title") or "?")[:60]
        print(f"[{i}/{len(queue)}] id={book['id']}  {title}", flush=True)

        sb_upsert("librarian_books", {
            "resource_id": book["id"],
            "status": "processing",
            "started_at": now_iso(),
            "error_message": None,
            "updated_at": now_iso(),
        }, on_conflict="resource_id")

        try:
            r = extract_one(book)
            print(f"        -> ok  {r['size_mb']}MB  pages={r['pages']}  chars={r['chars']}  "
                  f"dl={r['dl_time']}s  ext={r['ext_time']}s", flush=True)
            sb_upsert("librarian_books", {
                "resource_id": book["id"],
                "status": "extracted",
                "pages_count": r["pages"],
                "completed_at": now_iso(),
                "updated_at": now_iso(),
            }, on_conflict="resource_id")
            ok += 1
        except Exception as e:
            msg = str(e)[:300]
            print(f"        -> FAIL  {msg}", flush=True)
            sb_upsert("librarian_books", {
                "resource_id": book["id"],
                "status": "failed",
                "error_message": msg,
                "completed_at": now_iso(),
                "updated_at": now_iso(),
            }, on_conflict="resource_id")
            fail += 1

    print(f"\nDone. ok={ok}  failed={fail}  on_disk_before={len(on_disk)}")


if __name__ == "__main__":
    main()
