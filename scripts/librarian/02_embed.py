#!/usr/bin/env python3
"""
Librarian — Stage 2: chunk + embed every extracted book.

Reads each scripts/librarian/extracted/{resource_id}.json file produced
by stage 1, splits the pages into ~1500-char chunks, embeds them with
BAAI/bge-small-en-v1.5 via sentence-transformers + Apple MPS (so the
M-series GPU does the work), and inserts them into `librarian_chunks`
in Supabase.

Resume-safe: a book is skipped if it already has rows in librarian_chunks.
Retry-safe: transient SSL / 5xx / network errors on insert are retried
with exponential backoff so a flaky connection doesn't lose work.

Usage:
    pip3 install -r scripts/librarian/requirements.txt
    export $(grep -v '^#' .env.local | grep -v '^$' | xargs)

    # Recommended on macOS: run as a *background* QoS task so the OS
    # gives priority to your foreground apps. Indexing takes a bit longer
    # wall-clock but your machine stays responsive.
    taskpolicy -b -c utility nice -n 10 \\
        python3 -u scripts/librarian/02_embed.py

    # Test on N books, or one specific id:
    python3 -u scripts/librarian/02_embed.py --limit 5
    python3 -u scripts/librarian/02_embed.py --id 6
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

EMBED_MODEL    = "BAAI/bge-small-en-v1.5"   # 384-dim
EMBED_DIMS     = 384
EMBED_BATCH    = 16     # fastembed handles small CPU batches fine
INSERT_BATCH   = 25     # smaller = lighter HNSW index updates per statement
                        # (was 100, but big-book inserts hit Supabase 60s timeout
                        #  once the index grew past ~200k vectors)
TARGET_CHARS   = 1500
MAX_PAGE_CHARS = 3000

# Retry config for transient network/SSL/5xx failures.
MAX_RETRIES   = 5
RETRY_BACKOFF = 2.0     # base seconds, doubled each attempt

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ")


# ─── Supabase helpers ──────────────────────────────────────────────────
def sb_get(path: str, params: dict | None = None) -> list[dict]:
    r = requests.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=HEADERS, params=params or {}, timeout=30)
    r.raise_for_status()
    return r.json()

def sb_upsert(path: str, row: dict, on_conflict: str) -> None:
    h = {**HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"}
    r = requests.post(f"{SUPABASE_URL}/rest/v1/{path}?on_conflict={on_conflict}",
                      headers=h, json=row, timeout=30)
    if r.status_code >= 300:
        print(f"    [warn] upsert {path} HTTP {r.status_code}: {r.text[:200]}", flush=True)

def sb_insert_batch_retry(path: str, rows: list[dict]) -> None:
    """Insert rows in INSERT_BATCH-sized chunks, retrying transient errors."""
    if not rows:
        return
    h = {**HEADERS, "Prefer": "return=minimal"}

    for i in range(0, len(rows), INSERT_BATCH):
        batch = rows[i : i + INSERT_BATCH]
        last_err = None
        for attempt in range(MAX_RETRIES):
            try:
                r = requests.post(
                    f"{SUPABASE_URL}/rest/v1/{path}",
                    headers=h, json=batch, timeout=60,
                )
                if r.status_code < 300:
                    last_err = None
                    break
                # 4xx (except 429) = our problem, don't retry indefinitely.
                if 400 <= r.status_code < 500 and r.status_code != 429:
                    raise RuntimeError(f"insert HTTP {r.status_code}: {r.text[:300]}")
                last_err = f"HTTP {r.status_code}: {r.text[:200]}"
            except requests.exceptions.RequestException as e:
                last_err = f"{type(e).__name__}: {e}"

            sleep_s = RETRY_BACKOFF * (2 ** attempt)
            print(f"        [retry {attempt + 1}/{MAX_RETRIES}] insert failed "
                  f"({last_err}) — sleeping {sleep_s:.1f}s", flush=True)
            time.sleep(sleep_s)

        if last_err:
            raise RuntimeError(f"insert failed after {MAX_RETRIES} attempts: {last_err}")


# ─── Chunking ──────────────────────────────────────────────────────────
def split_long_text(text: str, target: int) -> list[str]:
    if len(text) <= target:
        return [text]
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    out, cur = [], ""
    for p in paragraphs:
        if cur and len(cur) + len(p) + 2 > target:
            out.append(cur)
            cur = p
        else:
            cur = (cur + "\n\n" + p) if cur else p
    if cur:
        out.append(cur)

    final = []
    for piece in out:
        if len(piece) <= target * 1.5:
            final.append(piece)
        else:
            words = piece.split(" ")
            buf = ""
            for w in words:
                cand = (buf + " " + w) if buf else w
                if len(cand) > target and buf:
                    final.append(buf)
                    buf = w
                else:
                    buf = cand
            if buf:
                final.append(buf)
    return final


def chunk_pages(pages: list[dict]) -> list[dict]:
    chunks: list[dict] = []
    buf_text, buf_page = "", None

    def flush():
        nonlocal buf_text, buf_page
        if buf_text.strip():
            chunks.append({"page_number": buf_page, "content": buf_text.strip()})
        buf_text, buf_page = "", None

    for p in pages:
        page_num = p["page_number"]
        text = (p.get("text") or "").strip()
        if not text:
            continue

        if len(text) > MAX_PAGE_CHARS:
            flush()
            for piece in split_long_text(text, TARGET_CHARS):
                chunks.append({"page_number": page_num, "content": piece.strip()})
            continue

        candidate = (buf_text + "\n\n" + text) if buf_text else text
        if len(candidate) > TARGET_CHARS and buf_text:
            flush()
            buf_text, buf_page = text, page_num
        else:
            if buf_page is None:
                buf_page = page_num
            buf_text = candidate

    flush()
    return chunks


# ─── Embedder (fastembed, ONNX, CPU) ───────────────────────────────────
# This is the path we know works reliably. MPS attempts hung the GPU
# kernel; fastembed CPU is slower but bulletproof.
_embedder = None
def get_embedder():
    global _embedder
    if _embedder is None:
        from fastembed import TextEmbedding
        print(f"  loading {EMBED_MODEL} via fastembed (CPU)...", flush=True)
        t0 = time.time()
        _embedder = TextEmbedding(model_name=EMBED_MODEL)
        # warm one call so first real book isn't slowed by JIT startup
        _ = next(iter(_embedder.embed(["warmup"])))
        print(f"  model ready in {time.time() - t0:.1f}s", flush=True)
    return _embedder


def embed_texts(texts: list[str]):
    """Yield (index, vector) pairs as fastembed produces them, so the
    caller can show progress while embedding."""
    embedder = get_embedder()
    for i, vec in enumerate(embedder.embed(texts, batch_size=EMBED_BATCH)):
        yield i, vec.tolist()


def vec_to_pg(values) -> str:
    return "[" + ",".join(f"{float(v):.7f}" for v in values) + "]"


# ─── Per-book pipeline ─────────────────────────────────────────────────
def already_embedded(rid: int) -> bool:
    rows = sb_get("librarian_chunks", {
        "select": "id",
        "resource_id": f"eq.{rid}",
        "limit": "1",
    })
    return len(rows) > 0


def embed_book(json_path: Path) -> dict:
    data = json.loads(json_path.read_text())
    rid    = data["resource_id"]
    title  = data.get("title") or ""
    author = data.get("author")

    if already_embedded(rid):
        return {"status": "already-embedded"}

    chunks = chunk_pages(data["pages"])
    if not chunks:
        raise RuntimeError("no chunks produced from extracted pages")

    print(f"        chunks: {len(chunks)}  "
          f"(min={min(len(c['content']) for c in chunks)}  "
          f"max={max(len(c['content']) for c in chunks)})", flush=True)

    texts = [c["content"] for c in chunks]

    rows: list[dict] = []
    t0 = time.time()
    last_print = t0
    for i, vec in embed_texts(texts):
        # Postgres text columns reject NUL bytes; some PDFs leak them.
        clean = chunks[i]["content"].replace("\x00", "")
        rows.append({
            "resource_id":  rid,
            "book_title":   title,
            "author":       author,
            "page_number":  chunks[i]["page_number"],
            "chunk_index":  i,
            "content":      clean,
            "char_count":   len(clean),
            "embedding":    vec_to_pg(vec),
        })
        # Print live progress every 5 seconds so the run never feels stuck.
        if time.time() - last_print > 5:
            done = i + 1
            elapsed = time.time() - t0
            print(f"        embedded {done}/{len(texts)}  "
                  f"({done / max(elapsed, 0.001):.1f} chunks/sec)", flush=True)
            last_print = time.time()
    elapsed = time.time() - t0
    print(f"        embed: {elapsed:.1f}s  ({len(texts) / max(elapsed, 0.001):.1f} chunks/sec)", flush=True)

    t0 = time.time()
    sb_insert_batch_retry("librarian_chunks", rows)
    print(f"        inserted {len(rows)} rows in {time.time() - t0:.1f}s", flush=True)

    return {"status": "embedded", "chunks": len(rows), "elapsed": round(elapsed, 1)}


# ─── Main ──────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--id", type=int, default=None,
                    help="Only embed extracted/{id}.json")
    args = ap.parse_args()

    print(f"\nLibrarian — Stage 2: embed")
    print(f"  source dir: {EXTRACT_DIR}")
    print(f"  model:      {EMBED_MODEL} ({EMBED_DIMS} dims)")

    if args.id:
        files = [EXTRACT_DIR / f"{args.id}.json"]
        if not files[0].exists():
            sys.exit(f"missing: {files[0]}  (run stage 1 first)")
    else:
        files = sorted(EXTRACT_DIR.glob("*.json"), key=lambda p: int(p.stem))

    if args.limit:
        files = files[: args.limit]
    print(f"  files:      {len(files)}\n")

    if not files:
        print("Nothing on disk to embed. Run 01_extract.py first.")
        return

    # Warm the model before the loop so the first book's timing is realistic.
    get_embedder()

    ok = fail = skip = 0
    for i, path in enumerate(files, 1):
        rid = int(path.stem)
        print(f"[{i}/{len(files)}] id={rid}  {path.name}", flush=True)

        sb_upsert("librarian_books", {
            "resource_id": rid,
            "status": "processing",
            "started_at": now_iso(),
            "updated_at": now_iso(),
        }, on_conflict="resource_id")

        try:
            r = embed_book(path)
            if r["status"] == "already-embedded":
                print(f"        -> skip (already in librarian_chunks)", flush=True)
                skip += 1
                continue

            sb_upsert("librarian_books", {
                "resource_id": rid,
                "status": "embedded",
                "chunks_count": r["chunks"],
                "completed_at": now_iso(),
                "updated_at": now_iso(),
            }, on_conflict="resource_id")
            print(f"        -> ok  chunks={r['chunks']}  embed={r['elapsed']}s", flush=True)
            ok += 1
        except Exception as e:
            msg = str(e)[:300]
            print(f"        -> FAIL  {msg}", flush=True)
            sb_upsert("librarian_books", {
                "resource_id": rid,
                "status": "failed",
                "error_message": msg,
                "completed_at": now_iso(),
                "updated_at": now_iso(),
            }, on_conflict="resource_id")
            fail += 1

    print(f"\nDone. ok={ok}  failed={fail}  skipped={skip}")


if __name__ == "__main__":
    main()
