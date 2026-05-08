#!/usr/bin/env python3
"""
Librarian — query embedding service (local).

Tiny HTTP server that embeds a single query string with the same model
(BAAI/bge-small-en-v1.5) used to index our chunks, so that vectors live
in the same space and cosine similarity is meaningful.

The Next.js /api/librarian/search route POSTs here, gets back a 384-dim
vector, then queries Supabase. That's the only role this service has.

Run it in its own terminal alongside `next dev`:
    python3 scripts/librarian/serve_embed.py

Endpoint:
    POST http://localhost:8787/embed
    body:    {"text": "your question here"}
    returns: {"vector": [384 floats]}

stdlib-only — no Flask/FastAPI dependency.
"""

import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = 8787
MODEL = "BAAI/bge-small-en-v1.5"

print(f"[librarian-embed] loading {MODEL}...", flush=True)
from fastembed import TextEmbedding
embedder = TextEmbedding(model_name=MODEL)
# Warm one call so the first real request is fast.
_ = next(iter(embedder.embed(["warmup"])))
print(f"[librarian-embed] ready  http://localhost:{PORT}/embed", flush=True)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # silence the default per-request logging
        pass

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            payload = b'{"ok":true}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self._cors()
            self.end_headers()
            self.wfile.write(payload)
            return
        self.send_error(404)

    def do_POST(self):
        if self.path != "/embed":
            self.send_error(404)
            return
        try:
            n = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(n) or b"{}")
            text = (body.get("text") or "").strip()
            if not text:
                self.send_error(400, "missing 'text'")
                return
            vec = next(iter(embedder.embed([text]))).tolist()
            payload = json.dumps({"vector": vec}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self._cors()
            self.end_headers()
            self.wfile.write(payload)
        except Exception as e:
            print(f"[librarian-embed] error: {e}", file=sys.stderr, flush=True)
            self.send_error(500, str(e))


if __name__ == "__main__":
    try:
        HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
    except KeyboardInterrupt:
        print("\n[librarian-embed] stopped.")
